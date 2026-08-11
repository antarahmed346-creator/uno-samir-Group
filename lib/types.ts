// types.ts — نسخة مبسطة وصحيحة
export type BrandSlug = 'pizza-uno' | 'feteer-samir' | 'uno-crepe' | 'ala-el-roof'
export type AdminRole = 'super_admin' | 'brand_manager' | 'content_editor'
export type ItemStatus = 'active' | 'inactive' | 'draft'  // ← بس غيرنا archived لـ draft
export type OfferType = 'percentage' | 'fixed' | 'bundle'
export type CustomizationType = 'single' | 'multiple'
export type SectionType =
  | 'hero'
  | 'brands'
  | 'featured'
  | 'offers'
  | 'gallery'
  | 'testimonials'
  | 'custom'

export interface Brand {
  id: string
  slug: BrandSlug
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  primary_color: string
  secondary_color: string
  logo_url: string | null
  cover_url: string | null
  favicon_url: string | null
  meta_title_ar: string | null
  meta_title_en: string | null
  meta_desc_ar: string | null
  meta_desc_en: string | null
  sort_order: number
  status: ItemStatus
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  brand_id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  image_url: string | null
  icon: string | null
  parent_id: string | null
  sort_order: number
  status: ItemStatus
  created_at: string
  updated_at: string
  brand?: Pick<Brand, 'id' | 'name_ar' | 'name_en' | 'primary_color'>
  children?: Category[]
}

export interface Product {
  id: string
  brand_id: string
  category_id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  main_image_url: string | null
  gallery_urls: string[] | null
  base_price: number
  compare_price: number | null
  calories: number | null
  prep_time: number | null
  tags: string[] | null
  is_featured: boolean
  is_available: boolean
  sort_order: number
  status: ItemStatus
  created_at: string
  updated_at: string
  brand?: Brand
  category?: Category
  customization_groups?: CustomizationGroup[]
}

export interface CustomizationGroup {
  id: string
  product_id: string
  name_ar: string
  name_en: string
  type: CustomizationType
  is_required: boolean
  min_selections: number
  max_selections: number | null
  sort_order: number
  created_at: string
  updated_at: string
  options?: CustomizationOption[]
}

export interface CustomizationOption {
  id: string
  group_id: string
  name_ar: string
  name_en: string
  price_modifier: number
  is_default: boolean
  is_available: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  brand_id: string | null
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  image_url: string | null
  type: OfferType
  discount_value: number
  promo_code: string | null
  min_order_value: number | null
  max_discount: number | null
  usage_limit: number | null
  usage_count: number
  starts_at: string
  expires_at: string | null
  status: ItemStatus
  created_at: string
  updated_at: string
  brand?: Brand
  products?: Product[]
}

// ─── Offer Insert/Update Types ──────────────────────────────────────────────
export type OfferInsert = Omit<Offer, 'id' | 'created_at' | 'updated_at' | 'brand' | 'products'>
export type OfferUpdate = Partial<OfferInsert>

export interface OfferProduct {
  offer_id: string
  product_id: string
}

export interface HomepageSection {
  id: string
  brand_id: string | null
  type: SectionType
  title_ar: string | null
  title_en: string | null
  subtitle_ar: string | null
  subtitle_en: string | null
  content: Record<string, unknown>
  is_visible: boolean
  sort_order: number
  created_at: string
  updated_at: string
  brand?: Brand
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: AdminRole
  brand_access: string[] | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

// WHAT: ألوان كل براند — دي بتتحكم في الشكل في كل مكان (الموقع + الأدمن)
// WHY:  كل براند له هوية بصرية مستقلة عشان العميل يفرق بينهم بسهولة
export const BRAND_COLORS: Record<BrandSlug, { primary: string; secondary: string }> = {
  'pizza-uno':    { primary: '#15803D', secondary: '#FDE68A' },  // أخضر + دهبي فاتح
  'feteer-samir': { primary: '#B91C1C', secondary: '#FEF3C7' },  // أحمر + كريمي
  'uno-crepe':    { primary: '#CA8A04', secondary: '#78350F' },  // أصفر + بني كراميل
  'ala-el-roof':  { primary: '#0A0A0A', secondary: '#C9A227' },  // أسود + دهبي بسيط
}

export const BRAND_NAMES: Record<BrandSlug, { ar: string; en: string }> = {
  'pizza-uno':    { ar: 'بيتزا أونو',  en: 'Pizza Uno' },
  'feteer-samir': { ar: 'فطير سمير',   en: 'Feteer Samir' },
  'uno-crepe':    { ar: 'أونو كريب',   en: 'Uno Crépe' },
  'ala-el-roof':  { ar: 'على الروف',   en: 'Ala El Roof' },
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at' | 'brand' | 'children'>
export type CategoryUpdate = Partial<CategoryInsert>

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'brand' | 'category' | 'customization_groups'>
export type ProductUpdate = Partial<ProductInsert>