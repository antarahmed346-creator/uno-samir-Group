// WHAT: صفحة "القائمة" — معلومات عن المجموعة، الدعم، الحساب، والإعدادات
// WHY:  المكان اللي العميل يقدر منه يسجل دخول بجوجل، يتحكم في
//       إشعاراته، ويلاقي طرق التواصل والروابط القانونية
// KILL: من غيرها، زرار "القائمة" في الشريط السفلي هيوديك لصفحة فاضية

import Link from 'next/link'
import { cookies } from 'next/headers'
import { Phone, MessageCircle, FileText, Shield, MapPin, UtensilsCrossed, User } from 'lucide-react'
import ThemeToggle from '@/components/public/ThemeToggle'
import LanguageSwitcher from '@/components/public/LanguageSwitcher'
import PushNotificationToggle from '@/components/public/PushNotificationToggle'
import GoogleSignInButton from '@/components/public/GoogleSignInButton'
import SignOutButton from '@/components/public/SignOutButton'
import { createServerClient } from '@/lib/supabase/server'

const SUPPORT_WHATSAPP_NUMBER = '201000000000' // ⚠️ استبدله برقم المطعم الحقيقي
const SUPPORT_PHONE_NUMBER = '+20 100 000 0000' // ⚠️ استبدله برقم المطعم الحقيقي

export default async function InfoPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale !== 'en'

  // WHAT: نتحقق هل العميل مسجل دخول بجوجل فعلاً (is_anonymous = false)
  //       ولا لسه anonymous/زائر — عشان نعرض زرار الدخول أو بياناته
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSignedIn = !!user && !user.is_anonymous

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-2xl mx-auto min-h-[70vh] bg-white dark:bg-gray-950 transition-colors">
      <div className="bg-gradient-to-l from-red-600 to-orange-600 px-6 py-8 text-white flex items-center gap-4 md:rounded-2xl md:mt-4">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <div>
          <div className="font-extrabold text-[15px]">UNO & SAMIR GROUP</div>
          <div className="text-[11.5px] opacity-85 mt-0.5">مجموعة مطاعم مرسى مطروح</div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mb-2 px-1">
          {isRTL ? 'حسابك' : 'Your Account'}
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
          {isSignedIn ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-[12.5px] font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {user?.email}
                </p>
              </div>
              <SignOutButton locale={locale} />
            </div>
          ) : (
            <GoogleSignInButton locale={locale} />
          )}
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mb-2 px-1">
          {isRTL ? 'التواصل والدعم' : 'Contact & Support'}
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden">
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800 text-[13px] font-semibold text-gray-800 dark:text-gray-100"
          >
            <MessageCircle className="w-[18px] h-[18px] text-green-600 flex-shrink-0" />
            {isRTL ? 'تواصل معانا على واتساب' : 'Chat with us on WhatsApp'}
          </a>
          <a
            href={`tel:${SUPPORT_PHONE_NUMBER}`}
            className="flex items-center gap-3 px-4 py-4 text-[13px] font-semibold text-gray-800 dark:text-gray-100"
          >
            <Phone className="w-[18px] h-[18px] text-gray-600 dark:text-gray-400 flex-shrink-0" />
            {isRTL ? 'اتصل بينا مباشرة' : 'Call us directly'}
          </a>
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mb-2 px-1">
          {isRTL ? 'فروعنا' : 'Our Branches'}
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-4 flex items-start gap-3 text-[13px] font-semibold text-gray-800 dark:text-gray-100">
          <MapPin className="w-[18px] h-[18px] text-red-600 flex-shrink-0 mt-0.5" />
          {isRTL
            ? 'مرسى مطروح، مصر — بيتزا أونو، فطير سمير، أونو كريب، على الروف'
            : 'Marsa Matrouh, Egypt — Pizza Uno, Feteer Samir, Uno Crêpe, Ala El Roof'}
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mb-2 px-1">
          {isRTL ? 'الإعدادات' : 'Settings'}
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              {isRTL ? 'إشعارات الطلبات' : 'Order Notifications'}
            </span>
            <PushNotificationToggle locale={locale} />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              {isRTL ? 'الوضع الليلي' : 'Dark Mode'}
            </span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">
              {isRTL ? 'اللغة' : 'Language'}
            </span>
            <LanguageSwitcher currentLocale={locale} currentPath="/info" />
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 mb-8">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mb-2 px-1">
          {isRTL ? 'قانوني' : 'Legal'}
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden">
          <Link href="/terms" className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800 text-[13px] font-semibold text-gray-800 dark:text-gray-100">
            <FileText className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400 flex-shrink-0" />
            {isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </Link>
          <Link href="/privacy" className="flex items-center gap-3 px-4 py-4 text-[13px] font-semibold text-gray-800 dark:text-gray-100">
            <Shield className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400 flex-shrink-0" />
            {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </Link>
        </div>
      </div>
    </div>
  )
}
