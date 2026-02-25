import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في إدارة المزارع والثروة الحيوانية. اسمك "مساعد المزرعة الذكي".
تساعد المزارعين في:
- تحليل صحة الحيوانات وتقديم نصائح بيطرية عامة
- توصيات التغذية المناسبة حسب العمر والنوع والوزن
- نصائح التكاثر وأفضل ممارسات التربية
- تحليل التكاليف وتحسين الأرباح
- الإجابة على الأسئلة العامة عن تربية الأغنام والماعز والإبل

تحدث بالعربية دائماً. كن مختصراً ومفيداً. إذا سُئلت عن بيانات المزرعة، استخدم البيانات المقدمة لك في السياق.
لا تقدم تشخيصات طبية نهائية - انصح دائماً بمراجعة الطبيب البيطري للحالات الخطيرة.`

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' })

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response

    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const body = await request.json()
      
      // Convert client messages to Gemini format
      const chatMessages = (body.messages || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }))

      // Fetch farm context data for AI
      const [goatCount, healthRecords, feedStats, breedingCount] = await Promise.all([
        prisma.goat.count({ where: { status: 'ACTIVE' } }),
        prisma.healthRecord.findMany({
          take: 5,
          orderBy: { date: 'desc' },
          include: { goat: { select: { name: true, tagId: true } } },
        }),
        prisma.feedType.findMany({
          take: 10,
          select: { name: true, nameAr: true, category: true, unitPrice: true },
        }),
        prisma.breeding.count({
          where: { pregnancyStatus: { in: ['MATED', 'PREGNANT'] } },
        }),
      ])

      const farmContext = `
بيانات المزرعة الحالية:
- عدد الحيوانات النشطة: ${goatCount}
- حالات التكاثر النشطة: ${breedingCount}
- آخر السجلات الصحية: ${healthRecords.map(r => `${r.goat?.name || r.goat?.tagId}: ${r.description} (${new Date(r.date).toLocaleDateString('ar')})`).join('، ')}
- الأعلاف المتوفرة: ${feedStats.map(f => `${f.nameAr || f.name} (${f.category}) - سعر الوحدة: ${f.unitPrice || 'غير محدد'}`).join('، ')}
`

      // Try gemini-2.5-pro first, fallback to gemini-2.5-flash if unavailable
      const models = ['gemini-2.5-pro', 'gemini-2.5-flash']
      let text = ''
      
      for (const modelName of models) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: chatMessages,
            config: {
              systemInstruction: SYSTEM_PROMPT + '\n\n' + farmContext,
            },
          })
          text = response.text || 'عذراً، لم أتمكن من توليد رد.'
          break
        } catch (modelError: unknown) {
          const errMsg = modelError instanceof Error ? modelError.message : String(modelError)
          if ((errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) && modelName !== models[models.length - 1]) {
            console.warn(`${modelName} unavailable, trying fallback...`)
            continue
          }
          throw modelError
        }
      }

      return new Response(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    })
  } catch (error: unknown) {
    console.error('AI Chat error:', error)
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد المجاني لـ Gemini AI. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
      return new Response(
        JSON.stringify({ error: 'مفتاح API غير صالح. تأكد من صحة المفتاح في ملف .env' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response(
      JSON.stringify({ error: `خطأ: ${msg.substring(0, 200)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
