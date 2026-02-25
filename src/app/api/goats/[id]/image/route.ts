import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getUserIdFromRequest } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

// Max ~2MB base64 payload per image
const MAX_BASE64_LENGTH = 2_800_000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params
      const body = await request.json()
      const { image, thumbnail } = body as { image?: string; thumbnail?: string }

      if (!image || !thumbnail) {
        return NextResponse.json({ error: 'الصورة والصورة المصغرة مطلوبتان' }, { status: 400 })
      }

      // Validate base64 data URL format
      const dataUrlRegex = /^data:image\/(jpeg|png|webp);base64,/
      if (!dataUrlRegex.test(image) || !dataUrlRegex.test(thumbnail)) {
        return NextResponse.json({ error: 'صيغة الصورة غير صحيحة' }, { status: 400 })
      }

      // Size check
      if (image.length > MAX_BASE64_LENGTH || thumbnail.length > MAX_BASE64_LENGTH) {
        return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)' }, { status: 400 })
      }

      // Verify goat exists
      const existing = await prisma.goat.findUnique({ where: { id }, select: { id: true, tagId: true } })
      if (!existing) {
        return NextResponse.json({ error: 'الحيوان غير موجود' }, { status: 404 })
      }

      const goat = await prisma.goat.update({
        where: { id },
        data: { image, thumbnail },
        select: { id: true, tagId: true, thumbnail: true }
      })

      const userId = await getUserIdFromRequest(request)
      await logActivity({
        userId: userId || undefined,
        action: 'UPDATE',
        entity: 'Goat',
        entityId: goat.id,
        description: `تم رفع صورة: ${goat.tagId}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json({ success: true, thumbnail: goat.thumbnail })
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ error: 'فشل في رفع الصورة' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'edit_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const { id } = await params

      const existing = await prisma.goat.findUnique({ where: { id }, select: { id: true, tagId: true } })
      if (!existing) {
        return NextResponse.json({ error: 'الحيوان غير موجود' }, { status: 404 })
      }

      await prisma.goat.update({
        where: { id },
        data: { image: null, thumbnail: null }
      })

      const userId = await getUserIdFromRequest(request)
      await logActivity({
        userId: userId || undefined,
        action: 'UPDATE',
        entity: 'Goat',
        entityId: existing.id,
        description: `تم حذف صورة: ${existing.tagId}`,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json({ success: true })
    })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الصورة' }, { status: 500 })
  }
}
