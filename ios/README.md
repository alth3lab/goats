# تطبيق إدارة المواشي - iOS

تطبيق iOS احترافي بـ SwiftUI متصل بالـ Backend (Next.js API).

## المتطلبات

- Xcode 16.0+
- iOS 17.0+
- macOS Sonoma+

## إعداد المشروع

### الطريقة 1: إنشاء من Xcode (الأسهل)

1. افتح **Xcode** → **File** → **New** → **Project**
2. اختر **iOS** → **App**
3. أدخل:
   - **Product Name:** `GoatApp`
   - **Organization Identifier:** `com.yourcompany`
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Storage:** None
4. احفظ المشروع في مجلد `ios/`
5. **احذف** ملفات `ContentView.swift` و `GoatAppApp.swift` الافتراضية
6. **اسحب** كل الملفات من `GoatApp/` إلى المشروع في Xcode

### الطريقة 2: استخدام ملف المشروع

```bash
cd ios/
open GoatApp.xcodeproj
```

## هيكل المشروع

```
ios/GoatApp/
├── App/
│   ├── GoatApp.swift              # نقطة البداية
│   ├── AppState.swift             # حالة التطبيق العامة  
│   └── Theme.swift                # الألوان والأنماط
├── Core/
│   ├── Network/
│   │   ├── APIClient.swift        # عميل HTTP مركزي
│   │   ├── AuthManager.swift      # إدارة المصادقة
│   │   └── KeychainHelper.swift   # تخزين آمن للتوكن
│   └── Models/
│       └── Models.swift           # جميع الـ Codable models
├── Features/
│   ├── Auth/
│   │   ├── LoginView.swift        # شاشة تسجيل الدخول
│   │   └── SplashView.swift       # شاشة البداية
│   ├── Dashboard/
│   │   ├── DashboardView.swift    # لوحة التحكم + الإحصائيات
│   │   └── FarmPickerView.swift   # اختيار المزرعة
│   ├── Goats/
│   │   ├── GoatListView.swift     # قائمة المواشي مع بحث وفلترة
│   │   ├── GoatDetailView.swift   # تفاصيل الماشية
│   │   └── GoatFormView.swift     # إضافة/تعديل ماشية
│   ├── Health/
│   │   └── HealthListView.swift   # السجلات الصحية + إضافة سجل
│   ├── Breeding/
│   │   └── BreedingListView.swift # التزاوج والولادات
│   ├── Feeds/
│   │   └── FeedsListView.swift    # الأعلاف
│   ├── Sales/
│   │   └── SalesListView.swift    # المبيعات
│   ├── Pens/
│   │   └── PensListView.swift     # الحظائر
│   ├── More/
│   │   └── MoreMenuView.swift     # المزيد + الإعدادات
│   └── MainTabView.swift          # التبويبات الرئيسية
├── Resources/
│   ├── Assets.xcassets/           # الصور والأيقونات
│   └── ar.lproj/
│       └── Localizable.strings    # الترجمة العربية
└── Info.plist                     # إعدادات التطبيق
```

## ربط الـ Backend

### Development (محلي)
التطبيق يتصل تلقائياً بـ `http://localhost:3000` في وضع Debug.

شغّل الـ Backend:
```bash
cd ../  # المجلد الرئيسي
npm run dev
```

### Production
غيّر الـ `baseURL` في `APIClient.swift`:
```swift
#if DEBUG
private let baseURL = "http://localhost:3000"
#else
private let baseURL = "https://your-api-domain.com"
#endif
```

## المصادقة

- التطبيق يستخدم **JWT Bearer Token** لكل الطلبات
- التوكن يُخزن بشكل آمن في **Keychain**
- تجديد تلقائي للتوكن قبل انتهاء صلاحيته (24 ساعة)
- عند فشل التجديد → تسجيل خروج تلقائي

### تدفق المصادقة:
```
فتح التطبيق → فحص Keychain
├── لا يوجد توكن → شاشة تسجيل الدخول
└── يوجد توكن → تجديد التوكن (POST /api/auth/refresh)
    ├── نجح → الشاشة الرئيسية
    └── فشل → شاشة تسجيل الدخول
```

## الميزات المنفذة

- [x] تسجيل الدخول/الخروج مع Bearer Token
- [x] تخزين آمن للتوكن (Keychain)
- [x] تجديد تلقائي للتوكن
- [x] لوحة تحكم مع إحصائيات شاملة
- [x] إدارة المواشي (CRUD)
- [x] بحث وفلترة المواشي
- [x] عرض تفاصيل الماشية مع الصور
- [x] السجلات الصحية
- [x] التزاوج والولادات
- [x] الأعلاف ومراقبة المخزون
- [x] المبيعات والمدفوعات
- [x] المصاريف
- [x] الحظائر
- [x] تبديل المزرعة
- [x] دعم كامل للعربية (RTL)
- [x] واجهة حديثة عصرية

## ميزات قادمة

- [ ] Push Notifications (APNs)
- [ ] التقاط وتحميل صور الكاميرا
- [ ] تخزين محلي بـ SwiftData (Offline mode)
- [ ] شجرة العائلة (Family Tree)
- [ ] التقارير والرسوم البيانية (Charts)
- [ ] فتح بالبصمة/FaceID
- [ ] المساعد الذكي (AI Chat)
- [ ] التقويم والمواعيد
- [ ] البحث الشامل
- [ ] Dark Mode

## نقاط API المستخدمة

| Endpoint | الوظيفة |
|----------|---------|
| `POST /api/auth/login` | تسجيل الدخول |
| `POST /api/auth/refresh` | تجديد التوكن |
| `GET /api/auth/me` | بيانات المستخدم |
| `POST /api/auth/logout` | تسجيل الخروج |
| `GET /api/stats` | الإحصائيات |
| `GET/POST /api/goats` | المواشي |
| `GET/PUT/DELETE /api/goats/[id]` | تفاصيل الماشية |
| `GET/POST /api/health` | السجلات الصحية |
| `GET/POST /api/breeding` | التزاوج |
| `GET /api/feeds` | الأعلاف |
| `GET/POST /api/sales` | المبيعات |
| `GET/POST /api/pens` | الحظائر |
| `GET/POST /api/expenses` | المصاريف |
| `GET /api/breeds` | السلالات |
| `POST /api/farms/switch` | تبديل المزرعة |
| `POST /api/push/device` | تسجيل الجهاز للإشعارات |
