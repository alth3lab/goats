import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, TOKEN_COOKIE } from '@/lib/jwt'

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  return payload?.userId || null
}

export async function getUserWithPermissions(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: { include: { permission: true } } }
  })

  if (!user) return null

  const permissions = user.permissions.map((entry) => entry.permission.name)
  return { user, permissions }
}

export async function requireAuth(request: NextRequest) {
  const data = await getUserWithPermissions(request)
  if (!data) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
  }
  return { response: null, ...data }
}

export async function requirePermission(request: NextRequest, permission: string) {
  const data = await getUserWithPermissions(request)
  if (!data) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
  }

  if (data.user.role === 'ADMIN') {
    return { response: null, ...data }
  }

  if (!data.permissions.includes(permission)) {
    return {
      response: NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
  }

  return { response: null, ...data }
}
