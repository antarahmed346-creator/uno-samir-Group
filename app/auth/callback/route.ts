// app/auth/callback/route.ts
// WHAT: جوجل بيرجع هنا بعد ما العميل يوافق على تسجيل الدخول، ومعاه
//       "code" مؤقت — بنستبدله بجلسة حقيقية (session) للعميل
// WHY:  ده الجزء اللي بيحوّل موافقة جوجل لجلسة تسجيل دخول فعلية على
//       موقعنا — من غيره العميل يوافق عند جوجل بس يفضل غير مسجل عندنا
// SECURITY: الكود ده بيتستخدم مرة واحدة بس وبينتهي بسرعة لو ماتحولش
//           لجلسة — نفس آلية أي OAuth flow قياسي

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/info'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[Auth Callback] exchangeCodeForSession failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/info?auth_error=1`)
}
