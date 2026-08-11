'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type {
  BrandRow,
  CategoryRow,
  CategoryWithBrand,
  CategoryInsert,
  CategoryUpdate,
} from '@/lib/database.types'

const supabase = createBrowserClient()

// ─── useBrands ────────────────────────────────────────────────────────────────
export function useBrands() {
  return useQuery<Pick<BrandRow, 'id' | 'name_ar' | 'name_en' | 'primary_color'>[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name_ar, name_en, primary_color')
        .eq('status', 'active')
        .order('sort_order')

      if (error) throw new Error(error.message)
      return (data ?? []) as Pick<BrandRow, 'id' | 'name_ar' | 'name_en' | 'primary_color'>[]
    },
  })
}

// ─── useCategories ────────────────────────────────────────────────────────────
export function useCategories(brandId?: string) {
  return useQuery<CategoryWithBrand[]>({
    queryKey: ['categories', brandId],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*, brand:brands(id, name_ar, name_en, primary_color)')
        .order('sort_order', { ascending: true })

      if (brandId) {
        query = query.eq('brand_id', brandId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as CategoryWithBrand[]
    },
  })
}

// ─── useCreateCategory ────────────────────────────────────────────────────────
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation<CategoryRow, Error, CategoryInsert>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(payload)  // ✅ شلنا as never
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as CategoryRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('✅ تم إضافة الفئة بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useUpdateCategory ────────────────────────────────────────────────────────
export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation<CategoryRow, Error, { id: string; data: CategoryUpdate }>({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('categories')
        .update(data)  // ✅ شلنا as never
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated as CategoryRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('✅ تم تعديل الفئة بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useDeleteCategory ────────────────────────────────────────────────────────
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('✅ تم حذف الفئة')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useToggleCategoryStatus ──────────────────────────────────────────────────
export function useToggleCategoryStatus() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; status: 'active' | 'inactive' }>({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase
        .from('categories')
        .update({ status })  // ✅ شلنا as never
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(
        variables.status === 'active'
          ? '✅ تم تفعيل الفئة'
          : '⏸️ تم إيقاف الفئة'
      )
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}