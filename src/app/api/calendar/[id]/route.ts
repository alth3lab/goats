import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const body = await request.json()
    const userId = await getUserIdFromRequest(request)

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: body
    })

    await logActivity({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'CalendarEvent',
      entityId: event.id,
      description: `تعديل حدث: ${event.title}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json(event)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث الحدث' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const { id } = await params
    const userId = await getUserIdFromRequest(request)

    const event = await prisma.calendarEvent.delete({
      where: { id }
    })

    await logActivity({
      userId: userId || undefined,
      action: 'DELETE',
      entity: 'CalendarEvent',
      entityId: event.id,
      description: `حذف حدث: ${event.title}`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الحدث' }, { status: 500 })
  }
}
