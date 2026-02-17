import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const runtime = 'nodejs'

// POST /api/auth/forgot-password — Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين' })
    }

    // Generate reset token (store hash, send raw)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry: resetExpiry,
      },
    })

    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
    
    // TODO: Send email — for now log to console
    console.log(`🔑 Password reset for ${email}: ${resetUrl}`)

    return NextResponse.json({
      message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين',
      ...(process.env.NODE_ENV === 'development' ? { _dev_resetUrl: resetUrl } : {}),
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
