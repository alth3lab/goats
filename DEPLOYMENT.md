# نشر المشروع على Nixpacks (Railway, Render, etc)

## 📋 المتطلبات الأساسية

### 1️⃣ إعداد قاعدة البيانات
تأكد من وجود قاعدة بيانات MySQL/PostgreSQL جاهزة مع connection string.

### 2️⃣ متغيرات البيئة المطلوبة

```env
# قاعدة البيانات
DATABASE_URL="mysql://user:password@host:port/database_name"

# أو PostgreSQL
# DATABASE_URL="postgresql://user:password@host:port/database_name"

# JWT Secret (اختياري للمصادقة)
JWT_SECRET="your-secret-key-here"
```

---

## 🚀 خطوات النشر على Railway

### 1. إنشاء مشروع جديد
```bash
railway login
railway init
```

### 2. إضافة قاعدة بيانات MySQL
في واجهة Railway:
- اضغط على "New" → "Database" → "MySQL"
- انسخ الـ `DATABASE_URL`

### 3. إعداد متغيرات البيئة
```bash
railway variables set DATABASE_URL="your-connection-string"
```

أو من الواجهة:
- Settings → Variables → Add Variable

### 4. دفع الكود والنشر
```bash
git add .
git commit -m "Deploy to Railway"
railway up
```

### 5. تشغيل Migrations
بعد أول نشر:
```bash
railway run npx prisma db push
railway run npm run db:seed
```

---

## 🚀 خطوات النشر على Render

### 1. إنشاء Web Service جديد
- اذهب إلى [Render Dashboard](https://dashboard.render.com)
- New → Web Service
- اربط repository الخاص بك

### 2. إعدادات Build & Deploy
```yaml
Build Command: npm ci && npx prisma generate && npm run build
Start Command: npm run start
```

### 3. إضافة قاعدة بيانات
- اذهب إلى Dashboard
- New → PostgreSQL (مجاني)
- انسخ Internal Database URL

### 4. Environment Variables
أضف في Render:
```
DATABASE_URL = [Internal Database URL]
NODE_ENV = production
```

### 5. Deploy
- اضغط "Create Web Service"
- انتظر البناء

### 6. تشغيل Migrations
من Render Shell:
```bash
npx prisma db push
npm run db:seed
```

---

## 🚀 خطوات النشر على Easypanel

### 1. إنشاء مشروع
```bash
# في Easypanel Dashboard
1. New Project → From Git
2. Repository: اربط GitHub repo
3. Build Method: Nixpacks (auto-detect)
```

### 2. إعدادات البيئة
```yaml
# في Environment Variables
DATABASE_URL: mysql://mysql:password@mysql:3306/goats_db
NODE_ENV: production
```

### 3. إضافة MySQL Service
```bash
1. Add Service → MySQL
2. Database: goats_db
3. Copy connection details
```

### 4. Deploy
```bash
git push origin main
# Easypanel سيبني المشروع تلقائياً
```

### 5. تشغيل Migrations
```bash
# من Terminal في Easypanel
npx prisma db push
npm run db:seed
```

---

## 🔧 ملف nixpacks.toml

المشروع يحتوي على `nixpacks.toml` الذي يقوم بـ:

1. **تثبيت Node.js 20** و OpenSSL
2. **تثبيت المكتبات:** `npm ci`
3. **إنشاء Prisma Client:** `npx prisma generate`
4. **بناء Next.js:** `npm run build`
5. **تشغيل المشروع:** `npm run start`

---

## 🧪 تجربة محلية بـ Nixpacks

```bash
# تثبيت nixpacks
curl -sSL https://nixpacks.com/install.sh | bash

# بناء المشروع
nixpacks build . --name goats-app

# تشغيل المشروع
docker run -p 3000:3000 -e DATABASE_URL="your-db-url" goats-app
```

---

## ⚠️ ملاحظات مهمة

### Prisma Migrations
بعد كل deployment، تأكد من تشغيل:
```bash
npx prisma db push
# أو
npx prisma migrate deploy
```

### الأداء
- Next.js يستخدم **Standalone Output** للحصول على أصغر حجم
- Prisma Client يُنشأ أثناء البناء
- Static assets تُخزن في `.next/static`

### الـ Logs
لمشاهدة الأخطاء:
```bash
# Railway
railway logs

# Render
من Dashboard → Logs tab
```

---

## 📊 البيانات الأولية (Seed)

بعد أول deployment:
```bash
npm run db:seed
```

هذا سينشئ:
- مستخدم admin (اسم: admin, كلمة سر: admin123)
- بيانات تجريبية للماعز
- سجلات صحية
- سجلات تكاثر

---

## 🔗 روابط مفيدة

- [Nixpacks Documentation](https://nixpacks.com/)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
