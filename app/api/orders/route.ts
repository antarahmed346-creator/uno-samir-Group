// app/api/orders/route.ts
// WHAT: Public endpoint to create orders; Admin endpoint to list orders
// WHY:  Customers place orders via POST; Admins fetch filtered lists via GET
// SECURITY: Auth check + Role verification + Brand isolation
// NOTE: Rate limiting disabled for development. Enable before production.

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

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
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(8).max(20),
  customer_address: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().min(0),
  delivery_fee: z.number().min(0).default(0),
  total: z.number().min(0),
  payment_method: z.string().default('cash_on_delivery'),
  customer_notes: z.string().optional(),
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

    // Insert order
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        brand_id: data.brand_id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        subtotal: data.subtotal,
        delivery_fee: data.delivery_fee,
        total: data.total,
        payment_method: data.payment_method,
        customer_notes: data.customer_notes,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('[Orders POST] Insert error:', orderError)
      return Response.json({ error: 'Failed to create order' }, { status: 500 })
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