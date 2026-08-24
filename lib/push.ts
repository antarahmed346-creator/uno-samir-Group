// WHAT: يبعت إشعار Push حقيقي لجهاز العميل — بيوصل حتى لو الموقع
//       مقفول تماماً، لأنه بيعدي على خوادم جوجل/آبل/موزيلا نفسها
//       (نفس الآلية اللي بتشتغل بيها تطبيقات native)
// WHY:  ده اللي بيحقق "الإشعار يوصل حتى لو التطبيق قافل" —
//       من غيره مفيش طريقة توصل إشعار لجهاز مقفول
// KILL: من غيره، أقصى حاجة نقدر نعملها هي toast جوا الموقع نفسه،
//       ومش هيظهر لو العميل مقفل التاب/الموقع

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

let vapidConfigured = false
function ensureVapidConfigured() {
  if (vapidConfigured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY مش موجودين في الـ environment variables'
    )
  }
  webpush.setVapidDetails(
    'mailto:support@uno-samir.com', // ⚠️ استبدله بإيميل دعم حقيقي لو حابب
    publicKey,
    privateKey
  )
  vapidConfigured = true
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

/**
 * يبعت إشعار لكل الأجهزة المسجلة لعميل معين (ممكن يكون عنده أكتر من
 * جهاز/متصفح). بيمسح تلقائياً أي اشتراك بقى منتهي الصلاحية (410 Gone)
 * — ده بيحصل عادي لما العميل يمسح الموقع أو يغيّر جهاز.
 */
export async function sendPushToCustomer(
  customerUid: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  ensureVapidConfigured()
  const supabase = getServiceClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('customer_uid', customerUid)

  if (error) {
    console.error('[sendPushToCustomer] Failed to load subscriptions:', error.message)
    return { sent: 0, failed: 0 }
  }
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0
  const expiredIds: string[] = []

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify(payload)
        )
        sent++
      } catch (err: unknown) {
        failed++
        const statusCode = (err as { statusCode?: number })?.statusCode
        // 404/410 = المتصفح ألغى الاشتراك (مسح الموقع، غيّر جهاز، إلخ)
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id)
        } else {
          console.error('[sendPushToCustomer] Send failed:', statusCode, err)
        }
      }
    })
  )

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return { sent, failed }
}
