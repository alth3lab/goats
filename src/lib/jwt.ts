import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'goats-farm-default-secret-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

const TOKEN_COOKIE = 'session'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface JWTPayload {
  userId: string
  role: string
  tenantId: string
  farmId: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      tenantId: payload.tenantId as string,
      farmId: payload.farmId as string,
    }
  } catch {
    return null
  }
}

export { TOKEN_COOKIE, TOKEN_MAX_AGE }
