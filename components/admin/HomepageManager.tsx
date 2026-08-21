// components/admin/HomepageManager.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff, Pencil, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/admin/ImageUpload'

interface HomepageSection {
  id: string
  brand_id: string | null
  type: string
  title_ar: string | null
  title_en: string | null
  subtitle_ar: string | null
  subtitle_en: string | null
  image_url: string | null
  link_url: string | null
  cta_text_ar: string | null
  cta_text_en: string | null
  is_active: boolean
  display_order: number
  valid_from: string | null
  valid_to: string | null
  created_at: string
}

const SECTION_TYPES: Record<string, { label: string; icon: string }> = {
  hero: { label: 'بانر رئيسي', icon: '🖼️' },
  brands: { label: 'البراندات', icon: '🏪' },
  featured: { label: 'منتجات مميزة', icon: '⭐' },
  offers: { label: 'عروض خاصة', icon: '🏷️' },
  gallery: { label: 'معرض الصور', icon: '📸' },
}

const EMPTY_FORM: Partial<HomepageSection> = {
  type: 'hero',
  title_ar: '',
  title_en: '',
  subtitle_ar: '',
  subtitle_en: '',
  image_url: '',
  link_url: '',
  cta_text_ar: '',
  cta_text_en: '',
  is_active: true,
  display_order: 0,
}

export default function HomepageManager() {
  const supabase = createBrowserClient()
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<HomepageSection>>(EMPTY_FORM)

  useEffect(() => {
    if (editingId) {
      const section = sections.find((s) => s.id === editingId)
      if (section) {
        setFormData({
          type: section.type,
          title_ar: section.title_ar,
          title_en: section.title_en,
          subtitle_ar: section.subtitle_ar,
          subtitle_en: section.subtitle_en,
          image_url: section.image_url,
          link_url: section.link_url,
          cta_text_ar: section.cta_text_ar,
          cta_text_en: section.cta_text_en,
          is_active: section.is_active,
          display_order: section.display_order,
          brand_id: section.brand_id,
          valid_from: section.valid_from,
          valid_to: section.valid_to,
        })
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
      }
    } else {
      setFormData({
        ...EMPTY_FORM,
        display_order: sections.length,
      })
    }
  }, [editingId, sections])

  const loadSections = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        toast.error('❌ فشل تحميل الأقسام')
        return
      }
      setSections(data || [])
    } catch {
      toast.error('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  function resetForm() {
    setEditingId(null)
  }

  function handleEdit(section: HomepageSection) {
    setEditingId(section.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const data = {
        ...formData,
        image_url: formData.image_url || null,
        link_url: formData.link_url || null,
        title_ar: formData.title_ar || null,
        title_en: formData.title_en || null,
        subtitle_ar: formData.subtitle_ar || null,
        subtitle_en: formData.subtitle_en || null,
        cta_text_ar: formData.cta_text_ar || null,
        cta_text_en: formData.cta_text_en || null,
      }

      if (editingId) {
        const { error } = await supabase
          .from('homepage_sections')
          .update(data)
          .eq('id', editingId)

        if (error) throw error
        toast.success('✅ تم التحديث بنجاح')
      } else {
        const { error } = await supabase
          .from('homepage_sections')
          .insert(data)

        if (error) throw error
        toast.success('✅ تم الإضافة بنجاح')
      }

      resetForm()
      await loadSections()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '❌ فشل الحفظ'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('هل أنت متأكد من الحذف؟')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('🗑️ تم الحذف')
      await loadSections()
    } catch {
      toast.error('❌ فشل الحذف')
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      const { error } = await supabase
        .from('homepage_sections')
        .update({ is_active: !current })
        .eq('id', id)

      if (error) throw error
      toast.success(current ? '🔴 تم التعطيل' : '🟢 تم التفعيل')
      await loadSections()
    } catch {
      toast.error('❌ فشل التحديث')
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const index = sections.findIndex((s) => s.id === id)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sections.length - 1) return

    const newOrder = [...sections]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]

    try {
      const updates = newOrder.map((section, i) => ({
        id: section.id,
        display_order: i,
      }))

      for (const update of updates) {
        await supabase
          .from('homepage_sections')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }

      setSections(newOrder)
      toast.success('✅ تم إعادة الترتيب')
    } catch {
      toast.error('❌ فشل الترتيب')
    }
  }

  const isEditing = !!editingId

  return (
    <div dir="rtl" className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">📱 مدير الصفحة الرئيسية</h1>

      {/* ====== Form ====== */}
      <form
        onSubmit={handleSubmit}
        className={`bg-white rounded-xl border p-6 space-y-6 transition-all ${
          isEditing ? 'ring-2 ring-orange-400 shadow-lg' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEditing ? '✏️ تعديل قسم' : '➕ قسم جديد'}
          </h2>
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="text-gray-500 dark:text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4 ms-1" />
              إلغاء التعديل
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">نوع القسم *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
              required
            >
              {Object.entries(SECTION_TYPES).map(([key, { label, icon }]) => (
                <option key={key} value={key}>
                  {icon} {label}
                </option>
              ))}
            </select>
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ترتيب العرض</label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: Number(e.target.value) })
              }
            />
          </div>

          {/* Titles */}
          <div className="space-y-2">
            <label className="text-sm font-medium">العنوان (عربي)</label>
            <Input
              value={formData.title_ar || ''}
              onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
              placeholder="مثال: أونو وسامر جروب"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">العنوان (English)</label>
            <Input
              value={formData.title_en || ''}
              onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
              placeholder="e.g. Uno & Samir Group"
              dir="ltr"
            />
          </div>

          {/* Subtitles */}
          <div className="space-y-2">
            <label className="text-sm font-medium">العنوان الفرعي (عربي)</label>
            <Input
              value={formData.subtitle_ar || ''}
              onChange={(e) => setFormData({ ...formData, subtitle_ar: e.target.value })}
              placeholder="وصف قصير..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">العنوان الفرعي (English)</label>
            <Input
              value={formData.subtitle_en || ''}
              onChange={(e) => setFormData({ ...formData, subtitle_en: e.target.value })}
              placeholder="Short description..."
              dir="ltr"
            />
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <label className="text-sm font-medium">نص الزر (عربي)</label>
            <Input
              value={formData.cta_text_ar || ''}
              onChange={(e) => setFormData({ ...formData, cta_text_ar: e.target.value })}
              placeholder="اطلب الآن"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">نص الزر (English)</label>
            <Input
              value={formData.cta_text_en || ''}
              onChange={(e) => setFormData({ ...formData, cta_text_en: e.target.value })}
              placeholder="Order Now"
              dir="ltr"
            />
          </div>

          {/* Link */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">رابط (URL)</label>
            <Input
              value={formData.link_url || ''}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              placeholder="/pizza-uno  أو  https://example.com"
              dir="ltr"
            />
          </div>

          {/* Image */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">الصورة</label>
            <ImageUpload
              value={formData.image_url || null}
              onChange={(url) => setFormData({ ...formData, image_url: url || '' })}
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
            <span className="font-medium">🟢 القسم نشط (يظهر في الهوم بيج)</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={saving}
            className={isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
            {isEditing ? '💾 حفظ التغييرات' : '➕ إضافة قسم'}
          </Button>
        </div>
      </form>

      {/* ====== Sections List ====== */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-semibold">الأقسام ({sections.length})</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>لا توجد أقسام</p>
          </div>
        ) : (
          <div className="divide-y">
            {sections.map((section, index) => {
              const typeInfo = SECTION_TYPES[section.type] || {
                label: section.type,
                icon: '📄',
              }

              return (
                <div
                  key={section.id}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                    !section.is_active ? 'opacity-60' : ''
                  } ${editingId === section.id ? 'bg-orange-50' : ''}`}
                >
                  {/* Type Icon */}
                  <div className="text-2xl flex-shrink-0 w-10 text-center">
                    {typeInfo.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold">{section.title_ar || typeInfo.label}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {typeInfo.label}
                      </span>
                      {!section.is_active && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                          معطل
                        </span>
                      )}
                      {editingId === section.id && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                          يتم التعديل...
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{section.subtitle_ar}</p>
                    {section.image_url && (
                      <div className="relative w-20 h-12 rounded overflow-hidden mt-2">
                        <Image
                          src={section.image_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleReorder(section.id, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(section.id, 'down')}
                      disabled={index === sections.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(section.id, section.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        section.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={section.is_active ? 'تعطيل' : 'تفعيل'}
                    >
                      {section.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(section)}
                      className={`p-2 rounded-lg transition-colors ${
                        editingId === section.id
                          ? 'bg-orange-100 text-orange-600'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(section.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}