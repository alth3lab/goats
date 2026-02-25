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

export async function getUserWithPermissions(request: NextRequest) {
  const ctx = await getTenantContext(request)
  if (!ctx) return null

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    include: { permissions: { include: { permission: true } } }
  })

  if (!user) return null

  // Check tenant is active (skip for SUPER_ADMIN)
  if (user.role !== 'SUPER_ADMIN' && ctx.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { isActive: true, trialEndsAt: true, plan: true }
    })
    if (tenant && !tenant.isActive) {
      return null // Tenant deactivated
    }
  }

  const permissions = user.permissions.map((entry) => entry.permission.name)
  return { user, permissions, tenantId: ctx.tenantId, farmId: ctx.farmId }
}

export async function requireAuth(request: NextRequest) {
  const data = await getUserWithPermissions(request)
  if (!data) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
  }
  return { response: null, ...data }
}

export async function requirePermission(request: NextRequest, permission: string) {
  const data = await getUserWithPermissions(request)
  if (!data) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
  }

  // SUPER_ADMIN, OWNER, ADMIN bypass permission checks
  if (['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(data.user.role)) {
    return { response: null, ...data }
  }

  if (!data.permissions.includes(permission)) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
  }

  return { response: null, ...data }
}
