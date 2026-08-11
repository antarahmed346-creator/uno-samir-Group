import Link from 'next/link'
import { Brand } from '@/lib/types'

// WHAT: شريط فئات سريع تحت كروت البراندات (زي matrouhmarket بالظبط)
// WHY:  اختصار بصري سريع للعميل يوصله لأي براند بضغطة واحدة
//       من غير ما يسكرول لفوق للـ Brands Section

const brandChipEmoji: Record<string, string> = {
  'pizza-uno': '🍕',
  'feteer-samir': '🥐',
  'uno-crepe': '🥞',
  'ala-el-roof': '☕',
}

export default function CategoryChips({ brands, locale = 'ar' }: { brands: Brand[] | null; locale?: string }) {
  if (!brands?.length) return null

  return (
    <div className="flex gap-2 px-4 overflow-x-auto pb-1 -mt-1 mb-2" style={{ scrollbarWidth: 'none' }}>
      {brands.map((brand, i) => (
        <Link
          key={brand.id}
          href={`/${brand.slug}`}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11.5px] font-bold transition-colors ${
            i === 0 ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span>{brandChipEmoji[brand.slug] || '🍽️'}</span>
          {locale === 'en' ? brand.name_en : brand.name_ar}
        </Link>
      ))}
      <Link
        href="/offers"
        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11.5px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        🏷️ {locale === 'en' ? 'Offers' : 'عروض'}
      </Link>
    </div>
  )
}
