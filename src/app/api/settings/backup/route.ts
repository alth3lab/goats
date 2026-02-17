import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

// GET /api/settings/backup — Export full database as JSON
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_settings')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    // Fetch all tables in dependency order
    const [
      users,
      permissions,
      userPermissions,
      activityLogs,
      goatTypes,
      breeds,
      pens,
      goats,
      healthRecords,
      vaccinationProtocols,
      breedings,
      births,
      feedingRecords,
      sales,
      payments,
      expenses,
      inventoryItems,
      inventoryTransactions,
      feedTypes,
      feedStocks,
      feedingSchedules,
      dailyFeedConsumptions,
      calendarEvents,
      appSettings,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.permission.findMany(),
      prisma.userPermission.findMany(),
      prisma.activityLog.findMany(),
      prisma.goatType.findMany(),
      prisma.breed.findMany(),
      prisma.pen.findMany(),
      prisma.goat.findMany(),
      prisma.healthRecord.findMany(),
      prisma.vaccinationProtocol.findMany(),
      prisma.breeding.findMany(),
      prisma.birth.findMany(),
      prisma.feedingRecord.findMany(),
      prisma.sale.findMany(),
      prisma.payment.findMany(),
      prisma.expense.findMany(),
      prisma.inventoryItem.findMany(),
      prisma.inventoryTransaction.findMany(),
      prisma.feedType.findMany(),
      prisma.feedStock.findMany(),
      prisma.feedingSchedule.findMany(),
      prisma.dailyFeedConsumption.findMany(),
      prisma.calendarEvent.findMany(),
      prisma.appSetting.findMany(),
    ])

    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        users,
        permissions,
        userPermissions,
        activityLogs,
        goatTypes,
        breeds,
        pens,
        goats,
        healthRecords,
        vaccinationProtocols,
        breedings,
        births,
        feedingRecords,
        sales,
        payments,
        expenses,
        inventoryItems,
        inventoryTransactions,
        feedTypes,
        feedStocks,
        feedingSchedules,
        dailyFeedConsumptions,
        calendarEvents,
        appSettings,
      },
      stats: {
        users: users.length,
        permissions: permissions.length,
        userPermissions: userPermissions.length,
        activityLogs: activityLogs.length,
        goatTypes: goatTypes.length,
        breeds: breeds.length,
        pens: pens.length,
        goats: goats.length,
        healthRecords: healthRecords.length,
        vaccinationProtocols: vaccinationProtocols.length,
        breedings: breedings.length,
        births: births.length,
        feedingRecords: feedingRecords.length,
        sales: sales.length,
        payments: payments.length,
        expenses: expenses.length,
        inventoryItems: inventoryItems.length,
        inventoryTransactions: inventoryTransactions.length,
        feedTypes: feedTypes.length,
        feedStocks: feedStocks.length,
        feedingSchedules: feedingSchedules.length,
        dailyFeedConsumptions: dailyFeedConsumptions.length,
        calendarEvents: calendarEvents.length,
        appSettings: appSettings.length,
      },
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="goats-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  
    })
} catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'فشل في إنشاء النسخة الاحتياطية' }, { status: 500 })
  }
}
