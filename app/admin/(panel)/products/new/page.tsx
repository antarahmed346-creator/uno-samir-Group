import { createServerClient } from '@/lib/supabase/server'
import ProductFormWrapper from '@/components/admin/products/ProductFormWrapper'


export default async function NewProductPage() {
  const supabase = await createServerClient()

  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from('brands').select('*').eq('status', 'active').order('sort_order'),
    supabase.from('categories').select('*').eq('status', 'active').order('sort_order'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">منتج جديد</h1>
        <p className="text-gray-500">أضف منتج جديد للقائمة</p>
      </div>
      <ProductFormWrapper 
        brands={brands || []} 
        categories={categories || []} 
        // مفيش productId = create
      />
    </div>
  )
}