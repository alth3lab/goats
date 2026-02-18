import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { z } from 'zod'

export const runtime = 'nodejs'

// Schema for validating backup structure
const recordArray = z.array(z.record(z.string(), z.unknown())).optional()
const backupSchema = z.object({
  data: z.object({
    pens: recordArray,
    goats: recordArray,
    healthRecords: recordArray,
    vaccinationProtocols: recordArray,
    breedings: recordArray,
    births: recordArray,
    feedingRecords: recordArray,
    sales: recordArray,
    payments: recordArray,
    expenses: recordArray,
    inventoryItems: recordArray,
    inventoryTransactions: recordArray,
    feedTypes: recordArray,
    feedStocks: recordArray,
    feedingSchedules: recordArray,
    dailyFeedConsumptions: recordArray,
    calendarEvents: recordArray,
    activityLogs: recordArray,
    goatTypes: recordArray,
    breeds: recordArray,
  }),
}).passthrough()

// POST /api/settings/restore — Restore tenant data from JSON backup (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'فقط مدير النظام يمكنه استعادة النسخة الاحتياطية' }, { status: 403 })
    }
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    
    // Validate backup structure with Zod
    const parsed = backupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ملف النسخة الاحتياطية غير صالح', details: parsed.error.issues.map(i => i.message) },
        { status: 400 }
      )
    }

    const data = parsed.data.data
    const results: Record<string, number> = {}

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete current tenant's data in reverse dependency order
      // Note: with User/ActivityLog in middleware, deleteMany auto-scopes to current tenant
      await tx.activityLog.deleteMany()
      await tx.userPermission.deleteMany()
      await tx.dailyFeedConsumption.deleteMany()
      await tx.feedingSchedule.deleteMany()
      await tx.feedStock.deleteMany()
      await tx.feedType.deleteMany()
      await tx.inventoryTransaction.deleteMany()
      await tx.inventoryItem.deleteMany()
      await tx.calendarEvent.deleteMany()
      await tx.payment.deleteMany()
      await tx.sale.deleteMany()
      await tx.feedingRecord.deleteMany()
      await tx.birth.deleteMany()
      await tx.breeding.deleteMany()
      await tx.healthRecord.deleteMany()
      await tx.vaccinationProtocol.deleteMany()
      await tx.goat.deleteMany()
      await tx.pen.deleteMany()
      await tx.expense.deleteMany()
      // Don't delete users to keep the current logged-in user
      // Don't delete global tables (Permission, GoatType, Breed)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restoreTable = async (model: { create: (args: any) => Promise<any> }, items: Record<string, unknown>[] | undefined, key: string) => {
        if (!items?.length) return
        for (const item of items) {
          await model.create({ data: sanitizeDates(item) as any })
        }
        results[key] = items.length
      }

      // Restore data tables (middleware auto-injects tenantId/farmId on create)
      await restoreTable(tx.pen, data.pens, 'pens')
      await restoreTable(tx.goat, data.goats, 'goats')
      await restoreTable(tx.healthRecord, data.healthRecords, 'healthRecords')
      await restoreTable(tx.vaccinationProtocol, data.vaccinationProtocols, 'vaccinationProtocols')
      await restoreTable(tx.breeding, data.breedings, 'breedings')
      await restoreTable(tx.birth, data.births, 'births')
      await restoreTable(tx.feedingRecord, data.feedingRecords, 'feedingRecords')
      await restoreTable(tx.sale, data.sales, 'sales')
      await restoreTable(tx.payment, data.payments, 'payments')
      await restoreTable(tx.expense, data.expenses, 'expenses')
      await restoreTable(tx.inventoryItem, data.inventoryItems, 'inventoryItems')
      await restoreTable(tx.inventoryTransaction, data.inventoryTransactions, 'inventoryTransactions')
      await restoreTable(tx.feedType, data.feedTypes, 'feedTypes')
      await restoreTable(tx.feedStock, data.feedStocks, 'feedStocks')
      await restoreTable(tx.feedingSchedule, data.feedingSchedules, 'feedingSchedules')
      await restoreTable(tx.dailyFeedConsumption, data.dailyFeedConsumptions, 'dailyFeedConsumptions')
      await restoreTable(tx.calendarEvent, data.calendarEvents, 'calendarEvents')
      await restoreTable(tx.activityLog, data.activityLogs, 'activityLogs')

      // Restore global tables if present (skip existing)
      if (data.goatTypes?.length) {
        for (const item of data.goatTypes) {
          const existing = await tx.goatType.findUnique({ where: { id: item.id as string } })
          if (!existing) {
            await tx.goatType.create({ data: sanitizeDates(item) as any })
          }
        }
        results['goatTypes'] = data.goatTypes.length
      }
      if (data.breeds?.length) {
        for (const item of data.breeds) {
          const existing = await tx.breed.findUnique({ where: { id: item.id as string } })
          if (!existing) {
            await tx.breed.create({ data: sanitizeDates(item) as any })
          }
        }
        results['breeds'] = data.breeds.length
      }
    }, { timeout: 120000 })

    return NextResponse.json({
      message: 'تمت الاستعادة بنجاح',
      restored: results,
    })
  
    })
} catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json(
      { error: 'فشل في استعادة النسخة الاحتياطية' },
      { status: 500 }
    )
  }
}

// Convert ISO string dates back to Date objects for Prisma
// Also strip any Prisma relation fields that aren't columns
function sanitizeDates(obj: Record<string, unknown>): Record<string, unknown> {
  const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
  const relationFields = new Set([
    'type', 'breed', 'pen', 'mother', 'father', 'kidsAsMother', 'kidsAsFather',
    'kidBirths', 'healthRecords', 'breedingAsMother', 'breedingAsFather',
    'feedingRecords', 'goat', 'user', 'permission', 'users', 'goats',
    'breeds', 'feedingSchedules', 'feedConsumptions', 'births', 'breeding',
    'kidGoat', 'sale', 'payments', 'item', 'transactions', 'feedType',
    'stock', 'schedules', 'consumptions', 'activities', 'permissions',
    'sales',
  ])

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip relation fields (objects and arrays that aren't columns)
    if (relationFields.has(key) && (typeof value === 'object' && value !== null && !(value instanceof Date))) {
      continue
    }
    if (typeof value === 'string' && datePattern.test(value)) {
      result[key] = new Date(value)
    } else {
      result[key] = value
    }
  }
  return result
}
