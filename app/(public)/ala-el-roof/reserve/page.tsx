'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, User, Phone, CalendarDays, Clock, Users, MessageSquare, Check, CalendarCheck } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { localize } from '@/lib/i18n'
import { toast } from 'sonner'

// ─── Helper: read locale from cookie ───────────────────────────────────────
// (نفس الهيلبر الموجود بالظبط في checkout/page.tsx و product/[id]/page.tsx)
function useLocale() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === 'undefined') return 'ar'
      const match = document.cookie.match(/locale=([^;]+)/)
      return match ? match[1] : 'ar'
    },
    () => 'ar'
  )
}

// WHAT: بيرجع تاريخ النهاردة كـ 'YYYY-MM-DD' عشان نمنع اختيار تاريخ فات في الـ input
function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface Brand {
  id: string
  name_ar: string
  name_en: string
}

export default function AlaElRoofReservePage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [brand, setBrand] = useState<Brand | null>(null)
  const [brandLoading, setBrandLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    party_size: '2',
    notes: '',
  })
  const [reservationDate, setReservationDate] = useState('')
  const [reservationTime, setReservationTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // WHAT: بنجيب بيانات براند "على الروف" (id + اسمه) عشان نستخدمهم في العرض والحجز
  // WHY:  الصفحة دي مخصصة لبراند واحد بس، فمحتاجين نتأكد إنه موجود فعلاً
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase
      .from('brands')
      .select('id, name_ar, name_en')
      .eq('slug', 'ala-el-roof')
      .single()
      .then(({ data }) => {
        setBrand(data as Brand | null)
        setBrandLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reservationDate || !reservationTime) {
      toast.error(isRTL ? 'من فضلك حدد تاريخ ووقت الحجز' : 'Please select a reservation date and time')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.name,
          customer_phone: formData.phone,
          reservation_date: reservationDate,
          reservation_time: reservationTime,
          party_size: Number(formData.party_size),
          notes: formData.notes || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Reservation error:', errorData)
        toast.error(isRTL ? 'فشل تأكيد الحجز' : 'Failed to confirm reservation')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error(err)
      toast.error(isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || brandLoading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRTL ? 'تم استلام حجزك!' : 'Reservation Received!'}
          </h1>
          <p className="text-white/50 mb-8">
            {isRTL ? 'سنتواصل معك قريباً لتأكيد الحجز' : 'We will contact you soon to confirm your reservation'}
          </p>
          <Link
            href={localize("/", locale)}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c49b2a] text-black font-semibold px-8 py-3 rounded-full transition-all"
          >
            <span>{isRTL ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
        </motion.div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <CalendarCheck className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            {isRTL ? 'الحجز غير متاح حالياً' : 'Reservations Unavailable'}
          </h1>
          <Link href={localize("/", locale)} className="inline-flex items-center gap-2 text-[#D4AF37] hover:underline">
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{isRTL ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090909] pb-32" dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={localize("/ala-el-roof", locale)}
            className="text-white/60 hover:text-white flex items-center gap-1 transition"
          >
            <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{isRTL ? 'العودة لعلى الروف' : 'Back to Ala El Roof'}</span>
          </Link>
          <h1 className="text-xl font-bold text-white">
            {isRTL ? 'حجز طاولة' : 'Table Reservation'}
          </h1>
        </div>

        {/* Brand intro card */}
        <div className="bg-[#111111] rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#D4AF37]" />
            {isRTL ? `احجز طاولتك في ${brand.name_ar}` : `Reserve your table at ${brand.name_en}`}
          </h2>
          <p className="text-white/50 text-sm mt-2">
            {isRTL
              ? 'هنأكد الحجز معاك تليفونياً بعد إرسال الطلب'
              : 'We will confirm your reservation by phone after you submit'}
          </p>
        </div>

        {/* Reservation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <User className="w-4 h-4" />
              {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isRTL ? 'محمد أحمد' : 'John Doe'}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none transition"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {isRTL ? 'رقم التليفون *' : 'Phone Number *'}
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={isRTL ? '01xxxxxxxxx' : '+20 1xx xxx xxxx'}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none transition"
              dir="ltr"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {isRTL ? 'التاريخ *' : 'Date *'}
              </label>
              <input
                type="date"
                required
                min={getTodayDateString()}
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {isRTL ? 'الوقت *' : 'Time *'}
              </label>
              <input
                type="time"
                required
                value={reservationTime}
                onChange={(e) => setReservationTime(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none transition [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Party size */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isRTL ? 'عدد الأشخاص *' : 'Party Size *'}
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.party_size}
              onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none transition"
              dir="ltr"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isRTL ? 'مناسبة خاصة، طلبات معينة...' : 'Special occasion, requests...'}
              rows={2}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none transition resize-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Submit Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#D4AF37] hover:bg-[#c49b2a] disabled:bg-[#D4AF37]/50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <CalendarCheck className="w-5 h-5" />
            <span>
              {loading
                ? (isRTL ? 'جاري الحجز...' : 'Booking...')
                : (isRTL ? 'تأكيد الحجز' : 'Confirm Reservation')}
            </span>
          </motion.button>
        </form>
      </div>
    </div>
  )
}
