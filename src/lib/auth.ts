import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, TOKEN_COOKIE } from '@/lib/jwt'
import { getTenantContext, type TenantContext } from '@/lib/tenant'

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  return payload?.userId || null
}

type AuthResult =
  | { ok: true; user: any; permissions: string[]; tenantId: string | undefined; farmId: string | undefined }
  | { ok: false; reason: 'unauthenticated' | 'deactivated' | 'no_permission' }

export async function getUserWithPermissions(request: NextRequest): Promise<AuthResult> {
  const ctx = await getTenantContext(request)
  if (!ctx) return { ok: false, reason: 'unauthenticated' }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    include: { permissions: { include: { permission: true } } }
  })

  if (!user) return { ok: false, reason: 'unauthenticated' }

  // Check tenant is active (skip for SUPER_ADMIN)
  if (user.role !== 'SUPER_ADMIN' && ctx.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { isActive: true }
    })
    if (tenant && !tenant.isActive) {
      return { ok: false, reason: 'deactivated' }
    }
  }

  const permissions = user.permissions.map((entry) => entry.permission.name)
  return { ok: true, user, permissions, tenantId: ctx.tenantId || undefined, farmId: ctx.farmId || undefined }
}

export async function requireAuth(request: NextRequest) {
  const result = await getUserWithPermissions(request)
  if (!result.ok) {
    const message =
      result.reason === 'deactivated'
        ? 'الحساب موقوف. يرجى التواصل مع الدعم.'
        : 'غير مصرح'
    return { response: NextResponse.json({ error: message, reason: result.reason }, { status: 401 }) }
  }
  return { response: null, ...result }
}

export async function requirePermission(request: NextRequest, permission: string) {
  const result = await getUserWithPermissions(request)
  if (!result.ok) {
    const message =
      result.reason === 'deactivated'
        ? 'الحساب موقوف. يرجى التواصل مع الدعم.'
        : 'غير مصرح'
    return { response: NextResponse.json({ error: message, reason: result.reason }, { status: 401 }) }
  }

  // SUPER_ADMIN, OWNER, ADMIN bypass permission checks
  if (['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(result.user.role)) {
    return { response: null, ...result }
  }

  if (!result.permissions.includes(permission)) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
  }

  return { response: null, ...result }
}
