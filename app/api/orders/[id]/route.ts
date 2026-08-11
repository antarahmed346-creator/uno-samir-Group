// app/api/orders/[id]/route.ts
// WHAT: Fetch single order details; Update order status (admin workflow)
// WHY:  Admin needs order detail view; Status updates drive kitchen workflow
// SECURITY: Auth check + Role verification + Brand isolation
// NOTE: Rate limiting disabled for development. Enable before production.

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum([
    'pending',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]),
  admin_notes: z.string().optional(),
})

// Helper: Create service client
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/orders/[id] — Fetch order details (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      console.error('[Order GET] Admin query error:', adminError)
      return Response.json({ error: 'Failed to verify admin' }, { status: 500 })
    }

    if (!adminUser || !adminUser.is_active) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = adminUser.role as string
    const brandId = adminUser.brand_access as string | null

    // Fetch order
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select(`
        *,
        brand:brands(id, name_ar, name_en)
      `)
      .eq('id', id)
      .single()

    if (orderError || !order) {
      console.error('[Order GET] Error:', orderError)
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    // Brand isolation: brand_manager can only see own brand orders
    if (role === 'brand_manager' && brandId && (order as { brand_id: string }).brand_id !== brandId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch order items
    const { data: items, error: itemsError } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('order_id', id)

    if (itemsError) {
      console.error('[Order GET] Items error:', itemsError)
    }

    const orderWithItems = {
      ...order,
      items: items || [],
    }

    return Response.json({ data: orderWithItems }, { status: 200 })
  } catch (err) {
    console.error('[Order GET] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/orders/[id] — Update status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      console.error('[Order PATCH] Admin query error:', adminError)
      return Response.json({ error: 'Failed to verify admin' }, { status: 500 })
    }

    if (!adminUser || !adminUser.is_active) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = adminUser.role as string
    const brandId = adminUser.brand_access as string | null

    // Only super_admin and brand_manager can update orders
    if (!['super_admin', 'brand_manager'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const result = updateStatusSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: 'Invalid status', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { status, admin_notes } = result.data

    // Verify order belongs to admin's brand (for brand_manager)
    if (role === 'brand_manager' && brandId) {
      const { data: orderCheck } = await serviceClient
        .from('orders')
        .select('brand_id')
        .eq('id', id)
        .single()

      if (!orderCheck || orderCheck.brand_id !== brandId) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Build update object with timestamp
    const updateData: Record<string, unknown> = { status }
    if (admin_notes) updateData.admin_notes = admin_notes

    // Set timestamp based on status
    const timestampMap: Record<string, string> = {
      accepted: 'accepted_at',
      preparing: 'preparing_at',
      ready: 'ready_at',
      out_for_delivery: 'out_for_delivery_at',
      delivered: 'delivered_at',
      cancelled: 'cancelled_at',
    }
    if (timestampMap[status]) {
      updateData[timestampMap[status]] = new Date().toISOString()
    }

    // Update
    const { data: updatedOrder, error } = await serviceClient
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Order PATCH] Error:', error)
      return Response.json({ error: 'Failed to update order' }, { status: 500 })
    }

    return Response.json({ data: updatedOrder }, { status: 200 })
  } catch (err) {
    console.error('[Order PATCH] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}