import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'edit_goat')
    if (auth.response) return auth.response

    const body = await request.json()
    const { goatIds, penId } = body

    if (!goatIds || !Array.isArray(goatIds)) {
      return NextResponse.json({ error: 'Invalid goat IDs' }, { status: 400 })
    }

    // التحقق من سعة الحظيرة قبل النقل إذا تم اختيار حظيرة
    if (penId) {
      const pen = await prisma.pen.findUnique({
        where: { id: penId },
        include: { _count: { select: { goats: true } } }
      })

      if (pen && pen.capacity) {
        const currentCount = pen._count.goats
        const newCount = currentCount + goatIds.length
        if (newCount > pen.capacity) {
           return NextResponse.json({ 
             error: `لا يمكن النقل: الحظيرة ستمتلئ! السعة المتاحة: ${pen.capacity - currentCount}، العدد المطلوب نقله: ${goatIds.length}` 
           }, { status: 400 })
        }
      }
    }

    await prisma.goat.updateMany({
      where: {
        id: { in: goatIds }
      },
      data: {
        penId: penId || null
      }
    })

    return NextResponse.json({ message: 'Updated successfully' })
  } catch (error) {
    console.error('Batch update error:', error)
    return NextResponse.json({ error: 'Failed to update goats' }, { status: 500 })
  }
}
