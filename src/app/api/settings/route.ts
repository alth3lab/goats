import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Settings endpoint' }, { status: 200 })
}
