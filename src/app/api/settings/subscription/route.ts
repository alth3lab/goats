import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

// Plan details
const PLANS = {
  FREE: {
    name: 'مجاني',
    nameEn: 'Free',
    maxFarms: 1,
    maxGoats: 50,
    maxUsers: 2,
    price: 0,
    features: ['مزرعة واحدة', 'حتى 50 رأس', 'مستخدمان', 'تقارير أساسية'],
  },
  BASIC: {
    name: 'أساسي',
    nameEn: 'Basic',
    maxFarms: 3,
    maxGoats: 500,
    maxUsers: 5,
    price: 49,
    features: ['3 مزارع', 'حتى 500 رأس', '5 مستخدمين', 'تقارير متقدمة', 'نسخ احتياطي'],
  },
  PRO: {
    name: 'احترافي',
    nameEn: 'Pro',
    maxFarms: 10,
    maxGoats: 5000,
    maxUsers: 20,
    price: 149,
    features: ['10 مزارع', 'حتى 5000 رأس', '20 مستخدم', 'تقارير شاملة', 'دعم أولوية', 'API'],
  },
  ENTERPRISE: {
    name: 'مؤسسي',
    nameEn: 'Enterprise',
    maxFarms: 999,
    maxGoats: 99999,
    maxUsers: 999,
    price: -1, // Custom pricing
    features: ['مزارع غير محدودة', 'ماعز غير محدود', 'مستخدمين غير محدودين', 'دعم مخصص', 'تكامل كامل'],
  },
}

// GET /api/settings/subscription — Get current tenant subscription info
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { farms: true, users: true } },
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    // Count goats across all tenant farms
    const goatCount = await prisma.goat.count({
      where: { farm: { tenantId: auth.tenantId } },
    })

    const currentPlan = PLANS[tenant.plan as keyof typeof PLANS] || PLANS.FREE

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        maxFarms: tenant.maxFarms,
        maxGoats: tenant.maxGoats,
        maxUsers: tenant.maxUsers,
        trialEndsAt: tenant.trialEndsAt,
        createdAt: tenant.createdAt,
      },
      usage: {
        farms: tenant._count.farms,
        users: tenant._count.users,
        goats: goatCount,
      },
      limits: {
        farms: tenant.maxFarms,
        users: tenant.maxUsers,
        goats: tenant.maxGoats,
      },
      currentPlan,
      plans: PLANS,
      subscriptions: tenant.subscriptions,
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: 'فشل في جلب بيانات الاشتراك' }, { status: 500 })
  }
}

// POST /api/settings/subscription — Upgrade plan (manual for now, Stripe later)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (!['SUPER_ADMIN', 'OWNER'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'فقط المالك يمكنه ترقية الخطة' }, { status: 403 })
    }

    const body = await request.json()
    const { plan } = body

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: 'خطة غير صالحة' }, { status: 400 })
    }

    const planDetails = PLANS[plan as keyof typeof PLANS]

    // Update tenant limits
    await prisma.tenant.update({
      where: { id: auth.tenantId },
      data: {
        plan: plan as any,
        maxFarms: planDetails.maxFarms,
        maxGoats: planDetails.maxGoats,
        maxUsers: planDetails.maxUsers,
      },
    })

    // Create subscription record
    await prisma.subscription.create({
      data: {
        tenantId: auth.tenantId,
        plan: plan as any,
        status: 'ACTIVE',
        startDate: new Date(),
        amount: planDetails.price > 0 ? planDetails.price : 0,
        currency: 'AED',
        notes: `ترقية للخطة ${planDetails.name}`,
      },
    })

    return NextResponse.json({
      message: `تم الترقية للخطة ${planDetails.name} بنجاح`,
      plan: planDetails,
    })
  } catch (error) {
    console.error('Upgrade error:', error)
    return NextResponse.json({ error: 'فشل في ترقية الخطة' }, { status: 500 })
  }
}
