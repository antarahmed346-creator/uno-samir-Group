'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  HomepageSection,
  Brand,
  Product,
  Offer,
} from '@/lib/types'
import { Star, Clock, Tag } from 'lucide-react'
import FavoriteButton from '@/components/public/FavoriteButton'
import AddToCartButton from '@/components/public/AddToCartButton'
import DOMPurify from 'isomorphic-dompurify'
import { localize } from '@/lib/i18n'

// WHAT: ينضف أي HTML جاي من الـ CustomSection قبل ما يترندر
// WHY:  المحتوى ده بيتكتب من لوحة التحكم — أي أدمن (brand_manager أو
//       content_editor) يقدر يكتبه، ولو دخل حساب حد غلط عليه ممكن
//       يحط سكريبت خبيث (XSS) يشتغل عند كل عميل بيفتح الصفحة
// KILL: من غير sanitize، dangerouslySetInnerHTML بيرندر أي HTML كما هو
//       بما فيه <script> tags — ده ثغرة أمنية حقيقية مش نظرية
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}

// ─── Helper: pick text based on locale ──────────────────────────
// WHAT: بياخد النص بلغة الموقع الحالية
// WHY:  الأدمن ممكن يظبط عنوان قسم بالعربي بس من غير ما يحط نسخة
//       إنجليزي — لو المستخدم مبدّل للإنجليزي، المفروض يشوف الافتراضي
//       الإنجليزي (fallback) مش النص العربي اللي الأدمن كتبه
// KILL: الترتيب القديم كان بيحط كل حقول اللغتين قبل الـ fallback،
//       فكان بيورّي عربي في وضع إنجليزي كل ما title_en يكون فاضي —
//       ده اللي كان بيحصل بالظبط لما الأدمن يظبط عنوان قسم بالعربي بس
function t(
  item: { name_ar?: string | null; name_en?: string | null; title_ar?: string | null; title_en?: string | null; description_ar?: string | null; description_en?: string | null; subtitle_ar?: string | null; subtitle_en?: string | null; text_ar?: string | null; text_en?: string | null; caption_ar?: string | null; caption_en?: string | null; cta_ar?: string | null; cta_en?: string | null },
  locale: string,
  fallback?: string
): string {
  if (locale === 'en') {
    return (
      item.name_en || item.title_en || item.description_en || item.subtitle_en || item.text_en || item.caption_en || item.cta_en ||
      fallback ||
      item.name_ar || item.title_ar || item.description_ar || item.subtitle_ar || item.text_ar || item.caption_ar || item.cta_ar || ''
    )
  }
  return (
    item.name_ar || item.title_ar || item.description_ar || item.subtitle_ar || item.text_ar || item.caption_ar || item.cta_ar ||
    fallback ||
    item.name_en || item.title_en || item.description_en || item.subtitle_en || item.text_en || item.caption_en || item.cta_en || ''
  )
}

// ─── Hero Section ──────────────────────────────────────────────

interface HeroSectionProps {
  section: HomepageSection
  brands: Brand[] | null
  offers?: Offer[] | null
  locale?: string
}

export function HeroSection({ section, offers, locale = 'ar' }: HeroSectionProps) {
  const content = (section.content || {}) as {
    slides?: Array<{
      image_url: string
      title_ar?: string
      title_en?: string
      subtitle_ar?: string
      subtitle_en?: string
      cta_ar?: string
      cta_en?: string
      link?: string
    }>
  }

  // WHAT: العروض النشطة (لو موجودة) بتتحول تلقائياً لسلايدز بتلف في
  //       البانر العلوي — مفيش داعي الأدمن يدخل يظبط سلايد يدوي لكل
  //       عرض بيضيفه
  // WHY:  ده بالظبط اللي طلبه العميل: العروض تظهر فوق مكان "عرض
  //       اليوم" وتتحرك لوحدها، بدل ما تكون قايمة ساكنة تحت الصفحة
  const offerSlides = (offers || [])
    .filter((offer) => offer.image_url)
    .map((offer) => ({
      image_url: offer.image_url as string,
      title_ar: offer.title_ar,
      title_en: offer.title_en,
      subtitle_ar: offer.description_ar || (offer.type === 'percentage' ? `خصم ${offer.discount_value}%` : undefined),
      subtitle_en: offer.description_en || (offer.type === 'percentage' ? `${offer.discount_value}% off` : undefined),
      cta_ar: 'اطلب دلوقتي 🍕',
      cta_en: 'Order Now 🍕',
      link: '/offers',
    }))

  const slides = offerSlides.length
    ? offerSlides
    : content.slides?.length
    ? content.slides
    : [
        {
          image_url: '',
          title_ar: section.title_ar || 'UNO & SAMIR GROUP',
          title_en: section.title_en || 'UNO & SAMIR GROUP',
          subtitle_ar:
            section.subtitle_ar ||
            'مجموعة مطاعم مرسى مطروح — أشهى البيتزا الإيطالية، الفطير المصري، والكريب الفرنسي',
          subtitle_en:
            section.subtitle_en ||
            'Marsa Matrouh Restaurant Group — Best Italian Pizza, Egyptian Feteer, and French Crêpes',
          cta_ar: 'اطلب دلوقتي 🍕',
          cta_en: 'Order Now 🍕',
          link: '/pizza-uno',
        },
      ]

  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const slide = slides[currentSlide]

  return (
    <section className="relative h-[400px] md:h-[520px] overflow-hidden">
      {/* Background: لو فيه عرض نشط، صورته بتتعرض هنا. لو مفيش،
          مفيش صورة تانية منفصلة — الخلفية المشتركة لكل الصفحة
          (في الـ layout) هي اللي بتظهر من وراها طبيعي، عشان
          تفضل صورة واحدة مستمرة، مش صورتين */}
      {slide.image_url ? (
        <Image
          src={slide.image_url}
          alt={t(slide, locale, '')}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-top"
          style={{
            backgroundImage: 'url(/images/hero-blend.jpg)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
          }}
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10"
        style={
          !slide.image_url
            ? {
                maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
              }
            : undefined
        }
      />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center px-6 md:px-16 text-white max-w-3xl">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-xs md:text-sm font-bold bg-white/25 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4">
            🔥 {offerSlides.length > 1
              ? (locale === 'en' ? 'Special Offers' : 'عروض خاصة')
              : (locale === 'en' ? "Today's Offer" : 'عرض اليوم')}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg leading-tight">
            {t(slide, locale, section.title_ar || 'UNO & SAMIR GROUP')}
          </h1>
          <p className="text-sm md:text-lg text-white/90 mb-6 leading-relaxed drop-shadow max-w-xl">
            {t({ subtitle_ar: slide.subtitle_ar, subtitle_en: slide.subtitle_en }, locale, section.subtitle_ar || '')}
          </p>
          {slide.link && (
            <Link
              href={slide.link}
              className="inline-block px-7 py-3 bg-white text-green-700 rounded-full font-bold text-sm md:text-base hover:bg-gray-100 transition shadow-lg"
            >
              {t({ cta_ar: slide.cta_ar, cta_en: slide.cta_en }, locale, locale === 'en' ? 'Order Now' : 'اطلب دلوقتي')}
            </Link>
          )}
        </motion.div>

        {/* Slide indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 right-6 md:right-16 flex gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentSlide ? 'bg-white w-5' : 'bg-white/50 w-1.5'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Brands Section ──────────────────────────────────────────────

interface BrandsSectionProps {
  section: HomepageSection
  brands: Brand[] | null
  locale?: string
}

const brandEmojis: Record<string, string> = {
  'pizza-uno': '🍕',
  'feteer-samir': '🥐',
  'uno-crepe': '🥞',
  'ala-el-roof': '☕',
}

// WHAT: خلفية باستيل فاتحة لأيقونة كل براند في كروت الـ Brands Row
// WHY:  نفس فكرة matrouhmarket — أيقونة ملونة فاتحة بدل خلفية غامقة تخنق التصميم
const brandPastelBg: Record<string, string> = {
  'pizza-uno': 'bg-green-100',
  'feteer-samir': 'bg-red-100',
  'uno-crepe': 'bg-amber-100',
  'ala-el-roof': 'bg-gray-100 dark:bg-gray-800',
}

export function BrandsSection({ section, brands, locale = 'ar' }: BrandsSectionProps) {
  const content = (section.content || {}) as { brand_ids?: string[] }
  const filteredBrands =
    content.brand_ids?.length && brands
      ? brands.filter((b) => content.brand_ids!.includes(b.id))
      : brands

  return (
    <section className="py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[15px] font-extrabold mb-3">
          {t(section, locale, locale === 'en' ? 'Our Brands' : 'البراندات بتاعتنا')}
        </h2>
        <div className="flex flex-col gap-2.5">
          {filteredBrands?.map((brand) =>
            brand.slug === 'ala-el-roof' ? (
              // WHAT: "على الروف" هو المكان الوحيد اللي فيه حجز طاولة —
              //       صفحة الحجز (/ala-el-roof/reserve) كانت موجودة
              //       وشغالة، بس مفيش ولا رابط واحد في الموقع كله بيوديك
              //       ليها. ضفنا زرار منفصل هنا عشان العميل يقدر يوصلها
              // WHY:  الصف بقى فيه هدفين مختلفين (شوف المنيو / احجز
              //       طاولة)، فقسمناه لرابطين منفصلين بدل رابط واحد
              //       يغطي الصف كله
              <div
                key={brand.id}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 transition-colors"
              >
                <Link
                  href={localize(`/${brand.slug}/menu`, locale)}
                  className="group flex items-center gap-3 flex-1 min-w-0"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      brandPastelBg[brand.slug] || 'bg-gray-100'
                    }`}
                  >
                    {brand.logo_url || brand.cover_url ? (
                      <div className="relative w-full h-full rounded-2xl overflow-hidden">
                        <Image src={brand.logo_url || brand.cover_url || ''} alt={t(brand, locale, '')} fill className="object-cover" />
                      </div>
                    ) : (
                      brandEmojis[brand.slug] || '☕'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-extrabold truncate">
                      {t(brand, locale, brand.name_ar || '')}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {locale === 'en'
                        ? (brand.description_en || brand.description_ar || 'Rooftop café')
                        : (brand.description_ar || 'كافيه واكتر')}
                    </p>
                  </div>
                </Link>
                <Link
                  href={localize("/ala-el-roof/reserve", locale)}
                  className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-[11.5px] font-bold px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-colors"
                >
                  {locale === 'en' ? 'Reserve' : 'احجز طاولة'}
                </Link>
              </div>
            ) : (
              <Link
                key={brand.id}
                href={localize(`/${brand.slug}/menu`, locale)}
                className="group flex items-center gap-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 transition-colors"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    brandPastelBg[brand.slug] || 'bg-gray-100'
                  }`}
                >
                  {brand.logo_url || brand.cover_url ? (
                    <div className="relative w-full h-full rounded-2xl overflow-hidden">
                      <Image src={brand.logo_url || brand.cover_url || ''} alt={t(brand, locale, '')} fill className="object-cover" />
                    </div>
                  ) : (
                    brandEmojis[brand.slug] || '🍽️'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-extrabold truncate">
                    {t(brand, locale, brand.name_ar || '')}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {locale === 'en'
                      ? (brand.description_en || brand.description_ar || 'Best food in Marsa Matrouh')
                      : (brand.description_ar || 'أشهى المأكولات في مرسى مطروح')}
                  </p>
                </div>
                <span className="text-gray-300 text-lg group-hover:-translate-x-0.5 transition-transform">‹</span>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Featured Products Section ───────────────────────────────────

// WHAT: نفس شكل Product من lib/types.ts بس زيادة عليه المقاسات/الأوزان
//       (لو موجودة) والبراند — عشان كارت الهوم بيدج يقدر يعرضهم
//       ويسمح للعميل يختار حجم من غير ما يفتح صفحة المنتج
interface ProductOption {
  id: string
  name: string
  name_ar: string
  name_en: string
  price_adjustment: number
}
interface ProductCustomizationGroup {
  id: string
  name: string
  name_ar: string
  name_en: string
  required: boolean
  min_select: number
  max_select: number
  options: ProductOption[]
}
type ProductWithOptions = Omit<Product, 'customization_groups'> & {
  customization_groups?: ProductCustomizationGroup[]
  brand?: Brand
}

interface FeaturedSectionProps {
  section: HomepageSection
  products: ProductWithOptions[] | null
  locale?: string
}

export function FeaturedSection({ section, products, locale = 'ar' }: FeaturedSectionProps) {
  const content = (section.content || {}) as { product_ids?: string[]; limit?: number }
  const filteredProducts =
    content.product_ids?.length && products
      ? products.filter((p) => content.product_ids!.includes(p.id))
      : products

  return (
    <section className="py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-extrabold">
            {t(section, locale, locale === 'en' ? 'Recommended for You' : 'موصى به لك')}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts?.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductCard({ product, locale }: { product: ProductWithOptions; locale: string }) {
  const hasDiscount =
    product.compare_price && product.compare_price > product.base_price

  // WHAT: أول مجموعة مقاسات/أوزان للمنتج (لو الأدمن ضاف واحدة) — بتتعرض
  //       كتاجات صغيرة تحت الاسم عشان العميل يشوف الخيارات المتاحة بسرعة
  const sizeGroup = product.customization_groups?.[0]
  const brandName = product.brand
    ? t(product.brand, locale, product.brand.name_ar)
    : ''

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300">
      <div className="relative aspect-square bg-gray-50 dark:bg-gray-800">
        <Link href={localize(`/product/${product.id}`, locale)} className="absolute inset-0">
          {product.main_image_url ? (
            <Image
              src={product.main_image_url}
              alt={t(product, locale, '')}
              fill
              className="object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-3xl">🍽️</div>
          )}
        </Link>
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
            {locale === 'en' ? 'Sale' : 'خصم'}
          </span>
        )}
        <FavoriteButton productId={product.id} />
      </div>
      <div className="p-2">
        <Link href={localize(`/product/${product.id}`, locale)}>
          <h3 className="font-bold text-[11px] mb-1 leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-green-700 transition">
            {t(product, locale, product.name_ar || '')}
          </h3>
        </Link>

        {!!sizeGroup?.options.length && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {sizeGroup.options.slice(0, 3).map((opt) => (
              <span
                key={opt.id}
                className="text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                {t(opt, locale, opt.name_ar)}
              </span>
            ))}
            {sizeGroup.options.length > 3 && (
              <span className="text-[8.5px] text-gray-400">+{sizeGroup.options.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-red-600 font-extrabold text-[12px]">
            {product.base_price.toLocaleString(locale === 'en' ? 'en-US' : 'ar-EG')}
          </span>
          {hasDiscount && (
            <span className="text-gray-400 line-through text-[9.5px]">
              {product.compare_price!.toLocaleString(locale === 'en' ? 'en-US' : 'ar-EG')}
            </span>
          )}
        </div>

        <AddToCartButton
          product={{
            id: product.id,
            name: product.name_en || product.name_ar,
            name_ar: product.name_ar,
            name_en: product.name_en || null,
            price: product.base_price,
            image_url: product.main_image_url,
            brand_id: product.brand_id,
            brand_name: brandName,
            brand_name_ar: product.brand?.name_ar || null,
            brand_name_en: product.brand?.name_en || null,
          }}
          customizationGroups={product.customization_groups}
          compact
        />
      </div>
    </div>
  )
}

// ─── Offers Section ──────────────────────────────────────────────

interface OffersSectionProps {
  section: HomepageSection
  offers: Offer[] | null
  locale?: string
}

export function OffersSection({ section, offers, locale = 'ar' }: OffersSectionProps) {
  const content = (section.content || {}) as { offer_ids?: string[] }
  const filteredOffers =
    content.offer_ids?.length && offers
      ? offers.filter((o) => content.offer_ids!.includes(o.id))
      : offers

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-center">
          {t(section, locale, locale === 'en' ? 'Special Offers 🔥' : 'عروض خاصة 🔥')}
        </h2>
        {section.subtitle_ar && (
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            {locale === 'en' ? (section.subtitle_en || section.subtitle_ar) : section.subtitle_ar}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOffers?.map((offer) => (
            <OfferCard key={offer.id} offer={offer} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}

function OfferCard({ offer, locale }: { offer: Offer; locale: string }) {
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date()
  const discountLabel =
    offer.type === 'percentage'
      ? `-%${offer.discount_value}`
      : `-${offer.discount_value.toLocaleString(locale === 'en' ? 'en-US' : 'ar-EG')} ${locale === 'en' ? 'EGP' : 'ج.م'}`

  return (
    <div
      className={`relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg ${
        isExpired ? 'opacity-60' : ''
      }`}
    >
      {offer.image_url && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <Image
            src={offer.image_url}
            alt={t(offer, locale, '')}
            fill
            className="object-cover opacity-20"
          />
        </div>
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
            <Tag className="w-4 h-4 inline-block ml-1" />
            {discountLabel}
          </span>
          {offer.expires_at && !isExpired && (
            <CountdownTimer expiresAt={offer.expires_at} locale={locale} />
          )}
        </div>
        <h3 className="text-2xl font-bold mb-2">{t(offer, locale, offer.title_ar || '')}</h3>
        <p className="text-white/90 mb-4">
          {locale === 'en' ? (offer.description_en || offer.description_ar) : offer.description_ar}
        </p>
        {offer.promo_code && (
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center font-mono font-bold">
            {locale === 'en' ? 'Code:' : 'كود:'} {offer.promo_code}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ═══ CountdownTimer — FIXED: useState<string | null>(null) ═══
// ═══════════════════════════════════════════════════════════════
function CountdownTimer({ expiresAt, locale }: { expiresAt: string; locale: string }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft(locale === 'en' ? 'Expired' : 'انتهى')
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, locale])

  // Server render: null (placeholder) | Client render: actual time
  if (timeLeft === null) {
    return (
      <span className="flex items-center gap-1 text-sm bg-black/20 px-2 py-1 rounded-full">
        <Clock className="w-4 h-4" />
        <span className="w-16 h-4 bg-white/20 rounded animate-pulse" />
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 text-sm bg-black/20 px-2 py-1 rounded-full">
      <Clock className="w-4 h-4" />
      {timeLeft}
    </span>
  )
}

// ─── Gallery Section ─────────────────────────────────────────────

interface GallerySectionProps {
  section: HomepageSection
  locale?: string
}

export function GallerySection({ section, locale = 'ar' }: GallerySectionProps) {
  const content = (section.content || {}) as {
    images?: Array<{ url: string; caption_ar?: string; caption_en?: string }>
  }

  const images = content.images || []

  return (
    <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">
          {t(section, locale, locale === 'en' ? 'Gallery' : 'معرض الصور')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-200">
              {img.url ? (
                <Image
                  src={img.url}
                  alt={t({ caption_ar: img.caption_ar, caption_en: img.caption_en }, locale, '')}
                  fill
                  className="object-cover group-hover:scale-110 transition duration-500"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">🖼️</span>
                </div>
              )}
              {img.caption_ar && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-4">
                  <p className="text-white font-medium">
                    {t({ caption_ar: img.caption_ar, caption_en: img.caption_en }, locale, '')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials Section ────────────────────────────────────────

interface TestimonialsSectionProps {
  section: HomepageSection
  locale?: string
}

export function TestimonialsSection({ section, locale = 'ar' }: TestimonialsSectionProps) {
  const content = (section.content || {}) as {
    testimonials?: Array<{
      name: string
      text_ar: string
      text_en?: string
      rating?: number
      avatar_url?: string
    }>
  }

  const testimonials = content.testimonials || []

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">
          {t(section, locale, locale === 'en' ? 'Customer Reviews' : 'آراء عملائنا')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-md dark:shadow-black/20">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < (item.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {locale === 'en' ? (item.text_en || item.text_ar) : item.text_ar}
              </p>
              <div className="flex items-center gap-3">
                {item.avatar_url ? (
                  <Image
                    src={item.avatar_url}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    {item.name.charAt(0)}
                  </div>
                )}
                <span className="font-bold">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Custom Section ──────────────────────────────────────────────

interface CustomSectionProps {
  section: HomepageSection
  locale?: string
}

export function CustomSection({ section, locale = 'ar' }: CustomSectionProps) {
  const content = (section.content || {}) as { html_ar?: string; html_en?: string }

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {section.title_ar && (
          <h2 className="text-3xl font-bold mb-4 text-center">
            {t(section, locale, '')}
          </h2>
        )}
        {locale === 'en' ? (
          content.html_en ? (
            <div
              className="prose prose-lg max-w-none mx-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html_en) }}
            />
          ) : content.html_ar ? (
            <div
              className="prose prose-lg max-w-none mx-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html_ar) }}
            />
          ) : null
        ) : (
          content.html_ar && (
            <div
              className="prose prose-lg max-w-none mx-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html_ar) }}
            />
          )
        )}
      </div>
    </section>
  )
}