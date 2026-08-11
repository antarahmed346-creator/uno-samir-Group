'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Offer, OfferInsert, OfferUpdate } from '@/lib/types'

const supabase = createBrowserClient()

// ─── useOffers ──────────────────────────────────────────────────────────────
export function useOffers(brandId?: string) {
  return useQuery<Offer[]>({
    queryKey: ['offers', brandId],
    queryFn: async () => {
      let query = supabase
        .from('offers')
        .select('*, brand:brands(id, name_ar, name_en, primary_color)')
        .order('created_at', { ascending: false })

      if (brandId) {
        query = query.eq('brand_id', brandId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as Offer[]
    },
  })
}

// ─── useOffer ─────────────────────────────────────────────────────────────────
export function useOffer(id: string) {
  return useQuery<Offer>({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, brand:brands(id, name_ar, name_en, primary_color)')
        .eq('id', id)
        .single()

      if (error) throw new Error(error.message)
      return data as Offer
    },
    enabled: !!id,
  })
}

// ─── useCreateOffer ─────────────────────────────────────────────────────────
export function useCreateOffer() {
  const queryClient = useQueryClient()

  return useMutation<Offer, Error, OfferInsert>({
    mutationFn: async (offer) => {
      const { data, error } = await supabase
        .from('offers')
        .insert(offer)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as Offer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      toast.success('✅ تم إضافة العرض بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useUpdateOffer ───────────────────────────────────────────────────────────
export function useUpdateOffer() {
  const queryClient = useQueryClient()

  return useMutation<Offer, Error, { id: string; data: OfferUpdate }>({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('offers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated as Offer
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['offer', variables.id] })
      toast.success('✅ تم تعديل العرض بنجاح')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useDeleteOffer ───────────────────────────────────────────────────────────
export function useDeleteOffer() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      toast.success('✅ تم حذف العرض')
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}

// ─── useToggleOfferStatus ──────────────────────────────────────────────────
export function useToggleOfferStatus() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; status: 'active' | 'inactive' | 'draft' }>({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase
        .from('offers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['offer', variables.id] })
      toast.success(
        variables.status === 'active'
          ? '✅ تم تفعيل العرض'
          : '⏸️ تم إيقاف العرض'
      )
    },
    onError: (err) => {
      toast.error(`❌ خطأ: ${err.message}`)
    },
  })
}