import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@uno-samir.com',
    password: 'Admin123456789!',
    email_confirm: true,
  })

  if (error) {
    console.error('[Setup Admin] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('admin_users').insert({
    id: data.user.id,
    email: 'admin@uno-samir.com',
    full_name: 'Admin User',
    role: 'super_admin',
    is_active: true,
  })

  return NextResponse.json({ success: true })
}