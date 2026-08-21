'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useProducts, useDeleteProduct, useToggleProductAvailability } from '@/lib/hooks/useProducts'

export default function ProductsPage() {
  // ✅ استخدمنا الـ API الجديد من useQuery
  const { data: products, isLoading } = useProducts()
  const deleteProduct = useDeleteProduct()
  const toggleAvailability = useToggleProductAvailability()

  const handleDelete = async (id: string) => {
    if (!confirm('متأكد من الحذف؟')) return
    await deleteProduct.mutateAsync(id)
    // ✅ الـ invalidateQueries في الـ hook هيحدث البيانات تلقائياً
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleAvailability.mutateAsync({ id, isAvailable: !current })
    // ✅ الـ invalidateQueries في الـ hook هيحدث البيانات تلقائياً
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          منتج جديد
        </Link>
      </div>

      {isLoading ? (
        <p>جاري التحميل...</p>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b">
              <tr>
                <th className="px-4 py-3 text-right">المنتج</th>
                <th className="px-4 py-3 text-right">السعر</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products?.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{p.name_ar}</td>
                  <td className="px-4 py-3">{p.base_price} ج.م</td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => handleToggle(p.id, p.is_available)} 
                      className={`px-2 py-1 rounded-full text-xs ${p.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {p.is_available ? 'متاح' : 'مخفي'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="text-blue-600 hover:underline ml-2">تعديل</Link>
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      className="text-red-600 hover:underline"
                      disabled={deleteProduct.isPending}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    لا توجد منتجات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}