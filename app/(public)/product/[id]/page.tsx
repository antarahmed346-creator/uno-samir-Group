'use client'

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Star, Clock, Flame, ChevronLeft, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { createBrowserClient } from '@supabase/ssr'

// ─── Helper: read locale from cookie (works on server + client) ──────────
function useLocale() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === 'undefined') return 'ar'
      const match = document.cookie.match(/locale=([^;]+)/)
      return match ? match[1] : 'ar'
    },
    () => 'ar'
  )
}

// ─── Helper: translate text ────────────────────────────────────────────────
function t(ar: string | null | undefined, en: string | null | undefined, locale: string, fallback?: string): string {
  if (locale === 'en') {
    return en || ar || fallback || ''
  }
  return ar || en || fallback || ''
}

// ─── Supabase client ───────────────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProductPage() {
  const params = useParams()
  const id = params?.id as string
  
  const locale = useLocale()
  const isRTL = locale === 'ar'
  
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [showAdded, setShowAdded] = useState(false)

  const addItem = useCartStore((s) => s.addItem)

  const fetchProduct = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, brand:brands(*)')
        .eq('id', id)
        .single()
      
      if (error) throw error
      setProduct(data as Record<string, unknown>)
    } catch (err) {
      console.error('Error fetching product:', err)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  const handleAddToCart = () => {
    if (!product) return
    
    const customizations = []
    if (selectedSize) {
      const sizes = product.sizes as Array<Record<string, unknown>> | undefined
      const size = sizes?.find((s) => s.id === selectedSize)
      if (size) customizations.push({ 
        optionName: size.name_ar as string, 
        optionNameAr: size.name_ar as string, 
        priceAdjustment: size.price_adjustment as number || 0 
      })
    }
    
    selectedAddons.forEach(addonId => {
      const addons = product.addons as Array<Record<string, unknown>> | undefined
      const addon = addons?.find((a) => a.id === addonId)
      if (addon) customizations.push({ 
        optionName: addon.name_ar as string, 
        optionNameAr: addon.name_ar as string, 
        priceAdjustment: addon.price as number || 0 
      })
    })

    const cartProduct = {
      id: product.id as string,
      name: (product.name_en as string) || (product.name_ar as string),
      name_ar: product.name_ar as string | null,
      name_en: product.name_en as string | null,
      price: product.base_price as number,
      image_url: product.main_image_url as string | null,
      brand_id: product.brand_id as string,
      brand_name: ((product.brand as Record<string, unknown>)?.name_en as string) || ((product.brand as Record<string, unknown>)?.name_ar as string),
      brand_name_ar: (product.brand as Record<string, unknown>)?.name_ar as string | null,
      brand_name_en: (product.brand as Record<string, unknown>)?.name_en as string | null,
    }

    addItem(cartProduct, customizations, quantity)

    setShowAdded(true)
    setTimeout(() => setShowAdded(false), 2000)
  }

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center text-white">
        {isRTL ? 'المنتج غير موجود' : 'Product not found'}
      </div>
    )
  }

  const name = t(product.name_ar as string, product.name_en as string, locale, product.name_ar as string)
  const description = t(product.description_ar as string, product.description_en as string, locale, '')
  const brandName = t(
    (product.brand as Record<string, unknown>)?.name_ar as string, 
    (product.brand as Record<string, unknown>)?.name_en as string, 
    locale, 
    (product.brand as Record<string, unknown>)?.name_ar as string
  )

  const sizes = product.sizes as Array<Record<string, unknown>> | undefined
  const addons = product.addons as Array<Record<string, unknown>> | undefined

  const totalPrice = ((product.base_price as number) || 0) + 
    (selectedSize ? ((sizes?.find((s) => s.id === selectedSize)?.price_adjustment as number) || 0) : 0) +
    selectedAddons.reduce((sum, addonId) => {
      const addon = addons?.find((a) => a.id === addonId)
      return sum + ((addon?.price as number) || 0)
    }, 0)

  return (
    <div className="min-h-screen bg-[#090909] pb-32" dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      {/* Product Images */}
      <div className="relative h-[400px] md:h-[500px] bg-gray-800">
        {product.main_image_url ? (
          <Image
            src={product.main_image_url as string}
            alt={name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">🍽️</div>
        )}
        
        {/* Back button */}
        <Link
          href={`/${(product.brand as Record<string, unknown>)?.slug as string}`}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        </Link>

        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {product.is_featured === true && (
            <span className="bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <Star className="w-4 h-4" />
              {isRTL ? 'مميز' : 'Featured'}
            </span>
          )}
          {product.is_spicy === true && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <Flame className="w-4 h-4" />
              {isRTL ? 'حار' : 'Spicy'}
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="bg-[#111111] rounded-3xl p-6 border border-white/10">
          {/* Brand & Name */}
          <div className="mb-4">
            <p className="text-[#D4AF37] text-sm font-medium mb-1">{brandName}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{name}</h1>
            {(product.name_en as string | null | undefined) && locale === 'ar' && (
              <p className="text-white/50 text-sm mt-1">{product.name_en as string}</p>
            )}
            {!!product.name_ar && locale === 'en' && (
              <p className="text-white/50 text-sm mt-1">{product.name_ar as string}</p>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-white/70 leading-relaxed mb-6">{description}</p>
          )}

          {/* Price & Time */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-[#D4AF37]">{totalPrice}</span>
              <span className="text-white/50">{isRTL ? 'ج.م' : 'EGP'}</span>
            </div>
            {product.prep_time_minutes !== undefined && product.prep_time_minutes !== null && (
              <div className="flex items-center gap-1 text-white/50">
                <Clock className="w-4 h-4" />
                <span>{product.prep_time_minutes as number} {isRTL ? 'دقيقة' : 'min'}</span>
              </div>
            )}
          </div>

          {/* Sizes */}
          {sizes && sizes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                {isRTL ? 'الحجم' : 'Size'}
                <span className="text-white/40 text-sm font-normal">
                  {isRTL ? '(اختر حجم واحد)' : '(Choose one)'}
                </span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {sizes.map((size) => (
                  <button
                    key={size.id as string}
                    onClick={() => setSelectedSize(selectedSize === size.id ? null : size.id as string)}
                    className={`p-3 rounded-xl border transition-all text-center ${
                      selectedSize === size.id
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-white/10 text-white hover:border-white/30'
                    }`}
                  >
                    <p className="font-medium text-sm">{t(size.name_ar as string, size.name_en as string, locale, size.name_ar as string)}</p>
                    {(size.price_adjustment as number) > 0 && (
                      <p className="text-xs text-white/50 mt-1">+{size.price_adjustment as number} {isRTL ? 'ج.م' : 'EGP'}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Addons */}
          {addons && addons.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                {isRTL ? 'الإضافات' : 'Addons'}
                <span className="text-white/40 text-sm font-normal">
                  {isRTL ? '(اختر حتى undefined)' : '(Choose multiple)'}
                </span>
              </h3>
              <div className="space-y-2">
                {addons.map((addon) => (
                  <button
                    key={addon.id as string}
                    onClick={() => toggleAddon(addon.id as string)}
                    className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between ${
                      selectedAddons.includes(addon.id as string)
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className={selectedAddons.includes(addon.id as string) ? 'text-[#D4AF37]' : 'text-white'}>
                      {t(addon.name_ar as string, addon.name_en as string, locale, addon.name_ar as string)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-sm">+{addon.price as number} {isRTL ? 'ج.م' : 'EGP'}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAddons.includes(addon.id as string)
                          ? 'border-[#D4AF37] bg-[#D4AF37]'
                          : 'border-white/30'
                      }`}>
                        {selectedAddons.includes(addon.id as string) && (
                          <Plus className="w-3 h-3 text-black" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">{isRTL ? 'الكمية' : 'Quantity'}</h3>
            <div className="flex items-center gap-3 bg-white/10 rounded-full px-2 py-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            className="w-full py-4 bg-[#D4AF37] hover:bg-[#c49b2a] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>
              {isRTL ? 'أضف للسلة' : 'Add to Cart'} — {totalPrice} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          </motion.button>

          {/* Added notification */}
          <AnimatePresence>
            {showAdded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed bottom-24 left-4 right-4 bg-green-500 text-white py-3 px-6 rounded-xl text-center font-medium z-50"
              >
                {isRTL ? '✓ تمت الإضافة للسلة' : '✓ Added to cart'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}