import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordBirth } from '@/lib/services/birthService'
import { recordBirthSchema } from '@/lib/validators/birth'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = recordBirthSchema.parse(await request.json())

    const results = await recordBirth(prisma, {
      breedingId: id,
      birthDate: new Date(body.birthDate),
      kids: body.kids.map((kid) => ({
        tagId: kid.tagId,
        gender: kid.gender,
        weight: kid.weight,
        status: kid.status,
        notes: kid.notes
      }))
    })

    return NextResponse.json({ created: results }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تسجيل الولادة' }, { status: 500 })
  }
}
