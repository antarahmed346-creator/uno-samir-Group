import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { AdminUser, AdminRole } from '@/lib/types'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options: CookieOptions
          }[]
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
}

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, email, full_name, avatar_url, role, brand_access, is_active, last_login, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error || !adminUser || !adminUser.is_active) return null

  return adminUser as AdminUser
}

export async function requireAdminAuth(
  allowedRoles?: AdminRole[]
): Promise<AdminUser> {
  const adminUser = await getCurrentAdminUser()

  if (!adminUser) {
    throw new Error('Unauthorized')
  }

  if (allowedRoles && !allowedRoles.includes(adminUser.role)) {
    throw new Error('Forbidden')
  }

  return adminUser
}