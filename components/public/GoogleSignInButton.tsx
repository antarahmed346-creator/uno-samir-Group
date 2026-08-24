'use client'

// WHAT: زرار "تسجيل دخول بجوجل" — بيدّي العميل هوية دائمة (حفظ
//       طلباته، أسهل تواصل)
// WHY:  لو العميل عنده جلسة anonymous بالفعل (من الشات أو طلب سابق)،
//       بنستخدم linkIdentity بدل signInWithOAuth العادي — ده بيربط
//       حساب جوجل بنفس الـ uid القديم بتاعه، فمبيفقدش سجل طلباته
//       ولا اشتراك الإشعارات بتاعه
// KILL: signInWithOAuth العادي كان هيعمل uid جديد كل مرة ويقطع الرابط
//       مع أي بيانات قديمة مرتبطة بالعميل

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function GoogleSignInButton({ locale = 'ar' }: { locale?: string }) {
  const [loading, setLoading] = useState(false)
  const isRTL = locale !== 'en'

  async function handleSignIn() {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/info`

      const { data: { session } } = await supabase.auth.getSession()

      // WHAT: linkIdentity ميزة أحدث نسبياً في مكتبة Supabase — بنتأكد
      //       إنها فعلاً موجودة في النسخة المثبتة قبل ما نستخدمها
      // WHY:  لو مش موجودة (نسخة أقدم)، بنرجع لـ signInWithOAuth
      //       العادي بدل ما نكسر الصفحة كاملة
      const authClient = supabase.auth as typeof supabase.auth & {
        linkIdentity?: (args: {
          provider: 'google'
          options: { redirectTo: string }
        }) => Promise<{ error: { message: string } | null }>
      }

      if (session?.user?.is_anonymous && typeof authClient.linkIdentity === 'function') {
        // عنده جلسة anonymous بالفعل — نربط حساب جوجل بيها بدل ما
        // نبدأ من الصفر
        const { error } = await authClient.linkIdentity({
          provider: 'google',
          options: { redirectTo },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        })
        if (error) throw error
      }
      // signInWithOAuth/linkIdentity بيعمل redirect تلقائي لجوجل —
      // الكود بعد السطر ده مبيتنفذش عادةً
    } catch (err) {
      console.error('[GoogleSignInButton] failed:', err)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 font-semibold text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
      )}
      {isRTL ? 'تسجيل الدخول بجوجل' : 'Sign in with Google'}
    </button>
  )
}
