import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

const defaultSettings = {
  farmName: 'مزرعة سهيل',
  phone: '',
  address: '',
  currency: 'درهم',
  notifications: true,
  alertPenCapacityPercent: 90,
  alertDeathCount: 3,
  alertDeathWindowDays: 30,
  alertBreedingOverdueDays: 150
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_settings')
    if (auth.response) return auth.response

    const prismaAny = prisma as any
    const settings = await prismaAny.appSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', ...defaultSettings }
    })
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الإعدادات' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_settings')
    if (auth.response) return auth.response

    const body = await request.json()
    const prismaAny = prisma as any
    const settings = await prismaAny.appSetting.upsert({
      where: { id: 'default' },
      update: body,
      create: { id: 'default', ...defaultSettings, ...body }
    })
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 })
  }
}
