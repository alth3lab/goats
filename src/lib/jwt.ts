import { SignJWT, jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const jwt = process.env.JWT_SECRET
  if (!jwt && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  return new TextEncoder().encode(jwt || 'dev-only-secret-do-not-use-in-production')
}

// Lazy-init so the check runs at first use, not during build
let _secret: Uint8Array | null = null
function secret() {
  if (!_secret) _secret = getSecret()
  return _secret
}

const TOKEN_COOKIE = 'session'
const TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours

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
    .sign(secret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
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
