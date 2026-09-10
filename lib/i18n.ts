// WHAT: أدوات اللغة المشتركة (اختيار النص + بناء روابط بادئة /en)
// WHY:  لقينا نفس المنطق ده متكرر (ومختلف شوية كل مرة) في أكتر من
//       ملف — ده كان بالظبط سبب باگين منفصلين: عناوين عربي في وضع
//       إنجليزي، وروابط داخلية بترجع الموقع عربي تلقائي لأنها مش
//       بتحافظ على بادئة /en

// WHAT: بياخد النص بلغة الموقع الحالية
// WHY:  المفروض الافتراضي الإنجليزي (fallback) يظهر لو مفيش نص
//       إنجليزي مُدخل، قبل ما نرجع للنص العربي كحل أخير — مش العكس
export function t(
  item: { name_ar?: string | null; name_en?: string | null; title_ar?: string | null; title_en?: string | null; description_ar?: string | null; description_en?: string | null },
  locale: string,
  fallback?: string
): string {
  if (locale === 'en') {
    return (
      item.name_en || item.title_en || item.description_en ||
      fallback ||
      item.name_ar || item.title_ar || item.description_ar || ''
    )
  }
  return (
    item.name_ar || item.title_ar || item.description_ar ||
    fallback ||
    item.name_en || item.title_en || item.description_en || ''
  )
}

// WHAT: بيحط بادئة /en للمسار لو اللغة إنجليزي، وبيسيبه زي ما هو
//       للعربي
// WHY:  middleware.ts بيحدد لغة الموقع من بادئة الرابط بس (/en أو
//       مفيش) — مش من كوكي محفوظ من قبل. يعني أي رابط داخلي (Link)
//       ما بيحطش /en، هيرجع الموقع عربي تلقائي أول ما حد يدوس عليه،
//       حتى لو كان في وضع إنجليزي قبلها
// KILL: من غيرها، أي رابط جديد يتضاف في أي مكان في الموقع هيقع في
//       نفس المشكلة اللي حصلت مع كروت البراندات في الهوم بيدج
export function localize(path: string, locale: string): string {
  if (locale !== 'en') return path
  return path === '/' ? '/en' : `/en${path}`
}
