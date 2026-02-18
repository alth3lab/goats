import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

async function sendResetEmail(email: string, resetUrl: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[email] SMTP not configured — reset link logged to console')
    console.log(`🔑 Password reset for ${email}: ${resetUrl}`)
    return
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: (Number(SMTP_PORT) || 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'إعادة تعيين كلمة المرور',
    html: `<div dir="rtl" style="font-family: sans-serif; padding: 20px;">
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>لقد طلبت إعادة تعيين كلمة المرور. اضغط على الرابط أدناه:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:white;text-decoration:none;border-radius:8px;">إعادة تعيين كلمة المرور</a>
      <p style="margin-top:16px;color:#666;">ينتهي هذا الرابط خلال ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
    </div>`,
  })
}

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
    
    // Send password reset email (falls back to console if SMTP not configured)
    await sendResetEmail(email, resetUrl)

    return NextResponse.json({
      message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين',
      ...(process.env.NODE_ENV === 'development' ? { _dev_resetUrl: resetUrl } : {}),
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
