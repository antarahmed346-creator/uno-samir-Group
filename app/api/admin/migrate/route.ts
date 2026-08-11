import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// WHAT: One-time migration API to convert plain-text passwords to Supabase Auth
// WHY:  Security fix — removes password_plain and creates proper auth.users entries
// KILL: Run once then delete this file
// NOTE: Only super_admin can run this. Remove after migration.

interface MigrationResult {
  email: string
  status: 'created' | 'updated' | 'failed'
  error?: string
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(
            cookiesToSet: Array<{
              name: string
              value: string
              options: CookieOptions
            }>
          ) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Components can't write cookies
            }
          },
        },
      }
    )
    
    // Verify super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: roleError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !adminUser || adminUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    
    // Get all admin users with plain text passwords
    const { data: users, error: fetchError } = await adminClient
      .from('admin_users')
      .select('id, email, password_plain, full_name, role, brand_access, is_active')
      .not('password_plain', 'is', null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const results: MigrationResult[] = []
    
    for (const u of users || []) {
      try {
        // Check if user already exists in auth.users
        const { data: existingUser } = await adminClient.auth.admin.getUserById(u.id)
        
        if (existingUser?.user) {
          // Update password if user exists
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            u.id,
            { password: u.password_plain }
          )
          
          if (updateError) {
            throw new Error(updateError.message)
          }
          
          results.push({ email: u.email, status: 'updated' })
        } else {
          // Create new auth user with same UUID
          const { error: createError } = await adminClient.auth.admin.createUser({
            id: u.id,
            email: u.email,
            password: u.password_plain,
            email_confirm: true,
            user_metadata: {
              full_name: u.full_name,
              role: u.role,
            },
          })
          
          if (createError) {
            throw new Error(createError.message)
          }
          
          results.push({ email: u.email, status: 'created' })
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({ email: u.email, status: 'failed', error: errorMessage })
      }
    }

    return NextResponse.json({
      success: true,
      migrated: results.filter((r) => r.status !== 'failed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      details: results,
      next_step: 'Run SQL: ALTER TABLE admin_users DROP COLUMN password_plain;',
    })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}