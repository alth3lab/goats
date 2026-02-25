import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

async function sendResetEmail(email: string, resetUrl: string) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    MAIL_FROM_NAME,
    EMAIL_USERNAME,
    EMAIL_PASSWORD,
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
  } = process.env

  const smtpPass = SMTP_PASS?.replace(/\s+/g, '')
  const emailPass = EMAIL_PASSWORD?.replace(/\s+/g, '')
  const gmailPass = GMAIL_APP_PASSWORD?.replace(/\s+/g, '')

  const smtpCandidates: Array<{ name: string; host: string; port: number; secure: boolean; user: string; pass: string }> = []

  if (SMTP_HOST && SMTP_USER && smtpPass) {
    const port = Number(SMTP_PORT) || 587
    smtpCandidates.push({
      name: 'smtp',
      host: SMTP_HOST,
      port,
      secure: port === 465,
      user: SMTP_USER,
      pass: smtpPass,
    })
  }

  if (EMAIL_USERNAME && emailPass) {
    const isGmail = /@gmail\.com$/i.test(EMAIL_USERNAME)
    smtpCandidates.push({
      name: isGmail ? 'email-gmail' : 'email-fallback',
      host: isGmail ? 'smtp.gmail.com' : (SMTP_HOST || 'smtp.gmail.com'),
      port: isGmail ? 465 : (Number(SMTP_PORT) || 587),
      secure: isGmail ? true : ((Number(SMTP_PORT) || 587) === 465),
      user: EMAIL_USERNAME,
      pass: emailPass,
    })
  }

  if (GMAIL_USER && gmailPass) {
    smtpCandidates.push({
      name: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: GMAIL_USER,
      pass: gmailPass,
    })
  }

  if (smtpCandidates.length === 0) {
    console.warn('[email] SMTP not configured — reset link logged to console')
    console.log(`🔑 Password reset for ${email}: ${resetUrl}`)
    return
  }

  let lastError: unknown = null
  for (const candidate of smtpCandidates) {
    try {
      const transporter = nodemailer.createTransport({
        host: candidate.host,
        port: candidate.port,
        secure: candidate.secure,
        auth: { user: candidate.user, pass: candidate.pass },
      })

      const fromAddress = SMTP_FROM || candidate.user
      const from = MAIL_FROM_NAME
        ? `"${MAIL_FROM_NAME}" <${fromAddress}>`
        : fromAddress

      await transporter.sendMail({
        from,
        to: email,
        replyTo: fromAddress,
        subject: 'إعادة تعيين كلمة المرور - نظام إدارة المواشي',
        text: `تم طلب إعادة تعيين كلمة المرور لحسابك في نظام إدارة المواشي.

استخدم الرابط التالي خلال ساعة واحدة:
${resetUrl}

إذا لم تطلب ذلك، تجاهل هذه الرسالة.`,
        html: `<div dir="rtl" style="font-family: sans-serif; padding: 20px;">
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>لقد طلبت إعادة تعيين كلمة المرور. اضغط على الرابط أدناه:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:white;text-decoration:none;border-radius:8px;">إعادة تعيين كلمة المرور</a>
      <p style="margin-top:16px;color:#666;">ينتهي هذا الرابط خلال ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
    </div>`,
        headers: {
          'X-Auto-Response-Suppress': 'All',
          'Auto-Submitted': 'auto-generated',
        },
      })

      console.info(`[email] Reset mail sent via ${candidate.name}`)
      return
    } catch (error) {
      lastError = error
      console.warn(`[email] Provider failed (${candidate.name})`, error)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All email providers failed')
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
    const exposeResetUrl = process.env.EXPOSE_RESET_URL === 'true'
    
    // Send password reset email (falls back to console if SMTP not configured)
    await sendResetEmail(email, resetUrl)

    return NextResponse.json({
      message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين',
      ...((process.env.NODE_ENV === 'development' || exposeResetUrl) ? { _dev_resetUrl: resetUrl } : {}),
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
