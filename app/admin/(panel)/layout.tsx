import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { getCurrentAdminUser } from '@/lib/supabase/server'

// WHAT: يتحقق من هوية الأدمن باستخدام Supabase Auth الحقيقي فقط
// WHY:  ده نفس بالظبط النظام اللي صفحة تسجيل الدخول (app/admin/login)
//       بتستخدمه. لازم يكون نظام واحد بس في كل المشروع، مش نظامين
//       مختلفين بيتعارضوا مع بعض.
// KILL: لو رجّعنا نظام الكوكي القديم (admin-session base64 token)،
//       هيحصل حاجتين وحشين:
//       1) أي حد يقدر يفك الـ base64 ويصنع لنفسه توكن فيه
//          role: "super_admin" ويدخل بدون ما يعرف أي باسورد خالص
//       2) تسجيل الدخول الحقيقي (Supabase Auth) مش بيحط الكوكي دي
//          خالص، يعني المستخدم هيتسجل دخول بنجاح وبعدين يترجّع
//          فورًا لصفحة الـ login تاني في حلقة مفرغة

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await getCurrentAdminUser()

  if (!adminUser) {
    redirect('/admin/login')
  }

  return (
    <>
      <AdminSidebar
        userRole={adminUser.role}
        userName={adminUser.full_name}
        userBrandId={adminUser.brand_access}
      >
        {children}
      </AdminSidebar>
      {/* WHAT: Toast notification container for sonner */}
      {/* WHY:  Required for all toast.success() / toast.error() calls to render */}
      {/* KILL: Without this, notifications are silently swallowed */}
      <Toaster position="top-left" richColors />
    </>
  )
}
