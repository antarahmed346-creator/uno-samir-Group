// WHAT: ملف Next.js الرسمي اللي بيشغّل كود عند بداية السيرفر أو
//       الـ edge runtime - هنا بنحمّل إعدادات Sentry المناسبة
// WHY:  Next.js بيستدعي register() ده تلقائي، مش محتاجين نستدعيه
//       إحنا بإيدينا من أي مكان
// KILL: من غيره، Sentry مش هيتفعّل خالص على السيرفر أو الـ edge

import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
