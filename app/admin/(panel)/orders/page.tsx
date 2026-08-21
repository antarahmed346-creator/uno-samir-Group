'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Eye, RefreshCw, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

// WHAT: Type-safe Order interface matching the API response shape
// WHY:  Zero 'any' policy — every data structure is explicitly typed
// KILL: Remove this and TypeScript cannot validate order fields anywhere in this file
interface Order {
  id: string
  brand_id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total: number
  status: string
  payment_method: string
  created_at: string
  scheduled_delivery_time: string | null
  brand: { name_ar: string; name_en: string }
  items: { id: string; product_name_ar: string; quantity: number; total_price: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
  ready: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
  out_for_delivery: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
  delivered: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلق',
  accepted: 'مقبول',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
}

export default function OrdersPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchPhone, setSearchPhone] = useState('')
  const [newOrderCount, setNewOrderCount] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const hasInteracted = useRef(false)

  // WHAT: Fetch orders from API with optional status filter
  // WHY:  Centralized data fetch so both initial load and refresh use identical logic
  // KILL: Remove this and every refresh path duplicates the fetch logic
  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/orders?limit=50'
      if (filterStatus !== 'all') url += `&status=${filterStatus}`

      const res = await fetch(url)
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to load')

      setOrders(result.data || [])
      setNewOrderCount(0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحميل الطلبات'
      toast.error(`❌ ${message}`)
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  // Initial load
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // WHAT: Auto-refresh every 30 seconds as polling fallback
  // WHY:  Realtime may disconnect; polling guarantees no missed orders
  // KILL: Remove this and network hiccups cause admins to see stale data
  useEffect(() => {
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [loadOrders])

  // WHAT: Realtime subscription for instant order updates + sound + toast
  // WHY:  Polling alone has 30-second latency; realtime pushes in <1 second
  // KILL: Remove this and new orders appear up to 30 seconds late
  useEffect(() => {
    const unlockAudio = () => {
      hasInteracted.current = true
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AC) audioCtxRef.current = new AC()
      }
    }
    window.addEventListener('click', unlockAudio, { once: true })

    const channel = supabase
      .channel('orders-page-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order

          // Sound alert
          if (hasInteracted.current && audioCtxRef.current) {
            try {
              const ctx = audioCtxRef.current
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.type = 'sine'
              osc.frequency.setValueAtTime(880, ctx.currentTime)
              osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
              osc.start(ctx.currentTime)
              osc.stop(ctx.currentTime + 0.4)
            } catch {
              // Silently ignore audio errors
            }
          }

          // Toast
          toast.success(`🛎️ طلب جديد! #${newOrder.order_number || newOrder.id.slice(0, 8)}`, {
            description: `${newOrder.customer_name} — ${newOrder.total.toLocaleString('ar-EG')} ج.م`,
            duration: 6000,
            position: 'top-left',
            action: {
              label: 'عرض',
              onClick: () => router.push(`/admin/orders/${newOrder.id}`),
            },
          })

          // Optimistically prepend to list
          setOrders((prev) => [newOrder, ...prev])
          setNewOrderCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('click', unlockAudio)
    }
  }, [supabase, router])

  const filteredOrders = orders.filter((o) =>
    searchPhone ? o.customer_phone.includes(searchPhone) : true
  )

  return (
    <div dir="rtl" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">📦 إدارة الطلبات</h1>
          {newOrderCount > 0 && (
            <Badge className="bg-red-500 text-white hover:bg-red-500 animate-pulse">
              {newOrderCount} طلب جديد
            </Badge>
          )}
        </div>
        <Button variant="outline" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4 ms-2" />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم التليفون..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">رقم الطلب</th>
                  <th className="px-4 py-3 text-right font-semibold">البراند</th>
                  <th className="px-4 py-3 text-right font-semibold">العميل</th>
                  <th className="px-4 py-3 text-right font-semibold">التليفون</th>
                  <th className="px-4 py-3 text-right font-semibold">الإجمالي</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">الموعد</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">#{order.order_number || order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{order.brand?.name_ar}</td>
                    <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                    <td className="px-4 py-3 font-mono" dir="ltr">{order.customer_phone}</td>
                    <td className="px-4 py-3 font-bold">{order.total.toFixed(2)} ج.م</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100'}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {order.scheduled_delivery_time ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {new Date(order.scheduled_delivery_time).toLocaleString('ar-EG', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">فوري</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}