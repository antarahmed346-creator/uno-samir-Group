import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    console.log('[Login] Attempting login for:', email)

    // Get admin user (NO brand_id - use brand_access instead)
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, is_active, brand_access, password_plain')
      .eq('email', email.trim())
      .eq('is_active', true)
      .single()

    console.log('[Login] Query result:', { adminUser, error })

    if (error) {
      console.log('[Login] Database error:', error.message)
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      )
    }

    if (!adminUser) {
      console.log('[Login] User not found')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    if (!adminUser.password_plain) {
      console.log('[Login] No password set')
      return NextResponse.json(
        { error: 'No password set for user' },
        { status: 401 }
      )
    }

    if (password !== adminUser.password_plain) {
      console.log('[Login] Password mismatch')
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    console.log('[Login] Password correct, creating token')

    // Create token (use brand_access instead of brand_id)
    const tokenData = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.full_name,
      brandAccess: adminUser.brand_access,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000),
    }
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64')

    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: 'admin-session',
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    console.log('[Login] Success, cookie set')
    return response

  } catch (err) {
    console.error('[Login] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error: ' + (err as Error).message },
      { status: 500 }
    )
  }
}