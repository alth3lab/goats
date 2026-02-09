import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function proxy(request: NextRequest) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/socket.io/:path*', '/icon-192.png'],
}
