import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { HomepageSection, Brand, Product, Offer } from '@/lib/types'
import {
  HeroSection,
  BrandsSection,
  FeaturedSection,
  OffersSection,
  GallerySection,
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
  const featuredProducts = productsRaw as unknown as Product[] | null
  const activeOffers = offersRaw as unknown as Offer[] | null

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
                  return <HeroSection key={section.id} section={section} brands={brands} locale={locale} />
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
                  return <OffersSection key={section.id} section={section} offers={activeOffers} locale={locale} />
                case 'gallery':
                  return <GallerySection key={section.id} section={section} locale={locale} />
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