import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordBirth } from '@/lib/services/birthService'
import { recordBirthSchema } from '@/lib/validators/birth'
import { requirePermission } from '@/lib/auth'
import { ZodError } from 'zod'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_breeding')
    if (auth.response) return auth.response

    const { id } = await params
    const bodyData = await request.json()
    const body = recordBirthSchema.parse(bodyData)

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
    console.error('Birth recording error:', error)
    
    if (error instanceof ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: `بيانات غير صحيحة: ${messages}` }, { status: 400 })
    }
    
    const message = error instanceof Error ? error.message : 'فشل في تسجيل الولادة'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
