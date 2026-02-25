import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

/* ── GET: Single recipe ── */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    const { id } = await params
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const recipe = await prisma.feedRecipe.findUnique({
        where: { id },
        include: {
          items: {
            include: { feedType: { select: { id: true, nameAr: true, name: true, category: true } } },
            orderBy: { percentage: 'desc' }
          },
          schedules: {
            include: { pen: { select: { nameAr: true } }, goat: { select: { tagId: true, name: true } } }
          }
        }
      })
      if (!recipe) return NextResponse.json({ error: 'الخلطة غير موجودة' }, { status: 404 })
      return NextResponse.json(recipe)
    })
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json({ error: 'فشل في جلب الخلطة' }, { status: 500 })
  }
}

/* ── PUT: Update recipe ── */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    const { id } = await params
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()
      const userId = await getUserIdFromRequest(request)

      const existing = await prisma.feedRecipe.findUnique({ where: { id } })
      if (!existing) return NextResponse.json({ error: 'الخلطة غير موجودة' }, { status: 404 })

      if (!body.nameAr || body.nameAr.trim().length === 0) {
        return NextResponse.json({ error: 'اسم الخلطة بالعربية مطلوب' }, { status: 400 })
      }

      // If items are provided, validate them
      if (Array.isArray(body.items)) {
        if (body.items.length === 0) {
          return NextResponse.json({ error: 'يجب إضافة مكون واحد على الأقل' }, { status: 400 })
        }
        const totalPct = body.items.reduce((s: number, i: any) => s + (Number(i.percentage) || 0), 0)
        if (Math.abs(totalPct - 100) > 0.1) {
          return NextResponse.json({ error: `مجموع النسب يجب أن يساوي 100% (الحالي: ${totalPct.toFixed(1)}%)` }, { status: 400 })
        }
        const feedTypeIds = body.items.map((i: any) => i.feedTypeId)
        if (new Set(feedTypeIds).size !== feedTypeIds.length) {
          return NextResponse.json({ error: 'لا يمكن تكرار نوع العلف في نفس الخلطة' }, { status: 400 })
        }
      }

      // Transaction: update recipe + replace items if provided
      const recipe = await prisma.$transaction(async (tx) => {
        const updated = await tx.feedRecipe.update({
          where: { id },
          data: {
            name: body.nameEn || body.nameAr,
            nameAr: body.nameAr.trim(),
            description: body.description ?? existing.description,
            isActive: body.isActive !== undefined ? body.isActive : existing.isActive
          }
        })

        if (Array.isArray(body.items)) {
          // Delete old items and recreate
          await tx.feedRecipeItem.deleteMany({ where: { recipeId: id } })
          await Promise.all(
            body.items.map((item: any) =>
              tx.feedRecipeItem.create({
                data: {
                  recipeId: id,
                  feedTypeId: item.feedTypeId,
                  percentage: Number(item.percentage),
                  notes: item.notes || null
                }
              })
            )
          )
        }

        return tx.feedRecipe.findUnique({
          where: { id },
          include: {
            items: {
              include: { feedType: { select: { id: true, nameAr: true, name: true, category: true } } },
              orderBy: { percentage: 'desc' }
            }
          }
        })
      })

      await logActivity({
        userId: userId || undefined,
        action: 'UPDATE',
        entity: 'FeedRecipe',
        entityId: id,
        description: `تعديل خلطة علف: ${body.nameAr}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(recipe)
    })
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json({ error: 'فشل في تعديل الخلطة' }, { status: 500 })
  }
}

/* ── DELETE: Delete recipe ── */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    const { id } = await params
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const userId = await getUserIdFromRequest(request)

      const existing = await prisma.feedRecipe.findUnique({
        where: { id },
        include: { schedules: { select: { id: true } } }
      })
      if (!existing) return NextResponse.json({ error: 'الخلطة غير موجودة' }, { status: 404 })

      if (existing.schedules.length > 0) {
        return NextResponse.json({
          error: `لا يمكن حذف الخلطة لأنها مستخدمة في ${existing.schedules.length} جدول تغذية`
        }, { status: 400 })
      }

      await prisma.feedRecipe.delete({ where: { id } })

      await logActivity({
        userId: userId || undefined,
        action: 'DELETE',
        entity: 'FeedRecipe',
        entityId: id,
        description: `حذف خلطة علف: ${existing.nameAr}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json({ success: true })
    })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json({ error: 'فشل في حذف الخلطة' }, { status: 500 })
  }
}
