# وبر وصوف — تطبيق iOS/Android (React Native + Expo)

## المتطلبات
- Node.js 18+
- حساب Expo (مجاني): https://expo.dev
- حساب Apple Developer ($99/سنة) للنشر على App Store

## البدء السريع

### 1. تثبيت المكتبات
```bash
cd mobile
npm install
```

### 2. تشغيل محلياً
```bash
npx expo start
```
ثم افتح تطبيق **Expo Go** على هاتفك وامسح الـ QR code.

### 3. إعداد API URL
في ملف `lib/api.ts` غيّر `API_BASE`:
- للتطوير: ضع IP جهازك (مثال: `http://192.168.1.100:3000`)
- للإنتاج: ضع رابط السيرفر الحقيقي

## البناء والنشر (بدون Mac!)

### تثبيت EAS CLI
```bash
npm install -g eas-cli
eas login
```

### بناء iOS (سحابي)
```bash
eas build --platform ios --profile production
```
> يتم البناء على سيرفرات Expo السحابية — لا تحتاج Mac!

### رفع على App Store
```bash
eas submit --platform ios
```
> عدّل `eas.json` بمعلومات حساب Apple Developer أولاً.

### بناء Android
```bash
eas build --platform android --profile production
```

## هيكل المشروع
```
mobile/
├── app/                    # شاشات التطبيق (Expo Router)
│   ├── _layout.tsx         # Layout الجذر
│   ├── index.tsx           # شاشة البداية
│   ├── login.tsx           # تسجيل الدخول
│   └── (tabs)/             # التنقل الرئيسي
│       ├── _layout.tsx     # Tab Navigation
│       ├── index.tsx       # الرئيسية / Dashboard
│       ├── goats/          # إدارة القطيع
│       ├── health/         # السجلات الصحية
│       ├── sales/          # المبيعات
│       └── more.tsx        # المزيد / الإعدادات
├── components/             # المكونات المشتركة
│   ├── ui.tsx              # مكونات UI (Button, Input, etc)
│   ├── KPICard.tsx         # بطاقة إحصائية
│   └── GoatCard.tsx        # بطاقة حيوان
├── lib/                    # المكتبات المساعدة
│   ├── api.ts              # HTTP Client
│   ├── auth.tsx            # Auth Context
│   ├── storage.ts          # Secure Storage
│   └── theme.ts            # الألوان والخطوط
├── types/                  # TypeScript Types
└── assets/                 # الأيقونات والصور
```

## ملاحظات
- التطبيق يتصل بنفس API الموجود (Next.js)
- يستخدم Bearer Token بدلاً من Cookies
- التخزين المحلي عبر SecureStore (آمن) و AsyncStorage
- اتجاه RTL مفعّل تلقائياً
