import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getUserIdFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const userId = await getUserIdFromRequest(request)
    let created = 0
    let errors = 0
    const today = new Date()

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
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            eventType: 'BIRTH',
            goatId: record.motherId,
            date: record.dueDate || undefined
          }
        })

        if (!existingEvent && record.dueDate) {
          await prisma.calendarEvent.create({
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
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            eventType: 'BIRTH',
            goatId: record.motherId,
            date: record.birthDate || undefined,
            isCompleted: true
          }
        })

        if (!existingEvent && record.birthDate) {
          await prisma.calendarEvent.create({
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
        let eventType = 'CHECKUP'
        if (record.type === 'VACCINATION') eventType = 'VACCINATION'
        if (record.type === 'DEWORMING') eventType = 'DEWORMING'
        
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            eventType: eventType as any,
            goatId: record.goatId,
            date: record.nextDueDate || undefined
          }
        })

        if (!existingEvent && record.nextDueDate) {
          const typeLabel = record.type === 'VACCINATION' ? 'تطعيم' : record.type === 'DEWORMING' ? 'تقليل ديدان' : 'فحص'
          await prisma.calendarEvent.create({
            data: {
              eventType: eventType as any,
              title: `${typeLabel} قادم: ${record.goat.tagId}`,
              description: `موعد ${typeLabel} التالي`,
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

    // 4. مزامنة الفطام - بعد 3 أشهر من الولادة
    const recentBirths = await prisma.breeding.findMany({
      where: {
        birthDate: {
          not: null,
          gte: new Date(today.getFullYear(), today.getMonth() - 4, 1)
        },
        pregnancyStatus: 'DELIVERED'
      },
      include: { mother: true, births: true }
    })

    for (const record of recentBirths) {
      if (!record.birthDate) continue
      try {
        const weaningDate = new Date(record.birthDate)
        weaningDate.setMonth(weaningDate.getMonth() + 3)

        if (weaningDate > today) {
          const existingEvent = await prisma.calendarEvent.findFirst({
            where: {
              eventType: 'WEANING',
              breedingId: record.id,
              date: { gte: new Date(weaningDate.setHours(0, 0, 0, 0)), lte: new Date(weaningDate.setHours(23, 59, 59, 999)) }
            }
          })

          if (!existingEvent) {
            await prisma.calendarEvent.create({
              data: {
                eventType: 'WEANING',
                title: `موعد فطام: ${record.births.length} ${record.births.length === 1 ? 'صغير' : 'صغار'}`,
                description: `فطام مواليد الأم ${record.mother.tagId}`,
                date: weaningDate,
                breedingId: record.id,
                reminder: true,
                reminderDays: 7,
                createdBy: userId
              }
            })
            created++
          }
        }
      } catch (e) {
        console.error('Error creating weaning event:', record.id, e)
        errors++
      }
    }

    // 5. إنشاء تذكيرات تطعيم دوري للماعز النشط
    const activeGoats = await prisma.goat.findMany({
      where: { status: 'ACTIVE' },
      include: {
        healthRecords: {
          where: { type: 'VACCINATION' },
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    })

    for (const goat of activeGoats) {
      try {
        const lastVaccination = goat.healthRecords[0]
        if (!lastVaccination) continue

        const nextVaccinationDate = new Date(lastVaccination.date)
        nextVaccinationDate.setMonth(nextVaccinationDate.getMonth() + 6)

        if (nextVaccinationDate > today && nextVaccinationDate < new Date(today.getFullYear(), today.getMonth() + 3, 1)) {
          const existingEvent = await prisma.calendarEvent.findFirst({
            where: {
              eventType: 'VACCINATION',
              goatId: goat.id,
              date: { gte: new Date(nextVaccinationDate.setHours(0, 0, 0, 0)), lte: new Date(nextVaccinationDate.setHours(23, 59, 59, 999)) }
            }
          })

          if (!existingEvent) {
            await prisma.calendarEvent.create({
              data: {
                eventType: 'VACCINATION',
                title: `تطعيم دوري: ${goat.tagId}`,
                description: 'موعد التطعيم الدوري (كل 6 أشهر)',
                date: nextVaccinationDate,
                goatId: goat.id,
                reminder: true,
                reminderDays: 3,
                createdBy: userId
              }
            })
            created++
          }
        }
      } catch (e) {
        console.error('Error creating vaccination reminder:', goat.id, e)
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
