// WHAT: Supabase Realtime subscription helper for orders table INSERT events
// WHY:  Enables instant push notifications to admin dashboard without polling
// KILL: Remove this and admins must manually refresh to see new orders

import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

// KILL: Removing this interface breaks TypeScript safety in all consumers
export interface OrderPayload {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
  brand_id: string
  created_at: string
}

// WHAT: Subscribes to new order INSERT events, optionally filtered by brand_id
// WHY:  brand_manager should only see orders for their assigned brand
// KILL: Remove this and realtime notifications stop working entirely
export function subscribeToOrders(
  callback: (payload: OrderPayload) => void,
  brandId?: string
): () => void {
  const supabase = createBrowserClient()

  // Build filter string for brand isolation (RLS handles auth, this handles noise)
  const filter = brandId ? `brand_id=eq.${brandId}` : undefined

  const subscription = supabase
    .channel("orders-notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter,
      },
      (payload: RealtimePostgresChangesPayload<OrderPayload>) => {
        // Validate payload shape before passing to consumer
        if (payload.new && typeof payload.new === "object") {
          callback(payload.new as OrderPayload)
        }
      }
    )
    .subscribe()

  // WHAT: Cleanup function to remove channel and prevent memory leaks
  // WHY:  Must be called on unmount to avoid duplicate subscriptions
  // KILL: Without this, every navigation creates a new channel until crash
  return () => {
    supabase.removeChannel(subscription)
  }
}