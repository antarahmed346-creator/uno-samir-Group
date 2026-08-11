'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useDeleteCategory } from '@/lib/hooks/useCategories'
import type { CategoryRow } from '@/lib/database.types'
type Category = CategoryRow
interface DeleteCategoryDialogProps {
  category: Category | null
  onClose: () => void
}

export function DeleteCategoryDialog({
  category,
  onClose,
}: DeleteCategoryDialogProps) {
  const deleteCategory = useDeleteCategory()

  async function handleConfirm() {
    if (!category) return

    try {
      await deleteCategory.mutateAsync(category.id)
      onClose()
    } catch {
      // الخطأ اتعالج في الـ hook
    }
  }

  return (
    <AlertDialog
      open={!!category}
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-red-500" />
            تأكيد الحذف
          </AlertDialogTitle>

          <AlertDialogDescription className="text-right space-y-2">
            <span>
              هل أنت متأكد من حذف الفئة &quot;
              <strong className="text-foreground">
                {category?.name_ar}
              </strong>
              &quot;؟
            </span>

            <br />

            <span className="text-red-500 font-medium">
              ⚠️ قد يؤثر ذلك على المنتجات المرتبطة بها.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 flex-row-reverse">
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteCategory.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteCategory.isPending && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}

            نعم، احذف
          </AlertDialogAction>

          <AlertDialogCancel
            onClick={onClose}
            disabled={deleteCategory.isPending}
          >
            إلغاء
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}