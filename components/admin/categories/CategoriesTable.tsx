'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Tag } from 'lucide-react'
import { useToggleCategoryStatus } from '@/lib/hooks/useCategories'
import type { CategoryWithBrand, CategoryRow } from '@/lib/database.types'
type Category = CategoryRow


interface CategoriesTableProps {
  categories: CategoryWithBrand[]
  isLoading: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoriesTable({
  categories,
  isLoading,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const toggleStatus = useToggleCategoryStatus()

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  // ─── Empty State ───────────────────────────────────────────────────────────
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Tag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">لا توجد فئات</h3>
        <p className="text-muted-foreground text-sm mt-1">
          ابدأ بإضافة أول فئة للمنيو
        </p>
      </div>
    )
  }

  // ─── Table ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border overflow-hidden" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-right w-16">ترتيب</TableHead>
            <TableHead className="text-right">الفئة</TableHead>
            <TableHead className="text-right">البرانده</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right w-16">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow
              key={category.id}
              className="hover:bg-muted/30 transition-colors"
            >
              {/* الترتيب */}
              <TableCell className="text-center font-mono text-muted-foreground">
                {category.sort_order ?? 0}
              </TableCell>

              {/* اسم الفئة */}
              <TableCell>
                <div>
                  <p className="font-semibold">{category.name_ar}</p>
                  <p className="text-sm text-muted-foreground">{category.name_en}</p>
                </div>
              </TableCell>

              {/* البرانده */}
              <TableCell>
                {category.brand ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: category.brand.primary_color ?? '#888',
                      color: category.brand.primary_color ?? '#888',
                    }}
                  >
                    {category.brand.name_ar}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>

              {/* الحالة */}
              <TableCell>
                <Badge
                  variant={
                    category.status === 'active' ? 'default' : 'secondary'
                  }
                >
                  {category.status === 'active' ? '🟢 نشط' : '⏸️ موقوف'}
                </Badge>
              </TableCell>

              {/* الإجراءات */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">إجراءات</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <Pencil className="ml-2 h-4 w-4" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        toggleStatus.mutate({
                          id: category.id,
                          status:
                            category.status === 'active' ? 'inactive' : 'active',
                        })
                      }
                      disabled={toggleStatus.isPending}
                    >
                      {category.status === 'active' ? (
                        <>
                          <EyeOff className="ml-2 h-4 w-4" />
                          إيقاف
                        </>
                      ) : (
                        <>
                          <Eye className="ml-2 h-4 w-4" />
                          تفعيل
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(category)}
                      className="text-red-500 focus:text-red-500 focus:bg-red-50"
                    >
                      <Trash2 className="ml-2 h-4 w-4" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}