import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'
export const maxDuration = 60

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' })

const BREEDING_PROMPT = `أنت خبير في تربية وتحسين سلالات الماعز والأغنام. مهمتك تحليل بيانات القطيع وتقديم توصيات تزاوج ذكية.

## المطلوب:
بناءً على بيانات الحيوانات المقدمة، قدم:

### 1. أفضل أزواج التزاوج المقترحة
- رتب الأزواج من الأفضل للأقل
- اذكر سبب كل اقتراح
- نسبة التوافق المتوقعة

### 2. تحذيرات زواج الأقارب
- حدد أي أزواج يجب تجنبها بسبب صلة القرابة
- وضح درجة القرابة (أخ/أخت، أب/بنت، أم/ابن، أبناء عم...)

### 3. توقع صفات المواليد
- الوزن المتوقع عند الولادة
- السلالة/اللون المتوقع
- الصفات الوراثية المحتملة

### 4. نصائح عامة
- أفضل موسم للتزاوج
- الفترة المثالية بين التزاوج
- عمر التزاوج الأمثل

قواعد مهمة:
- تجنب التزاوج بين الأقارب من الدرجة الأولى والثانية
- فضّل التنوع الجيني
- اعتبر الوزن والعمر والحالة الصحية
- النتائج بالعربية بتنسيق مرتب وواضح
- استخدم الأرقام التعريفية (tagId) عند الإشارة للحيوانات`

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_breeding')
    if (auth.response) return auth.response

    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()
      const { motherId, scope = 'all' } = body // scope: 'all' | 'specific'

      // Fetch active females (potential mothers)
      const females = await prisma.goat.findMany({
        where: {
          status: 'ACTIVE',
          gender: 'FEMALE',
          ...(motherId ? { id: motherId } : {}),
        },
        include: {
          breed: true,
          mother: { select: { id: true, tagId: true, name: true, breedId: true } },
          father: { select: { id: true, tagId: true, name: true, breedId: true } },
          healthRecords: {
            take: 3,
            orderBy: { date: 'desc' },
            select: { description: true, date: true, type: true },
          },
          breedingAsMother: {
            take: 5,
            orderBy: { matingDate: 'desc' },
            select: {
              matingDate: true,
              pregnancyStatus: true,
              numberOfKids: true,
              father: { select: { id: true, tagId: true, name: true } },
            },
          },
        },
      })

      // Fetch active males (potential fathers)
      const males = await prisma.goat.findMany({
        where: {
          status: 'ACTIVE',
          gender: 'MALE',
        },
        include: {
          breed: true,
          mother: { select: { id: true, tagId: true, name: true, breedId: true } },
          father: { select: { id: true, tagId: true, name: true, breedId: true } },
          healthRecords: {
            take: 3,
            orderBy: { date: 'desc' },
            select: { description: true, date: true, type: true },
          },
          breedingAsFather: {
            take: 5,
            orderBy: { matingDate: 'desc' },
            select: {
              matingDate: true,
              pregnancyStatus: true,
              numberOfKids: true,
            },
          },
        },
      })

      if (females.length === 0) {
        return new Response(
          JSON.stringify({ error: 'لا توجد إناث نشطة في القطيع' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (males.length === 0) {
        return new Response(
          JSON.stringify({ error: 'لا توجد ذكور نشطة في القطيع' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Build relationship map for inbreeding detection
      const buildFamilyTree = (goat: typeof females[0] | typeof males[0]) => {
        return {
          id: goat.id,
          tagId: goat.tagId,
          name: goat.name || goat.tagId,
          breed: goat.breed?.nameAr || goat.breed?.name || 'غير محدد',
          weight: goat.weight,
          birthDate: goat.birthDate?.toISOString().split('T')[0],
          age: goat.birthDate ? `${Math.floor((Date.now() - goat.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة` : 'غير معروف',
          color: goat.color || 'غير محدد',
          motherId: goat.mother?.id || null,
          motherTag: goat.mother?.tagId || null,
          fatherId: goat.father?.id || null,
          fatherTag: goat.father?.tagId || null,
          motherBreedId: goat.mother?.breedId || null,
          fatherBreedId: goat.father?.breedId || null,
          healthStatus: goat.healthRecords.length > 0
            ? goat.healthRecords.map(h => `${h.type}: ${h.description} (${new Date(h.date).toLocaleDateString('ar')})`).join(' | ')
            : 'لا توجد سجلات صحية',
        }
      }

      const femaleData = females.map(f => ({
        ...buildFamilyTree(f),
        gender: 'أنثى',
        breedingHistory: (f as typeof females[0]).breedingAsMother.map(b => ({
          date: b.matingDate?.toISOString().split('T')[0],
          status: b.pregnancyStatus,
          kids: b.numberOfKids,
          fatherTag: b.father?.tagId,
        })),
      }))

      const maleData = males.map(m => ({
        ...buildFamilyTree(m),
        gender: 'ذكر',
        breedingCount: (m as typeof males[0]).breedingAsFather.length,
        successRate: (() => {
          const breedings = (m as typeof males[0]).breedingAsFather
          if (breedings.length === 0) return 'لم يُستخدم بعد'
          const delivered = breedings.filter(b => b.pregnancyStatus === 'DELIVERED').length
          return `${delivered}/${breedings.length} (${Math.round(delivered / breedings.length * 100)}%)`
        })(),
      }))

      // Detect potential inbreeding risks
      const inbreedingRisks: string[] = []
      for (const female of females) {
        for (const male of males) {
          // Same parents (full siblings)
          if (female.motherId && male.motherId && female.motherId === male.motherId &&
              female.fatherId && male.fatherId && female.fatherId === male.fatherId) {
            inbreedingRisks.push(`⛔ ${female.tagId} و ${male.tagId}: أخوة أشقاء (نفس الأم والأب)`)
          }
          // Same mother (half siblings maternal)
          else if (female.motherId && male.motherId && female.motherId === male.motherId) {
            inbreedingRisks.push(`⚠️ ${female.tagId} و ${male.tagId}: أخوة من الأم`)
          }
          // Same father (half siblings paternal)
          else if (female.fatherId && male.fatherId && female.fatherId === male.fatherId) {
            inbreedingRisks.push(`⚠️ ${female.tagId} و ${male.tagId}: أخوة من الأب`)
          }
          // Father-daughter
          if (female.fatherId === male.id) {
            inbreedingRisks.push(`⛔ ${female.tagId}: أبوها هو ${male.tagId} (أب-بنت)`)
          }
          // Mother-son
          if (male.motherId === female.id) {
            inbreedingRisks.push(`⛔ ${male.tagId}: أمه هي ${female.tagId} (أم-ابن)`)
          }
        }
      }

      const contextData = `
## بيانات الإناث المتاحة للتزاوج:
${JSON.stringify(femaleData, null, 2)}

## بيانات الذكور المتاحة:
${JSON.stringify(maleData, null, 2)}

## تحذيرات القرابة المكتشفة تلقائياً:
${inbreedingRisks.length > 0 ? inbreedingRisks.join('\n') : 'لم يتم اكتشاف صلات قرابة مباشرة'}

## إحصائيات القطيع:
- عدد الإناث: ${females.length}
- عدد الذكور: ${males.length}
- ${scope === 'specific' && motherId ? 'التوصية مطلوبة لأنثى محددة' : 'التوصية لجميع الإناث'}
`

      // Call AI for recommendations
      const models = ['gemini-2.5-pro', 'gemini-2.5-flash']
      let resultText = ''

      for (const modelName of models) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: contextData }] }],
            config: {
              systemInstruction: BREEDING_PROMPT,
            },
          })
          resultText = response.text || 'عذراً، لم أتمكن من تقديم توصيات.'
          break
        } catch (modelError: unknown) {
          const errMsg = modelError instanceof Error ? modelError.message : String(modelError)
          if ((errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) && modelName !== models[models.length - 1]) {
            console.warn(`${modelName} unavailable for breeding recommendations, trying fallback...`)
            continue
          }
          throw modelError
        }
      }

      return new Response(
        JSON.stringify({
          recommendations: resultText,
          inbreedingRisks,
          stats: {
            totalFemales: females.length,
            totalMales: males.length,
            risksFound: inbreedingRisks.length,
          },
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })
  } catch (error: unknown) {
    console.error('Breeding Recommendations error:', error)
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد المجاني. يرجى الانتظار دقيقة.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response(
      JSON.stringify({ error: `خطأ: ${msg.substring(0, 200)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
