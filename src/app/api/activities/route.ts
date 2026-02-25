import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_activities')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const entity = searchParams.get('entity')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const format = searchParams.get('format')
    const limit = Number(searchParams.get('limit') || '50')
    const page = Number(searchParams.get('page') || '1')
    const entityId = searchParams.get('entityId')

    const createdAt: { gte?: Date; lte?: Date } = {}
    if (from) createdAt.gte = new Date(from)
    if (to) createdAt.lte = new Date(to)

    const where: any = {
      ...(action && action !== 'ALL' ? { action } : {}),
      ...(entity && entity !== 'ALL' ? { entity } : {}),
      ...(userId && userId !== 'ALL' ? { userId } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(entityId ? { entityId } : {})
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { entity: { contains: search } },
        { action: { contains: search } },
        { user: { fullName: { contains: search } } },
        { user: { username: { contains: search } } }
      ]
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 50,
      skip: Number.isFinite(page) ? Math.max(page - 1, 0) * limit : 0
    })

    if (format === 'csv') {
      const header = ['date', 'userFullName', 'username', 'action', 'entity', 'description']
      const rows = logs.map((log) => [
        log.createdAt.toISOString(),
        log.user?.fullName || '',
        log.user?.username || '',
        log.action || '',
        log.entity || '',
        log.description || ''
      ])

      const csv = [header.join(','), ...rows.map((row) => row.map(toCsvValue).join(','))].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="activity-log.csv"'
        }
      })
    }

    return NextResponse.json(logs)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب السجل' }, { status: 500 })
  }
}
