import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const today = new Date()
    const nextMonth = new Date()
    nextMonth.setDate(today.getDate() + 30)

    const [upcomingBirths, upcomingVaccinations, weaningKids] = await Promise.all([
      // 1. Upcoming Births (Due within 30 days)
      prisma.breeding.findMany({
        where: {
          pregnancyStatus: { in: ['PREGNANT', 'MATED'] },
          dueDate: {
            gte: today,
            lte: nextMonth
          },
          mother: { status: 'ACTIVE' }
        },
        include: {
          mother: {
            include: { breed: true }
          }
        },
        orderBy: { dueDate: 'asc' }
      }),

      // 2. Upcoming Vaccinations (Due within 30 days or Overdue)
      prisma.healthRecord.findMany({
        where: {
          nextDueDate: {
            lte: nextMonth,
            not: null
          },
          goat: { status: 'ACTIVE' }
        },
        include: {
          goat: { select: { tagId: true, name: true } }
        },
        orderBy: { nextDueDate: 'asc' }
      }),

      // 3. Weaning Alerts (Kids turning 3 months old soon)
      prisma.goat.findMany({
        where: {
          status: 'ACTIVE',
          birthDate: {
            // Born between 4 months ago and 2.5 months ago (approaching or just passed weaning)
            gte: new Date(new Date().setMonth(today.getMonth() - 4)),
            lte: new Date(new Date().setMonth(today.getMonth() - 2.5))
          }
        },
        select: {
          id: true,
          tagId: true,
          name: true,
          birthDate: true,
          motherTagId: true,
          breed: { select: { nameAr: true } }
        },
        orderBy: { birthDate: 'asc' }
      })
    ])

    const alerts = [
      // Format Birth Alerts
      ...upcomingBirths.map(record => ({
        id: `birth-${record.id}`,
        type: 'BIRTH',
        severity: getSeverity(new Date(record.dueDate!), today),
        title: 'ولادة متوقعة',
        message: `الأم ${record.mother.tagId} (${record.mother.breed.nameAr}) - متوقع: ${new Date(record.dueDate!).toLocaleDateString('ar-SA')}`,
        date: record.dueDate
      })),

      // Format Vaccination Alerts
      ...upcomingVaccinations.map(record => ({
        id: `health-${record.id}`,
        type: 'HEALTH',
        severity: getSeverity(new Date(record.nextDueDate!), today),
        title: 'تطعيم/علاج مستحق',
        message: `${record.type === 'VACCINATION' ? 'تطعيم' : 'علاج'} للماعز ${record.goat.tagId} - ${new Date(record.nextDueDate!).toLocaleDateString('ar-SA')}`,
        date: record.nextDueDate
      })),

      // Format Weaning Alerts
      ...weaningKids.map(kid => {
        const ageInDays = Math.floor((today.getTime() - new Date(kid.birthDate).getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: `wean-${kid.id}`,
          type: 'WEANING',
          severity: 'info',
          title: 'فطام مقترح',
          message: `الماعز ${kid.tagId} (عمر ${Math.floor(ageInDays/30)} شهر) - جاهز للفطام`,
          date: new Date() // Actionable now
        }
      })
    ].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

function getSeverity(date: Date, today: Date) {
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'error' // Overdue
  if (diffDays <= 3) return 'warning' // Due very soon
  return 'info' // Due later
}
