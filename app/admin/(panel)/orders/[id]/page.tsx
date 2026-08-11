'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_address: string | null
  total: number
  subtotal: number
  delivery_fee: number
  status: string
  payment_method: string
  customer_notes: string | null
  admin_notes: string | null
  created_at: string
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  items: {
    id: string
    product_name_ar: string
    quantity: number
    unit_price: number
    total_price: number
    customizations: unknown[]
  }[]
  brand: { name_ar: string }
}

const STATUS_FLOW = [
  { key: 'pending', label: 'معلق', color: 'bg-yellow-500' },
  { key: 'accepted', label: 'مقبول', color: 'bg-blue-500' },
  { key: 'preparing', label: 'قيد التحضير', color: 'bg-orange-500' },
  { key: 'ready', label: 'جاهز', color: 'bg-purple-500' },
  { key: 'out_for_delivery', label: 'في الطريق', color: 'bg-indigo-500' },
  { key: 'delivered', label: 'تم التوصيل', color: 'bg-green-500' },
]

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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setOrder(result.data)
    } catch (err) {
      toast.error('❌ فشل تحميل الطلب')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast.success(`✅ تم تحديث الحالة`)
      setOrder(result.data)
   } catch {
  toast.error('❌ فشل تحديث الحالة')
} finally {
      setUpdating(false)
    }
  }

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.findIndex((s) => s.key === current)
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1].key : null
  }

  const currentStatusIndex = order
    ? STATUS_FLOW.findIndex((s) => s.key === order.status)
    : -1

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>الطلب غير موجود</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/orders')}>
          العودة للقائمة
        </Button>
      </div>
    )
  }

  const nextStatus = getNextStatus(order.status)

  return (
    <div dir="rtl" className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلب #{order.id.slice(0, 8)}</h1>
          <p className="text-gray-500 mt-1">{order.brand?.name_ar}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/orders')}>
          العودة للقائمة
        </Button>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-6">حالة الطلب</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STATUS_FLOW.map((step, idx) => {
            const isActive = idx <= currentStatusIndex
            const isCurrent = idx === currentStatusIndex
            return (
              <div key={step.key} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      isActive ? step.color : 'bg-gray-200'
                    } ${isCurrent ? 'ring-4 ring-offset-2 ring-orange-200' : ''}`}
                  >
                    {isActive ? <CheckCircle className="h-5 w-5" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < STATUS_FLOW.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Current Status Badge */}
        <div className="mt-4">
          <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
            الحالة الحالية: {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        {nextStatus && order.status !== 'cancelled' && (
          <div className="mt-6 pt-4 border-t flex gap-3">
            <Button
              onClick={() => updateStatus(nextStatus)}
              disabled={updating}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              {nextStatus === 'accepted' && '✅ قبول الطلب'}
              {nextStatus === 'preparing' && '👨‍🍳 بدء التحضير'}
              {nextStatus === 'ready' && '📦 الطلب جاهز'}
              {nextStatus === 'out_for_delivery' && '🛵 خروج للتوصيل'}
              {nextStatus === 'delivered' && '✅ تم التوصيل'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => updateStatus('cancelled')}
              disabled={updating}
            >
              ❌ إلغاء الطلب
            </Button>
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">بيانات العميل</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">الاسم</label>
            <p className="font-medium">{order.customer_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">رقم التليفون</label>
            <p className="font-medium" dir="ltr">{order.customer_phone}</p>
          </div>
          {order.customer_address && (
            <div className="md:col-span-2">
              <label className="text-sm text-gray-500">العنوان</label>
              <p className="font-medium">{order.customer_address}</p>
            </div>
          )}
          {order.customer_notes && (
            <div className="md:col-span-2">
              <label className="text-sm text-gray-500">ملاحظات العميل</label>
              <p className="font-medium text-orange-600">{order.customer_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">تفاصيل الطلب</h2>
        <div className="space-y-3">
          {order.items && order.items.length > 0 ? (
            order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.product_name_ar}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} × {item.unit_price.toFixed(2)} ج.م
                  </p>
                </div>
                <p className="font-bold">{item.total_price.toFixed(2)} ج.م</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">لا توجد منتجات في هذا الطلب</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>المجموع الفرعي</span>
            <span>{order.subtotal.toFixed(2)} ج.م</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>رسوم التوصيل</span>
            <span>{order.delivery_fee.toFixed(2)} ج.م</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-orange-600">
            <span>الإجمالي</span>
            <span>{order.total.toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  )
}