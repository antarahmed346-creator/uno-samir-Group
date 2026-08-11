// app/api/orders/track/route.ts
// WHAT: Public endpoint to track orders by phone number
// WHY:  Customers only need their phone number to find their orders
// KILL: Remove this and customers cannot track their orders

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/orders/track?phone=01234567890
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')?.trim()

    // Validation
    if (!phone) {
      return Response.json(
        { error: 'رقم التليفون مطلوب' },
        { status: 400 }
      )
    }

    const serviceClient = getServiceClient()

    // Fetch all orders for this phone (last 30 days, max 20)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: orders, error: ordersError } = await serviceClient
      .from('orders')
      .select(`
        *,
        brand:brands(id, name_ar, name_en)
      `)
      .eq('customer_phone', phone)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (ordersError) {
      console.error('[Track Order] Error:', ordersError)
      return Response.json(
        { error: 'حدث خطأ في البحث' },
        { status: 500 }
      )
    }

    if (!orders || orders.length === 0) {
      return Response.json(
        { error: 'لم يتم العثور على طلبات بهذا الرقم. تأكد من رقم التليفون أو أن الطلب تم خلال آخر 30 يوم.' },
        { status: 404 }
      )
    }

    // Fetch items for all orders
    const orderIds = orders.map((o: { id: string }) => o.id)
    
    const { data: items, error: itemsError } = await serviceClient
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)

    if (itemsError) {
      console.error('[Track Order] Items error:', itemsError)
    }

    // Build timeline for each order
    const ordersWithItems = orders.map((order: { 
      id: string; 
      status: string; 
      created_at: string; 
      accepted_at: string | null;
      preparing_at: string | null;
      ready_at: string | null;
      out_for_delivery_at: string | null;
      delivered_at: string | null;
      cancelled_at: string | null;
      brand: { name_ar: string; name_en: string };
    }) => {
      const timeline = [
        { key: 'pending', label: 'تم استلام الطلب', time: order.created_at },
        { key: 'accepted', label: 'تم قبول الطلب', time: order.accepted_at },
        { key: 'preparing', label: 'قيد التحضير', time: order.preparing_at },
        { key: 'ready', label: 'الطلب جاهز', time: order.ready_at },
        { key: 'out_for_delivery', label: 'في الطريق للتوصيل', time: order.out_for_delivery_at },
        { key: 'delivered', label: 'تم التوصيل', time: order.delivered_at },
        { key: 'cancelled', label: 'تم الإلغاء', time: order.cancelled_at },
      ].filter((step) => step.time !== null)

      return {
        ...order,
        items: (items || []).filter((item: { order_id: string }) => item.order_id === order.id),
        timeline,
      }
    })

    return Response.json({ data: ordersWithItems }, { status: 200 })
  } catch (err) {
    console.error('[Track Order] Unexpected error:', err)
    return Response.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    )
  }
}