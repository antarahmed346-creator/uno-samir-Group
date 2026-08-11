'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'

interface UseRealtimeMenuOptions {
  brandId?: string
  enabled?: boolean
}

export function useRealtimeMenu({ brandId, enabled = true }: UseRealtimeMenuOptions) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    // Products channel
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: brandId ? `brand_id=eq.${brandId}` : undefined,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          queryClient.invalidateQueries({ queryKey: ['product'] })
        }
      )
      .subscribe(() => {
      })
    channels.push(productsChannel)

    // Offers channel
    const offersChannel = supabase
      .channel('offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: brandId ? `brand_id=eq.${brandId}` : undefined,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['offers'] })
        }
      )
      .subscribe(() => {
      })
    channels.push(offersChannel)

    // Homepage channel (global only)
    if (!brandId) {
      const homepageChannel = supabase
        .channel('homepage-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'homepage_sections',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['homepage'] })
          }
        )
        .subscribe(() => {
        })
      channels.push(homepageChannel)
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [brandId, enabled, queryClient])
}