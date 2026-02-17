import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

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

    // 5. إنشاء تذكيرات من بروتوكولات التطعيم النشطة
    const protocols = await prisma.vaccinationProtocol.findMany({
      where: { isActive: true }
    })

    const allActiveGoats = await prisma.goat.findMany({
      where: { status: 'ACTIVE' },
      include: {
        healthRecords: {
          orderBy: { date: 'desc' }
        }
      }
    })

    for (const protocol of protocols) {
      const protocolCreatedAt = new Date(protocol.createdAt)

      for (const goat of allActiveGoats) {
        try {
          // تحقق من الجنس
          if (protocol.gender && goat.gender !== protocol.gender) continue

          // حساب عمر الحيوان بالأشهر
          const birthDate = goat.birthDate ? new Date(goat.birthDate) : null
          if (!birthDate) continue
          const ageMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth())

          // لا يُطبق إذا الحيوان أصغر من العمر المطلوب
          if (ageMonths < protocol.ageMonths) continue

          // البحث عن آخر سجل يطابق هذا البروتوكول (بعد إنشاء البروتوكول فقط)
          const matchingRecords = goat.healthRecords.filter(r =>
            r.description && r.description.includes(protocol.nameAr)
            && new Date(r.date) >= protocolCreatedAt
          )
          const lastRecord = matchingRecords[0]

          let dueDate: Date

          if (!lastRecord) {
            // لم يتلق هذا التطعيم بعد إضافة البروتوكول - مستحق من تاريخ الإضافة أو اليوم
            dueDate = protocolCreatedAt > today ? new Date(protocolCreatedAt) : new Date(today)
          } else if (protocol.repeatMonths) {
            // حساب الموعد التالي بناءً على التكرار
            dueDate = new Date(lastRecord.date)
            dueDate.setMonth(dueDate.getMonth() + protocol.repeatMonths)
            // إذا الموعد فات، اجعله اليوم
            if (dueDate < today) dueDate = new Date(today)
          } else {
            // بروتوكول مرة واحدة وتم تنفيذه - تخطي
            continue
          }

          // فقط أحداث خلال 3 أشهر قادمة
          const threeMonthsLater = new Date(today)
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
          if (dueDate > threeMonthsLater) continue

          // التحقق من عدم وجود حدث مسبق لنفس البروتوكول والحيوان
          const eventTitle = `${protocol.nameAr}: ${goat.tagId}`
          const startOfDay = new Date(dueDate)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(dueDate)
          endOfDay.setHours(23, 59, 59, 999)

          const existingEvent = await prisma.calendarEvent.findFirst({
            where: {
              goatId: goat.id,
              title: { contains: protocol.nameAr },
              date: { gte: startOfDay, lte: endOfDay }
            }
          })

          if (!existingEvent) {
            const typeMap: Record<string, string> = {
              'VACCINATION': 'VACCINATION',
              'DEWORMING': 'DEWORMING',
              'TREATMENT': 'CHECKUP',
              'CHECKUP': 'CHECKUP',
              'SURGERY': 'CHECKUP'
            }
            await prisma.calendarEvent.create({
              data: {
                eventType: (typeMap[protocol.type] || 'CHECKUP') as any,
                title: eventTitle,
                description: protocol.medication
                  ? `${protocol.description || ''} | الدواء: ${protocol.medication}${protocol.dosage ? ' | الجرعة: ' + protocol.dosage : ''}`
                  : protocol.description || `بروتوكول: ${protocol.nameAr}`,
                date: dueDate,
                goatId: goat.id,
                reminder: true,
                reminderDays: 3,
                createdBy: userId
              }
            })
            created++
          }
        } catch (e) {
          console.error('Error creating protocol event:', protocol.name, goat.tagId, e)
          errors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء ${created} حدث بنجاح`,
      created,
      errors
    })
  
    })
} catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ 
      error: 'فشل في مزامنة الأحداث',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
