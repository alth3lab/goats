import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/admin/audit — System-wide activity log (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action') || undefined
    const entity = searchParams.get('entity') || undefined
    const tenantId = searchParams.get('tenantId') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (entity) where.entity = entity
    if (tenantId) where.tenantId = tenantId
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { entity: { contains: search } },
        { action: { contains: search } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    // Get tenant names for the logs
    const tenantIds = [...new Set(logs.map(l => l.tenantId).filter(Boolean))]
    const tenants = tenantIds.length > 0
      ? await prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, nameAr: true },
        })
      : []
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.nameAr || t.name]))

    return NextResponse.json({
      logs: logs.map(l => ({
        ...l,
        tenantName: tenantMap[l.tenantId] || '—',
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Admin audit error:', error)
    return NextResponse.json({ error: 'فشل في جلب سجل التدقيق' }, { status: 500 })
  }
}
