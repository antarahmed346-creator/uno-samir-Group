// WHAT: تفعيل Sentry على جانب المتصفح (أخطاء تحصل عند العميل)
// WHY:  من غيره، أي خطأ بيحصل للعميل وهو بيستخدم الموقع محدش هيعرف
//       عنه غير لما هو نفسه يشتكي
// KILL: حذف الملف ده بيوقف تتبع أخطاء المتصفح بالكامل

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // WHAT: مش بنستخدم performance tracing، بس تسجيل الأخطاء فعلياً
  // WHY:  العميل طلب يعرف لو حصل خطأ، مش تتبع أداء كل طلب — ودي
  //       الميزة اللي بتضيف أكبر حجم للكود المحمّل في المتصفح.
  //       الدالة دي بتخلي webpack يقدر يشيل كود التتبع خالص من
  //       الحزمة النهائية بدل ما يتحمّل ويتعطّل بس وقت التشغيل
  tracesSampleRate: 0,
  integrations: Sentry.getDefaultIntegrationsWithoutPerformance,

  debug: false,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
