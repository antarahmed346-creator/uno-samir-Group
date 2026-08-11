import Link from 'next/link'
import { UtensilsCrossed, ArrowRight } from 'lucide-react'
import { generateSeoMetadata } from '@/lib/seo'

export const metadata = generateSeoMetadata({
  title: '404 - الصفحة غير موجودة',
  description: 'الصفحة اللي بتدور عليها مش موجودة. ارجع للرئيسية واكتشف منيو UNO & SAMIR.',
  noIndex: true,
})

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
          <UtensilsCrossed className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="text-2xl font-bold text-gray-800">الصفحة غير موجودة</h2>

        <p className="text-gray-500 leading-relaxed">
          يبدو إن الصفحة اللي بتدور عليها اتشالت من المنيو! 😅
          <br />
          ارجع للرئيسية واكتشف أشهى الأطباق.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition shadow-lg"
          >
            <span>الرئيسية</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pizza-uno/menu"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-orange-500 hover:text-orange-600 transition"
          >
            <span>شوف المنيو</span>
          </Link>
        </div>
      </div>
    </div>
  )
}