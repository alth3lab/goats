import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const logs = await prisma.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب السجل' }, { status: 500 })
  }
}
