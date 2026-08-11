import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AdminRole = 'super_admin' | 'brand_manager' | 'content_editor' | null

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: AdminRole
  brand_access: string[]
  is_active: boolean
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data || !data.is_active) return null

  return data as AdminUser
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/login')
  return admin
}

export async function requireSuperAdmin(): Promise<AdminUser> {
  const admin = await requireAdmin()
  if (admin.role !== 'super_admin') redirect('/admin/dashboard?error=unauthorized')
  return admin
}

export async function requireBrandAccess(): Promise<AdminUser> {
  const admin = await requireAdmin()
  if (admin.role !== 'super_admin' && admin.role !== 'brand_manager') {
    redirect('/admin/dashboard?error=unauthorized')
  }
  return admin
}

export function canAccessBrand(admin: AdminUser, brandId: string): boolean {
  if (admin.role === 'super_admin') return true
  if (admin.role === 'brand_manager') {
    return admin.brand_access?.includes(brandId) ?? false
  }
  return false
}

export function canManageUsers(admin: AdminUser): boolean {
  return admin.role === 'super_admin'
}