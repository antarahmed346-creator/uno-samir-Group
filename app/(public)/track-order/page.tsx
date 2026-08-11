'use client'

import { useState, useEffect, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Package, CheckCircle, Clock, MapPin, Phone, User, ChevronDown } from 'lucide-react'

interface OrderItem {
  id: string
  product_name_ar: string
  quantity: number
  unit_price: number
  total_price: number
}

interface TimelineStep {
  key: string
  label: string
  time: string
}

interface Order {
  id: string
  status: string
  customer_name: string
  customer_phone: string
  customer_address: string | null
  customer_notes: string | null
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: string
  created_at: string
  brand: { name_ar: string; name_en: string }
  items: OrderItem[]
  timeline: TimelineStep[]
}

const STATUS_FLOW = [
  { key: 'pending', labelEn: 'Pending', labelAr: 'معلق', color: 'bg-yellow-500', text: 'text-yellow-600' },
  { key: 'accepted', labelEn: 'Accepted', labelAr: 'مقبول', color: 'bg-blue-500', text: 'text-blue-600' },
  { key: 'preparing', labelEn: 'Preparing', labelAr: 'قيد التحضير', color: 'bg-orange-500', text: 'text-orange-600' },
  { key: 'ready', labelEn: 'Ready', labelAr: 'جاهز', color: 'bg-purple-500', text: 'text-purple-600' },
  { key: 'out_for_delivery', labelEn: 'Out for Delivery', labelAr: 'في الطريق', color: 'bg-indigo-500', text: 'text-indigo-600' },
  { key: 'delivered', labelEn: 'Delivered', labelAr: 'تم التوصيل', color: 'bg-green-500', text: 'text-green-600' },
  { key: 'cancelled', labelEn: 'Cancelled', labelAr: 'ملغي', color: 'bg-red-500', text: 'text-red-600' },
]

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'معلق', en: 'Pending' },
  accepted: { ar: 'مقبول', en: 'Accepted' },
  preparing: { ar: 'قيد التحضير', en: 'Preparing' },
  ready: { ar: 'جاهز', en: 'Ready' },
  out_for_delivery: { ar: 'في الطريق', en: 'Out for Delivery' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
}

export default function TrackOrderPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [locale, setLocale] = useState('ar')

  useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/)
    if (match) setLocale(match[1])
  }, [])

  const isRTL = locale === 'ar'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      setError(isRTL ? 'رقم التليفون مطلوب' : 'Phone number is required')
      return
    }

    setError('')
    setOrders([])
    setSelectedOrder(null)
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('phone', phone.trim())

      const res = await fetch(`/api/orders/track?${params.toString()}`)
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || (isRTL ? 'حدث خطأ' : 'An error occurred'))
        return
      }

      setOrders(result.data || [])
    } catch {
      setError(isRTL ? 'فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.' : 'Failed to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIndex = (status: string) => STATUS_FLOW.findIndex((s) => s.key === status)

  const currentStatusIndex = selectedOrder ? getStatusIndex(selectedOrder.status) : -1

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 py-12 px-4" suppressHydrationWarning>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Package className="h-12 w-12 mx-auto text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">{isRTL ? 'تتبع طلبك' : 'Track Your Order'}</h1>
          <p className="text-gray-500">{isRTL ? 'أدخل رقم التليفون لمتابعة طلباتك' : 'Enter your phone number to track your orders'}</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{isRTL ? 'رقم التليفون' : 'Phone Number'}</label>
              <div className="relative">
                <Phone className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${isRTL ? 'pr-10' : 'pl-10'} h-12`}
                  type="tel"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin ms-2" />
              ) : (
                <Search className="h-5 w-5 ms-2" />
              )}
              {loading ? (isRTL ? 'جاري البحث...' : 'Searching...') : (isRTL ? 'ابحث عن طلباتي' : 'Search My Orders')}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Orders List */}
        {orders.length > 0 && !selectedOrder && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-4">{isRTL ? `طلباتك (${orders.length})` : `Your Orders (${orders.length})`}</h2>
            <div className="space-y-3">
              {orders.map((order) => {
                const statusIdx = getStatusIndex(order.status)
                const statusLabel = STATUS_LABELS[order.status] || { ar: order.status, en: order.status }
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full text-right p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition border hover:border-orange-200"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{isRTL ? 'طلب' : 'Order'} #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">{isRTL ? order.brand.name_ar : (order.brand.name_en || order.brand.name_ar)}</p>
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      </div>
                      <Badge className={`${STATUS_FLOW[statusIdx]?.color || 'bg-gray-500'} text-white`}>
                        {isRTL ? statusLabel.ar : statusLabel.en}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected Order Detail */}
        {selectedOrder && (
          <div className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setSelectedOrder(null)}
              className="w-full"
            >
              <ChevronDown className={`h-4 w-4 ms-2 ${isRTL ? 'rotate-90' : '-rotate-90'}`} />
              {isRTL ? 'العودة لقائمة الطلبات' : 'Back to Orders List'}
            </Button>

            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{isRTL ? 'طلب' : 'Order'} #{selectedOrder.id.slice(0, 8)}</h2>
                  <p className="text-gray-500 mt-1">{isRTL ? selectedOrder.brand.name_ar : (selectedOrder.brand.name_en || selectedOrder.brand.name_ar)}</p>
                </div>
                <Badge className={`text-sm px-4 py-2 ${STATUS_FLOW[currentStatusIndex]?.color || 'bg-gray-500'} text-white`}>
                  {isRTL ? (STATUS_LABELS[selectedOrder.status]?.ar || selectedOrder.status) : (STATUS_LABELS[selectedOrder.status]?.en || selectedOrder.status)}
                </Badge>
              </div>

              {selectedOrder.status !== 'cancelled' && (
                <div className="relative mb-8">
                  <div className="flex items-center justify-between">
                    {STATUS_FLOW.slice(0, 6).map((step, idx) => {
                      const isActive = idx <= currentStatusIndex
                      const isCurrent = idx === currentStatusIndex
                      return (
                        <div key={step.key} className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all ${
                              isActive ? step.color : 'bg-gray-200'
                            } ${isCurrent ? 'ring-4 ring-offset-2 ring-orange-200 scale-110' : ''}`}
                          >
                            {isActive ? <CheckCircle className="h-5 w-5" /> : idx + 1}
                          </div>
                          <span className={`text-xs mt-2 font-medium text-center w-16 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                            {isRTL ? step.labelAr : step.labelEn}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-0 mx-5">
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
                      style={{
                        width: `${Math.min((currentStatusIndex / (STATUS_FLOW.length - 2)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">{isRTL ? 'سجل التحديثات' : 'Update History'}</h3>
                {selectedOrder.timeline.map((step, idx) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${idx === selectedOrder.timeline.length - 1 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{step.label}</p>
                      <p className="text-xs text-gray-500">{formatDate(step.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                {isRTL ? 'بيانات العميل' : 'Customer Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{isRTL ? 'الاسم' : 'Name'}</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{isRTL ? 'رقم التليفون' : 'Phone'}</p>
                    <p className="font-medium" dir="ltr">{selectedOrder.customer_phone}</p>
                  </div>
                </div>
                {selectedOrder.customer_address && (
                  <div className="flex items-center gap-3 md:col-span-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">{isRTL ? 'العنوان' : 'Address'}</p>
                      <p className="font-medium">{selectedOrder.customer_address}</p>
                    </div>
                  </div>
                )}
                {selectedOrder.customer_notes && (
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">{isRTL ? 'ملاحظات' : 'Notes'}</p>
                      <p className="font-medium text-orange-600">{selectedOrder.customer_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                {isRTL ? 'تفاصيل الطلب' : 'Order Details'}
              </h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.product_name_ar}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × {item.unit_price.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                      </p>
                    </div>
                    <p className="font-bold">{item.total_price.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span>{selectedOrder.subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{isRTL ? 'رسوم التتوصيل' : 'Delivery Fee'}</span>
                  <span>{selectedOrder.delivery_fee.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-orange-600">
                  <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                  <span>{selectedOrder.total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}