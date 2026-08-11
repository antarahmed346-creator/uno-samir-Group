'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AdminUser } from '@/lib/types'

const supabase = createBrowserClient()

// ─── useUsers ──────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as AdminUser[]
    },
  })
}

// ─── useUser ─────────────────────────────────────────────────────────────────
export function useUser(id: string) {
  return useQuery<AdminUser>({
    queryKey: ['admin_user', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw new Error(error.message)
      return data as AdminUser
    },
    enabled: !!id,
  })
}

// ─── useCreateUser ─────────────────────────────────────────────────────────
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation<AdminUser, Error, Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (user) => {
      const { data, error } = await supabase
        .from('admin_users')
        .insert(user)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as AdminUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      toast.success('✅ تم إضافة المستخدم بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useUpdateUser ───────────────────────────────────────────────────────────
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation<AdminUser, Error, { id: string; data: Partial<AdminUser> }>({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('admin_users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated as AdminUser
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      queryClient.invalidateQueries({ queryKey: ['admin_user', variables.id] })
      toast.success('✅ تم تعديل المستخدم بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useDeleteUser ───────────────────────────────────────────────────────────
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      toast.success('✅ تم حذف المستخدم')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useToggleUserStatus ──────────────────────────────────────────────────
export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      toast.success(
        variables.is_active
          ? '✅ تم تفعيل المستخدم'
          : '⏸️ تم إيقاف المستخدم'
      )
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}