'use client'

// WHAT: هيدر الموبايل المضغوط — "التوصيل إلى" + بحث + جرس إشعارات
// WHY:  نفس نمط تطبيقات التوصيل المصرية (matrouhmarket) اللي العميل
//       متعود عليه، بيوريله بسرعة إنه بيطلب لمنطقته الصح
// KILL: من غيره، الموبايل هيرجع للهيدر الديسكتوب الطويل اللي
//       بياخد مساحة كبيرة من شاشة صغيرة

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Mic } from 'lucide-react'
import NotificationBell from '@/components/public/NotificationBell'

export default function AppHeader({ locale = 'ar' }: { locale?: string }) {
  const [q, setQ] = useState('')
  const router = useRouter()
  const isRTL = locale === 'ar'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) {
      const prefix = locale === 'en' ? '/en' : ''
      router.push(`${prefix}/search?q=${encodeURIComponent(q.trim())}`)
    }
  }

  return (
    <div className="md:hidden bg-white dark:bg-gray-900 px-4 pt-4 pb-2 transition-colors">
      <div className="flex items-center mb-3">
        <NotificationBell isRTL={isRTL} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3.5 py-3"
      >
        <Mic className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isRTL ? 'دور على أكلة أو براند تحبه' : 'Search for food or a brand'}
          className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-gray-400 dark:text-gray-100 min-w-0"
        />
        <button type="submit" aria-label={isRTL ? 'بحث' : 'Search'}>
          <Search className="w-4 h-4 text-red-600 flex-shrink-0" />
        </button>
      </form>
    </div>
  )
}
