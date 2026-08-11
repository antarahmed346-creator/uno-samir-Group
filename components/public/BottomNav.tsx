'use client'

// WHAT: شريط التنقل السفلي على الموبايل (زي matrouhmarket بالظبط)
// WHY:  أغلب عملاء المطعم هيطلبوا من موبايلهم — نفس نمط تطبيقات
//       التوصيل اللي الناس متعودة عليها بيسهّل عليهم يستخدموا الموقع
// KILL: من غيره، العميل على الموبايل هيحتاج يسكرول لفوق كل مرة
//       عشان يوصل لأي رابط تنقل

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Heart, Menu, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'

export default function BottomNav({ locale = 'ar' }: { locale?: string }) {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.getTotalItems())
  const isRTL = locale === 'ar'

  const items = [
    { href: '/info', label: isRTL ? 'القائمة' : 'Menu', icon: Menu },
    { href: '/track-order', label: isRTL ? 'الطلبات' : 'Orders', icon: ClipboardList },
    null, // مكان زرار السلة البارز في النص
    { href: '/favorites', label: isRTL ? 'المفضلة' : 'Favorites', icon: Heart },
    { href: '/', label: isRTL ? 'الرئيسية' : 'Home', icon: Home },
  ]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors flex items-center justify-around px-1 pt-2 pb-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {items.map((item, i) => {
        if (!item) {
          return (
            <Link
              key="cart"
              href="/cart"
              className="relative -mt-7 w-[52px] h-[52px] rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 border-4 border-white"
              
              aria-label={isRTL ? 'السلة' : 'Cart'}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-amber-400 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
          )
        }
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={i}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 text-[9.5px] font-bold transition-colors ${
              active ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 2} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
