// lib/customer-identity.ts
//
// WHAT: بيتأكد إن الزائر عنده هوية حقيقية في Supabase Auth (auth.uid())
//       — لو عنده جلسة بالفعل (anonymous كانت أو بجوجل) بيرجعها زي
//       ما هي، لو مفيش، بيعمله anonymous sign-in جديد
// WHY:  الإشعارات والطلبات محتاجين auth.uid() ثابت عشان نربط بيه
//       البيانات — نفس المنطق مستخدم في ChatWidget.tsx بالظبط
// KILL: من غيرها، كل ميزة (شات، إشعارات، طلبات) هتعيد كتابة نفس
//       منطق "sign in anonymously" بشكل منفصل وممكن يحصل تعارض

import type { SupabaseClient } from '@supabase/supabase-js'

export async function ensureCustomerUid(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    console.error('[ensureCustomerUid] Anonymous sign-in failed:', error?.message)
    return null
  }
  return data.user.id
}
