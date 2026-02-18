import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

// Plan details with ordering for upgrade/downgrade detection
const PLAN_ORDER = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const

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

// Trial period in days for new registrations
const TRIAL_DAYS = 14

// Helper: check if subscription/trial is expired
function checkSubscriptionStatus(tenant: { plan: string; trialEndsAt: Date | null; isActive: boolean }) {
  if (!tenant.isActive) {
    return { active: false, reason: 'الحساب معطل. تواصل مع الإدارة.' }
  }
  if (tenant.plan === 'FREE' && tenant.trialEndsAt) {
    const now = new Date()
    if (now > tenant.trialEndsAt) {
      return { active: true, trialExpired: true, reason: 'انتهت الفترة التجريبية. قم بالترقية للاستمرار بجميع الميزات.' }
    }
  }
  return { active: true, trialExpired: false, reason: null }
}

// GET /api/settings/subscription — Get current tenant subscription info
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    // Only OWNER/SUPER_ADMIN can view subscription details
    if (!['SUPER_ADMIN', 'OWNER'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 10 },
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
    const subStatus = checkSubscriptionStatus(tenant)

    // Check active subscription expiry
    const activeSubscription = tenant.subscriptions.find(s => s.status === 'ACTIVE')
    let subscriptionExpired = false
    if (activeSubscription?.endDate && new Date() > activeSubscription.endDate) {
      subscriptionExpired = true
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        maxFarms: tenant.maxFarms,
        maxGoats: tenant.maxGoats,
        maxUsers: tenant.maxUsers,
        trialEndsAt: tenant.trialEndsAt,
        isActive: tenant.isActive,
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
      status: {
        ...subStatus,
        subscriptionExpired,
        trialDaysLeft: tenant.trialEndsAt
          ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
      },
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: 'فشل في جلب بيانات الاشتراك' }, { status: 500 })
  }
}

// POST /api/settings/subscription — Upgrade/downgrade plan
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (!['SUPER_ADMIN', 'OWNER'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'فقط المالك يمكنه تغيير الخطة' }, { status: 403 })
    }

    const body = await request.json()
    const { plan } = body

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: 'خطة غير صالحة' }, { status: 400 })
    }

    if (plan === 'ENTERPRISE') {
      return NextResponse.json({ error: 'الخطة المؤسسية تتطلب التواصل مع الإدارة' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    const currentIndex = PLAN_ORDER.indexOf(tenant.plan as typeof PLAN_ORDER[number])
    const targetIndex = PLAN_ORDER.indexOf(plan as typeof PLAN_ORDER[number])
    const planDetails = PLANS[plan as keyof typeof PLANS]

    // Same plan
    if (tenant.plan === plan) {
      return NextResponse.json({ error: 'أنت بالفعل على هذه الخطة' }, { status: 400 })
    }

    // Downgrade: check if current usage exceeds target plan limits
    if (targetIndex < currentIndex) {
      const [goatCount, farmCount, userCount] = await Promise.all([
        prisma.goat.count({ where: { farm: { tenantId: auth.tenantId } } }),
        prisma.farm.count({ where: { tenantId: auth.tenantId } }),
        prisma.user.count({ where: { tenantId: auth.tenantId, role: { not: 'SUPER_ADMIN' } } }),
      ])

      const violations: string[] = []
      if (goatCount > planDetails.maxGoats) {
        violations.push(`لديك ${goatCount} رأس ماعز والحد الأقصى للخطة ${planDetails.maxGoats}`)
      }
      if (farmCount > planDetails.maxFarms) {
        violations.push(`لديك ${farmCount} مزارع والحد الأقصى للخطة ${planDetails.maxFarms}`)
      }
      if (userCount > planDetails.maxUsers) {
        violations.push(`لديك ${userCount} مستخدمين والحد الأقصى للخطة ${planDetails.maxUsers}`)
      }

      if (violations.length > 0) {
        return NextResponse.json({
          error: 'لا يمكن تخفيض الخطة: ' + violations.join('، '),
        }, { status: 400 })
      }
    }

    const isPaidUpgrade = targetIndex > currentIndex && planDetails.price > 0
    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'

    // Paid upgrade by non-SUPER_ADMIN: create PENDING request, don't change plan
    if (isPaidUpgrade && !isSuperAdmin) {
      // Check if there's already a pending request
      const pendingSub = await prisma.subscription.findFirst({
        where: { tenantId: auth.tenantId, status: 'PENDING' },
      })
      if (pendingSub) {
        return NextResponse.json({ error: 'يوجد طلب ترقية معلّق بالفعل. انتظر موافقة الإدارة أو تواصل معنا.' }, { status: 400 })
      }

      await prisma.subscription.create({
        data: {
          tenantId: auth.tenantId,
          plan: plan as any,
          status: 'PENDING',
          startDate: new Date(),
          endDate: null,
          amount: planDetails.price,
          currency: 'AED',
          notes: `طلب ترقية من ${PLANS[tenant.plan as keyof typeof PLANS]?.name || tenant.plan} إلى ${planDetails.name} — بانتظار الدفع/الموافقة`,
        },
      })

      return NextResponse.json({
        message: `تم إرسال طلب الترقية إلى ${planDetails.name}. يرجى التواصل مع الإدارة لإتمام الدفع وتفعيل الخطة.`,
        pending: true,
      })
    }

    // Free downgrade or SUPER_ADMIN direct activation
    // Cancel previous active subscriptions
    await prisma.subscription.updateMany({
      where: { tenantId: auth.tenantId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', endDate: new Date() },
    })
    // Also clear any pending requests
    await prisma.subscription.updateMany({
      where: { tenantId: auth.tenantId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })

    // Calculate subscription period (30 days)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

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
        startDate,
        endDate: planDetails.price > 0 ? endDate : null,
        amount: planDetails.price > 0 ? planDetails.price : 0,
        currency: 'AED',
        notes: targetIndex > currentIndex
          ? `ترقية من ${PLANS[tenant.plan as keyof typeof PLANS]?.name || tenant.plan} إلى ${planDetails.name}`
          : `تخفيض من ${PLANS[tenant.plan as keyof typeof PLANS]?.name || tenant.plan} إلى ${planDetails.name}`,
      },
    })

    const action = targetIndex > currentIndex ? 'ترقية' : 'تخفيض'

    return NextResponse.json({
      message: `تم ${action} الخطة إلى ${planDetails.name} بنجاح`,
      plan: planDetails,
    })
  } catch (error) {
    console.error('Plan change error:', error)
    return NextResponse.json({ error: 'فشل في تغيير الخطة' }, { status: 500 })
  }
}

// PATCH /api/settings/subscription — Approve/reject a pending upgrade (SUPER_ADMIN only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response

    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const body = await request.json()
    const { subscriptionId, action: approvalAction, tenantId: targetTenantId } = body

    if (!subscriptionId || !approvalAction) {
      return NextResponse.json({ error: 'البيانات مطلوبة' }, { status: 400 })
    }

    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    if (!subscription || subscription.status !== 'PENDING') {
      return NextResponse.json({ error: 'الطلب غير موجود أو ليس معلقاً' }, { status: 404 })
    }

    if (approvalAction === 'approve') {
      const planDetails = PLANS[subscription.plan as keyof typeof PLANS]
      if (!planDetails) {
        return NextResponse.json({ error: 'خطة غير صالحة' }, { status: 400 })
      }

      // Cancel previous active subscriptions
      await prisma.subscription.updateMany({
        where: { tenantId: subscription.tenantId, status: 'ACTIVE' },
        data: { status: 'CANCELLED', endDate: new Date() },
      })

      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      // Activate the subscription
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          startDate,
          endDate,
          notes: (subscription.notes || '') + ' — تمت الموافقة من الإدارة',
        },
      })

      // Update tenant plan & limits
      await prisma.tenant.update({
        where: { id: subscription.tenantId },
        data: {
          plan: subscription.plan as any,
          maxFarms: planDetails.maxFarms,
          maxGoats: planDetails.maxGoats,
          maxUsers: planDetails.maxUsers,
        },
      })

      return NextResponse.json({ message: 'تم تفعيل الترقية بنجاح' })
    } else if (approvalAction === 'reject') {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'CANCELLED', notes: (subscription.notes || '') + ' — مرفوض من الإدارة' },
      })
      return NextResponse.json({ message: 'تم رفض طلب الترقية' })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error) {
    console.error('Subscription approval error:', error)
    return NextResponse.json({ error: 'فشل في معالجة الطلب' }, { status: 500 })
  }
}

export { PLANS, TRIAL_DAYS, checkSubscriptionStatus }
