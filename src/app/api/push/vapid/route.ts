import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET — Return the VAPID public key for push subscription
 * This is a public endpoint (no auth needed) since the key is public
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })
  }

  return NextResponse.json({ publicKey })
}
