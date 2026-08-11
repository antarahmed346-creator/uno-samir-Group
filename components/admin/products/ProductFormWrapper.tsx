'use client'

// WHAT: Wrapper بيحفظ المنتج + Customization Groups في Supabase
// WHY:  ProductForm بس بيجمع البيانات — Wrapper بيحفظها
// KILL: لو اتحذف المنتج مش هيتحفظ في DB

import ProductForm from './ProductForm'
import { ProductFormData } from '@/lib/validations/product'
import { Brand, Category, Product } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface Props {
  initialData?: Product
  brands: Brand[]
  categories: Category[]
  productId?: string
}

export default function ProductFormWrapper({ 
  initialData, brands, categories, productId 
}: Props) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(data: ProductFormData) {
    setIsLoading(true)
    setError(null)

    try {
      // ====== 1. نحفظ المنتج ======
      const productData = {
        name_ar: data.name_ar,
        name_en: data.name_en,
        description_ar: data.description_ar || null,
        description_en: data.description_en || null,
        base_price: data.base_price,
        compare_price: data.compare_price || null,
        brand_id: data.brand_id,
        category_id: data.category_id,
        main_image_url: data.main_image_url || null,
        is_featured: data.is_featured,
        is_available: data.is_available,
        sort_order: data.sort_order,
        status: data.status,
      }

      let productIdToUse = productId

      if (productId) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)

        if (updateError) throw updateError
      } else {
        // CREATE
        const { data: newProduct, error: createError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single()

        if (createError) throw createError
        productIdToUse = newProduct.id
      }

      // ====== 2. نحفظ Customization Groups (Batch Insert) ======
      if (data.customization_groups && data.customization_groups.length > 0 && productIdToUse) {
        // نمسح الـ groups القديمة (لو update)
        if (productId) {
          await supabase
            .from('customization_groups')
            .delete()
            .eq('product_id', productId)
        }

        // ✅ Batch Insert: كل الـ groups دفعة واحدة
        const groupsData = data.customization_groups.map(group => ({
          product_id: productIdToUse,
          name_ar: group.name_ar,
          name_en: group.name_en,
          type: group.type,
          is_required: group.is_required,
          min_selections: 0,
          max_selections: null,
          sort_order: 0,
        }))

        const { data: savedGroups, error: groupsError } = await supabase
          .from('customization_groups')
          .insert(groupsData)
          .select('id, name_ar, name_en')  // نرجع الـ IDs

        if (groupsError) throw groupsError

        // ✅ Batch Insert: كل الـ options دفعة واحدة
        if (savedGroups && savedGroups.length > 0) {
          const allOptionsData = savedGroups.flatMap((savedGroup, groupIndex) => {
            const originalGroup = data.customization_groups![groupIndex]
            return originalGroup.options.map((option, optionIndex) => ({
              group_id: savedGroup.id,
              name_ar: option.name_ar,
              name_en: option.name_en,
              price_modifier: option.price_modifier,
              is_default: option.is_default,
              is_available: true,
              sort_order: optionIndex,
            }))
          })

          const { error: optionsError } = await supabase
            .from('customization_options')
            .insert(allOptionsData)

          if (optionsError) throw optionsError
        }
      }

      // ✅ Navigation بعد النجاح
      router.push('/admin/products')
      router.refresh()
    }catch (err: unknown) {
  console.error(err)
  const message = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ'
  setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}
      <ProductForm 
        initialData={initialData}
        brands={brands}
        categories={categories}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}