'use client'

// WHAT: جرس إشعارات حقيقي للعميل — عروض جديدة، منتجات جديدة، كوبونات
// WHY:  الموقع مفيهوش حساب عميل، فمفيش سيرفر يحفظله "مقروء/غير مقروء" —
//       الحل: نحفظ آخر وقت فتح فيه الجرس على جهازه (localStorage)،
//       وأي إشعار بعد الوقت ده يتحسب "جديد"
// KILL: من غيره، الجرس هيفضل شكل بس من غير أي وظيفة حقيقية

import { useEffect, useId, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: 'new_offer' | 'new_product' | 'new_coupon' | 'announcement'
  title_ar: string
  body_ar: string | null
  link: string | null
  created_at: string
}

const STORAGE_KEY = 'uno-samir-last-seen-notif'
const typeIcon: Record<string, string> = {
  new_offer: '🏷️',
  new_product: '🍽️',
  new_coupon: '🎁',
  announcement: '📢',
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  // WHAT: هوية فريدة لكل نسخة من الكومبوننت
  // WHY:  NotificationBell بيتعرض مرتين في نفس الوقت في الصفحة —
  //       مرة جوا AppHeader (للموبايل) ومرة في الـ nav بتاع الديسكتوب
  //       (app/(public)/layout.tsx)، والاتنين موجودين في الـ DOM
  //       سوا فعلاً، الـ CSS بس بيخفي واحد فيهم بصرياً
  // KILL: من غيرها الاتنين بيستخدموا نفس اسم القناة
  //       'customer-notifications-feed' بالظبط، فتاني نسخة تحاول
  //       تعمل .on() على قناة اتعمللها .subscribe() بالفعل من النسخة
  //       الأولى، وده بيرمي uncaught error بيكرش الصفحة بالكامل:
  //       "cannot add `postgres_changes` callbacks ... after `subscribe()`"
  const instanceId = useId()

  useEffect(() => {
    const supabase = createBrowserClient()

    async function load() {
      const { data } = await supabase
        .from('customer_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      const list = (data as Notification[]) || []
      setNotifications(list)
      updateUnread(list)
    }

    function updateUnread(list: Notification[]) {
      const lastSeen = localStorage.getItem(STORAGE_KEY)
      const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0
      const count = list.filter((n) => new Date(n.created_at).getTime() > lastSeenTime).length
      setUnreadCount(count)
    }

    load()

    const channel = supabase
      .channel(`customer-notifications-feed-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customer_notifications' },
        (payload) => {
          setNotifications((prev) => {
            const next = [payload.new as Notification, ...prev].slice(0, 20)
            updateUnread(next)
            return next
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  function handleOpen() {
    setOpen((prev) => !prev)
    if (!open) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
      setUnreadCount(0)
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative flex-shrink-0"
        aria-label="الإشعارات"
      >
        <Bell className="w-[18px] h-[18px] text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 left-0 sm:left-auto sm:right-0 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 font-bold text-sm">
            الإشعارات
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">لا توجد إشعارات حالياً</div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || '#'}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 p-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg flex-shrink-0">{typeIcon[n.type] || '🔔'}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{n.title_ar}</p>
                  {n.body_ar && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {n.body_ar}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
