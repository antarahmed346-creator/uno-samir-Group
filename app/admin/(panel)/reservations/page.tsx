'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, CalendarCheck, Users, X, Check, XCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

// WHAT: Type-safe Reservation interface matching the API response shape
// WHY:  Zero 'any' policy — every data structure is explicitly typed (زي orders بالظبط)
// KILL: Remove this and TypeScript cannot validate reservation fields anywhere in this file
interface Reservation {
  id: string
  brand_id: string
  customer_name: string
  customer_phone: string
  reservation_date: string // 'YYYY-MM-DD'
  reservation_time: string // 'HH:MM:SS'
  party_size: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  completed: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

// WHAT: بيفورمات وقت TIME جاي من Postgres ('19:30:00') لصيغة عربي مقروءة
function formatTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':')
  const hour = parseInt(hStr, 10)
  const minute = mStr || '00'
  const period = hour < 12 ? 'ص' : 'م'
  let displayHour = hour % 12
  if (displayHour === 0) displayHour = 12
  return `${displayHour}:${minute} ${period}`
}

// WHAT: بيفورمات تاريخ DATE جاي من Postgres ('2026-08-20') بدون أي انزلاق تايم زون
function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('ar-EG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDate, setFilterDate] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // WHAT: Fetch reservations from API with optional status + date filters
  // WHY:  Centralized data fetch so both initial load and refresh use identical logic
  const loadReservations = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/reservations?limit=100'
      if (filterStatus !== 'all') url += `&status=${filterStatus}`
      if (filterDate) url += `&date=${filterDate}`

      const res = await fetch(url)
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to load')

      setReservations(result.data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحميل الحجوزات'
      toast.error(`❌ ${message}`)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterDate])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // WHAT: بيحدّث حالة الحجز (تأكيد / رفض / إتمام) مع تحديث فوري للقايمة محلياً
  // WHY:  تجربة استخدام سريعة من غير ما ننتظر إعادة تحميل كل القايمة
  const updateStatus = async (id: string, status: Reservation['status']) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to update')

      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      toast.success('✅ تم تحديث الحجز')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحديث الحجز'
      toast.error(`❌ ${message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div dir="rtl" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="h-6 w-6" />
          إدارة الحجوزات — على الروف
        </h1>
        <Button variant="outline" onClick={loadReservations}>
          <RefreshCw className="h-4 w-4 ms-2" />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-800">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="dark:[color-scheme:dark]"
            />
          </div>
        </div>
        {filterDate && (
          <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>
            <X className="h-4 w-4 ms-1" />
            مسح التاريخ
          </Button>
        )}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>لا توجد حجوزات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">العميل</th>
                  <th className="px-4 py-3 text-right font-semibold">التليفون</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold">الوقت</th>
                  <th className="px-4 py-3 text-right font-semibold">عدد الأشخاص</th>
                  <th className="px-4 py-3 text-right font-semibold">ملاحظات</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium">{reservation.customer_name}</td>
                    <td className="px-4 py-3 font-mono" dir="ltr">{reservation.customer_phone}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(reservation.reservation_date)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300" dir="ltr">{formatTime(reservation.reservation_time)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <Users className="h-3.5 w-3.5" />
                        {reservation.party_size}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-gray-500 dark:text-gray-400" title={reservation.notes || ''}>
                      {reservation.notes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[reservation.status] || 'bg-gray-100'}>
                        {STATUS_LABELS[reservation.status] || reservation.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {updatingId === reservation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : reservation.status === 'pending' ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"
                            onClick={() => updateStatus(reservation.id, 'confirmed')}
                          >
                            <Check className="h-3.5 w-3.5 ms-1" />
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-2"
                            onClick={() => updateStatus(reservation.id, 'cancelled')}
                          >
                            <XCircle className="h-3.5 w-3.5 ms-1" />
                            رفض
                          </Button>
                        </div>
                      ) : reservation.status === 'confirmed' ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-2"
                            onClick={() => updateStatus(reservation.id, 'completed')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 ms-1" />
                            إتمام
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-2"
                            onClick={() => updateStatus(reservation.id, 'cancelled')}
                          >
                            <XCircle className="h-3.5 w-3.5 ms-1" />
                            إلغاء
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
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
