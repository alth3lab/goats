import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const goatId = searchParams.get('goatId')
    
    const records = await prisma.healthRecord.findMany({
      where: goatId ? { goatId } : undefined,
      include: { goat: true },
      orderBy: { date: 'desc' }
    })
    
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب السجلات الصحية' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { goatId, type, date, description, veterinarian, cost, nextDueDate, moveToIsolation } = body

    // Transaction to handle record creation + potential isolation
    const result = await prisma.$transaction(async (tx) => {
        const record = await tx.healthRecord.create({
            data: {
                goatId,
                type,
                date: new Date(date),
                description,
                veterinarian,
                cost: cost ? Number(cost) : null,
                nextDueDate: nextDueDate ? new Date(nextDueDate) : null
            },
            include: { goat: true }
        })

        if (moveToIsolation) {
            const isoPen = await tx.pen.findFirst({
                where: { type: 'ISOLATION' }
            })
            
            if (isoPen) {
                await tx.goat.update({
                    where: { id: goatId },
                    data: {
                        status: 'QUARANTINE',
                        penId: isoPen.id
                    }
                })
            }
        }
        return record
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة السجل الصحي' }, { status: 500 })
  }
}
