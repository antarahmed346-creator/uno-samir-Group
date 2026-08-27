import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { HomepageSection, Brand, Product, Offer } from '@/lib/types'
import {
  HeroSection,
  BrandsSection,
  FeaturedSection,
  TestimonialsSection,
  CustomSection,
} from '@/components/homepage/sections'
import {
  generateSeoMetadata,
  OrganizationJsonLd,
  LocalBusinessJsonLd,
  WebSiteJsonLd,
} from '@/lib/seo'
import RealtimeProvider from '@/components/public/RealtimeProvider'
import CategoryChips from '@/components/public/CategoryChips'
import { Suspense } from 'react'

export const metadata = generateSeoMetadata({
  title: 'UNO & SAMIR GROUP',
  titleAr: 'يونو وسمير جروب',
  description: 'مجموعة مطاعم مرسى مطروح — أشهى البيتزا الإيطالية، الفطير المصري، والكريب الفرنسي',
  descriptionEn: 'Marsa Matrouh Restaurant Group — Best Italian Pizza, Egyptian Feteer, and French Crêpes',
  path: '/',
  keywords: ['مطاعم مرسى مطروح', 'بيتزا', 'فطير', 'كريب', 'UNO', 'SAMIR', 'مطروح', 'مطعم'],
})

// WHAT: Loading skeleton for homepage sections
// WHY:  Prevents layout shift while data loads; improves perceived performance
// KILL: No skeleton = blank page → content jump = poor CLS
function HomepageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-[500px] bg-gray-200 rounded-lg" />
      <div className="h-64 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default async function Homepage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'

  const supabase = await createServerClient()

  // WHAT: Parallel data fetching
  // WHY:  Promise.all fetches all data simultaneously = faster TTFB
  // KILL: Sequential fetching = slower page load
  const [{ data: sections }, { data: brandsRaw }, { data: productsRaw }, { data: offersRaw }] =
    await Promise.all([
      supabase
        .from('homepage_sections')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('brands')
        .select('id, slug, name_ar, name_en, description_ar, description_en, cover_url, status, sort_order')
        .eq('status', 'active')
        .order('sort_order'),
      supabase
        .from('products')
        .select('id, name_ar, name_en, base_price, compare_price, main_image_url, brand_id, category_id, is_featured, status')
        .eq('is_featured', true)
        .eq('status', 'active')
        .limit(8),
      supabase
        .from('offers')
        .select('id, title_ar, title_en, description_ar, description_en, image_url, discount_value, type, starts_at, expires_at, status')
        .eq('status', 'active')
        .lte('starts_at', new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(4),
    ])

  const brands = brandsRaw as unknown as Brand[] | null
  const featuredProductsRaw = productsRaw as unknown as Product[] | null
  const activeOffers = offersRaw as unknown as Offer[] | null

  // WHAT: نجيب مقاسات/أوزان كل منتج مميز (لو الأدمن ضافها) عشان تظهر تحت
  //       الكارت في الهوم بيدج، والعميل يقدر يختارها من غير ما يفتح صفحة المنتج
  // WHY:  أسماء الأعمدة هنا لازم تطابق الأعمدة الحقيقية اللي
  //       ProductFormWrapper.tsx بيكتب بيها فعلياً وقت حفظ منتج من الأدمن
  //       (is_required/min_selections/max_selections/price_modifier) — مش
  //       نفس الأسماء اللي AddToCartButton بيستناها كـ props (required/
  //       min_select/max_select/price_adjustment)، فبنعمل mapping هنا
  const featuredIds = featuredProductsRaw?.map((p) => p.id) || []
  let featuredGroupsRaw: {
    id: string; name_ar: string; name_en: string; is_required: boolean
    min_selections: number; max_selections: number | null; product_id: string
    customization_options: { id: string; name_ar: string; name_en: string; price_modifier: number }[]
  }[] = []

  if (featuredIds.length > 0) {
    const { data, error } = await supabase
      .from('customization_groups')
      .select(`
        id, name_ar, name_en, is_required, min_selections, max_selections, product_id,
        customization_options ( id, name_ar, name_en, price_modifier )
      `)
      .in('product_id', featuredIds)

    if (error) console.error('[Homepage] customization_groups fetch failed:', error.message)
    featuredGroupsRaw = data || []
  }

  const featuredProducts = featuredProductsRaw?.map((product) => {
    const brand = brands?.find((b) => b.id === product.brand_id)
    const groups = featuredGroupsRaw
      .filter((g) => g.product_id === product.id)
      .map((g) => ({
        id: g.id,
        name: g.name_ar,
        name_ar: g.name_ar,
        name_en: g.name_en,
        required: g.is_required,
        min_select: g.is_required ? Math.max(1, g.min_selections || 1) : (g.min_selections || 0),
        max_select: g.max_selections ?? 1,
        options: (g.customization_options || []).map((o) => ({
          id: o.id,
          name: o.name_ar,
          name_ar: o.name_ar,
          name_en: o.name_en,
          price_adjustment: o.price_modifier || 0,
        })),
      }))
    return { ...product, customization_groups: groups, brand }
  }) || null

  return (
    <>
      <OrganizationJsonLd />
      <LocalBusinessJsonLd />
      <WebSiteJsonLd searchUrl="/search?q={search_term_string}" />

      <RealtimeProvider>
        <Suspense fallback={<HomepageSkeleton />}>
          <div className="space-y-0">
            {(sections as HomepageSection[] | null)?.map((section) => {
              switch (section.type) {
                case 'hero':
                  return <HeroSection key={section.id} section={section} brands={brands} offers={activeOffers} locale={locale} />
                case 'brands':
                  return (
                    <div key={section.id}>
                      <BrandsSection section={section} brands={brands} locale={locale} />
                      <CategoryChips brands={brands} locale={locale} />
                    </div>
                  )
                case 'featured':
                  return (
                    <FeaturedSection
                      key={section.id}
                      section={section}
                      products={featuredProducts}
                      locale={locale}
                    />
                  )
                case 'offers':
                  // WHAT: العروض بقت بتظهر في البانر العلوي بدل القايمة هنا
                  // WHY:  طلب العميل تحديداً — العروض تتحرك لوحدها فوق
                  //       جنب "عرض اليوم"، مش قايمة ساكنة تحت الصفحة
                  return null
                case 'testimonials':
                  return <TestimonialsSection key={section.id} section={section} locale={locale} />
                case 'custom':
                  return <CustomSection key={section.id} section={section} locale={locale} />
                default:
                  return null
              }
            })}
          </div>
        </Suspense>
      </RealtimeProvider>
    </>
  )
}