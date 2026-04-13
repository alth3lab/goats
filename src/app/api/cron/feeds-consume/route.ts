import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function extractSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null
  return request.headers.get('x-cron-secret') || bearer
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.FEEDS_CRON_SECRET || process.env.CRON_SECRET
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Cron secret is not configured' }, { status: 500 })
    }

    const providedSecret = extractSecret(request)
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const farms = await prisma.farm.findMany({
      where: {
        isActive: true,
        tenant: { isActive: true },
      },
      select: { id: true, tenantId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (farms.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active farms found',
        farmsProcessed: 0,
        succeeded: 0,
        failed: 0,
        results: [],
      })
    }

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin)

    const today = new Date().toISOString().slice(0, 10)
    const results: Array<{
      farmId: string
      tenantId: string
      ok: boolean
      status: number
      message: string
      executedDates?: number
      skippedDates?: number
    }> = []

    for (const farm of farms) {
      const url = `${baseUrl}/api/feeds/consume?tenantId=${encodeURIComponent(farm.tenantId)}&farmId=${encodeURIComponent(farm.id)}`
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cron-secret': expectedSecret,
          },
          body: JSON.stringify({ auto: true, date: today }),
          cache: 'no-store',
        })

        const data = await response.json().catch(() => ({}))
        results.push({
          farmId: farm.id,
          tenantId: farm.tenantId,
          ok: response.ok,
          status: response.status,
          message: response.ok ? (data.message || 'ok') : (data.error || 'consume failed'),
          executedDates: Array.isArray(data.executedDates) ? data.executedDates.length : undefined,
          skippedDates: Array.isArray(data.skippedDates) ? data.skippedDates.length : undefined,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'request failed'
        results.push({
          farmId: farm.id,
          tenantId: farm.tenantId,
          ok: false,
          status: 500,
          message,
        })
      }
    }

    const succeeded = results.filter(r => r.ok).length
    const failed = results.length - succeeded

    return NextResponse.json({
      success: failed === 0,
      farmsProcessed: farms.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('feeds cron execution failed:', error)
    return NextResponse.json({ error: 'Cron execution failed' }, { status: 500 })
  }
}
