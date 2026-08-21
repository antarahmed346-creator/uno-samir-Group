// app/api/coupons/validate/route.ts

// WHAT: بيتأكد إن كود الخصم صحيح ومسموح استخدامه دلوقتي
// WHY:  بيتشيك في السلة قبل ما العميل يكمل، عشان يشوف الخصم فوراً
// KILL: من غيره، العميل مش هيعرف الكود صح ولا غلط غير بعد ما يبعت الطلب

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const validateSchema = z.object({
  code: z.string().min(1),
  brand_id: z.string().uuid(),
  product_ids: z.array(z.string().uuid()).default([]),
  subtotal: z.number().min(0),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = validateSchema.safeParse(body)

    if (!result.success) {
      return Response.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }

    const { code, brand_id, product_ids, subtotal } = result.data
    const supabase = getServiceClient()

    const { data: offer, error } = await supabase
      .from('offers')
      .select('*, offer_products(product_id)')
      .ilike('promo_code', code.trim())
      .eq('status', 'active')
      .maybeSingle()

    if (error || !offer) {
      return Response.json({ error: 'كود الخصم غير صحيح' }, { status: 404 })
    }

    // WHAT: تحقق من تاريخ الصلاحية
    const now = new Date()
    if (new Date(offer.starts_at) > now) {
      return Response.json({ error: 'الكود ده لسه مفعّلش' }, { status: 400 })
    }
    if (offer.expires_at && new Date(offer.expires_at) < now) {
      return Response.json({ error: 'الكود ده انتهت صلاحيته' }, { status: 400 })
    }

    // WHAT: تحقق من حد الاستخدام
    if (offer.usage_limit && offer.usage_count >= offer.usage_limit) {
      return Response.json({ error: 'الكود ده وصل للحد الأقصى من الاستخدام' }, { status: 400 })
    }

    // WHAT: تحقق إن الكوبون تابع لنفس البراند (لو محدد براند معين)
    if (offer.brand_id && offer.brand_id !== brand_id) {
      return Response.json({ error: 'الكود ده مش شغال في البراند ده' }, { status: 400 })
    }

    // WHAT: لو الكوبون مرتبط بمنتجات معينة، لازم واحد منهم على الأقل في السلة
    const linkedProductIds: string[] = (offer.offer_products || []).map(
      (op: { product_id: string }) => op.product_id
    )
    if (linkedProductIds.length > 0) {
      const hasLinkedProduct = product_ids.some((id) => linkedProductIds.includes(id))
      if (!hasLinkedProduct) {
        return Response.json(
          { error: 'الكود ده خاص بمنتج معين مش موجود في سلتك' },
          { status: 400 }
        )
      }
    }

    // WHAT: تحقق من الحد الأدنى للطلب
    if (offer.min_order_value && subtotal < offer.min_order_value) {
      return Response.json(
        { error: `أقل قيمة طلب لاستخدام الكود ده ${offer.min_order_value} ج.م` },
        { status: 400 }
      )
    }

    let discount = 0
    if (offer.type === 'percentage') {
      discount = (subtotal * offer.discount_value) / 100
    } else if (offer.type === 'fixed') {
      discount = offer.discount_value
    }
    if (offer.max_discount && discount > offer.max_discount) {
      discount = offer.max_discount
    }
    discount = Math.min(discount, subtotal)

    return Response.json({
      valid: true,
      offerId: offer.id,
      code: offer.promo_code,
      type: offer.type,
      discountValue: offer.discount_value,
      maxDiscount: offer.max_discount,
      minOrderValue: offer.min_order_value,
      titleAr: offer.title_ar,
      discountAmount: discount,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'خطأ غير متوقع' },
      { status: 500 }
    )
  }
}
