import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activityLogger'
import { verifyToken, TOKEN_COOKIE } from '@/lib/jwt'

export const runtime = 'nodejs'

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  return proto === 'https'
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  let userId: string | undefined

  if (token) {
    const payload = await verifyToken(token)
    userId = payload?.userId
  }

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
  response.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  })
  return response
}
