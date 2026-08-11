'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// شيل 'Plus' و 'GripVertical' من الـ import
import { Loader2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/admin/ImageUpload'

interface Brand {
  id: string
  name_ar: string
  name_en: string
  slug: string
  logo_url: string | null
  cover_image_url: string | null
  description_ar: string | null
  description_en: string | null
  primary_color: string
  secondary_color: string
  is_active: boolean
  display_order: number
  created_at: string
}

export default function SettingsPage() {
  const supabase = createBrowserClient()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<Brand>>({
    name_ar: '',
    name_en: '',
    slug: '',
    logo_url: '',
    cover_image_url: '',
    description_ar: '',
    description_en: '',
    primary_color: '#FF6B00',
    secondary_color: '#FFFFFF',
    is_active: true,
    display_order: 0,
  })

  const loadBrands = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        toast.error('❌ فشل تحميل البراندات')
        return
      }
      setBrands(data || [])
    } catch {
  toast.error('❌ فشل الحذف')
} finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  function resetForm() {
    setFormData({
      name_ar: '',
      name_en: '',
      slug: '',
      logo_url: '',
      cover_image_url: '',
      description_ar: '',
      description_en: '',
      primary_color: '#FF6B00',
      secondary_color: '#FFFFFF',
      is_active: true,
      display_order: brands.length,
    })
    setEditingId(null)
  }

  function handleEdit(brand: Brand) {
    setFormData({ ...brand })
    setEditingId(brand.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate
      if (!formData.name_ar || !formData.name_en || !formData.slug) {
        toast.error('❌ الاسم والـ Slug مطلوبين')
        return
      }

      // Generate slug if not provided
      const slug = formData.slug
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '')

      const data = {
        ...formData,
        slug,
        logo_url: formData.logo_url || null,
        cover_image_url: formData.cover_image_url || null,
        description_ar: formData.description_ar || null,
        description_en: formData.description_en || null,
      }

      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from('brands')
          .update(data)
          .eq('id', editingId)

        if (error) throw error
        toast.success('✅ تم تحديث البراند')
      } else {
        // CREATE
        const { error } = await supabase
          .from('brands')
          .insert(data)

        if (error) throw error
        toast.success('✅ تم إضافة براند جديد')
      }

      resetForm()
      await loadBrands()
   } catch {
  toast.error('❌ فشل الحذف')
} finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('هل أنت متأكد؟ هذا سيحذف البراند وجميع منتجاته!')
    if (!confirmed) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('🗑️ تم الحذف')
      await loadBrands()
   } catch {
  toast.error('❌ فشل الحذف')
} finally {
      setDeletingId(null)
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: !current })
        .eq('id', id)

      if (error) throw error
      toast.success(current ? '🔴 تم التعطيل' : '🟢 تم التفعيل')
      await loadBrands()
   } catch {
  toast.error('❌ فشل الحذف')
}
  }

  return (
    <div dir="rtl" className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">إعدادات البراندات</h1>

      {/* ====== Form ====== */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
        <h2 className="text-lg font-semibold border-b pb-3">
          {editingId ? '✏️ تعديل براند' : '➕ براند جديد'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Names */}
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم البراند (عربي) *</label>
            <Input
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="مثال: بيتزا أونو"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">اسم البراند (English) *</label>
            <Input
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="e.g. Pizza Uno"
              dir="ltr"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Slug (رابط الـ URL) *</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="pizza-uno"
              dir="ltr"
              required
            />
            <p className="text-xs text-gray-500">
              هيكون الرابط: /{formData.slug || 'example'}
            </p>
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ترتيب العرض</label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
              placeholder="0"
            />
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium">اللون الأساسي</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                dir="ltr"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">اللون الثانوي</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                dir="ltr"
                className="flex-1"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">وصف (عربي)</label>
            <textarea
              value={formData.description_ar || ''}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="وصف قصير للبراند..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">وصف (English)</label>
            <textarea
              value={formData.description_en || ''}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              dir="ltr"
              placeholder="Short description..."
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">الشعار (Logo)</label>
            <ImageUpload
              value={formData.logo_url || null}
              onChange={(url) => setFormData({ ...formData, logo_url: url || '' })}
            />
          </div>

          {/* Cover */}
          <div className="space-y-2">
            <label className="text-sm font-medium">صورة الغلاف (Cover)</label>
            <ImageUpload
              value={formData.cover_image_url || null}
              onChange={(url) => setFormData({ ...formData, cover_image_url: url || '' })}
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5"
            />
            <span className="font-medium">🟢 البراند نشط (يظهر للعملاء)</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
            {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
            {editingId ? '💾 حفظ التغييرات' : '➕ إضافة براند'}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              إلغاء
            </Button>
          )}
        </div>
      </form>

      {/* ====== Brands List ====== */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">البراندات ({brands.length})</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>لا توجد براندات</p>
          </div>
        ) : (
          <div className="divide-y">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  !brand.is_active ? 'opacity-60' : ''
                }`}
              >
                {/* Logo */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border bg-white flex-shrink-0">
                  {brand.logo_url ? (
                    <Image src={brand.logo_url} alt={brand.name_ar} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                      {brand.name_ar[0]}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{brand.name_ar}</h3>
                    <span className="text-sm text-gray-500">({brand.name_en})</span>
                    {!brand.is_active && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                        معطل
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">/{brand.slug}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: brand.primary_color }}
                      title="Primary"
                    />
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: brand.secondary_color }}
                      title="Secondary"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(brand.id, brand.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      brand.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={brand.is_active ? 'تعطيل' : 'تفعيل'}
                  >
                    {brand.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => handleEdit(brand)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(brand.id)}
                    disabled={deletingId === brand.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="حذف"
                  >
                    {deletingId === brand.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}