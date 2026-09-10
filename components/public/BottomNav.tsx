'use client'

// WHAT: شريط التنقل السفلي على الموبايل (زي matrouhmarket بالظبط)
// WHY:  أغلب عملاء المطعم هيطلبوا من موبايلهم — نفس نمط تطبيقات
//       التوصيل اللي الناس متعودة عليها بيسهّل عليهم يستخدموا الموقع
// KILL: من غيره، العميل على الموبايل هيحتاج يسكرول لفوق كل مرة
//       عشان يوصل لأي رابط تنقل

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Heart, Menu, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { localize } from '@/lib/i18n'

export default function BottomNav({ locale = 'ar' }: { locale?: string }) {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.getTotalItems())
  const isRTL = locale === 'ar'

  const items = [
    { href: localize('/info', locale), label: isRTL ? 'القائمة' : 'Menu', icon: Menu },
    { href: localize('/track-order', locale), label: isRTL ? 'الطلبات' : 'Orders', icon: ClipboardList },
    null, // مكان زرار السلة البارز في النص
    { href: localize('/favorites', locale), label: isRTL ? 'المفضلة' : 'Favorites', icon: Heart },
    { href: localize('/', locale), label: isRTL ? 'الرئيسية' : 'Home', icon: Home },
  ]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors flex items-center justify-around px-1 pt-2 pb-3 overflow-visible"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {items.map((item, i) => {
        if (!item) {
          return (
            <Link
              key="cart"
              href={localize('/cart', locale)}
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
            className="relative flex flex-col items-center gap-0.5 flex-1 py-1 text-[9.5px] font-bold"
          >
            <span className="relative w-[30px] h-[30px] flex items-center justify-center">
              {active && (
                <motion.span
                  layoutId="bottomNavActiveCircle"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute -top-[18px] w-[42px] h-[42px] rounded-full bg-red-600 shadow-lg shadow-red-600/40 border-4 border-white dark:border-gray-900"
                />
              )}
              <Icon
                className={`relative w-[18px] h-[18px] transition-colors ${
                  active ? 'text-white -translate-y-[18px]' : 'text-gray-400 dark:text-gray-500'
                }`}
                strokeWidth={active ? 2.4 : 2}
              />
            </span>
            <span className={active ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
