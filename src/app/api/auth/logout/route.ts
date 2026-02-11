import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLogger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value || undefined

  if (userId) {
    await logActivity({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      description: 'تسجيل خروج المستخدم',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('userId', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  })
  return response
}
