'use client'

// WHAT: Real-time countdown timer for limited-time offers
// WHY:  Creates urgency for flash deals; auto-hides when offer expires
// KILL: Remove this → flash deals look like regular offers, no urgency

import { useState, useEffect, useCallback } from 'react'
import { Zap } from 'lucide-react'

interface FlashDealCountdownProps {
  expiresAt: string
  onExpire?: () => void
  locale?: string
}

// WHAT: Format remaining time into HH:MM:SS
// WHY:  Consistent display format across all countdowns
// KILL: Wrong format = confusing user experience
function formatTime(ms: number): { hours: string; minutes: string; seconds: string; isExpired: boolean } {
  if (ms <= 0) return { hours: '00', minutes: '00', seconds: '00', isExpired: true }

  const seconds = Math.floor((ms / 1000) % 60)
  const minutes = Math.floor((ms / 1000 / 60) % 60)
  const hours = Math.floor(ms / 1000 / 60 / 60)

  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
    isExpired: false,
  }
}

export default function FlashDealCountdown({ expiresAt, onExpire, locale = 'ar' }: FlashDealCountdownProps) {
  const isRTL = locale === 'ar'
  
  // WHAT: Calculate remaining time from target date
  // WHY:  Client-side calculation ensures accuracy regardless of server time
  // KILL: Server-side only = wrong time for users in different timezones
  const calculateRemaining = useCallback(() => {
    const now = new Date().getTime()
    const target = new Date(expiresAt).getTime()
    return target - now
  }, [expiresAt])

  const [timeLeft, setTimeLeft] = useState(calculateRemaining())
  const [isExpired, setIsExpired] = useState(timeLeft <= 0)

  // WHAT: Update countdown every second
  // WHY:  Real-time display creates urgency and accuracy
  // KILL: No interval = static display, user thinks time is wrong
  useEffect(() => {
    if (isExpired) return

    const interval = setInterval(() => {
      const remaining = calculateRemaining()
      setTimeLeft(remaining)

      if (remaining <= 0) {
        setIsExpired(true)
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [calculateRemaining, isExpired, onExpire])

  // WHAT: Sync with document visibility (tab switching)
  // WHY:  Browser pauses intervals in background tabs; resync prevents drift
  // KILL: No visibility sync = countdown freezes when user switches tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const remaining = calculateRemaining()
        setTimeLeft(remaining)
        if (remaining <= 0) {
          setIsExpired(true)
          onExpire?.()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [calculateRemaining, onExpire])

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 text-sm bg-black/30 px-3 py-2 rounded-full">
        <span className="line-through opacity-60">
          {isRTL ? 'انتهى العرض' : 'Offer Expired'}
        </span>
      </div>
    )
  }

  const { hours, minutes, seconds } = formatTime(timeLeft)
  const isUrgent = timeLeft < 1000 * 60 * 60 // Less than 1 hour

  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-full ${
      isUrgent 
        ? 'bg-red-500/30 animate-pulse' 
        : 'bg-black/20'
    }`}>
      <Zap className={`w-4 h-4 ${isUrgent ? 'text-yellow-300' : 'text-white'}`} />
      <span className="font-mono font-bold tabular-nums">
        {hours}:{minutes}:{seconds}
      </span>
      <span className="text-xs opacity-80">
        {isRTL ? 'متبقي' : 'left'}
      </span>
    </div>
  )
}