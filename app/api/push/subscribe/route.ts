// app/api/push/subscribe/route.ts
// WHAT: بيحفظ اشتراك Push جديد للعميل الحالي
// WHY:  المتصفح بيدّينا endpoint + مفاتيح تشفير فريدة لكل جهاز/متصفح
//       وافق فيه العميل على الإشعارات — لازم نخزنها عشان نقدر نبعتله
//       إشعار بعدين

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const subscribeSchema = z.object({
  customer_uid: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const identifier = getClientIdentifier(request)
    const rl = await checkRateLimit(rateLimiters.chatMessage, identifier) // نفس حد الشات، معدل معقول لعملية زي دي
    if (!rl.allowed) {
      return Response.json({ error: 'حاول تاني بعد شوية' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { customer_uid, subscription } = parsed.data
    const serviceClient = getServiceClient()

    // upsert بالـ endpoint (unique) — لو العميل رجع يوافق تاني على نفس
    // الجهاز، منعملش صف مكرر، بس نحدّث الهوية المرتبطة بيه
    const { error } = await serviceClient
      .from('push_subscriptions')
      .upsert(
        {
          customer_uid,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: request.headers.get('user-agent') || null,
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[Push Subscribe] Error:', error)
      return Response.json({ error: 'فشل حفظ الاشتراك' }, { status: 500 })
    }

    return Response.json({ data: { subscribed: true } }, { status: 201 })
  } catch (err) {
    console.error('[Push Subscribe] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
