// WHAT: تفعيل Sentry على جانب السيرفر (أخطاء API routes والصفحات
//       اللي بتتبني على السيرفر)
// WHY:  أغلب أخطاء الموقع المهمة (فشل إنشاء طلب، استعلام قاعدة
//       بيانات فشل) بتحصل هنا، مش في المتصفح
// KILL: حذف الملف ده يوقف تتبع أخطاء السيرفر بالكامل

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  debug: false,
})
