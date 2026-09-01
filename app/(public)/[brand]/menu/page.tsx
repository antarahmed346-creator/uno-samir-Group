import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { cookies } from 'next/headers'
import AddToCartButton from "@/components/public/AddToCartButton";
import {
  generateSeoMetadata,
  BreadcrumbJsonLd,
} from '@/lib/seo'
import { BRAND_NAMES } from '@/lib/types'
import RealtimeProvider from '@/components/public/RealtimeProvider'
import BrandLocationButton from '@/components/public/BrandLocationButton'

interface Props {
  params: Promise<{ brand: string }>
  searchParams: Promise<{ category?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { brand: brandSlug } = await params
  const supabase = await createServerClient()
  const { data: brand } = await supabase
    .from('brands')
    .select('name_ar, name_en, description_ar, meta_title_ar, meta_desc_ar')
    .eq('slug', brandSlug)
    .single()

  if (!brand) return generateSeoMetadata({ title: 'غير موجود', noIndex: true })

  return generateSeoMetadata({
    title: brand.meta_title_ar || `منيو ${brand.name_ar}`,
    description: brand.meta_desc_ar || `استكشف قائمة ${brand.name_ar} الكاملة — أشهى الأطباق في مرسى مطروح`,
    path: `/${brandSlug}/menu`,
    keywords: [brand.name_ar, brand.name_en, 'منيو', 'قائمة الطعام', 'مرسى مطروح', 'مطعم'],
  })
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { brand: brandSlug } = await params
  const { category } = await searchParams

  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale === 'ar'

  const t = (ar: string | null | undefined, en: string | null | undefined, fallback: string) =>
    locale === 'en' ? (en || ar || fallback) : (ar || en || fallback)

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

  const { data: locations } = await supabase
    .from('brand_locations')
    .select('id, label_ar, label_en, address, google_maps_url')
    .eq('brand_id', brand.id)
    .order('sort_order')

  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .eq('is_available', true)
    .order('sort_order')

  if (category) {
    query = query.eq('category_id', category)
  }

  const { data: products } = await query

  const productIds = products?.map(p => p.id) || []

  // WHAT: الشكل اللي AddToCartButton بيستناه (required/min_select/max_select/options/price_adjustment)
  // WHY:  مختلف عن أسماء أعمدة قاعدة البيانات الحقيقية (is_required/min_selections/
  //       max_selections/customization_options/price_modifier) اللي بيستخدمها ProductForm
  //       فعلياً وقت الحفظ — فبنعمل mapping هنا بدل ما نغيّر AddToCartButton نفسه
  interface CustomizationOption {
    id: string
    name: string
    name_ar: string
    price_adjustment: number
  }

  interface CustomizationGroup {
    id: string
    name: string
    name_ar: string
    required: boolean
    min_select: number
    max_select: number
    product_id: string
    options: CustomizationOption[]
  }

  // WHAT: شكل الصف الخام زي ما بيرجع من الاستعلام مباشرة (قبل ما نحوّله
  //       لـ CustomizationGroup/Option فوق) — لازم نوضحه صراحة عشان
  //       TypeScript يعرف نوع الباراميتر جوا .map() المتداخل تحت
  interface RawCustomizationOption {
    id: string
    name_ar: string
    name_en: string | null
    price_modifier: number | null
  }
  interface RawCustomizationGroupRow {
    id: string
    name_ar: string
    name_en: string | null
    is_required: boolean
    min_selections: number | null
    max_selections: number | null
    product_id: string
    customization_options: RawCustomizationOption[] | null
  }

  let customizationGroups: CustomizationGroup[] = []
  if (productIds.length > 0) {
    // WHAT: أسماء الأعمدة هنا لازم تطابق قاعدة البيانات الحقيقية بالظبط —
    //       نفس الأسماء اللي ProductFormWrapper.tsx بيكتب بيها لما الأدمن يحفظ منتج
    const { data: groups, error: groupsError } = await supabase
      .from('customization_groups')
      .select(`
        id, name_ar, name_en, is_required, min_selections, max_selections, product_id,
        customization_options (
          id, name_ar, name_en, price_modifier
        )
      `)
      .in('product_id', productIds)

    if (groupsError) {
      console.error('[MenuPage] customization_groups fetch failed:', groupsError.message)
    }

    customizationGroups = (groups || []).map((g: RawCustomizationGroupRow) => ({
      id: g.id,
      name: t(g.name_ar, g.name_en, g.name_ar),
      name_ar: g.name_ar,
      required: g.is_required,
      min_select: g.is_required ? Math.max(1, g.min_selections || 1) : (g.min_selections || 0),
      max_select: g.max_selections ?? 1,
      product_id: g.product_id,
      options: (g.customization_options || []).map((o: RawCustomizationOption) => ({
        id: o.id,
        name: t(o.name_ar, o.name_en, o.name_ar),
        name_ar: o.name_ar,
        price_adjustment: o.price_modifier || 0,
      })),
    }))
  }

  const productsWithGroups = products?.map(product => ({
    ...product,
    customization_groups: customizationGroups.filter(g => g.product_id === product.id)
  })) || []

  const colors: Record<string, string> = {
    'pizza-uno': 'from-green-600 to-green-800',
    'feteer-samir': 'from-red-600 to-red-800',
    'uno-crepe': 'from-yellow-500 to-amber-800',
    'ala-el-roof': 'from-gray-900 to-black',
  }

  const brandName = BRAND_NAMES[brand.slug as keyof typeof BRAND_NAMES]

  const localize = (path: string) =>
    locale === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: isRTL ? 'الرئيسية' : 'Home', url: localize('/') },
          { name: isRTL ? (brandName?.ar || brand.name_ar) : (brand.name_en || brandName?.en || brand.name_ar), url: localize(`/${brand.slug}`) },
          { name: isRTL ? 'المنيو' : 'Menu', url: localize(`/${brand.slug}/menu`) },
        ]}
      />

      {/* ✅ Wrap with RealtimeProvider for live updates */}
      <RealtimeProvider brandId={brand.id}>
        <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
          <section className={`py-12 rounded-2xl bg-gradient-to-br ${colors[brand.slug] || 'from-gray-600 to-gray-800'} text-white text-center`}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{t(brand.name_ar, brand.name_en, brand.name_ar)}</h1>
            <p className="text-lg opacity-90">{isRTL ? 'القائمة الكاملة' : 'Full Menu'}</p>
            <BrandLocationButton locations={locations || []} locale={locale} />
          </section>

          <section className="flex gap-3 flex-wrap justify-center">
            <a href={localize(`/${brand.slug}/menu`)} className={`px-5 py-2 rounded-full font-medium transition ${!category ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              {isRTL ? 'الكل' : 'All'}
            </a>
            {categories?.map(cat => (
              <a key={cat.id} href={localize(`/${brand.slug}/menu?category=${cat.id}`)} className={`px-5 py-2 rounded-full font-medium transition ${category === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {t(cat.name_ar, cat.name_en, cat.name_ar)}
              </a>
            ))}
          </section>

          <section>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {productsWithGroups.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {product.main_image_url ? (
                      <Image src={product.main_image_url} alt={t(product.name_ar, product.name_en, product.name_ar)} fill className="object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-3xl">🍽️</div>
                    )}
                    {product.is_featured && (
                      <div className="absolute top-1.5 right-1.5 bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full text-[9px] font-bold">⭐</div>
                    )}
                    {product.compare_price && (
                      <div className="absolute top-1.5 left-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold">{isRTL ? 'خصم' : 'Sale'}</div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-bold text-[11px] mb-1 leading-tight line-clamp-2 min-h-[2.4em]">
                      {t(product.name_ar, product.name_en, product.name_ar)}
                    </h3>

                    {!!product.customization_groups?.[0]?.options.length && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {product.customization_groups[0].options.slice(0, 3).map((opt: CustomizationOption) => (
                          <span key={opt.id} className="text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {opt.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-red-600 font-extrabold text-[12px]">{product.base_price} {isRTL ? 'ج.م' : 'EGP'}</span>
                      {product.compare_price && (
                        <span className="text-[9.5px] text-gray-400 line-through">{product.compare_price}</span>
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
                        brand_name: product.brand?.name_en || product.brand?.name_ar || '',
                        brand_name_ar: product.brand?.name_ar || null,
                        brand_name_en: product.brand?.name_en || null,
                      }}
                      customizationGroups={product.customization_groups}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>

            {productsWithGroups.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 text-xl">{isRTL ? 'مفيش منتجات في الفئة دي' : 'No products in this category'}</p>
              </div>
            )}
          </section>
        </div>
      </RealtimeProvider>
    </>
  )
}