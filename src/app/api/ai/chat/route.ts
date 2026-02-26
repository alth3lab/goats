import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في إدارة المزارع والثروة الحيوانية. اسمك "مساعد المزرعة الذكي".
لديك وصول كامل ومفصل لجميع بيانات المزرعة الحالية وهي مرفقة في السياق أدناه.

البيانات المتوفرة لك تشمل:
1. معلومات المزرعة الأساسية (الاسم، النوع، العملة)
2. إحصائيات القطيع (العدد، الحالات، الجنس، السلالات)
3. الملاك وعدد حيواناتهم
4. التقويم والأحداث القادمة والمكتملة
5. السجلات الصحية والتطعيمات المستحقة
6. بروتوكولات التطعيم المعتمدة
7. التكاثر (تزاوج، حمل، ولادات) مع التفريق بين الحالات
8. المبيعات والمدفوعات المعلقة
9. المصاريف مع التوزيع حسب الفئة
10. التحليل المالي (إيرادات، مصاريف، صافي ربح)
11. الحظائر وإشغالها ونوعها
12. مخزون الأعلاف ومستويات إعادة الطلب
13. خلطات الأعلاف (الوصفات) ومكوناتها
14. جداول التغذية النشطة
15. استهلاك الأعلاف اليومي (آخر 7 أيام)
16. المخزون والمستلزمات
17. سجل النشاطات الأخيرة في النظام

تساعد المزارعين في:
- الإجابة عن أي سؤال يخص بيانات المزرعة بأرقام دقيقة
- تحليل الأداء المالي الشامل (إيرادات، مصاريف، أرباح، مدفوعات معلقة)
- متابعة التقويم والمواعيد والأحداث القادمة
- تحليل تركيبة القطيع (ذكور/إناث، سلالات، أعمار)
- تحليل صحة الحيوانات وجدول التطعيمات والبروتوكولات
- توصيات التغذية وتحليل الاستهلاك وكفاءة الخلطات
- تحليل التكاثر مع التمييز الدقيق بين التزاوج والحمل المؤكد
- تحليل إشغال الحظائر وتوصيات التوزيع
- تنبيهات المخزون والأعلاف المنخفضة
- اتخاذ قرارات مبنية على البيانات

قواعد مهمة:
- تحدث بالعربية دائماً
- كن مختصراً ومفيداً
- استخدم البيانات المقدمة لك في السياق عند الإجابة - لا تختلق أرقاماً
- قدم أرقام ونسب دقيقة من البيانات المتاحة
- لا تقدم تشخيصات طبية نهائية - انصح دائماً بمراجعة الطبيب البيطري للحالات الخطيرة
- إذا سُئلت عن شيء ليس في البيانات المقدمة، اذكر ذلك بوضوح
- عند تقديم ملخص شامل، غطِّ جميع الأقسام: القطيع، الصحة، التكاثر، المالية، الأعلاف، الحظائر`

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
      const lastWeek = new Date()
      lastWeek.setDate(today.getDate() - 7)

      const [
        farm,
        goatCount,
        goatsByStatus,
        goatGenderDist,
        goatBreedDist,
        breeds,
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
        owners,
        vaccinationProtocols,
        feedRecipes,
        feedingSchedulesActive,
        dailyConsumption,
        pendingPayments,
        expensesByCategory,
        recentActivities,
      ] = await Promise.all([
        prisma.farm.findFirst({ select: { name: true, nameAr: true, farmType: true, currency: true } }),
        prisma.goat.count({ where: { status: 'ACTIVE' } }),
        prisma.goat.groupBy({ by: ['status'], _count: true }),
        // Gender distribution
        prisma.goat.groupBy({ by: ['gender'], where: { status: 'ACTIVE' }, _count: true }),
        // Breed distribution
        prisma.goat.groupBy({
          by: ['breedId'],
          where: { status: 'ACTIVE' },
          _count: true,
          orderBy: { _count: { breedId: 'desc' } },
          take: 15,
        }),
        // Breeds catalog for name mapping
        prisma.breed.findMany({
          select: { id: true, nameAr: true, name: true, type: { select: { nameAr: true, name: true } } },
          take: 30,
        }),
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
          select: { name: true, nameAr: true, category: true, unitPrice: true, reorderLevel: true },
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
          select: { name: true, nameAr: true, capacity: true, type: true, _count: { select: { goats: true } } },
        }),
        prisma.feedStock.findMany({
          where: { quantity: { gt: 0 } },
          include: { feedType: { select: { nameAr: true, name: true, reorderLevel: true } } },
          take: 20,
        }),
        prisma.inventoryItem.findMany({
          where: { currentStock: { lte: 5 } },
          select: { name: true, nameAr: true, currentStock: true, unit: true, category: true },
          take: 10,
        }),
        // Owners with goat counts
        prisma.owner.findMany({
          where: { isActive: true },
          select: { name: true, phone: true, _count: { select: { goats: true, expenses: true } } },
          take: 15,
        }),
        // Vaccination protocols
        prisma.vaccinationProtocol.findMany({
          where: { isActive: true },
          select: { nameAr: true, name: true, ageMonths: true, repeatMonths: true, medication: true, dosage: true, gender: true },
          take: 15,
        }),
        // Feed recipes with ingredients
        prisma.feedRecipe.findMany({
          where: { isActive: true },
          include: {
            items: {
              include: { feedType: { select: { nameAr: true, name: true } } },
            },
          },
          take: 10,
        }),
        // Active feeding schedules
        prisma.feedingSchedule.findMany({
          where: { isActive: true },
          include: {
            feedType: { select: { nameAr: true, name: true } },
            pen: { select: { name: true } },
            goat: { select: { name: true, tagId: true } },
            recipe: { select: { nameAr: true, name: true } },
          },
          take: 15,
        }),
        // Daily feed consumption last 7 days
        prisma.dailyFeedConsumption.findMany({
          where: { date: { gte: lastWeek } },
          include: { feedType: { select: { nameAr: true, name: true } }, pen: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 50,
        }),
        // Pending/partial payments
        prisma.sale.findMany({
          where: { paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
          select: { buyerName: true, salePrice: true, paymentStatus: true, date: true, goat: { select: { name: true, tagId: true } } },
          take: 10,
        }),
        // Expense breakdown by category this month
        prisma.expense.groupBy({
          by: ['category'],
          where: { date: { gte: lastMonth } },
          _sum: { amount: true },
          _count: true,
        }),
        // Recent activity log
        prisma.activityLog.findMany({
          take: 15,
          orderBy: { createdAt: 'desc' },
          select: { action: true, entity: true, description: true, createdAt: true },
        }),
      ])

      const fmtDate = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString('ar-AE') : 'غير محدد'

      // Build breed name map
      const breedMap = new Map(breeds.map(b => [b.id, `${b.nameAr || b.name} (${b.type?.nameAr || b.type?.name || ''})`]))

      const farmContext = `
═══════ بيانات المزرعة الشاملة ═══════

📊 نظرة عامة:
- اسم المزرعة: ${farm?.nameAr || farm?.name || 'غير محدد'}
- نوع المزرعة: ${farm?.farmType === 'CAMEL' ? 'إبل' : farm?.farmType === 'MIXED' ? 'مختلطة' : farm?.farmType === 'SHEEP' ? 'أغنام' : 'ماعز'}
- العملة: ${farm?.currency || 'AED'}
- عدد الحيوانات النشطة: ${goatCount}
- توزيع الحالات: ${goatsByStatus.map(g => {
        const statusLabel: Record<string, string> = { ACTIVE: 'نشط', SOLD: 'مباع', DECEASED: 'نافق', QUARANTINE: 'حجر', EXTERNAL: 'خارجي' }
        return `${statusLabel[g.status] || g.status}: ${g._count}`
      }).join('، ')}

🚻 التوزيع حسب الجنس (النشطة فقط):
${goatGenderDist.map(g => `- ${g.gender === 'MALE' ? 'ذكور' : 'إناث'}: ${g._count}`).join('\n')}

🐐 التوزيع حسب السلالة (النشطة):
${goatBreedDist.length === 0 ? '- لا توجد بيانات سلالات' : goatBreedDist.map(g => `- ${breedMap.get(g.breedId) || g.breedId}: ${g._count} رأس`).join('\n')}

👤 الملاك:
${owners.length === 0 ? '- لا يوجد ملاك مسجلون' : owners.map(o => `- ${o.name}: ${o._count.goats} رأس، ${o._count.expenses} مصروف${o.phone ? ' | هاتف: ' + o.phone : ''}`).join('\n')}

📅 التقويم والأحداث (آخر شهر - الشهر القادم):
${calendarEvents.length === 0 ? '- لا توجد أحداث مسجلة' : calendarEvents.map(e => `- [${e.isCompleted ? '✅' : '⏳'}] ${e.title} (${e.eventType}) - ${fmtDate(e.date)}${e.description ? ': ' + e.description : ''}`).join('\n')}

🏥 آخر السجلات الصحية:
${healthRecords.length === 0 ? '- لا توجد سجلات صحية' : healthRecords.map(r => `- ${r.goat?.name || r.goat?.tagId || 'غير محدد'}: ${r.type} - ${r.description || ''} (${fmtDate(r.date)})${r.medication ? ' [دواء: ' + r.medication + ']' : ''}${r.cost ? ' [تكلفة: ' + r.cost + ']' : ''}`).join('\n')}

💉 تطعيمات/علاجات مستحقة (30 يوم القادمة):
${upcomingVaccinations.length === 0 ? '- لا توجد مواعيد مستحقة' : upcomingVaccinations.map(v => `- ${v.goat?.name || v.goat?.tagId}: ${v.type} - مستحق ${fmtDate(v.nextDueDate)}`).join('\n')}

📋 بروتوكولات التطعيم المعتمدة:
${vaccinationProtocols.length === 0 ? '- لا توجد بروتوكولات' : vaccinationProtocols.map(p => `- ${p.nameAr || p.name}: عمر ${p.ageMonths} شهر${p.repeatMonths ? '، يتكرر كل ' + p.repeatMonths + ' شهر' : ''}${p.medication ? ' | دواء: ' + p.medication : ''}${p.gender ? ' | جنس: ' + (p.gender === 'MALE' ? 'ذكور' : 'إناث') : ' | الجنسين'}`).join('\n')}

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
${recentBirths.length === 0 ? '- لا توجد ولادات مسجلة' : recentBirths.map(b => `- ${fmtDate(b.createdAt)}: الأم ${b.breeding?.mother?.name || b.breeding?.mother?.tagId || '؟'} - ${b.gender === 'MALE' ? 'ذكر' : 'أنثى'} (${b.weight ? b.weight + ' كجم' : ''}) [${b.status === 'ALIVE' ? 'حي' : b.status === 'STILLBORN' ? 'ميت' : 'نفق'}]`).join('\n')}

💰 المبيعات (آخر 10):
${recentSales.length === 0 ? '- لا توجد مبيعات' : recentSales.map(s => `- ${s.goat?.name || s.goat?.tagId || '؟'} → ${s.buyerName || 'مشتري'}: ${s.salePrice} (${fmtDate(s.date)}) [${s.paymentStatus === 'PAID' ? 'مدفوع' : s.paymentStatus === 'PARTIAL' ? 'جزئي' : 'معلق'}]`).join('\n')}
- إجمالي مبيعات الشهر: ${salesTotal._sum?.salePrice || 0}

💳 مدفوعات معلقة:
${pendingPayments.length === 0 ? '- لا توجد مدفوعات معلقة' : pendingPayments.map(p => `- ${p.goat?.name || p.goat?.tagId || '؟'} → ${p.buyerName}: ${p.salePrice} [${p.paymentStatus === 'PARTIAL' ? 'جزئي' : 'معلق'}] (${fmtDate(p.date)})`).join('\n')}

📤 المصاريف (آخر 10):
${recentExpenses.length === 0 ? '- لا توجد مصاريف' : recentExpenses.map(e => `- ${e.category}: ${e.amount} - ${e.description || ''} (${fmtDate(e.date)})`).join('\n')}
- إجمالي مصاريف الشهر: ${expensesTotal._sum?.amount || 0}
- صافي الربح التقريبي للشهر: ${(salesTotal._sum?.salePrice || 0) - (expensesTotal._sum?.amount || 0)}

📊 توزيع المصاريف حسب الفئة (هذا الشهر):
${expensesByCategory.length === 0 ? '- لا توجد مصاريف' : expensesByCategory.map(e => {
        const catLabel: Record<string, string> = { FEED: 'أعلاف', MEDICINE: 'أدوية', VETERINARY: 'بيطري', EQUIPMENT: 'معدات', LABOR: 'عمالة', UTILITIES: 'خدمات', MAINTENANCE: 'صيانة', OTHER: 'أخرى' }
        return `- ${catLabel[e.category] || e.category}: ${e._sum?.amount || 0} (${e._count} عملية)`
      }).join('\n')}

🏠 الحظائر:
${pens.length === 0 ? '- لا توجد حظائر' : pens.map(p => `- ${p.nameAr || p.name}${p.type ? ' (' + p.type + ')' : ''}: ${p._count.goats}/${p.capacity || '∞'} رأس ${p.capacity ? `(${Math.round(p._count.goats / p.capacity * 100)}%)` : ''}`).join('\n')}

🌾 مخزون الأعلاف:
${feedStockLevels.length === 0 ? '- لا يوجد مخزون أعلاف' : feedStockLevels.map(f => {
        const low = f.feedType.reorderLevel && f.quantity <= f.feedType.reorderLevel
        return `- ${f.feedType.nameAr || f.feedType.name}: ${f.quantity} ${f.unit || 'كجم'}${low ? ' ⚠️ منخفض!' : ''}`
      }).join('\n')}
🔔 أعلاف تحت الحد الأدنى: ${feedStockLevels.filter(f => f.feedType.reorderLevel && f.quantity <= f.feedType.reorderLevel).length} نوع

🍽️ أنواع الأعلاف المتوفرة:
${feedTypes.map(f => `- ${f.nameAr || f.name} (${f.category}) - سعر الوحدة: ${f.unitPrice || 'غير محدد'}${f.reorderLevel ? ' | حد إعادة الطلب: ' + f.reorderLevel : ''}`).join('\n')}

🧪 خلطات الأعلاف (الوصفات):
${feedRecipes.length === 0 ? '- لا توجد خلطات مسجلة' : feedRecipes.map(r => `- ${r.nameAr || r.name}: ${r.items.map(i => `${i.feedType?.nameAr || i.feedType?.name || '؟'} ${i.percentage}%`).join(' + ')}`).join('\n')}

⏰ جداول التغذية النشطة:
${feedingSchedulesActive.length === 0 ? '- لا توجد جداول تغذية نشطة' : feedingSchedulesActive.map(s => `- ${s.feedType?.nameAr || s.feedType?.name || '؟'}: ${s.quantity} ${s.frequency}x يومياً${s.pen ? ' | حظيرة: ' + s.pen.name : ''}${s.goat ? ' | حيوان: ' + (s.goat.name || s.goat.tagId) : ''}${s.recipe ? ' | خلطة: ' + (s.recipe.nameAr || s.recipe.name) : ''}`).join('\n')}

📈 استهلاك الأعلاف (آخر 7 أيام):
${dailyConsumption.length === 0 ? '- لا توجد بيانات استهلاك' : (() => {
        const byDay = new Map<string, { total: number; items: string[] }>()
        dailyConsumption.forEach(c => {
          const day = fmtDate(c.date)
          const entry = byDay.get(day) || { total: 0, items: [] }
          entry.total += c.quantity
          entry.items.push(`${c.feedType?.nameAr || c.feedType?.name}: ${c.quantity}${c.pen ? ' (' + c.pen.name + ')' : ''}`)
          byDay.set(day, entry)
        })
        return Array.from(byDay.entries()).map(([day, data]) => `- ${day}: إجمالي ${data.total.toFixed(1)} كجم [${data.items.join('، ')}]`).join('\n')
      })()}

📦 مخزون منخفض (مستلزمات):
${inventoryLow.length === 0 ? '- المخزون جيد' : inventoryLow.map(i => `- ${i.nameAr || i.name} (${i.category}): ${i.currentStock} ${i.unit || ''} ⚠️`).join('\n')}

📝 آخر النشاطات في النظام:
${recentActivities.length === 0 ? '- لا توجد نشاطات مسجلة' : recentActivities.map(a => `- [${fmtDate(a.createdAt)}] ${a.action} ${a.entity}: ${a.description}`).join('\n')}

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
