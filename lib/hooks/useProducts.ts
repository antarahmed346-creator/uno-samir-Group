'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Product, ProductInsert, ProductUpdate } from '@/lib/types'

const supabase = createBrowserClient()

// ─── useProducts ──────────────────────────────────────────────────────────────
export function useProducts(brandId?: string) {
  return useQuery<Product[]>({
    queryKey: ['products', brandId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, brand:brands(*), category:categories(*)')
        .order('sort_order', { ascending: true })

      if (brandId) {
        query = query.eq('brand_id', brandId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    },
  })
}

// ─── useProduct ─────────────────────────────────────────────────────────────────
export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, brand:brands(*), category:categories(*)')
        .eq('id', id)
        .single()

      if (error) throw new Error(error.message)
      return data as Product
    },
    enabled: !!id,  // ما يشتغلش لو مفيش id
  })
}

// ─── useCreateProduct ─────────────────────────────────────────────────────────
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation<Product, Error, ProductInsert>({
    mutationFn: async (product) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('✅ تم إضافة المنتج بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useUpdateProduct ───────────────────────────────────────────────────────────
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation<Product, Error, { id: string; data: ProductUpdate }>({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('products')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated as Product
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] })
      toast.success('✅ تم تعديل المنتج بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useDeleteProduct ───────────────────────────────────────────────────────────
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('✅ تم حذف المنتج')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useToggleProductAvailability ─────────────────────────────────────────────
export function useToggleProductAvailability() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; isAvailable: boolean }>({
    mutationFn: async ({ id, isAvailable }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] })
      toast.success(
        variables.isAvailable
          ? '✅ تم تفعيل المنتج'
          : '⏸️ تم إيقاف المنتج'
      )
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}