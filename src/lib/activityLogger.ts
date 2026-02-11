import { prisma } from '@/lib/prisma'

interface ActivityInput {
  userId?: string
  action: string
  entity: string
  entityId?: string
  description: string
  ipAddress?: string | null
  userAgent?: string | null
}

async function getFallbackUserId() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (admin) return admin.id

  const anyUser = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  return anyUser?.id || null
}

export async function logActivity(input: ActivityInput) {
  try {
    const actorId = input.userId || (await getFallbackUserId())
    if (!actorId) return

    await prisma.activityLog.create({
      data: {
        userId: actorId,
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
