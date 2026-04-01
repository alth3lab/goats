import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { TOKEN_COOKIE } from '@/lib/jwt'

export const runtime = 'nodejs'

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  return proto === 'https'
}

/**
 * DELETE /api/auth/account
 *
 * Permanently deletes the authenticated user's account and all their data.
 * If the user is the sole user in their tenant (or the tenant owner and no
 * other users remain), the entire tenant record is also deleted — which
 * cascades through Prisma to remove all associated farms, goats, health
 * records, etc.
 *
 * If other users exist in the tenant the requesting user is simply removed
 * and the tenant is preserved.
 *
 * Apple Guideline 5.1.1(v) compliance: this is a hard delete, not a
 * deactivation.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const userId = auth.user.id as string
  const tenantId = auth.user.tenantId as string | undefined

  try {
    // Count remaining users in this tenant (excluding the requesting user)
    const otherUsersCount = tenantId
      ? await prisma.user.count({
          where: { tenantId, id: { not: userId }, isActive: true },
        })
      : 0

    if (tenantId && otherUsersCount === 0) {
      // Last (or only) user in tenant — delete the whole tenant.
      // Prisma cascades will remove: Users, UserFarms, Farms, Goats,
      // HealthRecords, Sales, Expenses, Feeds, Schedules, etc.
      await prisma.tenant.delete({ where: { id: tenantId } })
    } else {
      // Other users exist — only delete this user record.
      // Cascade rules in schema: UserFarm, UserPermission, ActivityLog → Cascade
      await prisma.user.delete({ where: { id: userId } })
    }

    // Clear auth cookie for web sessions
    const response = NextResponse.json({ success: true, message: 'تم حذف الحساب بنجاح' })
    response.cookies.set(TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    })
    return response
  } catch (err) {
    console.error('[account/delete]', err)
    return NextResponse.json({ error: 'فشل حذف الحساب' }, { status: 500 })
  }
}
