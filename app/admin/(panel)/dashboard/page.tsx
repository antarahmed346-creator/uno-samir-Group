 // WHAT: صفحة الـ Dashboard الرئيسية للـ Admin
// WHY:  أول صفحة بيشوفها الـ Admin بعد تسجيل الدخول
// KILL: مفيش مكان يروحله الـ Admin بعد الـ login

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { 
  ShoppingBag, 
  Tag, 
  Layers, 
  TrendingUp,
  Store
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function getStats() {
  try {
    const supabase = await createServerClient()
    
    const [products, categories, offers, brands] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('categories').select('id', { count: 'exact' }),
      supabase.from('offers').select('id', { count: 'exact' }),
      supabase.from('brands').select('id', { count: 'exact' }),
    ])

    return {
      products: products.count ?? 0,
      categories: categories.count ?? 0,
      offers: offers.count ?? 0,
      brands: brands.count ?? 0,
    }
  } catch {
    return { products: 0, categories: 0, offers: 0, brands: 0 }
  }
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const stats = await getStats()

  const cards = [
    { title: 'البراندات', value: stats.brands, icon: Store, color: 'text-blue-500' },
    { title: 'المنتجات', value: stats.products, icon: ShoppingBag, color: 'text-green-500' },
    { title: 'الفئات', value: stats.categories, icon: Layers, color: 'text-purple-500' },
    { title: 'العروض', value: stats.offers, icon: Tag, color: 'text-orange-500' },
  ]

  return (
    <div className="p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">مرحباً بك في UNO & SAMIR GROUP</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">إجمالي السجلات</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Brands Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            البراندات النشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'بيتزا أونو', slug: 'pizza-uno', color: '#15803D', emoji: '🍕' },
              { name: 'فطير سمير', slug: 'feteer-samir', color: '#B91C1C', emoji: '🥐' },
              { name: 'أونو كريب', slug: 'uno-crepe', color: '#CA8A04', emoji: '🥞' },
              { name: 'على الروف', slug: 'ala-el-roof', color: '#0A0A0A', emoji: '☕' },
            ].map((brand) => (
              <div
                key={brand.slug}
                className="flex items-center gap-3 p-4 rounded-xl border"
                style={{ borderColor: brand.color + '40', backgroundColor: brand.color + '10' }}
              >
                <span className="text-3xl">{brand.emoji}</span>
                <div>
                  <p className="font-semibold">{brand.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{brand.slug}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
