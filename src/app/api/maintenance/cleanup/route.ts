import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * Cleanup old data - حذف البيانات القديمة والمؤقتة
 * يحذف:
 * - سجلات النشاط الأقدم من 6 أشهر
 * - أحداث التقويم المكتملة الأقدم من 3 أشهر
 * - الماعز بـ TEMP tagIds الأقدم من شهر
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_permissions')
    if (auth.response) return auth.response

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const results = await prisma.$transaction(async (tx) => {
      // حذف سجلات النشاط القديمة
      const deletedActivityLogs = await tx.activityLog.deleteMany({
        where: {
          createdAt: { lt: sixMonthsAgo }
        }
      })

      // حذف أحداث التقويم المكتملة القديمة
      const deletedCalendarEvents = await tx.calendarEvent.deleteMany({
        where: {
          isCompleted: true,
          date: { lt: threeMonthsAgo }
        }
      })

      // حذف الماعز المؤقت (TEMP tagIds) القديم
      const deletedTempGoats = await tx.goat.deleteMany({
        where: {
          tagId: { startsWith: 'TEMP-' },
          createdAt: { lt: oneMonthAgo }
        }
      })

      return {
        deletedActivityLogs: deletedActivityLogs.count,
        deletedCalendarEvents: deletedCalendarEvents.count,
        deletedTempGoats: deletedTempGoats.count
      }
    })

    return NextResponse.json({
      message: 'تم تنظيف البيانات بنجاح',
      results
    })
  } catch (error) {
    console.error('Error in cleanup:', error)
    return NextResponse.json({ error: 'فشل في تنظيف البيانات' }, { status: 500 })
  }
}
