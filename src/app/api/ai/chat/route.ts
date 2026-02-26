import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في إدارة المزارع والثروة الحيوانية. اسمك "مساعد المزرعة الذكي".
لديك وصول كامل لبيانات المزرعة الحالية (التقويم، الصحة، التكاثر، المبيعات، المصاريف، الأعلاف، المخزون، الحظائر) وهي مرفقة في السياق أدناه.

تساعد المزارعين في:
- الإجابة عن بيانات المزرعة الحالية (أحداث اليوم، مواعيد قادمة، حالات التكاثر، إلخ)
- تحليل الأداء المالي (مبيعات، مصاريف، أرباح)
- متابعة التقويم والمواعيد والأحداث القادمة
- تحليل صحة الحيوانات وتقديم نصائح بيطرية عامة
- توصيات التغذية المناسبة حسب العمر والنوع والوزن
- نصائح التكاثر وأفضل ممارسات التربية
- تحليل مستويات المخزون والأعلاف وتنبيهات النقص
- تحليل إشغال الحظائر والسعة
- اتخاذ قرارات مبنية على البيانات

قواعد مهمة:
- تحدث بالعربية دائماً
- كن مختصراً ومفيداً
- استخدم البيانات المقدمة لك في السياق عند الإجابة عن أسئلة المزرعة
- قدم أرقام ونسب دقيقة من البيانات المتاحة
- لا تقدم تشخيصات طبية نهائية - انصح دائماً بمراجعة الطبيب البيطري للحالات الخطيرة
- إذا سُئلت عن شيء ليس في البيانات المقدمة، اذكر ذلك بوضوح`

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

      // Fetch comprehensive farm context data for AI
      const today = new Date()
      const nextMonth = new Date()
      nextMonth.setDate(today.getDate() + 30)
      const lastMonth = new Date()
      lastMonth.setMonth(today.getMonth() - 1)

      const [
        farm,
        goatCount,
        goatsByStatus,
        healthRecords,
        upcomingVaccinations,
        feedTypes,
        breedingActive,
        breedingStats,
        recentBirths,
        calendarEvents,
        recentSales,
        recentExpenses,
        salesTotal,
        expensesTotal,
        pens,
        feedStockLevels,
        inventoryLow,
      ] = await Promise.all([
        prisma.farm.findFirst({ select: { name: true, nameAr: true, farmType: true, currency: true } }),
        prisma.goat.count({ where: { status: 'ACTIVE' } }),
        prisma.goat.groupBy({ by: ['status'], _count: true }),
        prisma.healthRecord.findMany({
          take: 10,
          orderBy: { date: 'desc' },
          include: { goat: { select: { name: true, tagId: true } } },
        }),
        prisma.healthRecord.findMany({
          where: { nextDueDate: { gte: today, lte: nextMonth }, goat: { status: 'ACTIVE' } },
          take: 15,
          orderBy: { nextDueDate: 'asc' },
          include: { goat: { select: { name: true, tagId: true } } },
        }),
        prisma.feedType.findMany({
          take: 20,
          select: { name: true, nameAr: true, category: true, unitPrice: true },
        }),
        prisma.breeding.findMany({
          where: { pregnancyStatus: { in: ['MATED', 'PREGNANT'] } },
          include: {
            mother: { select: { name: true, tagId: true } },
            father: { select: { name: true, tagId: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: 20,
        }),
        prisma.breeding.groupBy({
          by: ['pregnancyStatus'],
          _count: true,
        }),
        prisma.birth.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            breeding: {
              include: {
                mother: { select: { name: true, tagId: true } },
                father: { select: { name: true, tagId: true } },
              },
            },
          },
        }),
        prisma.calendarEvent.findMany({
          where: { date: { gte: lastMonth, lte: nextMonth } },
          orderBy: { date: 'asc' },
          take: 30,
        }),
        prisma.sale.findMany({
          take: 10,
          orderBy: { date: 'desc' },
          include: { goat: { select: { name: true, tagId: true } } },
        }),
        prisma.expense.findMany({
          take: 10,
          orderBy: { date: 'desc' },
          select: { amount: true, category: true, description: true, date: true },
        }),
        prisma.sale.aggregate({ _sum: { salePrice: true }, where: { date: { gte: lastMonth } } }),
        prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: lastMonth } } }),
        prisma.pen.findMany({
          select: { name: true, capacity: true, _count: { select: { goats: true } } },
        }),
        prisma.feedStock.findMany({
          where: { quantity: { gt: 0 } },
          include: { feedType: { select: { nameAr: true, name: true, reorderLevel: true } } },
          take: 20,
        }),
        prisma.inventoryItem.findMany({
          where: { currentStock: { lte: 5 } },
          select: { name: true, nameAr: true, currentStock: true, unit: true },
          take: 10,
        }),
      ])

      const fmtDate = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString('ar-AE') : 'غير محدد'

      const farmContext = `
═══════ بيانات المزرعة الشاملة ═══════

📊 نظرة عامة:
- اسم المزرعة: ${farm?.nameAr || farm?.name || 'غير محدد'}
- نوع المزرعة: ${farm?.farmType === 'CAMEL' ? 'إبل' : farm?.farmType === 'MIXED' ? 'مختلطة' : 'أغنام'}
- العملة: ${farm?.currency || 'AED'}
- عدد الحيوانات النشطة: ${goatCount}
- توزيع الحالات: ${goatsByStatus.map(g => `${g.status}: ${g._count}`).join('، ')}

📅 التقويم والأحداث (آخر شهر - الشهر القادم):
${calendarEvents.length === 0 ? '- لا توجد أحداث مسجلة' : calendarEvents.map(e => `- [${e.isCompleted ? '✅' : '⏳'}] ${e.title} (${e.eventType}) - ${fmtDate(e.date)}${e.description ? ': ' + e.description : ''}`).join('\n')}

🏥 آخر السجلات الصحية:
${healthRecords.map(r => `- ${r.goat?.name || r.goat?.tagId || 'غير محدد'}: ${r.type} - ${r.description || ''} (${fmtDate(r.date)})`).join('\n')}

💉 تطعيمات/علاجات مستحقة (30 يوم القادمة):
${upcomingVaccinations.length === 0 ? '- لا توجد مواعيد مستحقة' : upcomingVaccinations.map(v => `- ${v.goat?.name || v.goat?.tagId}: ${v.type} - مستحق ${fmtDate(v.nextDueDate)}`).join('\n')}

🐣 إحصائيات التكاثر:
${breedingStats.map(s => {
        const label = s.pregnancyStatus === 'MATED' ? 'تزاوج (لم يتأكد الحمل)' : s.pregnancyStatus === 'PREGNANT' ? 'حمل مؤكد' : s.pregnancyStatus === 'DELIVERED' ? 'تمت الولادة' : s.pregnancyStatus === 'FAILED' ? 'فشل' : s.pregnancyStatus
        return `- ${label}: ${s._count}`
      }).join('\n')}

🔴 حالات الحمل المؤكد (PREGNANT):
${(() => {
        const pregnant = breedingActive.filter(b => b.pregnancyStatus === 'PREGNANT')
        return pregnant.length === 0 ? '- لا توجد حالات حمل مؤكدة حالياً' : pregnant.map(b => `- الأم: ${b.mother?.name || b.mother?.tagId || '؟'} × الأب: ${b.father?.name || b.father?.tagId || '؟'} | الولادة المتوقعة: ${fmtDate(b.dueDate)}`).join('\n')
      })()}

🔵 حالات التزاوج بانتظار تأكيد الحمل (MATED):
${(() => {
        const mated = breedingActive.filter(b => b.pregnancyStatus === 'MATED')
        return mated.length === 0 ? '- لا توجد' : mated.map(b => `- الأم: ${b.mother?.name || b.mother?.tagId || '؟'} × الأب: ${b.father?.name || b.father?.tagId || '؟'} | تاريخ التزاوج: ${fmtDate(b.matingDate)}`).join('\n')
      })()}

👶 آخر الولادات:
${recentBirths.length === 0 ? '- لا توجد ولادات مسجلة' : recentBirths.map(b => `- ${fmtDate(b.createdAt)}: الأم ${b.breeding?.mother?.name || b.breeding?.mother?.tagId || '؟'} - ${b.gender} (${b.weight ? b.weight + ' كجم' : ''}) [${b.status}]`).join('\n')}

💰 المبيعات (آخر 10):
${recentSales.length === 0 ? '- لا توجد مبيعات' : recentSales.map(s => `- ${s.goat?.name || s.goat?.tagId || '؟'} → ${s.buyerName || 'مشتري'}: ${s.salePrice} (${fmtDate(s.date)}) [${s.paymentStatus}]`).join('\n')}
- إجمالي مبيعات الشهر: ${salesTotal._sum?.salePrice || 0}

📤 المصاريف (آخر 10):
${recentExpenses.length === 0 ? '- لا توجد مصاريف' : recentExpenses.map(e => `- ${e.category}: ${e.amount} - ${e.description || ''} (${fmtDate(e.date)})`).join('\n')}
- إجمالي مصاريف الشهر: ${expensesTotal._sum?.amount || 0}
- صافي الربح التقريبي للشهر: ${(salesTotal._sum?.salePrice || 0) - (expensesTotal._sum?.amount || 0)}

🏠 الحظائر:
${pens.length === 0 ? '- لا توجد حظائر' : pens.map(p => `- ${p.name}: ${p._count.goats}/${p.capacity || '∞'} رأس ${p.capacity ? `(${Math.round(p._count.goats / p.capacity * 100)}%)` : ''}`).join('\n')}

🌾 مخزون الأعلاف:
${feedStockLevels.length === 0 ? '- لا يوجد مخزون أعلاف' : feedStockLevels.map(f => {
        const low = f.feedType.reorderLevel && f.quantity <= f.feedType.reorderLevel
        return `- ${f.feedType.nameAr || f.feedType.name}: ${f.quantity} ${f.unit || 'كجم'}${low ? ' ⚠️ منخفض!' : ''}`
      }).join('\n')}

🔔 أعلاف تحت الحد الأدنى: ${feedStockLevels.filter(f => f.feedType.reorderLevel && f.quantity <= f.feedType.reorderLevel).length} نوع

📦 مخزون منخفض (مستلزمات):
${inventoryLow.length === 0 ? '- المخزون جيد' : inventoryLow.map(i => `- ${i.nameAr || i.name}: ${i.currentStock} ${i.unit || ''} ⚠️`).join('\n')}

🍽️ أنواع الأعلاف المتوفرة:
${feedTypes.map(f => `- ${f.nameAr || f.name} (${f.category}) - سعر الوحدة: ${f.unitPrice || 'غير محدد'}`).join('\n')}

═══════════════════════════════════════
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
