import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import {
  generateSeoMetadata,
  BreadcrumbJsonLd,
  OrganizationJsonLd,
} from '@/lib/seo'
import { BRAND_NAMES } from '@/lib/types'
import RealtimeProvider from '@/components/public/RealtimeProvider'

interface Product {
  id: string
  name_ar: string
  name_en: string
  description_ar?: string
  base_price: number
  compare_price?: number
  main_image_url?: string
  is_featured?: boolean
}

interface Props {
  params: Promise<{ brand: string }>
}

export async function generateMetadata({ params }: Props) {
  const { brand: brandSlug } = await params
  const supabase = await createServerClient()
  const { data: brand } = await supabase
    .from('brands')
    .select('name_ar, name_en, description_ar, description_en, cover_url, meta_title_ar, meta_title_en, meta_desc_ar, meta_desc_en')
    .eq('slug', brandSlug)
    .single()

  if (!brand) return generateSeoMetadata({ title: 'غير موجود', noIndex: true })

  return generateSeoMetadata({
    title: brand.meta_title_ar || brand.name_ar,
    description: brand.meta_desc_ar || brand.description_ar || undefined,
    image: brand.cover_url || undefined,
    path: `/${brandSlug}`,
    keywords: [brand.name_ar, brand.name_en, 'مطعم', 'مرسى مطروح', 'منيو'],
  })
}

export default async function BrandPage({ params }: Props) {
  const { brand: brandSlug } = await params

  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale === 'ar'

  const supabase = await createServerClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', brandSlug)
    .single()

  if (!brand) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .order('sort_order')

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .eq('is_available', true)
    .order('sort_order')

  const colors: Record<string, string> = {
    'pizza-uno': 'from-green-600 to-green-800',
    'feteer-samir': 'from-red-600 to-red-800',
    'uno-crepe': 'from-yellow-500 to-amber-800',
    'ala-el-roof': 'from-gray-900 to-black',
  }

  const brandName = BRAND_NAMES[brand.slug as keyof typeof BRAND_NAMES]

  const localize = (path: string) =>
    locale === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path

  const t = (ar: string | null | undefined, en: string | null | undefined, fallback: string) =>
    locale === 'en' ? (en || ar || fallback) : (ar || en || fallback)

  return (
    <>
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: isRTL ? 'الرئيسية' : 'Home', url: localize('/') },
          { name: isRTL ? (brandName?.ar || brand.name_ar) : (brand.name_en || brandName?.en || brand.name_ar), url: localize(`/${brand.slug}`) },
        ]}
      />

      {/* ✅ Wrap with RealtimeProvider for live updates */}
      <RealtimeProvider brandId={brand.id}>
        <div className="space-y-12" dir={isRTL ? 'rtl' : 'ltr'}>
          <section className={`relative py-16 md:py-24 rounded-3xl bg-gradient-to-br ${colors[brand.slug] || 'from-gray-600 to-gray-800'} text-white overflow-hidden`}>
            <div className="relative z-10 text-center px-4">
              <h1 className="text-4xl md:text-6xl font-extrabold mb-4">{t(brand.name_ar, brand.name_en, brand.name_ar)}</h1>
              <p className="text-xl md:text-2xl opacity-90 mb-2">{locale === 'en' ? (brand.name_en || brand.name_ar) : brand.name_ar}</p>
              {brand.description_ar && (
                <p className="text-lg opacity-80 max-w-2xl mx-auto mt-4">
                  {t(brand.description_ar, brand.description_en, '')}
                </p>
              )}
              <Link
                href={localize(`/${brand.slug}/menu`)}
                className="inline-block mt-8 px-8 py-4 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition shadow-lg"
              >
                {isRTL ? 'شوف القائمة الكاملة 📋' : 'View Full Menu 📋'}
              </Link>
            </div>
          </section>

          {categories && categories.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-center">{isRTL ? 'الفئات' : 'Categories'}</h2>
              <div className="flex gap-3 flex-wrap justify-center">
                <Link
                  href={localize(`/${brand.slug}/menu`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition"
                >
                  {isRTL ? 'الكل' : 'All'}
                </Link>
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    href={localize(`/${brand.slug}/menu?category=${cat.id}`)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition"
                  >
                    {t(cat.name_ar, cat.name_en, cat.name_ar)}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {products && products.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-center">{isRTL ? 'أشهر المنتجات' : 'Popular Products'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.slice(0, 6).map(product => (
                  <ProductCard key={product.id} product={product as Product} locale={locale} />
                ))}
              </div>
              <div className="text-center mt-8">
                <Link
                  href={localize(`/${brand.slug}/menu`)}
                  className="inline-block px-8 py-3 border-2 border-gray-900 text-gray-900 rounded-full font-bold hover:bg-gray-900 hover:text-white transition"
                >
                  {isRTL ? 'كل المنتجات →' : '← All Products'}
                </Link>
              </div>
            </section>
          )}
        </div>
      </RealtimeProvider>
    </>
  )
}

function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const isRTL = locale === 'ar'
  const name = isRTL ? product.name_ar : (product.name_en || product.name_ar)
  const nameOther = isRTL ? (product.name_en || product.name_ar) : product.name_ar

  return (
    <Link href={`/product/${product.id}`} className="block bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
      <div className="h-48 bg-gray-200 relative overflow-hidden">
        {product.main_image_url ? (
          <Image
            src={product.main_image_url}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">🍽️</div>
        )}
        {product.is_featured && (
          <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-sm font-bold">
            {isRTL ? '⭐ مميز' : '⭐ Featured'}
          </div>
        )}
        {product.compare_price && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {isRTL ? 'خصم' : 'Discount'}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-1">{name}</h3>
        <p className="text-gray-500 text-sm mb-3">{nameOther}</p>
        {product.description_ar && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{product.description_ar}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-600">{product.base_price} {isRTL ? 'ج.م' : 'EGP'}</span>
            {product.compare_price && (
              <span className="text-sm text-gray-400 line-through mr-2">{product.compare_price} {isRTL ? 'ج.م' : 'EGP'}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}