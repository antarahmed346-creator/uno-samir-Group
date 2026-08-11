'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Plus, RefreshCw, Tag } from 'lucide-react'
import { CategoriesTable } from '@/components/admin/categories/CategoriesTable'
import { CategoryForm } from '@/components/admin/categories/CategoryForm'
import { DeleteCategoryDialog } from '@/components/admin/categories/DeleteCategoryDialog'
import { useCategories, useBrands } from '@/lib/hooks/useCategories'
import type { CategoryRow } from '@/lib/database.types'
type Category = CategoryRow
export default function CategoriesPage() {
  // ─── State ───────────────────────────────────────────────────────────────
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)

  // ─── Data ────────────────────────────────────────────────────────────────
  const brandFilter = selectedBrand === 'all' ? undefined : selectedBrand
  const {
  data: categories = [],
  isLoading,
  error,
  refetch,
} = useCategories(brandFilter)
  const { data: brands } = useBrands()

  // ─── Error State ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div dir="rtl" className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center space-y-3">
          <p className="text-red-600 font-semibold text-lg">❌ حدث خطأ في تحميل الفئات</p>
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

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">إدارة الفئات</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'جاري التحميل...' : `${categories?.length ?? 0} فئة`}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة فئة
        </Button>
      </div>

      <Separator />

      {/* ─── Brand Filter ────────────────────────────────────────────────── */}
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
                  style={{
  backgroundColor: brand.primary_color ?? '#888',
}}
                />
                {brand.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Table ──────────────────────────────────────────────────────── */}
      <CategoriesTable
        categories={categories ?? []}
        isLoading={isLoading}
        onEdit={setEditCategory}
        onDelete={setDeleteCategory}
      />

      {/* ─── Dialogs ────────────────────────────────────────────────────── */}

      {/* Add */}
      <CategoryForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        category={null}
      />

      {/* Edit */}
      <CategoryForm
        open={!!editCategory}
        onClose={() => setEditCategory(null)}
        category={editCategory}
      />

      {/* Delete */}
      <DeleteCategoryDialog
        category={deleteCategory}
        onClose={() => setDeleteCategory(null)}
      />

    </div>
  )
}