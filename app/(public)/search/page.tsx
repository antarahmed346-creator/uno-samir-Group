import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { generateSeoMetadata } from '@/lib/seo'

export const metadata = generateSeoMetadata({
  title: 'بحث',
  description: 'ابحث في قائمة الطعام',
  path: '/search',
})

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    min_price?: string
    max_price?: string
    tags?: string
    brand?: string
  }>
}

interface SearchProduct {
  id: string
  name_ar: string | null
  name_en: string | null
  base_price: number
  compare_price: number | null
  main_image_url: string | null
  category_id: string | null
  brand_id: string | null
  category: {
    id: string
    name_ar: string | null
    name_en: string | null
  } | null
  brand: {
    id: string
    slug: string
    name_ar: string | null
    name_en: string | null
  } | null
}

interface SearchCategory {
  id: string
  name_ar: string | null
  name_en: string | null
}

interface SearchBrand {
  id: string
  slug: string
  name_ar: string | null
  name_en: string | null
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams

  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale === 'ar'

  const supabase = await createServerClient()

  const q = params.q?.trim() || ''
  const categoryId = params.category || ''
  const minPrice = params.min_price ? parseFloat(params.min_price) : null
  const maxPrice = params.max_price ? parseFloat(params.max_price) : null
  const tags = params.tags ? params.tags.split(',').filter(Boolean) : []
  const brandId = params.brand || ''

  const localize = (path: string) =>
    locale === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path

  const t = (ar: string | null | undefined, en: string | null | undefined, fallback: string) =>
    locale === 'en' ? (en || ar || fallback) : (ar || en || fallback)

  // Build query dynamically
  let query = supabase
    .from('products')
    .select('*, category:categories(id, name_ar, name_en), brand:brands(id, slug, name_ar, name_en)')
    .eq('status', 'active')
    .eq('is_available', true)

  if (q) {
    const term = `%${q}%`
    query = query.or(`name_ar.ilike.${term},name_en.ilike.${term},description_ar.ilike.${term}`)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (brandId) {
    query = query.eq('brand_id', brandId)
  }

  if (minPrice !== null) {
    query = query.gte('base_price', minPrice)
  }

  if (maxPrice !== null) {
    query = query.lte('base_price', maxPrice)
  }

  if (tags.length > 0) {
    query = query.contains('tags', tags)
  }

  const { data: productsRaw } = await query.order('is_featured', { ascending: false }).limit(24)
  const products = (productsRaw as unknown as SearchProduct[] | null) ?? []

  // Fetch categories & brands for filters
  const [{ data: categoriesRaw }, { data: brandsRaw }] = await Promise.all([
    supabase.from('categories').select('id, name_ar, name_en').eq('status', 'active').order('sort_order'),
    supabase.from('brands').select('id, slug, name_ar, name_en').eq('status', 'active').order('sort_order'),
  ])

  const categories = (categoriesRaw as unknown as SearchCategory[] | null) ?? []
  const brands = (brandsRaw as unknown as SearchBrand[] | null) ?? []

  // Common tags
  const { data: tagProducts } = await supabase
    .from('products')
    .select('tags')
    .eq('status', 'active')
    .not('tags', 'is', null)
    .limit(50)

  const allTags = new Set<string>()
  tagProducts?.forEach((p: { tags: string[] | null }) => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t: string) => allTags.add(t))
    }
  })
  const popularTags = Array.from(allTags).slice(0, 12)

  const hasFilters = !!(categoryId || minPrice || maxPrice || tags.length || brandId)

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 min-h-[60vh]" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold mb-2">{isRTL ? 'البحث' : 'Search'}</h1>
      <p className="text-gray-500 mb-6">{isRTL ? 'دور على اللي نفسك فيه من بين كل منتجاتنا' : 'Find what you crave from all our products'}</p>

      {/* Search + Filters Form */}
      <form action={localize('/search')} method="GET" className="mb-8 space-y-4">
        <div className="relative max-w-xl">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={isRTL ? 'اكتب اسم الأكل اللي نفسك فيه...' : 'Type the food you crave...'}
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition"
          >
            🔍
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">{isRTL ? 'الفئة' : 'Category'}</label>
            <select
              name="category"
              defaultValue={categoryId}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 bg-white"
            >
              <option value="">{isRTL ? 'كل الفئات' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {t(cat.name_ar, cat.name_en, '—')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">{isRTL ? 'البراند' : 'Brand'}</label>
            <select
              name="brand"
              defaultValue={brandId}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 bg-white"
            >
              <option value="">{isRTL ? 'كل البراندات' : 'All Brands'}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {t(b.name_ar, b.name_en, '—')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">{isRTL ? 'من سعر' : 'Min Price'}</label>
            <input
              type="number"
              name="min_price"
              defaultValue={minPrice ?? ''}
              placeholder="0"
              min="0"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">{isRTL ? 'إلى سعر' : 'Max Price'}</label>
            <input
              type="number"
              name="max_price"
              defaultValue={maxPrice ?? ''}
              placeholder="∞"
              min="0"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {isRTL ? 'فلترة' : 'Filter'}
          </button>

          {hasFilters && (
            <Link
              href={localize('/search')}
              className="px-4 py-2 text-gray-500 hover:text-red-500 rounded-lg text-sm transition-colors underline"
            >
              {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
            </Link>
          )}
        </div>

        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400">{isRTL ? 'تاجات شائعة:' : 'Popular Tags:'}</span>
            {popularTags.map((tag) => {
              const isActive = tags.includes(tag)
              const newTags = isActive
                ? tags.filter((t) => t !== tag)
                : [...tags, tag]
              const sp = new URLSearchParams()
              if (q) sp.set('q', q)
              if (categoryId) sp.set('category', categoryId)
              if (brandId) sp.set('brand', brandId)
              if (minPrice !== null) sp.set('min_price', minPrice.toString())
              if (maxPrice !== null) sp.set('max_price', maxPrice.toString())
              if (newTags.length) sp.set('tags', newTags.join(','))

              return (
                <Link
                  key={tag}
                  href={`${localize('/search')}?${sp.toString()}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </Link>
              )
            })}
          </div>
        )}
      </form>

      {/* Results */}
      {products.length > 0 ? (
        <>
          <p className="text-gray-500 mb-4">
            {q ? `${isRTL ? 'نتائج لـ' : 'Results for'} "${q}"` : (isRTL ? 'كل المنتجات' : 'All Products')} ({products.length})
            {hasFilters && ` — ${isRTL ? 'مع فلاتر' : 'with filters'}`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={localize(`/product/${product.id}`)}
                className="group block bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-48 bg-gray-100">
                  {product.main_image_url ? (
                    <Image
                      src={product.main_image_url}
                      alt={t(product.name_ar, product.name_en, '')}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-4xl">🍽️</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg group-hover:text-orange-600 transition">
                    {t(product.name_ar, product.name_en, '—')}
                  </h3>
                  <p className="text-gray-500 text-sm">{locale === 'en' ? (product.name_en || product.name_ar) : product.name_ar}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-600 font-bold">
                      {product.base_price.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {isRTL ? 'ج.م' : 'EGP'}
                    </span>
                    {product.compare_price && product.compare_price > product.base_price && (
                      <span className="text-gray-400 line-through text-sm">
                        {product.compare_price.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {isRTL ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                  </div>
                  {product.category?.name_ar && (
                    <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {t(product.category.name_ar, product.category.name_en, product.category.name_ar)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : q || hasFilters ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-gray-500 text-lg">{isRTL ? 'مفيش نتائج' : 'No Results'}</p>
          <p className="text-gray-400 text-sm mt-2">{isRTL ? 'جرب تغيّر الفلاتر أو كلمة البحث' : 'Try changing filters or search term'}</p>
          <Link
            href={localize('/search')}
            className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
          >
            {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
          </Link>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🍕</p>
          <p>{isRTL ? 'اكتب فوق أو اختار فلتر عشان تلاقي اللي نفسك فيه' : 'Type above or choose a filter to find what you crave'}</p>
        </div>
      )}
    </div>
  )
}