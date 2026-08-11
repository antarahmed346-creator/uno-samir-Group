'use client'

// WHAT: زرار قلب (مفضلة) على كل كارت منتج
// WHY:  الموقع مفيهوش تسجيل دخول للعميل (الطلب برقم التليفون بس)
//       فمفيش "حساب مستخدم" نحفظ فيه المفضلة على السيرفر.
//       الحل الصح هنا هو localStorage — يفضل محفوظ على نفس الجهاز
//       حتى لو العميل قفل المتصفح وفتحه تاني.
// KILL: لو اتشالت، زرار القلب هيبقى شكل بس من غير أي وظيفة حقيقية

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

const STORAGE_KEY = 'uno-samir-favorites'

// WHAT: يقرأ قائمة الـ IDs المحفوظة من localStorage
// WHY:  مصدر واحد للحقيقة يستخدمه كل زرار قلب في الموقع
function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function setFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  // WHAT: بيبعت حدث مخصص عشان أي زرار تاني أو صفحة المفضلة تتحدث فوراً
  // WHY:  localStorage مش بيبعت event في نفس الـ tab تلقائياً
  window.dispatchEvent(new Event('favorites-changed'))
}

export function toggleFavorite(productId: string): boolean {
  const current = getFavorites()
  const exists = current.includes(productId)
  const next = exists ? current.filter((id) => id !== productId) : [...current, productId]
  setFavorites(next)
  return !exists // true = بقى في المفضلة, false = اتشال
}

export function useFavoriteIds(): string[] {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    setIds(getFavorites())
    const handler = () => setIds(getFavorites())
    window.addEventListener('favorites-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('favorites-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return ids
}

export default function FavoriteButton({ productId }: { productId: string }) {
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    setIsFav(getFavorites().includes(productId))
    const handler = () => setIsFav(getFavorites().includes(productId))
    window.addEventListener('favorites-changed', handler)
    return () => window.removeEventListener('favorites-changed', handler)
  }, [productId])

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(productId)
      }}
      aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center z-10"
    >
      <Heart
        className={`w-3.5 h-3.5 transition-colors ${
          isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'
        }`}
      />
    </button>
  )
}
