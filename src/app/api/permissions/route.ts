import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_permissions')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const permissions = await prisma.permission.findMany({
      orderBy: { category: 'asc' }
    })
    return NextResponse.json(permissions)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الصلاحيات' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_permissions')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const body = await request.json()
    const permission = await prisma.permission.create({
      data: body
    })
    return NextResponse.json(permission, { status: 201 })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة الصلاحية' }, { status: 500 })
  }
}
