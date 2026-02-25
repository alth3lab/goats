import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const runtime = 'nodejs'

// POST /api/auth/reset-password — Reset password with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, password } = body

    if (!email || !token || !password) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    // Hash the incoming token to compare
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.resetToken !== tokenHash) {
      return NextResponse.json({ error: 'رابط إعادة التعيين غير صالح' }, { status: 400 })
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'انتهت صلاحية رابط إعادة التعيين' }, { status: 400 })
    }

    // Update password and clear reset token
    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json({ message: 'تم تغيير كلمة المرور بنجاح' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
