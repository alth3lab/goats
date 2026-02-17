import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

/**
 * Validate database integrity - التحقق من سلامة البيانات
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'manage_permissions')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const issues: string[] = []

    // 1. الماعز بدون سلالة  
    const allGoats = await prisma.goat.count()
    const goatsWithBreed = await prisma.goat.count({
      where: { 
        breed: {}
      }
    })
    const goatsWithoutBreed = allGoats - goatsWithBreed
    if (goatsWithoutBreed > 0) {
      issues.push(`${goatsWithoutBreed} ماعز بدون سلالة محددة`)
    }

    // 2. births بدون kidGoatId
    const allBirths = await prisma.birth.count()
    const birthsWithKid = await prisma.birth.count({
      where: { 
        kidGoat: {}
      }
    })
    const birthsWithoutKid = allBirths - birthsWithKid
    if (birthsWithoutKid > 0) {
      issues.push(`${birthsWithoutKid} سجل ولادة بدون ربط بالماعز`)
    }

    // 3. breeding delivered بدون births
    const deliveredWithoutBirths = await prisma.breeding.count({
      where: {
        pregnancyStatus: 'DELIVERED',
        births: { none: {} }
      }
    })
    if (deliveredWithoutBirths > 0) {
      issues.push(`${deliveredWithoutBirths} سجل تكاثر مكتمل بدون ولادات مسجلة`)
    }

    // 4. numberOfKids لا يتطابق مع عدد births الفعلي
    const breedingsWithKids = await prisma.breeding.findMany({
      where: {
        pregnancyStatus: 'DELIVERED',
        numberOfKids: { not: null }
      },
      include: {
        _count: { select: { births: true } }
      }
    })
    const mismatchedKids = breedingsWithKids.filter(
      b => b.numberOfKids !== b._count.births
    ).length
    if (mismatchedKids > 0) {
      issues.push(`${mismatchedKids} سجل تكاثر: عدد الولادات لا يتطابق مع numberOfKids`)
    }

    // 5. الماعز المباع لا يزال في حظيرة
    const soldInPen = await prisma.goat.count({
      where: {
        status: 'SOLD',
        penId: { not: null }
      }
    })
    if (soldInPen > 0) {
      issues.push(`${soldInPen} ماعز مباع لا يزال في حظيرة`)
    }

    // 6. health records بـ nextDueDate في الماضي
    const overdueHealth = await prisma.healthRecord.count({
      where: {
        nextDueDate: { lt: new Date() },
        goat: { status: 'ACTIVE' }
      }
    })
    if (overdueHealth > 0) {
      issues.push(`${overdueHealth} سجل صحي متأخر (nextDueDate في الماضي)`)
    }

    // 7. breeding مع أب/أم نفس الجنس
    const invalidGenderBreeding = await prisma.breeding.count({
      where: {
        mother: { gender: 'MALE' }
      }
    })
    if (invalidGenderBreeding > 0) {
      issues.push(`${invalidGenderBreeding} سجل تكاثر بجنس خاطئ للأم`)
    }

    // 8. الماعز بـ motherTagId/fatherTagId لكن بدون motherId/fatherId
    const goatsWithMotherTagOnly = await prisma.goat.count({
      where: {
        motherTagId: { not: "" },
        mother: { is: null }
      }
    })
    const goatsWithFatherTagOnly = await prisma.goat.count({
      where: {
        fatherTagId: { not: "" },
        father: { is: null }
      }
    })
    const goatsWithMismatchedParents = goatsWithMotherTagOnly + goatsWithFatherTagOnly
    if (goatsWithMismatchedParents > 0) {
      issues.push(`${goatsWithMismatchedParents} ماعز: معلومات الأبوين غير متطابقة`)
    }

    return NextResponse.json({
      isValid: issues.length === 0,
      issuesCount: issues.length,
      issues,
      message: issues.length === 0 
        ? 'البيانات سليمة ✓' 
        : `تم العثور على ${issues.length} مشكلة`
    })
  
    })
} catch (error) {
    console.error('Error validating data:', error)
    return NextResponse.json({ error: 'فشل في التحقق من البيانات' }, { status: 500 })
  }
}
