'use client'

// WHAT: بيتابع حالة اتصال الـ Realtime ويظهر بانر لو الاتصال اتقطع
// WHY:  العميل يعرف إن التحديثات الفورية مش شغالة دلوقتي
// KILL: من غيره العميل مش هيعرف ليه السعر مش بيتحدث لوحده

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

// WHAT: أقصى عدد محاولات قبل ما نوقف ونسيب حالة "غير متصل" ثابتة
// WHY:  من غيره، لو الاتصال مستحيل يحصل (مشكلة شبكة/إعدادات)،
//       الكود كان بيحاول آلاف المرات في الدقيقة ويقفّل المتصفح —
//       ده اللي حصل بالظبط وخلى العداد يوصل لـ 114,000+
const MAX_RETRIES = 8

export function useRealtimeStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [retryCount, setRetryCount] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)
  // WHAT: قفل بيمنع فتح أكتر من محاولة اتصال في نفس اللحظة
  // WHY:  دي كانت السبب الحقيقي — الكود القديم كان يقدر يفتح
  //       محاولة جديدة قبل ما القديمة تخلص، فيتضاعفوا بسرعة
  const isSubscribingRef = useRef(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    let isMounted = true
    let attempts = 0

    const cleanup = () => {
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      isSubscribingRef.current = false
    }

    const subscribe = () => {
      if (!isMounted || isSubscribingRef.current) return
      isSubscribingRef.current = true

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const channel = supabase.channel('connection-check')
      channelRef.current = channel

      channel
        .on('system', {}, (payload) => {
          if (!isMounted) return
          if (payload.type === 'connected') {
            setStatus('connected')
            setRetryCount(0)
            attempts = 0
          }
        })
        .subscribe((state) => {
          if (!isMounted) return
          isSubscribingRef.current = false

          if (state === 'SUBSCRIBED') {
            setStatus('connected')
            setRetryCount(0)
            attempts = 0
            return
          }

          if (state === 'CLOSED' || state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
            setStatus('disconnected')
            attempts += 1
            setRetryCount(attempts)

            // WHAT: بعد ما نوصل للحد الأقصى، بنوقف تماماً
            // WHY:  أحسن نسيب بانر ثابت "الاتصال مقطوع" بدل ما نفضل
            //       نحاول لانهائياً ونستهلك موارد المتصفح
            if (attempts >= MAX_RETRIES) {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
              }
              return
            }

            if (channelRef.current) {
              supabase.removeChannel(channelRef.current)
              channelRef.current = null
            }

            // WHAT: كل محاولة بتستنى وقت أطول من اللي قبلها (exponential backoff)
            // WHY:  محاولة كل 5 ثواني بالظبط لو فيه مشكلة شبكة حقيقية
            //       بتستهلك موارد من غير فايدة — الانتظار المتزايد أرحم
            const delay = Math.min(5000 * Math.pow(1.6, attempts - 1), 30000)
            timeoutRef.current = setTimeout(subscribe, delay)
          }
        })
    }

    subscribe()

    return cleanup
  }, [])

  return { status, retryCount }
}
