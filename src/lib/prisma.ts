import { PrismaClient } from '@prisma/client'
import { getCurrentTenantContext } from '@/lib/tenantContext'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Models that need tenantId + farmId filtering
const TENANT_FARM_MODELS = [
  'Pen', 'Goat', 'HealthRecord', 'VaccinationProtocol', 'Breeding',
  'Sale', 'Expense', 'InventoryItem', 'FeedType', 'FeedStock', 'FeedingSchedule',
  'DailyFeedConsumption', 'CalendarEvent', 'FeedingRecord', 'Owner'
]

// Models that need tenantId only (no farmId)
const TENANT_ONLY_MODELS = ['Birth', 'Payment', 'InventoryTransaction', 'User', 'Subscription']

// Models that need tenantId + optional farmId filtering on reads
const TENANT_OPTIONAL_FARM_MODELS = ['ActivityLog']

// Prisma 5 يدعم MySQL مباشرة بدون adapter
// MariaDB متوافق 100% مع MySQL
// Connection pooling: set ?connection_limit=10 in DATABASE_URL for production
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
  const isTenantOptionalFarm = TENANT_OPTIONAL_FARM_MODELS.includes(model)

  if (!isTenantFarm && !isTenantOnly && !isTenantOptionalFarm) return next(params)

  const { tenantId, farmId } = ctx

  // Read operations: add tenantId (+ farmId) to where
  if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
    params.args = params.args || {}
    params.args.where = params.args.where || {}
    params.args.where.tenantId = tenantId
    if (isTenantFarm) {
      params.args.where.farmId = farmId
    }
    if (isTenantOptionalFarm && farmId) {
      params.args.where.farmId = farmId
    }
  }

  // findUnique/findUniqueOrThrow: convert to findFirst with tenant scope
  if (['findUnique', 'findUniqueOrThrow'].includes(params.action)) {
    const isOrThrow = params.action === 'findUniqueOrThrow'
    params.action = isOrThrow ? 'findFirstOrThrow' : 'findFirst'
    params.args = params.args || {}
    params.args.where = { ...params.args.where, tenantId }
    if (isTenantFarm) {
      params.args.where.farmId = farmId
    }
    if (isTenantOptionalFarm && farmId) {
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
    if (isTenantOptionalFarm && farmId) {
      params.args.data.farmId = farmId
    }
  }

  // CreateMany: inject tenantId + farmId into each record
  if (['createMany', 'createManyAndReturn'].includes(params.action)) {
    params.args = params.args || {}
    if (Array.isArray(params.args.data)) {
      params.args.data = params.args.data.map((record: Record<string, unknown>) => ({
        ...record,
        tenantId,
        ...(isTenantFarm ? { farmId } : {}),
        ...(isTenantOptionalFarm && farmId ? { farmId } : {}),
      }))
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
    if (isTenantOptionalFarm && farmId) {
      params.args.where.farmId = farmId
    }
  }

  // Single update/delete/upsert: scope by tenant
  if (['update', 'delete'].includes(params.action)) {
    params.args = params.args || {}
    params.args.where = { ...params.args.where, tenantId }
    if (isTenantFarm) {
      params.args.where.farmId = farmId
    }
    if (isTenantOptionalFarm && farmId) {
      params.args.where.farmId = farmId
    }
  }

  if (params.action === 'upsert') {
    params.args = params.args || {}
    params.args.where = { ...params.args.where, tenantId }
    if (isTenantFarm) {
      params.args.where.farmId = farmId
    }
    // Also inject into create data
    params.args.create = params.args.create || {}
    params.args.create.tenantId = tenantId
    if (isTenantFarm) {
      params.args.create.farmId = farmId
    }
  }

  return next(params)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
