// app/api/orders/route.ts
// WHAT: Public endpoint to create orders; Admin endpoint to list orders
// WHY:  Customers place orders via POST; Admins fetch filtered lists via GET
// SECURITY: Auth check + Role verification + Brand isolation
// NOTE: Rate limiting disabled for development. Enable before production.

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'

// Zod schema for creating an order
const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name_ar: z.string().min(1),
  product_name_en: z.string().optional(),
  unit_price: z.number().min(0),
  quantity: z.number().int().min(1),
  total_price: z.number().min(0),
  customizations: z.array(z.record(z.any())).default([]),
})

const createOrderSchema = z.object({
  brand_id: z.string().uuid(),
  customer_uid: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(8).max(20),
  customer_address: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().min(0),
  delivery_fee: z.number().min(0).default(0),
  total: z.number().min(0),
  payment_method: z.string().default('cash_on_delivery'),
  customer_notes: z.string().optional(),
  coupon_code: z.string().optional(),
  discount_amount: z.number().min(0).default(0),
  // WHAT: ميعاد التوصيل اللي العميل حدده بنفسه، بدل "أسرع وقت ممكن"
  // WHY:  لازم نتحقق إنه فعلاً في المستقبل (مش تاريخ فات) قبل ما نسجله
  // KILL: من غيره حد يقدر يبعت تاريخ في الماضي أو قيمة مش صالحة كـ timestamp
  scheduled_delivery_time: z
    .string()
    .datetime()
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: 'scheduled_delivery_time must be in the future',
    })
    .nullable()
    .optional(),
})

// Helper: Create service client
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/orders — Admin only, with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = getServiceClient()

    // Role check
    const { data: adminUser, error: adminError } = await serviceClient
      .from('admin_users')
      .select('role, brand_access, is_active')
      .eq('id', user.id)
      .single()

    if (adminError) {
      console.error('[Orders GET] Admin query error:', adminError)
      return Response.json({ error: 'Failed to verify admin' }, { status: 500 })
    }

    if (!adminUser || !adminUser.is_active) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = adminUser.role as string
    const brandId = adminUser.brand_access as string | null

    // Parse query params
    const { searchParams } = new URL(request.url)
    const filterBrandId = searchParams.get('brand_id')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = serviceClient
      .from('orders')
      .select(`
        *,
        brand:brands(id, name_ar, name_en)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (role === 'brand_manager' && brandId) {
      query = query.eq('brand_id', brandId)
    } else if (filterBrandId && role === 'super_admin') {
      query = query.eq('brand_id', filterBrandId)
    }

    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      console.error('[Orders GET] Error:', ordersError)
      return Response.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Fetch items for all orders
    const orderIds = (orders || []).map((o: { id: string }) => o.id)
    let items: Array<{ order_id: string; id: string; product_name_ar: string; quantity: number; unit_price: number; total_price: number; customizations: unknown[] }> = []

    if (orderIds.length > 0) {
      const { data: itemsData } = await serviceClient
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
      items = (itemsData || []) as typeof items
    }

    // Combine orders with items
    const ordersWithItems = (orders || []).map((order: { id: string }) => ({
      ...order,
      items: items.filter((item) => item.order_id === order.id),
    }))

    return Response.json({ data: ordersWithItems }, { status: 200 })
  } catch (err) {
    console.error('[Orders GET] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/orders — Public (guest checkout)
export async function POST(request: NextRequest) {
  try {
    // WHAT: يمنع أي جهاز يبعت أكتر من 5 طلبات في 10 دقايق
    // WHY:  الموقع بقى منشور فعلياً على الإنترنت — لازم نمنع
    //       سبام الطلبات الوهمية اللي ممكن تغرق لوحة تحكم المطعم
    // KILL: من غيره أي حد يقدر يبعت آلاف الطلبات الوهمية بضغطة سكريبت
    // NOTE: لو Redis نفسه فشل (مشكلة شبكة/إعدادات)، منمنعش عميل حقيقي
    //       من إتمام طلبه بسبب مشكلة في خدمة خارجية — بنسجل الخطأ ونكمل
    try {
      const identifier = getClientIdentifier(request)
      const rl = await checkRateLimit(rateLimiters.orderCreation, identifier)
      if (!rl.allowed) {
        return Response.json(
          { error: 'محاولات كتير أوي، حاول تاني بعد شوية' },
          { status: 429 }
        )
      }
    } catch (rateLimitErr) {
      console.error('[Orders POST] Rate limit check failed, allowing order through:', rateLimitErr)
    }

    const body = await request.json()
    const result = createOrderSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: 'Invalid order data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    const serviceClient = getServiceClient()

    // WHAT: بيعيد التحقق من الكوبون على السيرفر، مش بيثق في القيمة
    //       اللي المتصفح بعتها
    // WHY:  لو ثقنا في discount_amount الجاي من العميل، أي حد يقدر
    //       يفتح الـ Developer Tools ويغيّر الرقم لأي قيمة يحبها
    //       ويطلب بخصم وهمي 100% مثلاً
    // KILL: من غيره فيه ثغرة تلاعب بالأسعار في كل طلب
    let verifiedDiscount = 0
    let matchedOfferId: string | null = null

    if (data.coupon_code) {
      const { data: offer } = await serviceClient
        .from('offers')
        .select('*, offer_products(product_id)')
        .ilike('promo_code', data.coupon_code.trim())
        .eq('status', 'active')
        .maybeSingle()

      if (offer) {
        const now = new Date()
        const withinDate =
          new Date(offer.starts_at) <= now &&
          (!offer.expires_at || new Date(offer.expires_at) >= now)
        const withinLimit = !offer.usage_limit || offer.usage_count < offer.usage_limit
        const brandMatches = !offer.brand_id || offer.brand_id === data.brand_id
        const linkedIds: string[] = (offer.offer_products || []).map(
          (op: { product_id: string }) => op.product_id
        )
        const productMatches =
          linkedIds.length === 0 || data.items.some((i) => linkedIds.includes(i.product_id))
        const meetsMin = !offer.min_order_value || data.subtotal >= offer.min_order_value

        if (withinDate && withinLimit && brandMatches && productMatches && meetsMin) {
          let calc = 0
          if (offer.type === 'percentage') calc = (data.subtotal * offer.discount_value) / 100
          else if (offer.type === 'fixed') calc = offer.discount_value
          if (offer.max_discount && calc > offer.max_discount) calc = offer.max_discount
          verifiedDiscount = Math.min(calc, data.subtotal)
          matchedOfferId = offer.id
        }
      }
    }

    const verifiedTotal = Math.max(data.subtotal + data.delivery_fee - verifiedDiscount, 0)

    // WHAT: بنحاول نضيف customer_uid (لربط الطلب بالإشعارات) — لو
    //       فشلت المحاولة الأولى (مثلاً لأن العمود لسه مش موجود في
    //       قاعدة البيانات، زي لو الـ SQL الجديد لسه ماتشغلش)، بنعيد
    //       المحاولة من غيره تاني
    // WHY:  إتمام الطلب هو الأهم على الإطلاق — ميزة الإشعارات لازم
    //       متوقفش عميل حقيقي عن إتمام طلبه لو مفيش عمود جديد لسه
    const orderPayloadBase = {
      brand_id: data.brand_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      subtotal: data.subtotal,
      delivery_fee: data.delivery_fee,
      total: verifiedTotal,
      coupon_code: matchedOfferId ? data.coupon_code : null,
      discount_amount: verifiedDiscount,
      payment_method: data.payment_method,
      customer_notes: data.customer_notes,
      scheduled_delivery_time: data.scheduled_delivery_time || null,
      status: 'pending',
    }

    let { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({ ...orderPayloadBase, customer_uid: data.customer_uid || null })
      .select()
      .single()

    if (orderError) {
      console.error('[Orders POST] Insert with customer_uid failed, retrying without it:', orderError.message)
      const retry = await serviceClient
        .from('orders')
        .insert(orderPayloadBase)
        .select()
        .single()
      order = retry.data
      orderError = retry.error
    }

    if (orderError || !order) {
      console.error('[Orders POST] Insert error:', orderError)
      return Response.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // WHAT: بيزود عداد استخدام الكوبون بعد ما الطلب اتسجل بنجاح
    if (matchedOfferId) {
      await serviceClient.rpc('increment_offer_usage', { offer_id_input: matchedOfferId })
    }

    // Insert order items
    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name_ar: item.product_name_ar,
      product_name_en: item.product_name_en,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price,
      customizations: item.customizations,
    }))

    const { error: itemsError } = await serviceClient
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('[Orders POST] Items error:', itemsError)
      await serviceClient.from('orders').delete().eq('id', order.id)
      return Response.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    return Response.json(
      { data: order, message: 'Order created successfully' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Orders POST] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}