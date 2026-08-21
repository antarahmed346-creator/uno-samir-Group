// app/api/reservations/route.ts
// WHAT: Public endpoint to create table reservations; Admin endpoint to list them
// WHY:  Customers book a table via POST (guest, "على الروف" only); Admins fetch
//       filtered lists via GET to manage the reservation queue
// SECURITY: Auth check + Role verification, mirrors app/api/orders/route.ts exactly
// NOTE: Rate limited via rateLimiters.reservationCreation (5 req / 10 min per IP)

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'

// WHAT: سلوج البراند الوحيد اللي بيستخدم نظام الحجوزات ده
// WHY:  "على الروف" كافيه بجلسة، عكس باقي البراندات اللي مطاعم توصيل بس
// KILL: تغيير القيمة دي هيوجّه كل الحجوزات لبراند تاني غلط
const RESERVATIONS_BRAND_SLUG = 'ala-el-roof'

const createReservationSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(8).max(20),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  reservation_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format'),
  party_size: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional(),
})

// Helper: Create service client (نفس الباترن بالظبط المستخدم في app/api/orders/route.ts)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/reservations — Admin only, with date + status filters
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
      console.error('[Reservations GET] Admin query error:', adminError)
      return Response.json({ error: 'Failed to verify admin' }, { status: 500 })
    }

    if (!adminUser || !adminUser.is_active) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = adminUser.role as string
    const brandAccess = adminUser.brand_access as string[] | null

    // Only super_admin and brand_manager can view reservations (زي orders بالظبط)
    if (!['super_admin', 'brand_manager'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: brand } = await serviceClient
      .from('brands')
      .select('id')
      .eq('slug', RESERVATIONS_BRAND_SLUG)
      .single()

    if (!brand) {
      return Response.json({ error: 'Reservation system unavailable' }, { status: 500 })
    }

    // Brand isolation: brand_manager يشوف الحجوزات بس لو "على الروف" ضمن براندز المتاحة له
    if (role === 'brand_manager' && !(brandAccess || []).includes(brand.id)) {
      return Response.json({ data: [] }, { status: 200 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

    let query = serviceClient
      .from('reservations')
      .select('*')
      .eq('brand_id', brand.id)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (date) {
      query = query.eq('reservation_date', date)
    }

    const { data: reservations, error: reservationsError } = await query

    if (reservationsError) {
      console.error('[Reservations GET] Error:', reservationsError)
      return Response.json({ error: 'Failed to fetch reservations' }, { status: 500 })
    }

    return Response.json({ data: reservations || [] }, { status: 200 })
  } catch (err) {
    console.error('[Reservations GET] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/reservations — Public (guest booking, "على الروف" فقط)
export async function POST(request: NextRequest) {
  try {
    // WHAT: يمنع أي جهاز يبعت أكتر من 5 حجوزات في 10 دقايق
    // WHY:  نفس منطق حماية /api/orders بالظبط — لازم نمنع سبام
    //       حجوزات وهمية تغرق طاولات "على الروف"
    // KILL: من غيره أي حد يقدر يبعت آلاف الحجوزات الوهمية بضغطة سكريبت
    const identifier = getClientIdentifier(request)
    const rl = await checkRateLimit(rateLimiters.reservationCreation, identifier)
    if (!rl.allowed) {
      return Response.json(
        { error: 'محاولات كتير أوي، حاول تاني بعد شوية' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const result = createReservationSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: 'Invalid reservation data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    const serviceClient = getServiceClient()

    // WHAT: بنجيب brand_id بتاع "على الروف" من السيرفر نفسه، مش من العميل
    // WHY:  النظام ده مخصص لبراند "على الروف" بس — لو ثقنا في brand_id
    //       جاي من المتصفح، أي حد يقدر يبعت حجز لبراند تاني مش مصمم له
    // KILL: من غيره فيه ثغرة تسمح بحجوزات لبراندات توصيل مالهاش طاولات أصلاً
    const { data: brand, error: brandError } = await serviceClient
      .from('brands')
      .select('id')
      .eq('slug', RESERVATIONS_BRAND_SLUG)
      .single()

    if (brandError || !brand) {
      console.error('[Reservations POST] Brand lookup error:', brandError)
      return Response.json({ error: 'Reservation system unavailable' }, { status: 500 })
    }

    // WHAT: التأكد إن الميعاد المطلوب فعلاً في المستقبل
    // WHY:  مينفعش حد يحجز معاد فات، ده بيلخبط لوحة التحكم
    const reservationDateTime = new Date(`${data.reservation_date}T${data.reservation_time}`)
    if (Number.isNaN(reservationDateTime.getTime()) || reservationDateTime.getTime() <= Date.now()) {
      return Response.json({ error: 'الميعاد المطلوب لازم يكون في المستقبل' }, { status: 400 })
    }

    const { data: reservation, error: insertError } = await serviceClient
      .from('reservations')
      .insert({
        brand_id: brand.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        reservation_date: data.reservation_date,
        reservation_time: data.reservation_time,
        party_size: data.party_size,
        notes: data.notes,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !reservation) {
      console.error('[Reservations POST] Insert error:', insertError)
      return Response.json({ error: 'Failed to create reservation' }, { status: 500 })
    }

    return Response.json(
      { data: reservation, message: 'Reservation created successfully' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Reservations POST] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
