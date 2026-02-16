# إضافة خط Cairo لـ PDF

## الخطوات المطلوبة لتضمين خط Cairo في ملفات PDF:

### الطريقة 1: استخدام Courier (الحل الحالي)
الحل الحالي يستخدم خط Courier والذي يدعم العربية بشكل جيد في jsPDF.

### الطريقة 2: إضافة خط Cairo الكامل (اختياري)

إذا كنت تريد استخدام خط Cairo بالضبط كما في التطبيق:

1. تحميل خط Cairo من Google Fonts:
   ```
   https://fonts.google.com/specimen/Cairo
   ```

2. تحويل الخط إلى Base64 باستخدام:
   ```bash
   npm install -D font2base64-cli
   font2base64 Cairo-Regular.ttf
   ```

3. إضافة الخط في `pdfHelper.ts`:
   ```typescript
   doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64)
   doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal')
   doc.setFont('Cairo')
   ```

### حجم الخط
- خط Cairo الكامل سيزيد حجم التطبيق بحوالي 200-300 KB
- الحل الحالي (Courier) لا يضيف أي حجم إضافي

### الحالة الحالية
✅ النصوص العربية تعمل بشكل صحيح
✅ دعم RTL (من اليمين لليسار)
✅ الجداول منسقة بشكل احترافي
✅ أرقام الصفحات بالعربية

## الاختبار
جرب تصدير أي تقرير PDF وتحقق من النتيجة.
