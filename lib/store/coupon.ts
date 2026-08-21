import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// WHAT: بيحفظ الكوبون المطبّق عشان يفضل موجود من السلة لحد الشيك أوت
// WHY:  العميل بيدخل الكود في صفحة السلة، لكن الطلب الفعلي بيتبعت
//       من صفحة تانية (checkout) — لازم الكوبون يفضل متذكر بينهم
// KILL: من غيره، العميل هيضطر يدخل الكود تاني في كل صفحة

export interface AppliedCoupon {
  offerId: string
  code: string
  type: 'percentage' | 'fixed' | 'bundle'
  discountValue: number
  maxDiscount: number | null
  minOrderValue: number | null
  titleAr: string
}

interface CouponStore {
  coupon: AppliedCoupon | null
  setCoupon: (coupon: AppliedCoupon) => void
  clearCoupon: () => void
}

export const useCouponStore = create<CouponStore>()(
  persist(
    (set) => ({
      coupon: null,
      setCoupon: (coupon) => set({ coupon }),
      clearCoupon: () => set({ coupon: null }),
    }),
    {
      name: 'uno-samir-coupon',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// WHAT: بيحسب قيمة الخصم الفعلية بناءً على نوع الكوبون
// WHY:  دالة واحدة مشتركة تستخدم في السلة والشيك أوت عشان
//       الحساب يبقى متطابق في كل مكان، مش منسوخ ومختلف
export function calculateDiscount(coupon: AppliedCoupon | null, subtotal: number): number {
  if (!coupon) return 0
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) return 0

  let discount = 0
  if (coupon.type === 'percentage') {
    discount = (subtotal * coupon.discountValue) / 100
  } else if (coupon.type === 'fixed') {
    discount = coupon.discountValue
  }

  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount
  }

  return Math.min(discount, subtotal)
}
