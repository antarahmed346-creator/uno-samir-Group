'use client'

// WHAT: زرار "فعّل الإشعارات" في صفحة الإعدادات — العميل يضغط عليه
//       مرة واحدة، المتصفح يسأله "تسمح بالإشعارات؟"، لو وافق بيتسجل
//       اشتراكه في قاعدة البيانات
// WHY:  اختيار العميل نفسه أفضل من إننا نسأله فجأة أول ما يفتح الموقع
//       — المتصفحات بتفضّل كده، وده اللي بيحقق "إشعار يوصل حتى لو
//       التطبيق قافل"
// KILL: من غيره مفيش طريقة للعميل يفعّل الإشعارات أصلاً

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { ensureCustomerUid } from '@/lib/customer-identity'
import { toast } from 'sonner'

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushNotificationToggle({ locale = 'ar' }: { locale?: string }) {
  const [status, setStatus] = useState<Status>('checking')
  const [busy, setBusy] = useState(false)
  const isRTL = locale !== 'en'

  useEffect(() => {
    async function check() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        setStatus('unsupported')
        return
      }
      if (Notification.permission === 'denied') {
        setStatus('denied')
        return
      }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const existing = await reg.pushManager.getSubscription()
        setStatus(existing ? 'on' : 'off')
      } catch {
        setStatus('off')
      }
    }
    check()
  }, [])

  async function handleEnable() {
    setBusy(true)
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        toast.error(isRTL ? 'الإشعارات مش متاحة دلوقتي' : 'Notifications unavailable right now')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const supabase = createBrowserClient()
      const customerUid = await ensureCustomerUid(supabase)
      if (!customerUid) {
        toast.error(isRTL ? 'حصل خطأ، جرب تاني' : 'Something went wrong, try again')
        return
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_uid: customerUid,
          subscription: subscription.toJSON(),
        }),
      })

      if (!res.ok) throw new Error('subscribe failed')

      setStatus('on')
      toast.success(isRTL ? '🔔 هتوصلك إشعارات طلباتك دلوقتي' : '🔔 You’ll now get order notifications')
    } catch (err) {
      console.error('[PushNotificationToggle] enable failed:', err)
      toast.error(isRTL ? 'فشل تفعيل الإشعارات' : 'Failed to enable notifications')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('off')
    } catch (err) {
      console.error('[PushNotificationToggle] disable failed:', err)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'unsupported') return null

  return (
    <button
      onClick={status === 'on' ? handleDisable : handleEnable}
      disabled={busy || status === 'checking' || status === 'denied'}
      className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
      style={{
        backgroundColor: status === 'on' ? '#16a34a1a' : '#6b72801a',
        color: status === 'on' ? '#16a34a' : '#6b7280',
      }}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : status === 'on' ? (
        <Bell className="w-3.5 h-3.5" />
      ) : (
        <BellOff className="w-3.5 h-3.5" />
      )}
      {status === 'denied'
        ? (isRTL ? 'محظورة من المتصفح' : 'Blocked in browser')
        : status === 'on'
          ? (isRTL ? 'مفعّلة' : 'On')
          : (isRTL ? 'فعّلها' : 'Enable')}
    </button>
  )
}
