import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { calculateGoatAge } from '@/lib/ageCalculator'

export const runtime = 'nodejs'

// Returns goats that are due for vaccination based on active protocols
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_health')
    if (auth.response) return auth.response

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
          where: { type: 'VACCINATION' },
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

        // Calculate when this vaccination is due
        const birthDate = new Date(goat.birthDate)

        if (protocol.repeatMonths) {
          // Recurring vaccination — check if enough time has passed since last one
          const relevantRecords = goat.healthRecords.filter(hr =>
            hr.description?.includes(protocol.name) || hr.description?.includes(protocol.nameAr)
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
            // Never vaccinated — due since ageMonths old
            dueDate = new Date(birthDate)
            dueDate.setMonth(dueDate.getMonth() + protocol.ageMonths)
          }

          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays <= 14) { // Due within 2 weeks or overdue
            dueList.push({
              goatId: goat.id,
              tagId: goat.tagId,
              goatName: goat.name,
              protocolId: protocol.id,
              protocolName: protocol.name,
              protocolNameAr: protocol.nameAr,
              medication: protocol.medication,
              dosage: protocol.dosage,
              ageMonths: protocol.ageMonths,
              goatAgeMonths: age.totalMonths,
              status: diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'due',
              dueDate: dueDate.toISOString(),
              lastVaccination: lastRecord ? new Date(lastRecord.date).toISOString() : null
            })
          }
        } else {
          // One-time vaccination
          if (age.totalMonths < protocol.ageMonths) continue // Too young

          // Check if already vaccinated with this protocol
          const alreadyDone = goat.healthRecords.some(hr =>
            hr.description?.includes(protocol.name) || hr.description?.includes(protocol.nameAr)
          )

          if (alreadyDone) continue

          // Due since ageMonths old
          const dueDate = new Date(birthDate)
          dueDate.setMonth(dueDate.getMonth() + protocol.ageMonths)

          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          dueList.push({
            goatId: goat.id,
            tagId: goat.tagId,
            goatName: goat.name,
            protocolId: protocol.id,
            protocolName: protocol.name,
            protocolNameAr: protocol.nameAr,
            medication: protocol.medication,
            dosage: protocol.dosage,
            ageMonths: protocol.ageMonths,
            goatAgeMonths: age.totalMonths,
            status: diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'due',
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
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب التطعيمات المستحقة' }, { status: 500 })
  }
}
