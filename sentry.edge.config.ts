// WHAT: تفعيل Sentry على الـ edge runtime (الـ middleware بتاع
//       الموقع - فحص تسجيل الدخول، تحديد اللغة)
// WHY:  middleware.ts بيشتغل على كل طلب تقريباً، فلو فيه خطأ فيه
//       هيأثر على الموقع كله
// KILL: حذف الملف ده يوقف تتبع أخطاء الـ middleware بالكامل

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  debug: false,
})
