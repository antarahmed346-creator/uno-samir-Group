'use client'

// WHAT: آخر خط دفاع — لو حصل خطأ كبير يكسر الصفحة كلها (حتى
//       الـ layout نفسه)، الملف ده بيمسكه ويبعته لـ Sentry
//       قبل ما يوري العميل صفحة بيضا فاضية
// WHY:  من غيره، أخطاء الـ layout نفسه (نادرة بس خطيرة) مش
//       هتتسجل في Sentry خالص
// KILL: حذفه يفقدنا رؤية أي خطأ من النوع ده

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html dir="rtl" lang="ar">
      <body>
        <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>حصل خطأ غير متوقع</h2>
          <p>برجاء تحديث الصفحة أو المحاولة بعد شوية</p>
        </div>
      </body>
    </html>
  )
}
