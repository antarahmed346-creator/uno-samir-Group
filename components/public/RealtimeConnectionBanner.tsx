// WHAT: بيظهر بانر لو الاتصال الفوري مقطوع
// WHY:  العميل يعرف إن الأسعار مش هتتحدث لوحدها دلوقتي
// KILL: من غيره العميل مش هيفهم ليه السعر مش بيتغير أوتوماتيك

'use client'

import { useRealtimeStatus } from '@/lib/hooks/useRealtimeStatus'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MAX_RETRIES = 8

export default function RealtimeConnectionBanner() {
  const { status, retryCount } = useRealtimeStatus()
  const gaveUp = retryCount >= MAX_RETRIES

  return (
    <AnimatePresence>
      {status === 'disconnected' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4" />
          <span>
            {gaveUp
              ? 'التحديث الفوري مش شغال دلوقتي — الأسعار محتاجة تحديث الصفحة يدوياً'
              : `الاتصال انقطع — بنحاول تاني (${retryCount})`}
          </span>
          {!gaveUp && <Loader2 className="w-4 h-4 animate-spin" />}
        </motion.div>
      )}

      {status === 'connected' && retryCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-green-500 text-green-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
        >
          <Wifi className="w-4 h-4" />
          <span>رجع الاتصال — التحديث الفوري شغال تاني</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
