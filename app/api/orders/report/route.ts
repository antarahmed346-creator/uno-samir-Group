// app/api/orders/report/route.ts
// WHAT: Admin-only endpoint that returns a month's orders split into
//       delivered vs cancelled, for the accounting review report page.
// WHY:  المحاسبة محتاجة تراجع الطلبات المكتملة والملغاة لشهر معيّن بسرعة
//       من غير ما تدوّر يدوي في صفحة /admin/orders.
// SECURITY: Same auth + role + brand-isolation pattern used in
//           app/api/orders/route.ts — session check, then admin_users
//           role lookup via the service client, then role-based scoping.

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Helper: Create service client (bypasses RLS — role already verified above)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface ReportOrderRow {
  id: string
  order_number: string | null
  created_at: string
  customer_name: string
  total: number
  status: string
  brand: { id: string; name_ar: string; name_en: string } | null
}

// GET /api/orders/report?year=2026&month=8 — Admin only
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
      console.error('[Orders Report GET] Admin query error:', adminError)
      return Response.json({ error: 'Failed to verify admin' }, { status: 500 })
    }

    if (!adminUser || !adminUser.is_active) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = adminUser.role as string
    const brandAccess = adminUser.brand_access as string[] | null

    // content_editor لا يشوف تقارير مالية
    if (role !== 'super_admin' && role !== 'brand_manager') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse & validate year/month
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '') // 1-12

    if (
      !Number.isInteger(year) || year < 2000 || year > 2100 ||
      !Number.isInteger(month) || month < 1 || month > 12
    ) {
      return Response.json({ error: 'Invalid year/month' }, { status: 400 })
    }

    // WHAT: نطاق الشهر بالكامل — من أول يوم للشهر لأول يوم في اللي بعده
    // WHY:  أدق وأبسط من حساب آخر يوم في الشهر يدويًا (بيراير مثلاً)
    const rangeStart = new Date(Date.UTC(year, month - 1, 1)).toISOString()
    const rangeEnd = new Date(Date.UTC(year, month, 1)).toISOString()

    let query = serviceClient
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        customer_name,
        total,
        status,
        brand:brands(id, name_ar, name_en)
      `)
      .in('status', ['delivered', 'cancelled'])
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .order('created_at', { ascending: false })

    // Brand isolation: نفس منطق app/api/orders/route.ts
    if (role === 'brand_manager') {
      if (!brandAccess || brandAccess.length === 0) {
        return Response.json({ data: { delivered: [], cancelled: [] } }, { status: 200 })
      }
      query = query.in('brand_id', brandAccess)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Orders Report GET] Error:', error)
      return Response.json({ error: 'Failed to fetch report' }, { status: 500 })
    }

    const rows = (data || []) as unknown as ReportOrderRow[]
    const delivered = rows.filter((o) => o.status === 'delivered')
    const cancelled = rows.filter((o) => o.status === 'cancelled')

    return Response.json({ data: { delivered, cancelled } }, { status: 200 })
  } catch (err) {
    console.error('[Orders Report GET] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
