'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, FileBarChart, RefreshCw, Download, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

// WHAT: صف الطلب زي ما بيرجع من /api/orders/report — نفس شكل بيانات
//       صفحة الطلبات، بس مبسّط للحقول اللي محتاجاها في المراجعة المحاسبية
// WHY:  Type-safe، وممنوع أي 'any' في المشروع
// KILL: من غيره TypeScript مش هيقدر يتحقق من شكل بيانات التقرير
interface ReportOrder {
  id: string
  order_number: string | null
  created_at: string
  customer_name: string
  total: number
  status: string
  brand: { id: string; name_ar: string; name_en: string } | null
}

interface ReportData {
  delivered: ReportOrder[]
  cancelled: ReportOrder[]
}

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

// WHAT: آخر 3 سنين لحد السنة الحالية — كافية للمراجعة المحاسبية العادية
// WHY:  مفيش داعي نعرض سنين مستقبلية أو قديمة أوي في الدروب داون
function getYearOptions(): number[] {
  const current = new Date().getFullYear()
  return [current, current - 1, current - 2]
}

function formatMoney(n: number): string {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// WHAT: يحول اسم الملف والبيانات لصيغة CSV ويبدأ التنزيل في المتصفح
// WHY:  المحاسب محتاج ياخد الأرقام في Excel يشتغل عليها براحته
// KILL: من غيره لازم ينسخ من الجدول يدوي صف صف
function downloadCsv(filename: string, rows: ReportOrder[]) {
  const header = ['رقم الطلب', 'التاريخ', 'اسم العميل', 'البراند', 'المبلغ الإجمالي']
  const lines = rows.map((o) => [
    o.order_number || o.id.slice(0, 8),
    new Date(o.created_at).toLocaleDateString('ar-EG'),
    o.customer_name,
    o.brand?.name_ar || '—',
    o.total.toFixed(2),
  ])
  const csvContent = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // BOM عشان Excel العربي يفتح الملف بترميز صحيح من غير حروف مبعثرة
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function OrdersTable({ rows, emptyLabel }: { rows: ReportOrder[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b">
          <tr>
            <th className="px-4 py-3 text-right font-semibold">رقم الطلب</th>
            <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
            <th className="px-4 py-3 text-right font-semibold">اسم العميل</th>
            <th className="px-4 py-3 text-right font-semibold">البراند</th>
            <th className="px-4 py-3 text-right font-semibold">المبلغ الإجمالي</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 dark:bg-gray-800 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">#{order.order_number || order.id.slice(0, 8)}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                {new Date(order.created_at).toLocaleDateString('ar-EG')}
              </td>
              <td className="px-4 py-3 font-medium">{order.customer_name}</td>
              <td className="px-4 py-3">{order.brand?.name_ar || '—'}</td>
              <td className="px-4 py-3 font-bold">{order.total.toFixed(2)} ج.م</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryBar({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t text-sm">
      <span className="text-gray-600 dark:text-gray-300">
        إجمالي عدد الطلبات: <span className="font-bold text-gray-900 dark:text-white">{count}</span>
      </span>
      <span className="text-gray-600 dark:text-gray-300">
        إجمالي المبلغ: <span className="font-bold text-gray-900 dark:text-white">{formatMoney(total)} ج.م</span>
      </span>
    </div>
  )
}

export default function ReportsPage() {
  const yearOptions = useMemo(getYearOptions, [])
  const now = useMemo(() => new Date(), [])

  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1) // 1-12
  const [data, setData] = useState<ReportData>({ delivered: [], cancelled: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'delivered' | 'cancelled'>('delivered')

  // WHAT: تحميل تقرير الشهر المختار من الـ API
  // WHY:  مصدر واحد للبيانات يستخدمه التحميل الأول وزرار "تحديث"
  // KILL: من غيره كل مسار تحميل هيكرر نفس منطق الفetch
  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/report?year=${year}&month=${month}`)
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to load report')

      setData(result.data || { delivered: [], cancelled: [] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحميل التقرير'
      toast.error(`❌ ${message}`)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const deliveredTotal = data.delivered.reduce((sum, o) => sum + o.total, 0)
  const cancelledTotal = data.cancelled.reduce((sum, o) => sum + o.total, 0)

  function handleExport() {
    const rows = activeTab === 'delivered' ? data.delivered : data.cancelled
    if (rows.length === 0) {
      toast.error('لا يوجد بيانات للتصدير')
      return
    }
    const tabLabel = activeTab === 'delivered' ? 'مكتملة' : 'ملغاة'
    downloadCsv(`تقرير-طلبات-${tabLabel}-${year}-${month}.csv`, rows)
  }

  return (
    <div dir="rtl" className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileBarChart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">تقارير الطلبات الشهرية</h1>
        </div>
        <Button variant="outline" onClick={loadReport}>
          <RefreshCw className="h-4 w-4 ms-2" />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">الشهر:</span>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="الشهر" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_AR.map((label, idx) => (
                <SelectItem key={idx + 1} value={String(idx + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">السنة:</span>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'delivered' | 'cancelled')}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="delivered" className="gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              الطلبات المكتملة
              <span className="ms-1 text-xs text-muted-foreground">({data.delivered.length})</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              الطلبات الملغاة
              <span className="ms-1 text-xs text-muted-foreground">({data.cancelled.length})</span>
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4 ms-2" />
            تصدير Excel (CSV)
          </Button>
        </div>

        <TabsContent value="delivered">
          <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                <OrdersTable rows={data.delivered} emptyLabel="لا توجد طلبات مكتملة في هذا الشهر" />
                <SummaryBar count={data.delivered.length} total={deliveredTotal} />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cancelled">
          <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                <OrdersTable rows={data.cancelled} emptyLabel="لا توجد طلبات ملغاة في هذا الشهر" />
                <SummaryBar count={data.cancelled.length} total={cancelledTotal} />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
