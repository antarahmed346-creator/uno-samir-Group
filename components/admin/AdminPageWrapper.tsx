'use client'

import { useEffect, useState } from 'react'
import AdminSidebar from './AdminSidebar'
import { createBrowserClient } from '@/lib/supabase/client'
import { AdminRole, AdminPermissions } from '@/lib/types'

interface AdminPageWrapperProps {
  children: React.ReactNode
}

export default function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const [userData, setUserData] = useState<{ role: AdminRole; name: string; permissions: AdminPermissions | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('admin_users')
          .select('role, full_name, permissions')
          .eq('id', user.id)
          .single()

        // WHAT: Validates the role is a valid AdminRole before setting state
        // WHY:  TypeScript strict mode requires exact type matching
        // KILL: Remove this and TypeScript will reject invalid roles
        const validRole: AdminRole = ['super_admin', 'brand_manager', 'content_editor'].includes(data?.role)
          ? data?.role
          : 'content_editor'

        setUserData({
          role: validRole,
          name: data?.full_name || user.email || 'Admin',
          permissions: data?.permissions ?? null,
        })
      }
      setLoading(false)
    }
    loadUser()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">غير مصرح بالدخول</p>
      </div>
    )
  }

  return (
    <AdminSidebar userRole={userData.role} userName={userData.name} userPermissions={userData.permissions}>
      {children}
    </AdminSidebar>
  )
}