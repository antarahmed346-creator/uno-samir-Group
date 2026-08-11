import { createServerClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { Clock, Tag } from 'lucide-react'
import { Suspense } from 'react'
import {
  generateSeoMetadata,
  BreadcrumbJsonLd,
  OrganizationJsonLd,
} from '@/lib/seo'
import FlashDealCountdown from '@/components/public/FlashDealCountdown'

export const metadata = generateSeoMetadata({
  title: 'العروض والخصومات',
  description: 'اكتشف أحدث العروض والخصومات على البيتزا، الفطير، والكريب في مرسى مطروح',
  path: '/offers',
  keywords: ['عروض', 'خصومات', 'بيتزا', 'فطير', 'كريب', 'مرسى مطروح', 'offers', 'discounts'],
})

// WHAT: Loading skeleton for offers page
// WHY:  Prevents layout shift while data loads
// KILL: No skeleton = jarring blank page → content jump
function OffersSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <div className="h-10 w-64 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
        <div className="h-6 w-96 bg-gray-200 rounded mx-auto animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default async function OffersPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale === 'ar'

  const supabase = await createServerClient()

  const { data: offers } = await supabase

    .from('offers')
    .select('*, brand:brands(*)')
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  const localize = (path: string) =>
    locale === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path

  const t = (ar: string | null | undefined, en: string | null | undefined, fallback: string) =>
    locale === 'en' ? (en || ar || fallback) : (ar || en || fallback)

  // WHAT: Check if offer is a flash deal (expires within 24 hours)
  // WHY:  Flash deals need countdown timer; regular offers show date only
  // KILL: Wrong classification = countdown on regular offers or missing on flash deals
  const isFlashDeal = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false
    const hoursUntilExpiry = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0
  }

  return (
    <>
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: isRTL ? 'الرئيسية' : 'Home', url: localize('/') },
          { name: isRTL ? 'العروض' : 'Offers', url: localize('/offers') },
        ]}
      />

      <Suspense fallback={<OffersSkeleton />}>
        <div className="max-w-6xl mx-auto py-12 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{isRTL ? 'عروض خاصة 🔥' : 'Special Offers 🔥'}</h1>
            <p className="text-gray-500 text-lg">
              {isRTL ? 'أفضل العروض على أشهى المأكولات في مرسى مطروح' : 'Best offers on the most delicious food in Marsa Matrouh'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {offers?.map((offer) => {
              const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date()
              const isFlash = isFlashDeal(offer.expires_at)
              const discountLabel =
                offer.type === 'percentage'
                  ? `-%${offer.discount_value}`
                  : `-${offer.discount_value.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${isRTL ? 'ج.م' : 'EGP'}`

              return (
                <div
                  key={offer.id}
                  className={`relative bg-gradient-to-br rounded-2xl p-6 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] ${
                    isExpired 
                      ? 'from-gray-500 to-gray-600 opacity-60' 
                      : isFlash 
                        ? 'from-red-600 to-orange-500 animate-pulse' 
                        : 'from-orange-500 to-red-600'
                  }`}
                >
                  {offer.image_url && (
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <Image
                        src={offer.image_url}
                        alt={t(offer.title_ar, offer.title_en, '')}
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
                      {offer.brand && (
                        <span className="text-white/80 text-sm">
                          {t(offer.brand.name_ar, offer.brand.name_en, offer.brand.name_ar)}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-2">{t(offer.title_ar, offer.title_en, '')}</h3>
                    <p className="text-white/90 mb-4">{t(offer.description_ar, offer.description_en, '')}</p>
                    
                    {offer.promo_code && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center font-mono font-bold mb-4">
                        {isRTL ? 'كود:' : 'Code:'} {offer.promo_code}
                      </div>
                    )}
                    
                    {/* WHAT: Flash deal countdown or regular expiry date */}
                    {/* WHY:  Flash deals need urgency; regular offers show static date */}
                    {/* KILL: Missing countdown = flash deals lose urgency = fewer conversions */}
                    {offer.expires_at && !isExpired && (
                      <div className="mt-4">
                        {isFlash ? (
                          <FlashDealCountdown 
                            expiresAt={offer.expires_at} 
                            locale={locale}
                            onExpire={() => {
                              // WHAT: Auto-refresh page when flash deal expires
                              // WHY:  Removes expired offer without user refresh
                              // KILL: No auto-refresh = expired offer stays visible
                              window.location.reload()
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-sm bg-black/20 px-3 py-2 rounded-full w-fit">
                            <Clock className="w-4 h-4" />
                            <span>{isRTL ? 'ينتهي:' : 'Ends:'} {new Date(offer.expires_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {(!offers || offers.length === 0) && (
              <div className="col-span-full text-center py-16">
                <p className="text-gray-500 text-xl">{isRTL ? 'مفيش عروض نشطة دلوقتي' : 'No active offers right now'}</p>
                <p className="text-gray-400 mt-2">{isRTL ? 'تابعنا على السوشيال ميديا عشان تعرف أول بأول!' : 'Follow us on social media to stay updated!'}</p>
              </div>
            )}
          </div>
        </div>
      </Suspense>
    </>
  )
}