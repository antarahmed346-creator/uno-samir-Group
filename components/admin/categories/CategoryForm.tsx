'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import {
  useBrands,
  useCreateCategory,
  useUpdateCategory,
} from '@/lib/hooks/useCategories'
import type { CategoryRow } from '@/lib/database.types'
type Category = CategoryRow
// ─── Validation Schema ────────────────────────────────────────────────────────
const schema = z.object({
  brand_id: z.string().uuid('اختار البرانده'),
  name_ar: z.string().min(2, 'الاسم بالعربي لازم حرفين على الأقل'),
  name_en: z.string().min(2, 'الاسم بالإنجليزي لازم حرفين على الأقل'),
  sort_order: z.coerce.number().min(0).default(0),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────
interface CategoryFormProps {
  open: boolean
  onClose: () => void
  category?: Category | null
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CategoryForm({ open, onClose, category }: CategoryFormProps) {
  const isEdit = !!category
  const { data: brands, isLoading: brandsLoading } = useBrands()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_id: '',
      name_ar: '',
      name_en: '',
      sort_order: 0,
    },
  })

  useEffect(() => {
    if (category) {
      form.reset({
        brand_id: category.brand_id,
        name_ar: category.name_ar,
        name_en: category.name_en,
        sort_order: category.sort_order ?? 0,
      })
    } else {
      form.reset({
        brand_id: '',
        name_ar: '',
        name_en: '',
        sort_order: 0,
      })
    }
  }, [category, form])

  const isPending = createCategory.isPending || updateCategory.isPending

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          data: values,
        })
      } else {
        await createCategory.mutateAsync(values)
      }
      onClose()
    } catch {
      // الخطأ اتعالج في الـ hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '✏️ تعديل الفئة' : '➕ إضافة فئة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* البرانده */}
            <FormField
              control={form.control}
              name="brand_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البرانده *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            brandsLoading ? 'جاري التحميل...' : 'اختار البرانده'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الاسم بالعربي */}
            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالعربي *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: بيتزا كلاسيك" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الاسم بالإنجليزي */}
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالإنجليزي *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: Classic Pizza"
                      dir="ltr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الترتيب */}
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الترتيب في المنيو</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? 'حفظ التعديلات' : 'إضافة الفئة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}