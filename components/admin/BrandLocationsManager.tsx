'use client'

// WHAT: مودال إدارة مواقع البراند — يفتح من صفحة /admin/brands، يسمح
//       للـ Super Admin يضيف/يعدل/يمسح لوكيشن واحد أو أكتر لنفس البراند
// WHY:  كل موقع بيتظهر كخيار في زرار "الموقع" في صفحة البراند العامة
// KILL: من غيره مفيش طريقة للأدمن يحط رابط جوجل ماب للبراند من غير
//       ما يدخل على قاعدة البيانات يدوي

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface BrandLocation {
  id: string
  brand_id: string
  label_ar: string
  label_en: string
  address: string | null
  google_maps_url: string
  is_primary: boolean
  sort_order: number
}

const EMPTY_FORM = {
  label_ar: '',
  label_en: '',
  address: '',
  google_maps_url: '',
  is_primary: false,
}

export default function BrandLocationsManager({
  brandId,
  brandName,
  open,
  onOpenChange,
}: {
  brandId: string
  brandName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const supabase = createBrowserClient()
  const [locations, setLocations] = useState<BrandLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('brand_locations')
      .select('*')
      .eq('brand_id', brandId)
      .order('sort_order')

    if (error) {
      toast.error('فشل تحميل المواقع')
    } else {
      setLocations(data || [])
    }
    setLoading(false)
  }, [supabase, brandId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(loc: BrandLocation) {
    setForm({
      label_ar: loc.label_ar,
      label_en: loc.label_en,
      address: loc.address || '',
      google_maps_url: loc.google_maps_url,
      is_primary: loc.is_primary,
    })
    setEditingId(loc.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.google_maps_url.trim()) {
      toast.error('لازم تحط رابط جوجل ماب')
      return
    }
    setSaving(true)

    // لو ده هيبقى الفرع الرئيسي، نشيل is_primary من أي فرع تاني الأول
    if (form.is_primary) {
      await supabase
        .from('brand_locations')
        .update({ is_primary: false })
        .eq('brand_id', brandId)
    }

    const payload = {
      brand_id: brandId,
      label_ar: form.label_ar || 'الفرع الرئيسي',
      label_en: form.label_en || 'Main Branch',
      address: form.address || null,
      google_maps_url: form.google_maps_url.trim(),
      is_primary: form.is_primary,
      sort_order: editingId ? undefined : locations.length,
    }

    const { error } = editingId
      ? await supabase.from('brand_locations').update(payload).eq('id', editingId)
      : await supabase.from('brand_locations').insert(payload)

    if (error) {
      toast.error('فشل الحفظ')
    } else {
      toast.success(editingId ? '✅ تم تحديث الموقع' : '✅ تم إضافة الموقع')
      resetForm()
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('متأكد إنك عايز تمسح الموقع ده؟')) return
    const { error } = await supabase.from('brand_locations').delete().eq('id', id)
    if (error) {
      toast.error('فشل الحذف')
    } else {
      toast.success('✅ اتمسح')
      load()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            مواقع {brandName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {locations.length === 0 && !showForm && (
              <p className="text-sm text-gray-400 text-center py-4">لسه مفيش أي موقع مضاف</p>
            )}

            {locations.map((loc) => (
              <div key={loc.id} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{loc.label_ar}</p>
                    {loc.is_primary && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  {loc.address && <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>}
                  <a
                    href={loc.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate block mt-1"
                  >
                    {loc.google_maps_url}
                  </a>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(loc)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(loc.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}

            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-3 p-3 rounded-lg border-2 border-orange-200 dark:border-orange-900">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{editingId ? 'تعديل الموقع' : 'موقع جديد'}</p>
                  <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <Input
                  placeholder="اسم الفرع (عربي) — مثال: فرع الكورنيش"
                  value={form.label_ar}
                  onChange={(e) => setForm({ ...form, label_ar: e.target.value })}
                />
                <Input
                  placeholder="اسم الفرع (إنجليزي) — Corniche Branch"
                  value={form.label_en}
                  onChange={(e) => setForm({ ...form, label_en: e.target.value })}
                />
                <Input
                  placeholder="العنوان (اختياري)"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <Input
                  placeholder="رابط جوجل ماب — https://maps.google.com/..."
                  value={form.google_maps_url}
                  onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
                  dir="ltr"
                  required
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  الفرع الرئيسي
                </label>
                <Button type="submit" disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'حفظ التعديل' : 'إضافة الموقع'}
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة موقع جديد
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
