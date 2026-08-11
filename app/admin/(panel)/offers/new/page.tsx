'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateOffer } from '@/lib/hooks/useOffers'
import { useBrands } from '@/lib/hooks/useCategories'

const offerTypes = [
  { value: 'percentage', label: 'نسبة مئوية (%)' },
  { value: 'fixed', label: 'خصم ثابت (ج.م)' },
  { value: 'bundle', label: 'باقة (Bundle)' },
]

export default function NewOfferPage() {
  const router = useRouter()
  const createOffer = useCreateOffer()
  const { data: brands } = useBrands()

  const [form, setForm] = useState({
    title_ar: '',
    title_en: '',
    description_ar: '',
    description_en: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'bundle',
    discount_value: '',
    promo_code: '',
    min_order_value: '',
    max_discount: '',
    usage_limit: '',
    brand_id: '',
    starts_at: '',
    expires_at: '',
    status: 'draft' as 'active' | 'inactive' | 'draft',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createOffer.mutateAsync({
      title_ar: form.title_ar,
      title_en: form.title_en,
      description_ar: form.description_ar || null,
      description_en: form.description_en || null,
      type: form.type,
      discount_value: Number(form.discount_value) || 0,
      promo_code: form.promo_code || null,
      min_order_value: form.min_order_value ? Number(form.min_order_value) : null,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      usage_count: 0,
      brand_id: form.brand_id || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      status: form.status,
      image_url: null,
    })

    router.push('/admin/offers')
  }

  return (
    <div dir="rtl" className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Tag className="h-6 w-6" />
        <h1 className="text-2xl font-bold">إضافة عرض جديد</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">معلومات أساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">العنوان (عربي) *</Label>
                <Input
                  id="title_ar"
                  value={form.title_ar}
                  onChange={(e) => handleChange('title_ar', e.target.value)}
                  placeholder="مثال: خصم 20% على البيتزا"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title_en">العنوان (إنجليزي)</Label>
                <Input
                  id="title_en"
                  value={form.title_en}
                  onChange={(e) => handleChange('title_en', e.target.value)}
                  placeholder="e.g. 20% Off on Pizza"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description_ar">الوصف (عربي)</Label>
                <Textarea
                  id="description_ar"
                  value={form.description_ar}
                  onChange={(e) => handleChange('description_ar', e.target.value)}
                  placeholder="وصف العرض..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_en">الوصف (إنجليزي)</Label>
                <Textarea
                  id="description_en"
                  value={form.description_en}
                  onChange={(e) => handleChange('description_en', e.target.value)}
                  placeholder="Offer description..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل العرض</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">نوع العرض *</Label>
                <Select value={form.type} onValueChange={(v) => handleChange('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {offerTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  {form.type === 'percentage' ? 'نسبة الخصم (%) *' : 'قيمة الخصم (ج.م) *'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => handleChange('discount_value', e.target.value)}
                  placeholder={form.type === 'percentage' ? '20' : '50'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo_code">كود الخصم (اختياري)</Label>
                <Input
                  id="promo_code"
                  value={form.promo_code}
                  onChange={(e) => handleChange('promo_code', e.target.value.toUpperCase())}
                  placeholder="PIZZA20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_id">البراند</Label>
                <Select value={form.brand_id} onValueChange={(v) => handleChange('brand_id', v)}>
                  <SelectTrigger>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_order_value">الحد الأدنى للطلب (ج.م)</Label>
                <Input
                  id="min_order_value"
                  type="number"
                  value={form.min_order_value}
                  onChange={(e) => handleChange('min_order_value', e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_discount">أقصى خصم (ج.م)</Label>
                <Input
                  id="max_discount"
                  type="number"
                  value={form.max_discount}
                  onChange={(e) => handleChange('max_discount', e.target.value)}
                  placeholder="200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usage_limit">حد الاستخدام</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  value={form.usage_limit}
                  onChange={(e) => handleChange('usage_limit', e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المواعيد والحالة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at">تاريخ البدء *</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => handleChange('starts_at', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">تاريخ الانتهاء</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => handleChange('expires_at', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v as 'active' | 'inactive' | 'draft')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">📝 مسودة</SelectItem>
                  <SelectItem value="active">✅ نشط</SelectItem>
                  <SelectItem value="inactive">⏸️ متوقف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={createOffer.isPending} className="bg-orange-500 hover:bg-orange-600">
            <ArrowRight className="h-4 w-4 ml-2" />
            {createOffer.isPending ? 'جاري الحفظ...' : 'حفظ العرض'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/offers')}>
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  )
}