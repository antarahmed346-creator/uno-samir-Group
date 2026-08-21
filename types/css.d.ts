// WHAT: يعرّف TypeScript إزاي يتعامل مع استيراد ملفات CSS مباشرة
// WHY:  بدون الملف ده، أمر "tsc" لوحده (مش جوا Next.js build) بيديك
//       تحذير "Cannot find module" على أي `import '...css'`
// KILL: مسح الملف بيرجّع نفس التحذير في كل فحص TypeScript يدوي
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}
