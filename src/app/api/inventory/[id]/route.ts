import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'view_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })
    }

    return NextResponse.json(item)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: body
    })

    return NextResponse.json(item)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث البيانات' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'delete_inventory')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    await prisma.inventoryItem.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الصنف' }, { status: 500 })
  }
}
