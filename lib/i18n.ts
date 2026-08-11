// Helper to pick Arabic or English text
export function t(
  item: { name_ar?: string | null; name_en?: string | null; title_ar?: string | null; title_en?: string | null; description_ar?: string | null; description_en?: string | null },
  locale: string,
  fallback?: string
): string {
  if (locale === 'en') {
    return item.name_en || item.title_en || item.description_en || item.name_ar || item.title_ar || item.description_ar || fallback || ''
  }
  return item.name_ar || item.title_ar || item.description_ar || item.name_en || item.title_en || item.description_en || fallback || ''
}