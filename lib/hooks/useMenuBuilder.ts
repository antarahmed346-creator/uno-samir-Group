'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const supabase = createBrowserClient()

export interface MenuItem {
  id: string
  type: 'category' | 'product'
  name_ar: string
  name_en: string
  brand_id: string
  sort_order: number
  status: string
  parent_id?: string | null
  // Product-specific
  base_price?: number
  is_available?: boolean
  category_id?: string
}

// ─── useMenuBuilder ──────────────────────────────────────────────────────────────
export function useMenuBuilder(brandId?: string) {
  return useQuery<MenuItem[]>({
    queryKey: ['menu_builder', brandId],
    queryFn: async () => {
      // Fetch categories
      let catQuery = supabase
        .from('categories')
        .select('id, name_ar, name_en, brand_id, sort_order, status, parent_id')
        .order('sort_order', { ascending: true })

      if (brandId) {
        catQuery = catQuery.eq('brand_id', brandId)
      }

      const { data: categories, error: catError } = await catQuery
      if (catError) throw new Error(catError.message)

      // Fetch products
      let prodQuery = supabase
        .from('products')
        .select('id, name_ar, name_en, brand_id, sort_order, status, base_price, is_available, category_id')
        .order('sort_order', { ascending: true })

      if (brandId) {
        prodQuery = prodQuery.eq('brand_id', brandId)
      }

      const { data: products, error: prodError } = await prodQuery
      if (prodError) throw new Error(prodError.message)

      const menuItems: MenuItem[] = [
        ...(categories ?? []).map((c) => ({
          ...c,
          type: 'category' as const,
        })),
        ...(products ?? []).map((p) => ({
          ...p,
          type: 'product' as const,
          parent_id: p.category_id,
        })),
      ]

      return menuItems.sort((a, b) => a.sort_order - b.sort_order)
    },
  })
}

// ─── useUpdateMenuOrder ─────────────────────────────────────────────────────────
export function useUpdateMenuOrder() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { items: { id: string; type: 'category' | 'product'; sort_order: number }[] }>({
    mutationFn: async ({ items }) => {
      const categories = items.filter((i) => i.type === 'category')
      const products = items.filter((i) => i.type === 'product')

      if (categories.length > 0) {
        for (const cat of categories) {
          const { error } = await supabase
            .from('categories')
            .update({ sort_order: cat.sort_order, updated_at: new Date().toISOString() })
            .eq('id', cat.id)
          if (error) throw new Error(error.message)
        }
      }

      if (products.length > 0) {
        for (const prod of products) {
          const { error } = await supabase
            .from('products')
            .update({ sort_order: prod.sort_order, updated_at: new Date().toISOString() })
            .eq('id', prod.id)
          if (error) throw new Error(error.message)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_builder'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('✅ تم حفظ الترتيب بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}