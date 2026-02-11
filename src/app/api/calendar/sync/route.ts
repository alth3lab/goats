import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getUserIdFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const userId = getUserIdFromRequest(request)
    const prismaAny = prisma as any
    let created = 0
    let errors = 0

    // 1. مزامنة الولادات المتوقعة من سجلات التكاثر
    const breedingRecords = await prisma.breeding.findMany({
      where: {
        dueDate: { not: null },
        pregnancyStatus: { in: ['PREGNANT', 'MATED'] }
      },
      include: {
        mother: true,
        father: true
      }
    })

    for (const record of breedingRecords) {
      try {
        // التحقق من عدم وجود حدث مسبق
        const existingEvent = await prismaAny.calendarEvent.findFirst({
          where: {
            eventType: 'BIRTH',
            goatId: record.motherId,
            date: record.dueDate
          }
        })

        if (!existingEvent) {
          await prismaAny.calendarEvent.create({
            data: {
              eventType: 'BIRTH',
              title: `ولادة متوقعة: ${record.mother.tagId}`,
              description: `ولادة متوقعة من سجل التكاثر رقم ${record.id}`,
              date: record.dueDate,
              goatId: record.motherId,
              reminder: true,
              createdBy: userId
            }
          })
          created++
        }
      } catch (e) {
        console.error('Error creating event for breeding:', record.id, e)
        errors++
      }
    }

    // 2. مزامنة الولادات الفعلية
    const completedBreeding = await prisma.breeding.findMany({
      where: {
        birthDate: { not: null },
        pregnancyStatus: 'DELIVERED'
      },
      include: {
        mother: true
      }
    })

    for (const record of completedBreeding) {
      try {
        const existingEvent = await prismaAny.calendarEvent.findFirst({
          where: {
            eventType: 'BIRTH',
            goatId: record.motherId,
            date: record.birthDate,
            isCompleted: true
          }
        })

        if (!existingEvent && record.birthDate) {
          await prismaAny.calendarEvent.create({
            data: {
              eventType: 'BIRTH',
              title: `ولادة: ${record.mother.tagId}`,
              description: `ولادة فعلية من سجل التكاثر رقم ${record.id}`,
              date: record.birthDate,
              goatId: record.motherId,
              isCompleted: true,
              createdBy: userId
            }
          })
          created++
        }
      } catch (e) {
        console.error('Error creating event for completed breeding:', record.id, e)
        errors++
      }
    }

    // 3. مزامنة السجلات الصحية القادمة
    const healthRecords = await prisma.healthRecord.findMany({
      where: {
        nextDueDate: {
          not: null,
          gte: new Date()
        }
      },
      include: {
        goat: true
      }
    })

    for (const record of healthRecords) {
      try {
        const eventType = record.type === 'VACCINATION' ? 'VACCINATION' : 'CHECKUP'
        const existingEvent = await prismaAny.calendarEvent.findFirst({
          where: {
            eventType,
            goatId: record.goatId,
            date: record.nextDueDate
          }
        })

        if (!existingEvent && record.nextDueDate) {
          await prismaAny.calendarEvent.create({
            data: {
              eventType,
              title: `${record.type === 'VACCINATION' ? 'تطعيم قادم' : 'فحص قادم'}: ${record.goat.tagId}`,
              description: `موعد ${record.type === 'VACCINATION' ? 'التطعيم' : 'الفحص'} التالي`,
              date: record.nextDueDate,
              goatId: record.goatId,
              reminder: true,
              createdBy: userId
            }
          })
          created++
        }
      } catch (e) {
        console.error('Error creating event for health record:', record.id, e)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء ${created} حدث بنجاح`,
      created,
      errors
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ 
      error: 'فشل في مزامنة الأحداث',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
