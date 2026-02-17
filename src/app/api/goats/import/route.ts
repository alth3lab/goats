import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const header = splitCsvLine(lines[0]).map((value) => value.trim())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    header.forEach((key, index) => {
      row[key] = (cells[index] || '').trim()
    })
    return row
  })
}

function splitCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'add_goat')
    if (auth.response) return auth.response
    return runWithTenant(auth.tenantId, auth.farmId, async () => {

    const contentType = request.headers.get('content-type') || ''
    let rows: Record<string, string>[] = []

    if (contentType.includes('application/json')) {
      const body = await request.json()
      rows = Array.isArray(body) ? body : []
    } else {
      const text = await request.text()
      rows = parseCsv(text)
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للاستيراد' }, { status: 400 })
    }

    // Check goat limit across entire tenant (not just current farm)
    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId } })
    if (tenant) {
      const goatCount = await prisma.goat.count({ where: { farm: { tenantId: auth.tenantId } } })
      const remaining = tenant.maxGoats - goatCount
      if (remaining <= 0) {
        return NextResponse.json(
          { error: `تم الوصول للحد الأقصى من الماعز (${tenant.maxGoats}). قم بترقية الخطة.` },
          { status: 403 }
        )
      }
      if (rows.length > remaining) {
        return NextResponse.json(
          { error: `يمكن إضافة ${remaining} رأس فقط من أصل ${rows.length}. الحد الأقصى ${tenant.maxGoats}.` },
          { status: 403 }
        )
      }
    }

    const breeds = await prisma.breed.findMany({
      select: { id: true, name: true, nameAr: true }
    })
    const pens = await prisma.pen.findMany({
      select: { id: true, name: true, nameAr: true }
    })

    const breedLookup = new Map<string, string>()
    breeds.forEach((breed) => {
      breedLookup.set(breed.name.toLowerCase(), breed.id)
      breedLookup.set(breed.nameAr.toLowerCase(), breed.id)
    })

    const penLookup = new Map<string, string>()
    pens.forEach((pen) => {
      penLookup.set(pen.name.toLowerCase(), pen.id)
      penLookup.set(pen.nameAr.toLowerCase(), pen.id)
    })

    let created = 0
    const errors: Array<{ row: number; message: string }> = []

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const tagId = row.tagId || row.tag_id || row.tag || ''
      const breedName = row.breed || row.breedName || row.breedAr || row.breedNameAr || ''
      const gender = row.gender || ''
      const birthDate = row.birthDate || row.birth_date || ''

      if (!tagId || !breedName || !gender || !birthDate) {
        errors.push({ row: i + 2, message: 'حقول إلزامية ناقصة (tagId, breed, gender, birthDate)' })
        continue
      }

      const breedId = breedLookup.get(breedName.toLowerCase())
      if (!breedId) {
        errors.push({ row: i + 2, message: `السلالة غير موجودة: ${breedName}` })
        continue
      }

      const penName = row.pen || row.penName || row.penNameAr || ''
      const penId = penName ? penLookup.get(penName.toLowerCase()) : undefined

      try {
        await prisma.goat.create({
          data: {
            tagId,
            name: row.name || undefined,
            breedId,
            gender: gender.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
            birthDate: new Date(birthDate),
            weight: row.weight ? Number(row.weight) : undefined,
            color: row.color || undefined,
            status: (row.status as any) || 'ACTIVE',
            penId: penId || null,
            notes: row.notes || undefined
          }
        })
        created += 1
      } catch (error) {
        errors.push({ row: i + 2, message: 'فشل في إنشاء الماعز (قد يكون رقم التاج مكرر)' })
      }
    }

    return NextResponse.json({ created, errors })
  
    })
} catch (error) {
    return NextResponse.json({ error: 'فشل في الاستيراد' }, { status: 500 })
  }
}
