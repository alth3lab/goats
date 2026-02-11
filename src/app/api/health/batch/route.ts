import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import { getUserIdFromRequest, requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_health')
    if (auth.response) return auth.response

    const body = await request.json()
    const { 
      penId, // If "all" or specific pen
      goatIds, // If specific goats selected (optional feature)
      type, 
      date, 
      description, 
      veterinarian, 
      cost,
      nextDueDate,
      moveToIsolation 
    } = body

    // 1. Determine which goats to target
    let targetGoatIds: string[] = []

    if (goatIds && goatIds.length > 0) {
      targetGoatIds = goatIds
    } else if (penId) {
       // Fetch all goats in the pen
       const goats = await prisma.goat.findMany({
         where: { penId: penId },
         select: { id: true }
       })
       targetGoatIds = goats.map(g => g.id)
    } else {
        // "All" - Fetch all active goats
        const goats = await prisma.goat.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true }
        })
        targetGoatIds = goats.map(g => g.id)
    }

    if (targetGoatIds.length === 0) {
        return NextResponse.json({ message: 'No goats found for treatment' }, { status: 400 })
    }

    // 2. Prepare Isolation logic if needed
    let isolationPenId = null
    if (moveToIsolation) {
        const isoPen = await prisma.pen.findFirst({
            where: { type: 'ISOLATION' }
        })
        if (isoPen) {
            isolationPenId = isoPen.id
        }
    }

    // 3. Transaction: Create records + Update goats
    await prisma.$transaction(async (tx) => {
        // Create Health Records
        await tx.healthRecord.createMany({
            data: targetGoatIds.map(goatId => ({
                goatId,
                type,
                date: new Date(date),
                description,
                veterinarian,
                cost: cost ? Number(cost) : null,
                nextDueDate: nextDueDate ? new Date(nextDueDate) : null
            }))
        })

        // Move to Isolation if requested
        if (moveToIsolation && isolationPenId) {
            await tx.goat.updateMany({
                where: { id: { in: targetGoatIds } },
                data: {
                    status: 'QUARANTINE',
                    penId: isolationPenId
                }
            })
        }
    })

    const userId = getUserIdFromRequest(request)
    await logActivity({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Health',
      description: `تم تسجيل علاج جماعي لعدد ${targetGoatIds.length} من الحيوانات`,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return NextResponse.json({ count: targetGoatIds.length })
  } catch (error) {
    console.error('Batch health error:', error)
    return NextResponse.json({ error: 'Failed to process batch health records' }, { status: 500 })
  }
}
