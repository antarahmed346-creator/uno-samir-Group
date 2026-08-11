// WHAT: Client-side hook managing order notifications: sound + toast + badge count
// WHY:  Centralizes realtime logic so sidebar and orders page share one state
// KILL: Remove this and every component manages its own subscription = duplicate channels

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { subscribeToOrders, type OrderPayload } from "@/lib/supabase/realtime"
import { toast } from "sonner"

// WHAT: Generates a short beep using Web Audio API (no external MP3 needed)
// WHY:  Browsers block autoplay on Audio elements until user interaction; Web Audio is more reliable
// KILL: Remove this and notifications become silent
function playNotificationSound(): void {
  try {
    // WHAT: Get AudioContext constructor with proper typing to avoid circular reference
    // WHY:  AudioContext references itself in its own type, causing TS7022 error
    // KILL: Using AudioContext directly in typeof causes circular type reference
    const AC: typeof window.AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  } catch {
    // AudioContext not supported — silently fail
  }
}

export interface UseOrderNotificationsReturn {
  newCount: number
  resetCount: () => void
}

// WHAT: Hook that subscribes to new orders and triggers UI feedback
// WHY:  Provides a single source of truth for "unseen new orders" across admin UI
// KILL: Remove this and badge count + toast + sound all break
export function useOrderNotifications(brandId?: string): UseOrderNotificationsReturn {
  const [newCount, setNewCount] = useState<number>(0)
  const hasInteracted = useRef<boolean>(false)

  const resetCount = useCallback(() => {
    setNewCount(0)
  }, [])

  useEffect(() => {
    const unlockAudio = () => {
      hasInteracted.current = true
    }
    window.addEventListener("click", unlockAudio, { once: true })

    const unsubscribe = subscribeToOrders((order: OrderPayload) => {
      if (hasInteracted.current) {
        playNotificationSound()
      }

      toast.success(`طلب جديد! #${order.order_number || order.id.slice(0, 8)}`, {
        description: `${order.customer_name} — ${order.total?.toLocaleString("ar-EG") || "0"} ج.م`,
        duration: 6000,
        position: "top-left",
        action: {
          label: "عرض الطلب",
          onClick: () => {
            window.location.href = `/admin/orders/${order.id}`
          },
        },
      })

      setNewCount((prev) => prev + 1)
    }, brandId)

    return () => {
      unsubscribe()
      window.removeEventListener("click", unlockAudio)
    }
  }, [brandId])

  return { newCount, resetCount }
}