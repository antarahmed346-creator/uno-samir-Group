import { redirect } from 'next/navigation'

// WHAT: لو حد فتح /admin بس من غير ما يكمل الرابط
// WHY:  الميدل وير (middleware.ts) بيتأكد من تسجيل الدخول قبل
//       ما الصفحة دي حتى تترندر — لو مش مسجل دخول هيتحول لصفحة
//       الدخول تلقائياً قبل ما يوصل هنا أصلاً
// KILL: من غيرها، /admin لوحدها كانت بتدي 404 بدل توجيه منطقي
export default function AdminRootPage() {
  redirect('/admin/dashboard')
}
