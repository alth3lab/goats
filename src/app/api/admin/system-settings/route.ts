import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

const DEFAULT_SETTINGS: Record<string, string> = {
  registration_enabled: 'true',
  maintenance_mode: 'false',
  maintenance_message: '',
  trial_days: '14',
  max_free_goats: '50',
  max_free_farms: '1',
  max_free_users: '2',
  platform_name: 'منصة إدارة المواشي',
  platform_name_en: 'Livestock Management Platform',
}

// GET /api/admin/system-settings — Get all system settings (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const settings = await prisma.systemSetting.findMany()
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }

    for (const s of settings) {
      settingsMap[s.key] = s.value
    }

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('System settings error:', error)
    return NextResponse.json({ error: 'فشل في جلب إعدادات النظام' }, { status: 500 })
  }
}

// PUT /api/admin/system-settings — Update system settings (SUPER_ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const body = await request.json()

    // Only allow known keys
    const allowedKeys = Object.keys(DEFAULT_SETTINGS)
    const updates: { key: string; value: string }[] = []

    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key) && typeof value === 'string') {
        updates.push({ key, value })
      }
    }

    // Upsert each setting
    for (const { key, value } of updates) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    await logActivity({
      userId: auth.user.id,
      action: 'UPDATE',
      entity: 'SystemSetting',
      description: `تعديل إعدادات النظام: ${updates.map(u => u.key).join(', ')}`,
    })

    // Return updated settings
    const settings = await prisma.systemSetting.findMany()
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    for (const s of settings) {
      settingsMap[s.key] = s.value
    }

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('System settings update error:', error)
    return NextResponse.json({ error: 'فشل في حفظ إعدادات النظام' }, { status: 500 })
  }
}
