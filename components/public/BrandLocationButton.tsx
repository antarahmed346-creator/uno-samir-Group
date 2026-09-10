'use client'

// WHAT: زرار "الموقع" في صفحة البراند — لو فيه موقع واحد بس بياخد العميل
//       على طول لجوجل ماب، لو فيه أكتر من موقع بيفتح قايمة صغيرة يختار منها
// WHY:  الأدمن ممكن يضيف أكتر من فرع لنفس البراند من الداشبورد

import { useEffect, useRef, useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'

interface Location {
  id: string
  label_ar: string
  label_en: string
  address: string | null
  google_maps_url: string
}

export default function BrandLocationButton({
  locations,
  locale = 'ar',
  compact = false,
}: {
  locations: Location[]
  locale?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isRTL = locale !== 'en'

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (locations.length === 0) return null

  // WHAT: نسخة مصغّرة تتناسب مع خلفية الصفحة العادية (بيضا/فاتحة) —
  //       النسخة الأصلية بيضا شفافة كانت مصممة تبان بس فوق بانر ملوّن
  const triggerClass = compact
    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-[12.5px] font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
    : 'inline-flex items-center gap-2 mt-8 mr-3 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-full font-bold hover:bg-white/20 transition'
  const iconClass = compact ? 'w-3.5 h-3.5' : 'w-5 h-5'

  // موقع واحد بس — زرار مباشر لجوجل ماب من غير أي قايمة
  if (locations.length === 1) {
    return (
      <a
        href={locations[0].google_maps_url}
        target="_blank"
        rel="noopener noreferrer"
        className={triggerClass}
      >
        <MapPin className={iconClass} />
        {isRTL ? 'الموقع على الخريطة' : 'View on Map'}
      </a>
    )
  }

  // أكتر من موقع — قايمة صغيرة يختار منها
  return (
    <div ref={ref} className={compact ? 'relative inline-block' : 'relative inline-block mt-8 mr-3'}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        <MapPin className={iconClass} />
        {isRTL ? 'مواقعنا' : 'Our Locations'}
        <ChevronDown className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="absolute top-full mt-2 start-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-20 text-start"
        >
          {locations.map((loc) => (
            <a
              key={loc.id}
              href={loc.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors"
            >
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {isRTL ? loc.label_ar : (loc.label_en || loc.label_ar)}
                </p>
                {loc.address && (
                  <p className="text-xs text-gray-400 mt-0.5">{loc.address}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
