import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'
import { z } from 'zod'
import { validateBody } from '@/lib/validators/schemas'

export const runtime = 'nodejs'

const createProtocolSchema = z.object({
  name: z.string().min(1, 'اسم البروتوكول مطلوب'),
  nameAr: z.string().min(1, 'الاسم بالعربية مطلوب'),
  type: z.enum(['VACCINATION', 'DEWORMING', 'TREATMENT', 'CHECKUP', 'SURGERY']).optional(),
  ageMonths: z.number().int().min(0, 'العمر يجب أن يكون 0 أو أكثر'),
  repeatMonths: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_health')
    if (auth.response) return auth.response

    const protocols = await prisma.vaccinationProtocol.findMany({
      orderBy: [{ ageMonths: 'asc' }, { name: 'asc' }]
    })

    return NextResponse.json(protocols)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البروتوكولات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_health')
    if (auth.response) return auth.response

    const body = await request.json()
    const validation = validateBody(createProtocolSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const userId = await getUserIdFromRequest(request)
    const protocol = await prisma.vaccinationProtocol.create({
      data: validation.data as any
    })

    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'VaccinationProtocol',
      entityId: protocol.id,
      description: `إضافة بروتوكول تطعيم: ${protocol.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(protocol, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة البروتوكول' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'edit_health')
    if (auth.response) return auth.response

    const body = await request.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: 'معرف البروتوكول مطلوب' }, { status: 400 })

    const validation = validateBody(createProtocolSchema, rest)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const userId = await getUserIdFromRequest(request)
    const protocol = await prisma.vaccinationProtocol.update({
      where: { id },
      data: validation.data as any
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'VaccinationProtocol',
      entityId: protocol.id,
      description: `تحديث بروتوكول تطعيم: ${protocol.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(protocol)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث البروتوكول' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'delete_health')
    if (auth.response) return auth.response

    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'معرف البروتوكول مطلوب' }, { status: 400 })

    const userId = await getUserIdFromRequest(request)
    const protocol = await prisma.vaccinationProtocol.delete({ where: { id } })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'VaccinationProtocol',
      entityId: id,
      description: `حذف بروتوكول تطعيم: ${protocol.nameAr}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف البروتوكول' }, { status: 500 })
  }
}
