import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, TOKEN_COOKIE } from '@/lib/jwt'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/register', '/terms', '/privacy', '/forgot-password', '/reset-password', '/api/auth/login', '/api/auth/logout', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password']

// Static file extensions to skip
const STATIC_EXTENSIONS = /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|map)$/

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle socket.io requests
  if (pathname.startsWith('/socket.io')) {
    return NextResponse.json(
      { error: 'Socket.IO not configured' },
      { status: 404 }
    )
  }

  // Handle icon-192.png requests
  if (pathname === '/icon-192.png') {
    // Return a simple 1x1 transparent PNG
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    STATIC_EXTENSIONS.test(pathname) ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Check for session token
  const token = request.cookies.get(TOKEN_COOKIE)?.value

  if (!token) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    // Page routes redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify JWT
  const payload = await verifyToken(token)
  if (!payload) {
    // Token is invalid or expired
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'انتهت صلاحية الجلسة' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))

    // Clear the invalid cookie
    response.cookies.set(TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
