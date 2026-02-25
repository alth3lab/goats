import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

/* ── GET: List all recipes ── */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const recipes = await prisma.feedRecipe.findMany({
        include: {
          items: {
            include: {
              feedType: { select: { id: true, nameAr: true, name: true, category: true } }
            },
            orderBy: { percentage: 'desc' }
          }
        },
        orderBy: { nameAr: 'asc' }
      })
      return NextResponse.json(recipes)
    })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json({ error: 'فشل في جلب الخلطات' }, { status: 500 })
  }
}

/* ── POST: Create recipe with items ── */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_feeds')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()
      const userId = await getUserIdFromRequest(request)

      // Validation
      if (!body.nameAr || body.nameAr.trim().length === 0) {
        return NextResponse.json({ error: 'اسم الخلطة بالعربية مطلوب' }, { status: 400 })
      }
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: 'يجب إضافة مكون واحد على الأقل' }, { status: 400 })
      }

      // Validate percentages sum to 100
      const totalPct = body.items.reduce((s: number, i: any) => s + (Number(i.percentage) || 0), 0)
      if (Math.abs(totalPct - 100) > 0.1) {
        return NextResponse.json({ error: `مجموع النسب يجب أن يساوي 100% (الحالي: ${totalPct.toFixed(1)}%)` }, { status: 400 })
      }

      // Validate no duplicate feedTypeIds
      const feedTypeIds = body.items.map((i: any) => i.feedTypeId)
      if (new Set(feedTypeIds).size !== feedTypeIds.length) {
        return NextResponse.json({ error: 'لا يمكن تكرار نوع العلف في نفس الخلطة' }, { status: 400 })
      }

      // Verify all feedTypes exist
      const existingTypes = await prisma.feedType.findMany({
        where: { id: { in: feedTypeIds } },
        select: { id: true }
      })
      if (existingTypes.length !== feedTypeIds.length) {
        return NextResponse.json({ error: 'أحد أنواع الأعلاف غير موجود' }, { status: 400 })
      }

      const recipe = await prisma.feedRecipe.create({
        data: {
          name: body.nameEn || body.nameAr,
          nameAr: body.nameAr.trim(),
          description: body.description || null,
          isActive: body.isActive !== false,
          items: {
            create: body.items.map((item: any) => ({
              feedTypeId: item.feedTypeId,
              percentage: Number(item.percentage),
              notes: item.notes || null
            }))
          }
        },
        include: {
          items: {
            include: { feedType: { select: { id: true, nameAr: true, name: true, category: true } } },
            orderBy: { percentage: 'desc' }
          }
        }
      })

      await logActivity({
        userId: userId || undefined,
        action: 'CREATE',
        entity: 'FeedRecipe',
        entityId: recipe.id,
        description: `إنشاء خلطة علف: ${recipe.nameAr} (${body.items.length} مكونات)`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(recipe, { status: 201 })
    })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json({ error: 'فشل في إنشاء الخلطة' }, { status: 500 })
  }
}
