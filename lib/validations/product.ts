import { z } from 'zod'
import type { ItemStatus } from '@/lib/database.types'

export const customizationOptionSchema = z.object({
  name_ar: z.string().min(1, 'الاسم مطلوب'),
  name_en: z.string().min(1, 'Name required'),
  price_modifier: z.number().default(0),
  is_default: z.boolean().default(false),
})

export const customizationGroupSchema = z.object({
  name_ar: z.string().min(1, 'اسم المجموعة مطلوب'),
  name_en: z.string().min(1, 'Group name required'),
  type: z.enum(['single', 'multiple']),
  is_required: z.boolean().default(false),
  options: z.array(customizationOptionSchema).min(1, 'لازم يكون فيه option واحد على الأقل'),
})

export const productSchema = z.object({
  name_ar: z.string().min(2, 'الاسم لازم يكون حرفين على الأقل'),
  name_en: z.string().min(2, 'Name must be at least 2 characters'),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  base_price: z.number().min(0, 'السعر لازم يكون أكبر من 0'),
  compare_price: z.number().optional(),
  brand_id: z.string().uuid('اختر البراند'),
  category_id: z.string().uuid('اختر الفئة'),
  main_image_url: z.string().url('رابط الصورة غلط').optional().or(z.literal('')),
  is_featured: z.boolean().default(false),
  is_available: z.boolean().default(true),
  sort_order: z.number().default(0),
  status: z.enum(['active', 'inactive', 'draft'] as [ItemStatus, ItemStatus, ItemStatus]).default('active'),
  customization_groups: z.array(customizationGroupSchema).optional(),
})

// ✅ الـ type بيتصدر من هنا بس
export type ProductFormData = z.infer<typeof productSchema>