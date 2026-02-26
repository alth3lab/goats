import { AsyncLocalStorage } from 'node:async_hooks'

interface TenantCtx {
  tenantId: string
  farmId: string
}

export const tenantStorage = new AsyncLocalStorage<TenantCtx>()

/**
 * تشغيل كود داخل سياق المستأجر - يُستخدم في معالجات API
 * جميع استعلامات Prisma داخل هذا السياق تُفلتر تلقائياً بـ tenantId/farmId
 */
export function runWithTenant<T>(tenantId: string | undefined, farmId: string | undefined, fn: () => T): T {
  return tenantStorage.run({ tenantId: tenantId ?? '', farmId: farmId ?? '' }, fn)
}

export function getCurrentTenantContext(): TenantCtx | undefined {
  return tenantStorage.getStore()
}
