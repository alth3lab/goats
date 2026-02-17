import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const record = await prisma.breeding.findUnique({
      where: { id },
      include: {
        mother: true,
        father: true,
        births: true
      }
    })
    
    if (!record) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 })
    }
    
    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    const existing = await prisma.breeding.findUnique({
      where: { id },
      include: {
        mother: { select: { tagId: true, gender: true } },
        father: { select: { tagId: true, gender: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 })
    }

    const nextMotherId = body.motherId ?? existing.motherId
    const nextFatherId = body.fatherId ?? existing.fatherId
    const nextStatus = body.pregnancyStatus ?? existing.pregnancyStatus

    if (!nextMotherId || !nextFatherId) {
      return NextResponse.json({ error: 'يجب اختيار الأم والأب' }, { status: 400 })
    }

    if (nextMotherId === nextFatherId) {
      return NextResponse.json({ error: 'لا يمكن أن تكون الأم والأب نفس الحيوان' }, { status: 400 })
    }

    const [mother, father] = await Promise.all([
      prisma.goat.findUnique({ where: { id: nextMotherId }, select: { id: true, tagId: true, gender: true } }),
      prisma.goat.findUnique({ where: { id: nextFatherId }, select: { id: true, tagId: true, gender: true } })
    ])

    if (!mother || !father) {
      return NextResponse.json({ error: 'الأم أو الأب غير موجود' }, { status: 400 })
    }

    if (mother.gender !== 'FEMALE') {
      return NextResponse.json({ error: `الحيوان ${mother.tagId} ليس أنثى` }, { status: 400 })
    }

    if (father.gender !== 'MALE') {
      return NextResponse.json({ error: `الحيوان ${father.tagId} ليس ذكراً` }, { status: 400 })
    }

    const activeStatuses = ['MATED', 'PREGNANT'] as const
    if (activeStatuses.includes(nextStatus)) {
      const existingActive = await prisma.breeding.findFirst({
        where: {
          id: { not: id },
          motherId: nextMotherId,
          pregnancyStatus: { in: [...activeStatuses] }
        },
        include: {
          father: { select: { tagId: true } }
        },
        orderBy: { matingDate: 'desc' }
      })

      if (existingActive) {
        return NextResponse.json(
          {
            error: `لا يمكن حفظ التعديل: الأنثى ${mother.tagId} لديها سجل نشط (${existingActive.pregnancyStatus}) مع الأب ${existingActive.father.tagId}`
          },
          { status: 400 }
        )
      }
    }

    const record = await prisma.breeding.update({
      where: { id },
      data: body
    })
    
    // مزامنة تلقائية مع التقويم
    const prismaAny = prisma as any
    try {
      // 1. إذا تغير dueDate أو تمت إضافته
      if (body.dueDate !== undefined && body.dueDate !== existing.dueDate) {
        // البحث عن حدث الولادة المتوقعة الموجود باستخدام breedingId
        const existingBirthEvent = await prismaAny.calendarEvent.findFirst({
          where: {
            breedingId: id,
            eventType: 'BIRTH'
          }
        })
        
        if (body.dueDate) {
          // إذا كان هناك dueDate جديد
          if (existingBirthEvent) {
            // تحديث الحدث الموجود
            await prismaAny.calendarEvent.update({
              where: { id: existingBirthEvent.id },
              data: {
                date: body.dueDate,
                title: `ولادة متوقعة: ${existing.mother.tagId}`,
                description: `ولادة متوقعة من سجل التكاثر رقم ${record.id}`,
                isCompleted: false
              }
            })
          } else {
            // إنشاء حدث جديد
            await prismaAny.calendarEvent.create({
              data: {
                eventType: 'BIRTH',
                title: `ولادة متوقعة: ${existing.mother.tagId}`,
                description: `ولادة متوقعة من سجل التكاثر رقم ${record.id}`,
                date: body.dueDate,
                goatId: existing.motherId,
                breedingId: id,
                reminder: true,
                createdBy: userId
              }
            })
          }
        } else if (existingBirthEvent) {
          // إذا تم حذف dueDate، احذف الحدث
          await prismaAny.calendarEvent.delete({
            where: { id: existingBirthEvent.id }
          })
        }
      }
      
      // 2. إذا تغيرت الحالة إلى DELIVERED
      if (body.pregnancyStatus === 'DELIVERED' && existing.pregnancyStatus !== 'DELIVERED') {
        // البحث عن حدث الولادة المتوقعة باستخدام breedingId
        const birthEvent = await prismaAny.calendarEvent.findFirst({
          where: {
            breedingId: id,
            eventType: 'BIRTH'
          }
        })
        
        if (birthEvent) {
          // تحديث الحدث ليكون مكتمل بدلاً من حذفه
          await prismaAny.calendarEvent.update({
            where: { id: birthEvent.id },
            data: {
              isCompleted: true,
              title: `ولادة: ${existing.mother.tagId}`,
              date: body.birthDate || birthEvent.date,
              description: `ولادة فعلية من سجل التكاثر رقم ${record.id}`
            }
          })
        } else if (body.birthDate) {
          // إنشاء حدث ولادة فعلية إذا لم يكن هناك حدث متوقع
          await prismaAny.calendarEvent.create({
            data: {
              eventType: 'BIRTH',
              title: `ولادة: ${existing.mother.tagId}`,
              description: `ولادة فعلية من سجل التكاثر رقم ${record.id}`,
              date: body.birthDate,
              goatId: existing.motherId,
              breedingId: id,
              isCompleted: true,
              createdBy: userId
            }
          })
        }
      }
      
      // 3. إذا تغيرت الحالة من DELIVERED إلى شيء آخر (إعادة فتح السجل)
      if (existing.pregnancyStatus === 'DELIVERED' && body.pregnancyStatus !== 'DELIVERED') {
        const birthEvent = await prismaAny.calendarEvent.findFirst({
          where: {
            breedingId: id,
            eventType: 'BIRTH'
          }
        })
        
        if (birthEvent && birthEvent.isCompleted) {
          // إرجاع الحدث لحالة غير مكتمل
          await prismaAny.calendarEvent.update({
            where: { id: birthEvent.id },
            data: {
              isCompleted: false,
              title: `ولادة متوقعة: ${existing.mother.tagId}`,
              date: body.dueDate || birthEvent.date
            }
          })
        }
      }
    } catch (calendarError) {
      console.error('Failed to sync calendar:', calendarError)
      // لا نفشل العملية الأساسية إذا فشلت مزامنة التقويم
    }
    
    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Breeding',
      entityId: record.id,
      description: 'تم تعديل سجل التكاثر',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Breeding update error:', error)
    return NextResponse.json({ error: 'فشل في تحديث البيانات' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const userId = await getUserIdFromRequest(request)
    
    // حذف أحداث التقويم المرتبطة بسجل التكاثر قبل حذف السجل
    const prismaAny = prisma as any
    try {
      await prismaAny.calendarEvent.deleteMany({
        where: { breedingId: id }
      })
    } catch (calendarError) {
      console.error('Failed to delete calendar events:', calendarError)
      // نكمل عملية الحذف حتى لو فشل حذف أحداث التقويم
    }
    
    const record = await prisma.breeding.delete({
      where: { id }
    })
    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'Breeding',
      entityId: record.id,
      description: 'تم حذف سجل التكاثر',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف السجل' }, { status: 500 })
  }
}
