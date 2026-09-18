import { Cairo, Inter } from 'next/font/google'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { cookies, headers } from 'next/headers'
import '../globals.css'
import CartIcon from '@/components/public/CartIcon'
import SearchBar from '@/components/public/SearchBar'
import LanguageSwitcher from '@/components/public/LanguageSwitcher'
import RealtimeConnectionBanner from '@/components/public/RealtimeConnectionBanner'
import AppHeader from '@/components/public/AppHeader'
import BottomNav from '@/components/public/BottomNav'
import SupportFab from '@/components/public/SupportFab'
import ChatWidgetLoader from '@/components/public/ChatWidgetLoader'
import ThemeToggle from '@/components/public/ThemeToggle'
import NotificationBell from '@/components/public/NotificationBell'
import { Toaster } from 'sonner'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale === 'ar'

  const headersList = await headers()
  const currentPath = headersList.get('x-invoke-path') || '/'

  const localize = (path: string) =>
    locale === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path

  // ✅ NO <html> or <body> here! Only <div>
  return (
    <div className={`relative ${isRTL ? cairo.variable : inter.variable} bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors`}>
      {/* WHAT: خلفية واحدة مستمرة بصور الأكل — قوية عند أعلى الصفحة
          (منطقة الهيرو) وبتخف تدريجياً لحد ما تختفي خالص قبل باقي
          المحتوى، مش صورتين منفصلتين (وحدة جوه الهيرو ووحدة خفيفة
          للصفحة)
          WHY:  كانت الصورة قبل كده مكررة — نسخة قوية جوه صندوق
              الهيرو، ونسخة خفيفة جداً تحت — فكان شكلها متقطع/غريب،
              مش امتداد طبيعي واحد للصورة
          KILL: لو رجّعنا صورة تانية منفصلة جوه الهيرو زي الأول، هنرجع
              لنفس مشكلة "الصورة حبيسة جوه البانر" تاني */}
      <div
        className="absolute inset-0 bg-cover bg-top opacity-[0.12] dark:opacity-[0.08]"
        style={{ backgroundImage: 'url(/images/hero-blend.jpg)' }}
        aria-hidden="true"
      />
      <div className={isRTL ? 'font-cairo' : 'font-sans'}>
        <RealtimeConnectionBanner />

        {/* WHAT: هيدر الموبايل المضغوط (التوصيل إلى + بحث) */}
        {/* WHY:  زي matrouhmarket بالظبط — أنسب لعرض من موبايل */}
        <AppHeader locale={locale} />

        {/* Navbar — ديسكتوب بس، الموبايل بيستخدم AppHeader فوق + BottomNav تحت */}
        <nav className="hidden md:block bg-white dark:bg-gray-900 shadow-md dark:shadow-black/30 sticky top-0 z-50 transition-colors">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <Link href={localize('/')} className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                U
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent hidden md:inline">
                UNO & SAMIR
              </span>
            </Link>

            <SearchBar currentLocale={locale} />

            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
              <NavLink href={localize('/')}>
                {isRTL ? 'الرئيسية' : 'Home'}
              </NavLink>
              <NavLink href={localize('/pizza-uno')}>
                🍕 {isRTL ? 'بيتزا' : 'Pizza'}
              </NavLink>
              <NavLink href={localize('/feteer-samir')}>
                🥐 {isRTL ? 'فطير' : 'Feteer'}
              </NavLink>
              <NavLink href={localize('/uno-crepe')}>
                🥞 {isRTL ? 'كريب' : 'Crêpe'}
              </NavLink>
              <NavLink href={localize('/ala-el-roof')}>
                ☕ {isRTL ? 'على الروف' : 'Ala El Roof'}
              </NavLink>

              <Link
                href={localize('/track-order')}
                className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium"
              >
                <span className="hidden md:inline">
                  {isRTL ? 'تتبع طلبك' : 'Track'}
                </span>
                <span className="md:hidden">📦</span>
              </Link>

              <NotificationBell isRTL={isRTL} />
              <ThemeToggle />
              <CartIcon locale={locale} />
              <LanguageSwitcher currentLocale={locale} currentPath={currentPath} />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto md:px-4 md:py-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* WHAT: حاوية إشعارات الـ Toast للموقع العام */}
        {/* WHY:  من غيرها toast.success/error مش هيظهر للعميل خالص */}
        <Toaster position="top-center" richColors />

        {/* WHAT: القائمة السفلية + زرار الدعم — موبايل بس */}
        <BottomNav locale={locale} />
        <SupportFab />
        <ChatWidgetLoader />

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-start">
              <div>
                <h3 className="text-lg font-bold mb-4">UNO & SAMIR GROUP</h3>
                <p className="text-gray-400 text-sm">
                  {isRTL ? 'مجموعة مطاعم مرسى مطروح' : 'Marsa Matrouh Restaurant Group'}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">
                  {isRTL ? 'البراندات' : 'Brands'}
                </h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <Link href={localize('/pizza-uno')} className="block hover:text-white">
                    🍕 Pizza UNO
                  </Link>
                  <Link href={localize('/feteer-samir')} className="block hover:text-white">
                    🥐 Feteer Samir
                  </Link>
                  <Link href={localize('/uno-crepe')} className="block hover:text-white">
                    🥞 UNO Crêpe
                  </Link>
                  <Link href={localize('/ala-el-roof')} className="block hover:text-white">
                    ☕ Ala El Roof
                  </Link>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-4">
                  {isRTL ? 'روابط سريعة' : 'Quick Links'}
                </h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <Link
                    href={localize('/track-order')}
                    className="block hover:text-white flex items-center gap-2 justify-center md:justify-start"
                  >
                    <Search className="h-4 w-4" />
                    {isRTL ? 'تتبع طلبك' : 'Track Order'}
                  </Link>
                  <Link
                    href={localize('/cart')}
                    className="block hover:text-white flex items-center gap-2 justify-center md:justify-start"
                  >
                    <span>🛒</span>
                    {isRTL ? 'سلة المشتريات' : 'Cart'}
                  </Link>
                  <p className="text-gray-400 text-sm">
                    {isRTL ? 'مرسى مطروح، مصر' : 'Marsa Matrouh, Egypt'}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
              {isRTL
                ? 'جميع الحقوق محفوظة © 2026 UNO & SAMIR GROUP'
                : 'All rights reserved © 2026 UNO & SAMIR GROUP'}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm hidden lg:inline"
    >
      {children}
    </Link>
  )
}