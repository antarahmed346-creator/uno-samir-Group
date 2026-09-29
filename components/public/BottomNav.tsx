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

  const menuHref = localize('/info', locale)
  const ordersHref = localize('/track-order', locale)
  const favoritesHref = localize('/favorites', locale)

  const items = [
    { href: menuHref, label: isRTL ? 'القائمة' : 'Menu', icon: Menu },
    { href: ordersHref, label: isRTL ? 'الطلبات' : 'Orders', icon: ClipboardList },
    null, // مكان زرار السلة البارز في النص
    { href: favoritesHref, label: isRTL ? 'المفضلة' : 'Favorites', icon: Heart },
    { href: localize('/', locale), label: isRTL ? 'الرئيسية' : 'Home', icon: Home, isHome: true },
  ]

  // WHAT: أي صفحة مش تابعة صراحة للقائمة/الطلبات/المفضلة، الرئيسية
  //       بتتعلّم عليها كافتراضي
  // WHY:  من غيره، صفحة زي تفاصيل المنتج أو الدفع كانت بتخلي
  //       الدايرة تختفي تماماً من الشريط، مش بس تنتقل لتبويب
  //       تاني — ده بيحس العميل إنه "خرج" من التنقل الأساسي
  const matchesOther = [menuHref, ordersHref, favoritesHref].some((href) => pathname.startsWith(href))
  const isActive = (item: { href: string; isHome?: boolean }) =>
    item.isHome ? !matchesOther : pathname.startsWith(item.href)

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
        const active = isActive(item)
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
                  className="absolute -top-[36px] w-[42px] h-[42px] rounded-full bg-red-600 shadow-lg shadow-red-600/40 border-4 border-white dark:border-gray-900"
                />
              )}
              <Icon
                className={`relative w-[18px] h-[18px] transition-colors ${
                  active ? 'text-white -translate-y-[30px]' : 'text-gray-400 dark:text-gray-500'
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
