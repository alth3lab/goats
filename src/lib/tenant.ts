import type { NextRequest } from 'next/server'
import { verifyToken, TOKEN_COOKIE, type JWTPayload } from '@/lib/jwt'

/**
 * سياق المستأجر - يستخرج tenantId و farmId من JWT
 */
export interface TenantContext {
  userId: string
  role: string
  tenantId: string
  farmId: string
}

/**
 * استخراج سياق المستأجر من الطلب
 */
export async function getTenantContext(request: NextRequest): Promise<TenantContext | null> {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  // X-Farm-Id override is only respected during farm switch (handled by /api/farms/switch)
  // Do NOT allow arbitrary header override to prevent cross-farm access
  return {
    userId: payload.userId,
    role: payload.role,
    tenantId: payload.tenantId,
    farmId: payload.farmId,
  }
}

/**
 * بناء فلتر where لجدول يحتوي tenantId و farmId
 */
export function tenantFilter(ctx: TenantContext) {
  return {
    tenantId: ctx.tenantId,
    farmId: ctx.farmId,
  }
}

/**
 * بناء فلتر where لجدول يحتوي tenantId فقط (بدون farmId)
 */
export function tenantOnlyFilter(ctx: TenantContext) {
  return {
    tenantId: ctx.tenantId,
  }
}

/**
 * بيانات الإنشاء - tenantId + farmId
 */
export function tenantData(ctx: TenantContext) {
  return {
    tenantId: ctx.tenantId,
    farmId: ctx.farmId,
  }
}

/**
 * هل المستخدم مدير عام (يرى كل المستأجرين)
 */
export function isSuperAdmin(ctx: TenantContext) {
  return ctx.role === 'SUPER_ADMIN'
}

/**
 * هل المستخدم مالك أو مدير (كل الصلاحيات داخل المستأجر)
 */
export function isOwnerOrAdmin(ctx: TenantContext) {
  return ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(ctx.role)
}
