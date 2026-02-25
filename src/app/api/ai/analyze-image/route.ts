import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runWithTenant } from '@/lib/tenantContext'

export const runtime = 'nodejs'
export const maxDuration = 60

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' })

const ANALYSIS_TYPES = {
  breed: {
    prompt: `أنت خبير بيطري في تحديد سلالات الماعز والأغنام والإبل.
حلّل هذه الصورة وقدم:

1. **السلالة المحتملة**: حدد السلالة الأقرب (مثل: نجدية، عارضية، شامية، بور، سعانين، حجازية، دمشقية، نوبية...)
2. **نسبة الثقة**: نسبة مئوية
3. **الصفات المميزة**: لون الجسم، شكل الأذن، شكل القرون، حجم الجسم
4. **العمر التقريبي**: استناداً للحجم والأسنان إن ظهرت
5. **الجنس**: ذكر أو أنثى إن أمكن
6. **الوزن التقريبي**: بالكيلوجرام
7. **ملاحظات إضافية**: أي ملاحظات مفيدة

أجب بتنسيق مرتب بالعربية. إذا لم تكن الصورة لحيوان، أوضح ذلك.`,
  },
  health: {
    prompt: `أنت طبيب بيطري متخصص في صحة الماعز والأغنام والإبل.
حلّل هذه الصورة من الناحية الصحية وقدم:

1. **الحالة العامة**: سليم / يحتاج فحص / حالة طارئة
2. **الأعراض المرئية**: صف أي أعراض تلاحظها (جروح، التهابات، تورم، إفرازات، تساقط شعر...)
3. **التشخيص المحتمل**: أذكر الاحتمالات الأكثر ترجيحاً
4. **خطورة الحالة**: منخفضة / متوسطة / عالية / حرجة
5. **الإسعافات الأولية**: ما يمكن عمله فوراً
6. **العلاج المقترح**: الأدوية أو الإجراءات المقترحة
7. **هل يحتاج طبيب بيطري؟**: نعم / لا + السبب

⚠️ تنبيه: هذا تشخيص مبدئي فقط. يجب مراجعة طبيب بيطري للحالات الخطيرة.
أجب بتنسيق مرتب بالعربية.`,
  },
  wound: {
    prompt: `أنت متخصص في الجروح والالتهابات البيطرية للماعز والأغنام.
حلّل هذه الصورة للجرح/الالتهاب وقدم:

1. **نوع الإصابة**: جرح سطحي / عميق / كسر / التهاب / خراج / فطريات / طفيليات
2. **حجم الإصابة**: صغير / متوسط / كبير
3. **مرحلة الشفاء**: حاد / مزمن / في طور الشفاء
4. **درجة الخطورة**: 1 (بسيط) إلى 5 (حرج)
5. **خطوات العلاج الفورية**:
   - التنظيف
   - التعقيم
   - الضمادات
   - المضادات الحيوية
6. **الأدوية المقترحة**: أسماء محددة مع الجرعات
7. **مدة الشفاء المتوقعة**: بالأيام
8. **متى يجب زيارة البيطري**: فوراً / خلال 24 ساعة / عند تدهور الحالة

⚠️ هذا تقييم مبدئي. راجع طبيب بيطري للحالات الخطيرة.
أجب بالعربية بتنسيق واضح.`,
  },
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'view_goats')
    if (auth.response) return auth.response

    return runWithTenant(auth.tenantId, auth.farmId, async () => {
      const formData = await request.formData()
      const imageFile = formData.get('image') as File | null
      const analysisType = (formData.get('type') as string) || 'breed'
      const additionalNotes = (formData.get('notes') as string) || ''

      if (!imageFile) {
        return new Response(
          JSON.stringify({ error: 'الرجاء إرفاق صورة' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
      if (!validTypes.includes(imageFile.type)) {
        return new Response(
          JSON.stringify({ error: 'نوع الملف غير مدعوم. استخدم JPEG, PNG, أو WebP' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Max 10MB
      if (imageFile.size > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'حجم الصورة يجب أن يكون أقل من 10 ميجابايت' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const config = ANALYSIS_TYPES[analysisType as keyof typeof ANALYSIS_TYPES] || ANALYSIS_TYPES.breed

      // Get farm breeds for context
      const farmBreeds = await prisma.breed.findMany({
        select: { name: true, nameAr: true, characteristics: true },
      })

      const breedContext = farmBreeds.length > 0
        ? `\n\nالسلالات المسجلة في المزرعة: ${farmBreeds.map(b => b.nameAr || b.name).join('، ')}`
        : ''

      let systemPrompt = config.prompt + breedContext
      if (additionalNotes) {
        systemPrompt += `\n\nملاحظات إضافية من المستخدم: ${additionalNotes}`
      }

      // Convert image to base64
      const arrayBuffer = await imageFile.arrayBuffer()
      const base64Image = Buffer.from(arrayBuffer).toString('base64')

      // Try models with fallback
      const models = ['gemini-2.5-pro', 'gemini-2.5-flash']
      let resultText = ''

      for (const modelName of models) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  {
                    inlineData: {
                      mimeType: imageFile.type,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
          })
          resultText = response.text || 'عذراً، لم أتمكن من تحليل الصورة.'
          break
        } catch (modelError: unknown) {
          const errMsg = modelError instanceof Error ? modelError.message : String(modelError)
          if ((errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) && modelName !== models[models.length - 1]) {
            console.warn(`${modelName} unavailable for image analysis, trying fallback...`)
            continue
          }
          throw modelError
        }
      }

      return new Response(
        JSON.stringify({
          analysis: resultText,
          type: analysisType,
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    })
  } catch (error: unknown) {
    console.error('Image Analysis error:', error)
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد المجاني. يرجى الانتظار دقيقة ثم المحاولة.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response(
      JSON.stringify({ error: `خطأ في تحليل الصورة: ${msg.substring(0, 200)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
