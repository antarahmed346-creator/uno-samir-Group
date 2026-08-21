'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, ShoppingBag, User, Phone, MapPin, Clock, CalendarDays, CreditCard, Check } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart'
import { useCouponStore, calculateDiscount } from '@/lib/store/coupon'
import { toast } from 'sonner'

// ─── Helper: read locale from cookie ───────────────────────────────────────
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

// ─── Scheduled delivery: config + helpers ──────────────────────────────────
// WHAT: ساعات عمل المطعم المسموح فيها بجدولة توصيل — من 10 صباحاً لحد 12 منتصف الليل
// WHY:  مينفعش العميل يجدول طلب بره ساعات التشغيل المنطقية للمطعم
// KILL: تغيير الرقمين ده يغيّر نطاق الأوقات المتاحة في كل الموقع
const SCHEDULE_START_HOUR = 10
const SCHEDULE_END_HOUR = 24 // آخر سلوت يبدأ 23:30 وينتهي 12 منتصف الليل
const SCHEDULE_DAYS_AHEAD = 8 // النهاردة + 7 أيام قدام
const SCHEDULE_BUFFER_MINUTES = 30 // أقل وقت مسموح بيه من دلوقتي لو العميل بيجدول "النهاردة"

interface TimeSlot {
  value: string // 'HH:mm'
  hour: number
  minute: number
}

function generateDeliveryDays(count: number): Date[] {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (let h = SCHEDULE_START_HOUR; h < SCHEDULE_END_HOUR; h++) {
    for (const m of [0, 30]) {
      slots.push({ value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, hour: h, minute: m })
    }
  }
  return slots
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function getAvailableSlots(day: Date, allSlots: TimeSlot[]): TimeSlot[] {
  const now = new Date()
  if (!isSameDay(day, now)) return allSlots
  const cutoff = new Date(now.getTime() + SCHEDULE_BUFFER_MINUTES * 60000)
  return allSlots.filter((slot) => {
    const slotDate = new Date(day)
    slotDate.setHours(slot.hour, slot.minute, 0, 0)
    return slotDate > cutoff
  })
}

function formatDayLabel(day: Date, index: number, isRTL: boolean) {
  if (index === 0) return isRTL ? 'النهاردة' : 'Today'
  if (index === 1) return isRTL ? 'بكرة' : 'Tomorrow'
  return day.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTimeLabel(slot: TimeSlot, isRTL: boolean) {
  const period = slot.hour < 12 ? (isRTL ? 'ص' : 'AM') : (isRTL ? 'م' : 'PM')
  let displayHour = slot.hour % 12
  if (displayHour === 0) displayHour = 12
  return `${displayHour}:${String(slot.minute).padStart(2, '0')} ${period}`
}

export default function CheckoutPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const appliedCoupon = useCouponStore((s) => s.coupon)
  const clearCoupon = useCouponStore((s) => s.clearCoupon)
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    delivery_time: 'asap',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ─── Scheduled delivery state ─────────────────────────────────────────
  const deliveryDays = useMemo(() => generateDeliveryDays(SCHEDULE_DAYS_AHEAD), [])
  const allTimeSlots = useMemo(() => generateTimeSlots(), [])
  const [scheduledDayIndex, setScheduledDayIndex] = useState<number | null>(null)
  const [scheduledTime, setScheduledTime] = useState<string | null>(null)

  const availableSlotsForSelectedDay = useMemo(() => {
    if (scheduledDayIndex === null) return []
    return getAvailableSlots(deliveryDays[scheduledDayIndex], allTimeSlots)
  }, [scheduledDayIndex, deliveryDays, allTimeSlots])

  // لما العميل يفتح "حدد وقت" لأول مرة، نختار أول يوم فيه مواعيد متاحة
  useEffect(() => {
    if (formData.delivery_time !== 'scheduled' || scheduledDayIndex !== null) return
    const firstAvailableIndex = deliveryDays.findIndex(
      (day) => getAvailableSlots(day, allTimeSlots).length > 0
    )
    setScheduledDayIndex(firstAvailableIndex >= 0 ? firstAvailableIndex : 0)
  }, [formData.delivery_time, scheduledDayIndex, deliveryDays, allTimeSlots])

  // لو غيّر اليوم وكان الوقت المختار قبل كده بقى مش متاح، نصفّره
  useEffect(() => {
    if (scheduledTime && !availableSlotsForSelectedDay.some((s) => s.value === scheduledTime)) {
      setScheduledTime(null)
    }
  }, [availableSlotsForSelectedDay, scheduledTime])

  useEffect(() => {
    setMounted(true)
  }, [])

  const totalPrice = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const discount = calculateDiscount(appliedCoupon, totalPrice)
  const finalTotal = Math.max(totalPrice - discount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // WHAT: التحقق إن العميل حدد يوم ووقت لو اختار "حدد وقت معين"
    // WHY:  من غير التحقق ده ممكن يتبعت طلب بحالة scheduled من غير موعد فعلي
    if (formData.delivery_time === 'scheduled' && (scheduledDayIndex === null || !scheduledTime)) {
      toast.error(isRTL ? 'من فضلك حدد يوم ووقت التوصيل' : 'Please select a delivery date and time')
      return
    }

    setLoading(true)

    try {
      // ← نجيب brand_id من أول منتج فى السلة
      const brandId = items[0]?.product?.brand_id
      
      if (!brandId) {
        toast.error(isRTL ? 'خطأ: لا يمكن تحديد البراند' : 'Error: Cannot determine brand')
        setLoading(false)
        return
      }

      // WHAT: بنبني الـ ISO timestamp بتاع الميعاد المجدول من اليوم والوقت المختارين
      // WHY:  السيرفر محتاج قيمة TIMESTAMPTZ كاملة، مش يوم ووقت منفصلين
      let scheduledDeliveryTime: string | null = null
      if (formData.delivery_time === 'scheduled' && scheduledDayIndex !== null && scheduledTime) {
        const [h, m] = scheduledTime.split(':').map(Number)
        const dt = new Date(deliveryDays[scheduledDayIndex])
        dt.setHours(h, m, 0, 0)
        scheduledDeliveryTime = dt.toISOString()
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_address: formData.address,
          customer_notes: formData.notes,
          payment_method: 'cash_on_delivery',
          delivery_fee: 0,
          subtotal: totalPrice,
          total: finalTotal,
          coupon_code: appliedCoupon?.code || undefined,
          discount_amount: discount,
          scheduled_delivery_time: scheduledDeliveryTime,
          items: items.map(item => ({
            product_id: item.productId,
            product_name_ar: item.product.name_ar || item.product.name,
            product_name_en: item.product.name_en || item.product.name,
            unit_price: item.totalPrice / item.quantity,
            quantity: item.quantity,
            total_price: item.totalPrice,
            customizations: item.customizations,
          })),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Order error:', errorData)
        toast.error(isRTL ? 'فشل إنشاء الطلب' : 'Failed to create order')
        setLoading(false)
        return
      }

      clearCart()
      clearCoupon()
      setSuccess(true)
    } catch (err) {
      console.error(err)
      toast.error(isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
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
            {isRTL ? 'تم تأكيد طلبك!' : 'Order Confirmed!'}
          </h1>
          <p className="text-white/50 mb-8">
            {isRTL ? 'سنتواصل معك قريباً لتأكيد التفاصيل' : 'We will contact you soon to confirm details'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c49b2a] text-black font-semibold px-8 py-3 rounded-full transition-all"
          >
            <span>{isRTL ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
        </motion.div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            {isRTL ? 'السلة فارغة' : 'Cart is Empty'}
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:underline"
          >
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{isRTL ? 'العودة للتسوق' : 'Back to Shopping'}</span>
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
            href="/cart"
            className="text-white/60 hover:text-white flex items-center gap-1 transition"
          >
            <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{isRTL ? 'العودة للسلة' : 'Back to Cart'}</span>
          </Link>
          <h1 className="text-xl font-bold text-white">
            {isRTL ? 'إتمام الطلب' : 'Checkout'}
          </h1>
        </div>

        {/* Order Summary */}
        <div className="bg-[#111111] rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
            {isRTL ? 'ملخص الطلب' : 'Order Summary'}
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between text-sm">
                <div className="text-white">
                  <span className="font-medium">
                    {locale === 'en' ? (item.product.name_en || item.product.name) : (item.product.name_ar || item.product.name)}
                  </span>
                  <span className="text-white/50 ml-2">×{item.quantity}</span>
                </div>
                <span className="text-[#D4AF37] font-medium">{item.totalPrice} {isRTL ? 'ج.م' : 'EGP'}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-4 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span className="text-white/70">{totalPrice} {isRTL ? 'ج.م' : 'EGP'}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">🎟️ {isRTL ? 'خصم' : 'Discount'} ({appliedCoupon?.code})</span>
                <span className="text-green-400">-{discount.toFixed(0)} {isRTL ? 'ج.م' : 'EGP'}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5">
              <span className="text-white font-semibold">{isRTL ? 'الإجمالي' : 'Total'}</span>
              <span className="text-[#D4AF37] font-bold text-xl">{finalTotal} {isRTL ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
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

          {/* Address */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {isRTL ? 'العنوان *' : 'Address *'}
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={isRTL ? 'شارع، حي، رقم العمارة...' : 'Street, district, building number...'}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-[#D4AF37] focus:outline-none transition resize-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Delivery Time */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {isRTL ? 'وقت التوصيل' : 'Delivery Time'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, delivery_time: 'asap' })}
                className={`p-3 rounded-xl border transition-all text-center ${
                  formData.delivery_time === 'asap'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-white/10 text-white hover:border-white/30'
                }`}
              >
                {isRTL ? 'في أسرع وقت' : 'ASAP'}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, delivery_time: 'scheduled' })}
                className={`p-3 rounded-xl border transition-all text-center ${
                  formData.delivery_time === 'scheduled'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-white/10 text-white hover:border-white/30'
                }`}
              >
                {isRTL ? 'حدد وقت معين' : 'Schedule a time'}
              </button>
            </div>

            {formData.delivery_time === 'scheduled' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-4 bg-[#1a1a1a] border border-white/10 rounded-xl p-4"
              >
                {/* Day picker */}
                <div>
                  <span className="text-white/60 text-xs mb-2 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {isRTL ? 'اختر اليوم' : 'Choose a day'}
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {deliveryDays.map((day, idx) => {
                      const hasSlots = getAvailableSlots(day, allTimeSlots).length > 0
                      const isSelected = scheduledDayIndex === idx
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          disabled={!hasSlots}
                          onClick={() => setScheduledDayIndex(idx)}
                          className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                            isSelected
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                              : hasSlots
                              ? 'border-white/10 text-white hover:border-white/30'
                              : 'border-white/5 text-white/20 cursor-not-allowed'
                          }`}
                        >
                          {formatDayLabel(day, idx, isRTL)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time picker */}
                <div>
                  <span className="text-white/60 text-xs mb-2 block">
                    {isRTL ? 'اختر الساعة (10 صباحاً - 12 منتصف الليل)' : 'Choose a time (10 AM - 12 AM)'}
                  </span>
                  {availableSlotsForSelectedDay.length === 0 ? (
                    <p className="text-white/40 text-xs py-2">
                      {isRTL ? 'لا يوجد مواعيد متاحة في هذا اليوم' : 'No available times on this day'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                      {availableSlotsForSelectedDay.map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => setScheduledTime(slot.value)}
                          className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                            scheduledTime === slot.value
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                              : 'border-white/10 text-white hover:border-white/30'
                          }`}
                          dir="ltr"
                        >
                          {formatTimeLabel(slot, isRTL)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">
              {isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isRTL ? 'أي تعليمات خاصة...' : 'Any special instructions...'}
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
            <CreditCard className="w-5 h-5" />
            <span>
              {loading 
                ? (isRTL ? 'جاري التأكيد...' : 'Confirming...') 
                : `${isRTL ? 'تأكيد الطلب' : 'Confirm Order'} — ${finalTotal} ${isRTL ? 'ج.م' : 'EGP'}`
              }
            </span>
          </motion.button>
        </form>
      </div>
    </div>
  )
}