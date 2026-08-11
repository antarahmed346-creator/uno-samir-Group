import { createServerClient } from '@/lib/supabase/server'
import ProductFormWrapper from '@/components/admin/products/ProductFormWrapper'
import { notFound } from 'next/navigation'

// ✅ Next.js 15: params بقى Promise
interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params  // ✅ لازم await

  const supabase = await createServerClient()

  const [{ data: product }, { data: brands }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        customization_groups (
          *,
          options:customization_options (*)
        )
      `)
      .eq('id', id)
      .single(),
    supabase.from('brands').select('*').eq('status', 'active').order('sort_order'),
    supabase.from('categories').select('*').eq('status', 'active').order('sort_order'),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تعديل المنتج</h1>
        <p className="text-gray-500">{product.name_ar}</p>
      </div>
      <ProductFormWrapper 
        initialData={product}
        brands={brands || []} 
        categories={categories || []} 
        productId={id}
      />
    </div>
  )
}