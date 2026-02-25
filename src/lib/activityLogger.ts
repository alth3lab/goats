import { prisma } from '@/lib/prisma'

interface ActivityInput {
  userId?: string
  tenantId?: string
  farmId?: string
  action: string
  entity: string
  entityId?: string
  description: string
  ipAddress?: string | null
  userAgent?: string | null
}

async function getFallbackUser() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (admin) return admin

  const anyUser = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  return anyUser || null
}

export async function logActivity(input: ActivityInput) {
  try {
    let actorId = input.userId
    let tenantId = input.tenantId

    if (!actorId) {
      const fallback = await getFallbackUser()
      if (!fallback) return
      actorId = fallback.id
      tenantId = tenantId || fallback.tenantId
    }

    await prisma.activityLog.create({
      data: {
        userId: actorId,
        tenantId: tenantId || '',
        farmId: input.farmId || undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        description: input.description,
        ipAddress: input.ipAddress || undefined,
        userAgent: input.userAgent || undefined
      }
    })
  } catch {
    // Ignore logging failures to avoid blocking core actions.
  }
}
