'use client'

// WHAT: نموذج إضافة/تعديل منتج مع Customization Groups مبسط
// WHY:  الـ Owner مش تقني — لازم يفهم كل حاجة من أول نظرة
// KILL: لو اتحذف مش هنقدر نضيف منتجات بـ options

import { useState } from 'react'
import { useForm, useFieldArray, Controller, Control, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Brand, Category, Product } from '@/lib/types'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { ImageUpload } from '@/components/admin/ImageUpload'
// ✅ استورد الـ Schema والـ Type من validations/product
import { productSchema, type ProductFormData } from '@/lib/validations/product'

// ====== Types ======
interface ProductFormProps {
  initialData?: Product
  brands: Brand[]
  categories: Category[]
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
}

// ====== Component ======
export default function ProductForm({ 
  initialData, 
  brands, 
  categories, 
  onSubmit, 
  isLoading 
}: ProductFormProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData ? {
      name_ar: initialData.name_ar,
      name_en: initialData.name_en || '',
      description_ar: initialData.description_ar || '',
      description_en: initialData.description_en || '',
      base_price: initialData.base_price,
      compare_price: initialData.compare_price || undefined,
      brand_id: initialData.brand_id,
      category_id: initialData.category_id,
      main_image_url: initialData.main_image_url || '',
      is_featured: initialData.is_featured,
      is_available: initialData.is_available,
      sort_order: initialData.sort_order,
      status: initialData.status,
      customization_groups: initialData.customization_groups?.map(g => ({
        name_ar: g.name_ar,
        name_en: g.name_en,
        type: g.type,
        is_required: g.is_required,
        options: g.options?.map(o => ({
          name_ar: o.name_ar,
          name_en: o.name_en,
          price_modifier: o.price_modifier,
          is_default: o.is_default,
        })) || [],
      })) || [],
    } : {
      is_available: true,
      is_featured: false,
      sort_order: 0,
      status: 'active',
      customization_groups: [],
    },
  })

  const { fields: groups, append: appendGroup, remove: removeGroup } = useFieldArray({
    control,
    name: 'customization_groups',
  })

  const basePrice = watch('base_price') || 0

  const handleFormSubmit = async (data: ProductFormData) => {
    setSubmitError(null)
    try {
      await onSubmit(data)
      // ✅ الـ navigation بيتعمل في الـ Wrapper مش هنا
      // عشان لو فشل الـ save ما ينقلش المستخدم
    } catch (error) {
      console.error(error)
      setSubmitError('حدث خطأ أثناء الحفظ. جرب تاني.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-4xl">
      
      {/* ====== Error Message ====== */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ====== اسم المنتج ====== */}
        <div className="space-y-2">
          <label className="text-sm font-medium">اسم المنتج (عربي) *</label>
          <input {...register('name_ar')} className="w-full px-3 py-2 border rounded-lg" placeholder="مثال: بيتزا مارجريتا" />
          {errors.name_ar && <p className="text-red-500 text-sm">{errors.name_ar.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">اسم المنتج (English) *</label>
          <input {...register('name_en')} className="w-full px-3 py-2 border rounded-lg" dir="ltr" placeholder="e.g. Margherita Pizza" />
          {errors.name_en && <p className="text-red-500 text-sm">{errors.name_en.message}</p>}
        </div>

        {/* ====== البراند والفئة ====== */}
        <div className="space-y-2">
          <label className="text-sm font-medium">البراند *</label>
          <select {...register('brand_id')} className="w-full px-3 py-2 border rounded-lg">
            <option value="">اختر البراند</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name_ar}</option>
            ))}
          </select>
          {errors.brand_id && <p className="text-red-500 text-sm">{errors.brand_id.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الفئة *</label>
          <select {...register('category_id')} className="w-full px-3 py-2 border rounded-lg">
            <option value="">اختر الفئة</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </select>
          {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id.message}</p>}
        </div>

        {/* ====== الأسعار ====== */}
        <div className="space-y-2">
          <label className="text-sm font-medium">السعر الأساسي (جنيه) *</label>
          <input 
            type="number" 
            step="0.01" 
            {...register('base_price', { valueAsNumber: true })} 
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="95"
          />
          {errors.base_price && <p className="text-red-500 text-sm">{errors.base_price.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">سعر قبل الخصم (جنيه)</label>
          <input 
            type="number" 
            step="0.01" 
            {...register('compare_price', { valueAsNumber: true })} 
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="120"
          />
        </div>

        {/* ====== Live Price Preview ====== */}
        <div className="md:col-span-2 bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-sm text-green-800">
            💰 السعر اللي هيشوفه العميل: <strong className="text-lg">{basePrice} ج.م</strong>
          </p>
        </div>

        {/* ====== الوصف ====== */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">وصف المنتج (عربي)</label>
          <textarea {...register('description_ar')} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="صوص طماطم، موزاريلا، ريحان..." />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">وصف المنتج (English)</label>
          <textarea {...register('description_en')} rows={2} className="w-full px-3 py-2 border rounded-lg" dir="ltr" placeholder="Tomato sauce, mozzarella, basil..." />
        </div>

        {/* ====== الصورة ====== */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">صورة المنتج</label>
          
          <Controller
            name="main_image_url"
            control={control}
            render={({ field }) => (
              <ImageUpload
                value={field.value || null}
                onChange={(url) => field.onChange(url || '')}
              />
            )}
          />
          
          {errors.main_image_url && <p className="text-red-500 text-sm">{errors.main_image_url.message}</p>}
        </div>

        {/* ====== الإعدادات ====== */}
        <div className="flex items-center gap-6 md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('is_available')} className="w-4 h-4" />
            <span className="text-sm font-medium">✅ متاح للبيع</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('is_featured')} className="w-4 h-4" />
            <span className="text-sm font-medium">⭐ منتج مميز (يظهر في الصفحة الرئيسية)</span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">ترتيب العرض</label>
          <input type="number" {...register('sort_order', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg" placeholder="0" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">حالة المنتج</label>
          <select {...register('status')} className="w-full px-3 py-2 border rounded-lg">
            <option value="active">🟢 نشط — يظهر للعملاء</option>
            <option value="inactive">🔴 مخفي — مش ه يظهر</option>
            <option value="draft">🟡 مسودة — لسه بتشتغل عليه</option>
          </select>
        </div>
      </div>

      {/* ====== Customization Groups (مبسط) ====== */}
      <div className="border-t pt-6 space-y-4">
        
        {/* ====== مثال توضيحي ====== */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm">
          <p className="font-medium text-amber-900 mb-2">💡 مثال: بيتزا مارجريتا</p>
          <div className="space-y-1 text-amber-800">
            <p>• <strong>الحجم:</strong> صغير (+0 ج) / وسط (+15 ج) / كبير (+30 ج)</p>
            <p>• <strong>نوع العجينة:</strong> رقيقة (+0 ج) / سميكة (+5 ج)</p>
            <p>• <strong>إضافات:</strong> جبنة إضافية (+10 ج) / فطر (+8 ج) — العميل يقدر يختار أكتر من واحد</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">خيارات المنتج</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">الحجم، الإضافات، نوع العجينة...</p>
          </div>
          <button
            type="button"
            onClick={() => appendGroup({
              name_ar: '',
              name_en: '',
              type: 'single',
              is_required: false,
              options: [{ name_ar: '', name_en: '', price_modifier: 0, is_default: false }],
            })}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            إضافة مجموعة خيارات
          </button>
        </div>

        {groups.map((group, groupIndex) => (
          <GroupSection 
            key={group.id} 
            groupIndex={groupIndex} 
            control={control} 
            register={register}
            removeGroup={() => removeGroup(groupIndex)}
          />
        ))}

        {errors.customization_groups && (
          <p className="text-red-500 text-sm">{errors.customization_groups.message}</p>
        )}
      </div>

      {/* ====== Buttons ====== */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'جاري الحفظ...' : initialData ? '💾 حفظ التغييرات' : '➕ إضافة المنتج'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:bg-gray-800"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ====== Group Section (مبسط جداً) ======
function GroupSection({ 
  groupIndex, 
  control, 
  register, 
  removeGroup 
}: { 
  groupIndex: number
  control: Control<ProductFormData>
  register: UseFormRegister<ProductFormData>
  removeGroup: () => void
}) {
  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `customization_groups.${groupIndex}.options`,
  })

  return (
    <div className="border-2 border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4 bg-white dark:bg-gray-900">
      {/* Group Header */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-gray-400" />
          <span className="font-bold">مجموعة {groupIndex + 1}</span>
        </div>
        <button
          type="button"
          onClick={removeGroup}
          className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          مسح المجموعة
        </button>
      </div>

      {/* Group Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">اسم المجموعة (عربي) *</label>
          <input 
            {...register(`customization_groups.${groupIndex}.name_ar`)} 
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="مثال: الحجم"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">اسم المجموعة (English) *</label>
          <input 
            {...register(`customization_groups.${groupIndex}.name_en`)} 
            className="w-full px-3 py-2 border rounded-lg" 
            placeholder="e.g. Size"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">نوع الاختيار</label>
          <select {...register(`customization_groups.${groupIndex}.type`)} className="w-full px-3 py-2 border rounded-lg">
            <option value="single">👆 اختيار واحد بس (مثال: الحجم)</option>
            <option value="multiple">☑️ اختيار متعدد (مثال: الإضافات)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input 
            type="checkbox" 
            {...register(`customization_groups.${groupIndex}.is_required`)} 
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">⚠️ العميل لازم يختار من هنا</span>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">الخيارات المتاحة</h4>
          <button
            type="button"
            onClick={() => appendOption({ name_ar: '', name_en: '', price_modifier: 0, is_default: false })}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4" />
            إضافة خيار
          </button>
        </div>

        {options.map((option, optionIndex) => (
          <div key={option.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">الاسم (عربي)</label>
              <input 
                {...register(`customization_groups.${groupIndex}.options.${optionIndex}.name_ar`)} 
                className="w-full px-2 py-1 border rounded text-sm" 
                placeholder="صغير"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">الاسم (English)</label>
              <input 
                {...register(`customization_groups.${groupIndex}.options.${optionIndex}.name_en`)} 
                className="w-full px-2 py-1 border rounded text-sm" 
                placeholder="Small"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                سعر إضافي
                <span title="اكتب 0 لو مفيش زيادة في السعر">(جنيه)</span>
              </label>
              <input 
                type="number" 
                step="0.01"
                {...register(`customization_groups.${groupIndex}.options.${optionIndex}.price_modifier`, { valueAsNumber: true })} 
                className="w-full px-2 py-1 border rounded text-sm" 
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input 
                  type="checkbox" 
                  {...register(`customization_groups.${groupIndex}.options.${optionIndex}.is_default`)} 
                  className="w-4 h-4"
                />
                <span className="text-xs">مختار افتراضي</span>
              </label>
              <button
                type="button"
                onClick={() => removeOption(optionIndex)}
                className="text-red-500 hover:text-red-700"
                title="مسح الخيار"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}