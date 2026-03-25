import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Farm-Id',
  'Access-Control-Max-Age': '86400',
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '*'

  // Handle CORS preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        ...CORS_HEADERS,
      },
    })
  }

  // Pass through and add CORS headers to response
  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', CORS_HEADERS['Access-Control-Allow-Methods'])
  response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS['Access-Control-Allow-Headers'])
  return response
}

export const config = {
  matcher: '/api/:path*',
}
