import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'
import { calculateGoatAge, AnimalSpecies } from '@/lib/ageCalculator'

export const runtime = 'nodejs'

// Returns goats that are due for vaccination based on active protocols
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_health')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    // Get active protocols
    const protocols = await prisma.vaccinationProtocol.findMany({
      where: { isActive: true },
      orderBy: { ageMonths: 'asc' }
    })

    if (protocols.length === 0) {
      return NextResponse.json([])
    }

    // Get all active goats
    const goats = await prisma.goat.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        tagId: true,
        name: true,
        gender: true,
        birthDate: true,
        healthRecords: {
          select: { id: true, description: true, date: true, type: true },
          orderBy: { date: 'desc' }
        }
      }
    })

    const today = new Date()
    const dueList: Array<{
      goatId: string
      tagId: string
      goatName: string | null
      protocolId: string
      protocolName: string
      protocolNameAr: string
      protocolType: string
      medication: string | null
      dosage: string | null
      ageMonths: number
      goatAgeMonths: number
      status: 'overdue' | 'due_soon' | 'due'
      dueDate: string
      lastVaccination: string | null
    }> = []

    for (const goat of goats) {
      const age = calculateGoatAge(goat.birthDate)

      for (const protocol of protocols) {
        // Skip if protocol is gender-specific and doesn't match
        if (protocol.gender && protocol.gender !== goat.gender) continue

        // البروتوكول يعمل فقط من تاريخ إضافته فصاعداً
        const protocolCreatedAt = new Date(protocol.createdAt)

        // Calculate when this vaccination is due
        const birthDate = new Date(goat.birthDate)

        if (protocol.repeatMonths) {
          // Recurring vaccination — only count records AFTER protocol was created
          const relevantRecords = goat.healthRecords.filter(hr =>
            (hr.description?.includes(protocol.name) || hr.description?.includes(protocol.nameAr))
            && new Date(hr.date) >= protocolCreatedAt
          )

          const lastRecord = relevantRecords.length > 0 ? relevantRecords[0] : null

          // First dose is at ageMonths, then every repeatMonths after
          if (age.totalMonths < protocol.ageMonths) continue // Too young

          let dueDate: Date

          if (lastRecord) {
            // Next dose = last vaccination + repeatMonths
            dueDate = new Date(lastRecord.date)
            dueDate.setMonth(dueDate.getMonth() + protocol.repeatMonths)
          } else {
            // Never vaccinated since protocol was added — due from protocol creation or today (whichever is later)
            dueDate = protocolCreatedAt > today ? new Date(protocolCreatedAt) : new Date(today)
          }

          // Determine status BEFORE resetting overdue dates
          const isOverdue = dueDate < today
          const originalDueDate = new Date(dueDate)

          const diffDays = Math.ceil((originalDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays <= 14) { // Due within 2 weeks or overdue
            dueList.push({
              goatId: goat.id,
              tagId: goat.tagId,
              goatName: goat.name,
              protocolId: protocol.id,
              protocolName: protocol.name,
              protocolNameAr: protocol.nameAr,
              protocolType: protocol.type,
              medication: protocol.medication,
              dosage: protocol.dosage,
              ageMonths: protocol.ageMonths,
              goatAgeMonths: age.totalMonths,
              status: isOverdue ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'due',
              dueDate: originalDueDate.toISOString(),
              lastVaccination: lastRecord ? new Date(lastRecord.date).toISOString() : null
            })
          }
        } else {
          // One-time vaccination
          if (age.totalMonths < protocol.ageMonths) continue // Too young

          // Check if already vaccinated with this protocol AFTER it was created
          const alreadyDone = goat.healthRecords.some(hr =>
            (hr.description?.includes(protocol.name) || hr.description?.includes(protocol.nameAr))
            && new Date(hr.date) >= protocolCreatedAt
          )

          if (alreadyDone) continue

          // Due from protocol creation date
          const dueDate = new Date(protocolCreatedAt)
          const isOverdue = dueDate < today

          dueList.push({
            goatId: goat.id,
            tagId: goat.tagId,
            goatName: goat.name,
            protocolId: protocol.id,
            protocolName: protocol.name,
            protocolNameAr: protocol.nameAr,
            protocolType: protocol.type,
            medication: protocol.medication,
            dosage: protocol.dosage,
            ageMonths: protocol.ageMonths,
            goatAgeMonths: age.totalMonths,
            status: isOverdue ? 'overdue' : 'due_soon',
            dueDate: dueDate.toISOString(),
            lastVaccination: null
          })
        }
      }
    }

    // Sort: overdue first, then due_soon, then due
    const statusOrder = { overdue: 0, due_soon: 1, due: 2 }
    dueList.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

    return NextResponse.json(dueList)
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في جلب التطعيمات المستحقة' }, { status: 500 })
  }
}
