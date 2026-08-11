'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Tag, RefreshCw, Pencil, Trash2, Eye, EyeOff, Percent, Banknote, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOffers, useDeleteOffer, useToggleOfferStatus } from '@/lib/hooks/useOffers'
import { useBrands } from '@/lib/hooks/useCategories'

const offerTypeLabels: Record<string, string> = {
  percentage: 'نسبة مئوية',
  fixed: 'خصم ثابت',
  bundle: 'باقة',
}

const offerTypeIcons: Record<string, React.ReactNode> = {
  percentage: <Percent className="h-4 w-4" />,
  fixed: <Banknote className="h-4 w-4" />,
  bundle: <Package className="h-4 w-4" />,
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  inactive: { label: 'متوقف', variant: 'secondary' },
  draft: { label: 'مسودة', variant: 'outline' },
}

export default function OffersPage() {
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const brandFilter = selectedBrand === 'all' ? undefined : selectedBrand

  const { data: offers, isLoading, error, refetch } = useOffers(brandFilter)
  const { data: brands } = useBrands()
  const deleteOffer = useDeleteOffer()
  const toggleStatus = useToggleOfferStatus()

  const handleDelete = async (id: string) => {
    if (!confirm('متأكد من حذف العرض؟')) return
    await deleteOffer.mutateAsync(id)
  }

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await toggleStatus.mutateAsync({ id, status: newStatus as 'active' | 'inactive' | 'draft' })
  }

  if (error) {
    return (
      <div dir="rtl" className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center space-y-3">
          <p className="text-red-600 font-semibold text-lg">❌ حدث خطأ في تحميل العروض</p>
          <p className="text-red-500 text-sm">{(error as Error).message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">إدارة العروض</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'جاري التحميل...' : `${offers?.length ?? 0} عرض`}
          </p>
        </div>
        <Link href="/admin/offers/new">
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة عرض
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Brand Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium">تصفية حسب البرانده:</span>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="كل البراندات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🍽️ كل البراندات</SelectItem>
            {brands?.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                <span
                  className="inline-block w-3 h-3 rounded-full ml-2"
                  style={{ backgroundColor: brand.primary_color ?? '#888' }}
                />
                {brand.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers?.map((offer) => (
            <Card key={offer.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{offer.title_ar}</CardTitle>
                    <p className="text-sm text-muted-foreground">{offer.title_en}</p>
                  </div>
                  <Badge variant={statusLabels[offer.status]?.variant || 'outline'}>
                    {statusLabels[offer.status]?.label || offer.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type & Value */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-orange-600 font-medium">
                    {offerTypeIcons[offer.type]}
                    {offerTypeLabels[offer.type] || offer.type}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-bold text-lg">
                    {offer.type === 'percentage' ? `${offer.discount_value}%` : `${offer.discount_value} ج.م`}
                  </span>
                </div>

                {/* Brand */}
                {offer.brand && (
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: offer.brand.primary_color || '#888' }}
                    />
                    <span className="text-muted-foreground">{offer.brand.name_ar}</span>
                  </div>
                )}

                {/* Dates */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🗓️ من: {new Date(offer.starts_at).toLocaleDateString('ar-EG')}</p>
                  {offer.expires_at && (
                    <p>⏰ لغاية: {new Date(offer.expires_at).toLocaleDateString('ar-EG')}</p>
                  )}
                  {offer.promo_code && (
                    <p className="font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">
                      🎫 {offer.promo_code}
                    </p>
                  )}
                </div>

                {/* Usage */}
                {offer.usage_limit && (
                  <div className="text-xs text-muted-foreground">
                    👥 استخدام: {offer.usage_count} / {offer.usage_limit}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Link href={`/admin/offers/${offer.id}`}>
                    <Button variant="ghost" size="sm" className="text-blue-600">
                      <Pencil className="h-4 w-4 ml-1" />
                      تعديل
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(offer.id, offer.status)}
                    className={offer.status === 'active' ? 'text-amber-600' : 'text-green-600'}
                  >
                    {offer.status === 'active' ? (
                      <><EyeOff className="h-4 w-4 ml-1" /> إيقاف</>
                    ) : (
                      <><Eye className="h-4 w-4 ml-1" /> تفعيل</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(offer.id)}
                    className="text-red-600 hover:text-red-700"
                    disabled={deleteOffer.isPending}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!offers || offers.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">لا توجد عروض</p>
              <p className="text-sm">أضف عرض جديد للبدء</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}