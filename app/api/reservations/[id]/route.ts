// app/api/reservations/[id]/route.ts
// WHAT: Update reservation status (confirm / reject / complete) — Admin only
// WHY:  Admin workflow: pending → confirmed/cancelled, confirmed → completed/cancelled
// SECURITY: Auth check + Role verification, mirrors app/api/orders/[id]/route.ts

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const RESERVATIONS_BRAND_SLUG = 'ala-el-roof'

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
})

// Helper: Create service client
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH /api/reservations/[id] — Update status (Admin only)
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
      console.error('[Reservation PATCH] Admin query error:', adminError)
      return Response.json({ error: 'Failed to verify admin' }, { status: 500 })
    }

    if (!adminUser || !adminUser.is_active) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = adminUser.role as string
    const brandAccess = adminUser.brand_access as string[] | null

    // Only super_admin and brand_manager can update reservations
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

    const { status } = result.data

    // Brand isolation: brand_manager لازم يكون "على الروف" ضمن براندز المتاحة له
    if (role === 'brand_manager') {
      const { data: brand } = await serviceClient
        .from('brands')
        .select('id')
        .eq('slug', RESERVATIONS_BRAND_SLUG)
        .single()

      if (!brand || !(brandAccess || []).includes(brand.id)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Update
    const { data: updatedReservation, error } = await serviceClient
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Reservation PATCH] Error:', error)
      return Response.json({ error: 'Failed to update reservation' }, { status: 500 })
    }

    return Response.json({ data: updatedReservation }, { status: 200 })
  } catch (err) {
    console.error('[Reservation PATCH] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
