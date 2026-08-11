// app/api/admin/users/route.ts — FIXED VERSION
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('🚀 API /api/admin/users called')

  try {
    const body = await request.json()
    console.log('📦 Request body:', body)

    const { email, password, full_name, role, brand_access } = body

    if (!email || !password) {
      console.log('❌ Missing email or password')
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // WHAT: Uses admin client with service role key for privileged operations
    // WHY:  Creating users requires admin privileges that anon key doesn't have
    // KILL: Using createServerClient (anon key) will fail with permission error
    const supabase = createAdminClient()

    // 1. Create user in Supabase Auth
    console.log('🔐 Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.log('❌ Auth error:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    console.log('✅ Auth user created:', authData.user.id)

    // 2. Insert into admin_users
    console.log('📝 Inserting into admin_users...')
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: authData.user.id,
        email,
        full_name: full_name || email.split('@')[0],
        role: role || 'content_editor',
        brand_access: brand_access || [],
        is_active: true,
        avatar_url: null,
        last_login: null,
      })
      .select()
      .single()

    if (adminError) {
      console.log('❌ Admin insert error:', adminError.message)
      // Rollback: delete auth user if admin_users insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: adminError.message }, { status: 400 })
    }

    console.log('✅ User created successfully!')
    return NextResponse.json({ 
      success: true, 
      user: adminData,
      message: 'تم إنشاء المستخدم بنجاح' 
    })

  } catch (error) {
    console.log('❌ Server error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Delete from admin_users
    const { error: adminError } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 400 })
    }

    // 2. Delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف المستخدم بنجاح' 
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}