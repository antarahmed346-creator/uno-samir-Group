'use client'

// WHAT: صفحة "المفضلة" — بتعرض المنتجات اللي العميل ضغط على قلبها
// WHY:  الموقع مفيهوش حساب مستخدم (الطلب برقم تليفون بس)، فالمفضلة
//       بتتخزن على الجهاز نفسه (localStorage) مش على السيرفر
// KILL: من غيرها، زرار القلب اللي في كل كارت منتج هيبقى بدون صفحة
//       تجمع اللي اتحفظ

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useFavoriteIds, toggleFavorite } from '@/components/public/FavoriteButton'
import type { Product } from '@/lib/types'
import { localize } from '@/lib/i18n'

function EmptyState({ locale }: { locale: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <svg viewBox="0 0 100 100" fill="none" stroke="#cbd5e1" strokeWidth={2.5} className="w-28 h-28 mb-5 opacity-60">
        <circle cx="34" cy="30" r="16" />
        <path d="M27 30 L41 30 M34 23 L34 37" strokeWidth={3} transform="rotate(45 34 30)" />
        <path d="M15 55 L15 82 L75 82 L75 55" strokeLinecap="round" />
        <path d="M15 55 L38 55 L44 63 L60 63 L66 55 L75 55" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-gray-400 font-semibold text-sm">لسه مفيش حاجة في المفضلة</p>
      <Link href={localize("/", locale)} className="mt-4 text-red-600 font-bold text-sm">
        شوف المنيو ←
      </Link>
    </div>
  )
}

export default function FavoritesPage() {
  const favoriteIds = useFavoriteIds()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [locale, setLocale] = useState('ar')

  useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/)
    setLocale(match ? match[1] : 'ar')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (favoriteIds.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }
      setLoading(true)
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('products')
        .select('id, name_ar, name_en, base_price, compare_price, main_image_url')
        .in('id', favoriteIds)

      if (!cancelled) {
        setProducts((data as unknown as Product[]) || [])
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [favoriteIds])

  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4 py-6 min-h-[60vh]">
      <h1 className="text-xl font-extrabold mb-5">المفضلة</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative">
              <button
                onClick={() => toggleFavorite(product.id)}
                aria-label="إزالة من المفضلة"
                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center z-10"
              >
                <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              </button>
              <Link href={localize(`/product/${product.id}`, locale)}>
                <div className="relative h-28 bg-gray-50">
                  {product.main_image_url ? (
                    <Image src={product.main_image_url} alt={product.name_ar} fill className="object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-3xl">🍽️</div>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-bold text-[12px] mb-1 line-clamp-2">{product.name_ar}</h3>
                  <span className="text-red-600 font-extrabold text-[13px]">
                    {product.base_price?.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
