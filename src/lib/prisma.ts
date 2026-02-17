import { PrismaClient } from '@prisma/client'
import { getCurrentTenantContext } from '@/lib/tenantContext'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Models that need tenantId + farmId filtering
const TENANT_FARM_MODELS = [
  'Pen', 'Goat', 'HealthRecord', 'VaccinationProtocol', 'Breeding',
  'Sale', 'Expense', 'InventoryItem', 'FeedType', 'FeedingSchedule',
  'DailyFeedConsumption', 'CalendarEvent', 'FeedingRecord'
]

// Models that need tenantId only (no farmId)
const TENANT_ONLY_MODELS = ['Birth', 'Payment', 'FeedStock', 'InventoryTransaction']

// Prisma 5 يدعم MySQL مباشرة بدون adapter
// MariaDB متوافق 100% مع MySQL
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Tenant isolation middleware - auto-filters by tenantId/farmId
prisma.$use(async (params, next) => {
  const ctx = getCurrentTenantContext()
  if (!ctx) return next(params) // No context = raw query (migrations, seeds, etc.)

  const model = params.model
  if (!model) return next(params)

  const isTenantFarm = TENANT_FARM_MODELS.includes(model)
  const isTenantOnly = TENANT_ONLY_MODELS.includes(model)

  if (!isTenantFarm && !isTenantOnly) return next(params)

  const { tenantId, farmId } = ctx

  // Read operations: add tenantId (+ farmId) to where
  if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
    params.args = params.args || {}
    params.args.where = params.args.where || {}
    params.args.where.tenantId = tenantId
    if (isTenantFarm) {
      params.args.where.farmId = farmId
    }
  }

  // Create: inject tenantId + farmId into data
  if (params.action === 'create') {
    params.args = params.args || {}
    params.args.data = params.args.data || {}
    params.args.data.tenantId = tenantId
    if (isTenantFarm) {
      params.args.data.farmId = farmId
    }
  }

  // UpdateMany/DeleteMany: scope by tenant
  if (['updateMany', 'deleteMany'].includes(params.action)) {
    params.args = params.args || {}
    params.args.where = params.args.where || {}
    params.args.where.tenantId = tenantId
    if (isTenantFarm) {
      params.args.where.farmId = farmId
    }
  }

  return next(params)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
