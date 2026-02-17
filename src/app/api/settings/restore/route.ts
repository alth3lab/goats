import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

// POST /api/settings/restore — Restore database from JSON backup
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_settings')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const backup = await request.json()

    // Validate backup structure
    if (!backup.version || !backup.data) {
      return NextResponse.json(
        { error: 'ملف النسخة الاحتياطية غير صالح' },
        { status: 400 }
      )
    }

    const data = backup.data
    const results: Record<string, number> = {}

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all existing data in reverse dependency order
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
      await tx.breed.deleteMany()
      await tx.goatType.deleteMany()
      await tx.expense.deleteMany()
      await tx.user.deleteMany()
      await tx.permission.deleteMany()
      await tx.appSetting.deleteMany()

      // Restore in dependency order
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restoreTable = async (model: { create: (args: any) => Promise<any> }, items: Record<string, unknown>[], key: string) => {
        if (!items?.length) return
        for (const item of items) {
          await model.create({ data: sanitizeDates(item) })
        }
        results[key] = items.length
      }

      await restoreTable(tx.user, data.users, 'users')
      await restoreTable(tx.permission, data.permissions, 'permissions')
      await restoreTable(tx.userPermission, data.userPermissions, 'userPermissions')
      await restoreTable(tx.activityLog, data.activityLogs, 'activityLogs')
      await restoreTable(tx.goatType, data.goatTypes, 'goatTypes')
      await restoreTable(tx.breed, data.breeds, 'breeds')
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
      await restoreTable(tx.appSetting, data.appSettings, 'appSettings')
    }, { timeout: 120000 }) // 2 minute timeout for large databases

    return NextResponse.json({
      message: 'تمت الاستعادة بنجاح',
      restored: results,
    })
  
    })
} catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json(
      { error: 'فشل في استعادة النسخة الاحتياطية: ' + (error instanceof Error ? error.message : 'خطأ غير معروف') },
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
