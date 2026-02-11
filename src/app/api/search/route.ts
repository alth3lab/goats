import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_search')
    if (auth.response) return auth.response

    const searchParams = request.nextUrl.searchParams
    const q = String(searchParams.get('q') || '').trim()
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '5'), 1), 20)

    if (!q) {
      return NextResponse.json({ results: [] })
    }

    const [goats, pens, types, breeds, sales, users] = await Promise.all([
      prisma.goat.findMany({
        where: {
          OR: [
            { tagId: { contains: q } },
            { name: { contains: q } }
          ]
        },
        include: { breed: { include: { type: true } } },
        take: limit
      }),
      prisma.pen.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { nameAr: { contains: q } }
          ]
        },
        take: limit
      }),
      prisma.goatType.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { nameAr: { contains: q } }
          ]
        },
        take: limit
      }),
      prisma.breed.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { nameAr: { contains: q } }
          ]
        },
        include: { type: true },
        take: limit
      }),
      prisma.sale.findMany({
        where: {
          OR: [
            { buyerName: { contains: q } },
            { buyerPhone: { contains: q } }
          ]
        },
        take: limit
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: q } },
            { username: { contains: q } },
            { email: { contains: q } }
          ]
        },
        take: limit
      })
    ])

    const results = [
      ...goats.map((goat) => ({
        type: 'goat',
        title: `${goat.tagId}${goat.name ? ` - ${goat.name}` : ''}`,
        subtitle: `${goat.breed.type.nameAr} • ${goat.breed.nameAr}`,
        href: '/dashboard/goats'
      })),
      ...pens.map((pen) => ({
        type: 'pen',
        title: pen.nameAr,
        subtitle: pen.name,
        href: '/dashboard/pens'
      })),
      ...types.map((type) => ({
        type: 'type',
        title: type.nameAr,
        subtitle: type.name,
        href: '/dashboard/types'
      })),
      ...breeds.map((breed) => ({
        type: 'breed',
        title: breed.nameAr,
        subtitle: `${breed.type.nameAr} • ${breed.name}`,
        href: '/dashboard/types'
      })),
      ...sales.map((sale) => ({
        type: 'sale',
        title: sale.buyerName,
        subtitle: sale.buyerPhone || 'بدون رقم',
        href: '/dashboard/sales'
      })),
      ...users.map((user) => ({
        type: 'user',
        title: user.fullName,
        subtitle: user.username,
        href: '/dashboard/users'
      }))
    ]

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: 'فشل في البحث' }, { status: 500 })
  }
}
