import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ role: null, brandAccess: [], isAdmin: false })
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('role, brand_access, is_active, full_name')
    .eq('id', user.id)
    .single()

  if (error || !data || !data.is_active) {
    return NextResponse.json({ role: null, brandAccess: [], isAdmin: false })
  }

  return NextResponse.json({
    role: data.role,
    brandAccess: data.brand_access || [],
    isAdmin: true,
    fullName: data.full_name
  })
}