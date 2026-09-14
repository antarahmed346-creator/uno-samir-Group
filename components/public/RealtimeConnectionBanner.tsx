// WHAT: بيظهر بانر لو الاتصال الفوري مقطوع
// WHY:  العميل يعرف إن الأسعار مش هتتحدث لوحدها دلوقتي
// KILL: من غيره العميل مش هيفهم ليه السعر مش بيتغير أوتوماتيك

'use client'

import { useRealtimeStatus } from '@/lib/hooks/useRealtimeStatus'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

const MAX_RETRIES = 8

export default function RealtimeConnectionBanner() {
  const { status, retryCount } = useRealtimeStatus()
  const gaveUp = retryCount >= MAX_RETRIES

  const showDisconnected = status === 'disconnected'
  const showReconnected = status === 'connected' && retryCount > 0

  return (
    <>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          showDisconnected ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>
            {gaveUp
              ? 'التحديث الفوري مش شغال دلوقتي — الأسعار محتاجة تحديث الصفحة يدوياً'
              : `الاتصال انقطع — بنحاول تاني (${retryCount})`}
          </span>
          {!gaveUp && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 delay-500 ${
          showReconnected ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-green-500 text-green-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>رجع الاتصال — التحديث الفوري شغال تاني</span>
        </div>
      </div>
    </>
  )
}
