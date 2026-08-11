'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, ShoppingBag, Layers, Tag, 
  ImageIcon, Users, LogOut, ChevronRight, ChevronLeft, Settings, GripVertical, Store, Package, Bell
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/public/ThemeToggle'
import { AdminRole } from '@/lib/types'
import { toast } from 'sonner'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: AdminRole[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'الرئيسية', icon: LayoutDashboard, roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/products', label: 'المنتجات', icon: ShoppingBag, roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/categories', label: 'الفئات', icon: Layers, roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/brands', label: 'البراندات', icon: Store, roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/offers', label: 'العروض', icon: Tag, roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/media', label: 'الصور', icon: ImageIcon, roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/users', label: 'المستخدمين', icon: Users, roles: ['super_admin'] },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings, roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/homepage', label: 'الصفحة الرئيسية', icon: LayoutDashboard, roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/menu-builder', label: 'ترتيب القائمة', icon: GripVertical, roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/orders', label: 'الطلبات', icon: Package, roles: ['super_admin', 'brand_manager'] },
]

export interface AdminSidebarProps {
  userRole: AdminRole
  userName: string
  userBrandId?: string[] | null
  children: React.ReactNode
}

function useRealtimeOrders(brandIds?: string[] | null) {
  const supabase = createBrowserClient()
  const [count, setCount] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const hasInteracted = useRef(false)

  useEffect(() => {
    const unlockAudio = () => {
      hasInteracted.current = true
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AC) audioCtxRef.current = new AC()
      }
    }
    window.addEventListener('click', unlockAudio, { once: true })

    let filter: string | undefined
    if (brandIds && brandIds.length === 1) {
      filter = `brand_id=eq.${brandIds[0]}`
    } else if (brandIds && brandIds.length > 1) {
      filter = `brand_id=in.(${brandIds.join(',')})`
    }

    const channel = supabase
      .channel('admin-orders-notify')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter,
        },
        (payload) => {
          const order = payload.new as {
            id: string
            order_number: string
            customer_name: string
            total: number
          }

          if (hasInteracted.current && audioCtxRef.current) {
            try {
              const ctx = audioCtxRef.current
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.type = 'sine'
              osc.frequency.setValueAtTime(880, ctx.currentTime)
              osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
              osc.start(ctx.currentTime)
              osc.stop(ctx.currentTime + 0.4)
            } catch {
              // AudioContext failed — silently ignore
            }
          }

          toast.success(`طلب جديد! #${order.order_number || order.id.slice(0, 8)}`, {
            description: `${order.customer_name} — ${order.total?.toLocaleString('ar-EG') || '0'} ج.م`,
            duration: 6000,
            position: 'top-left',
            action: {
              label: 'عرض الطلب',
              onClick: () => window.location.href = `/admin/orders/${order.id}`,
            },
          })

          setCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('click', unlockAudio)
    }
  }, [brandIds, supabase])

  const reset = () => setCount(0)
  return { count, reset }
}

function OrderBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute start-auto end-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function OrderBell({ count, onReset }: { count: number; onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label={count > 0 ? `طلبات جديدة: ${count}` : 'لا توجد طلبات جديدة'}
    >
      <Bell className="w-5 h-5 text-gray-600" />
      {count > 0 && (
        <span className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

export default function AdminSidebar({ userRole, userName, userBrandId, children }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createBrowserClient()

  const { count, reset } = useRealtimeOrders(userBrandId)

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleLogout() {
    document.cookie = 'admin-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict;'
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  function getRoleLabel(role: AdminRole): string {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'brand_manager': return 'Brand Manager'
      case 'content_editor': return 'Content Editor'
      default: return role
    }
  }

  function getRoleBadgeColor(role: AdminRole): string {
    switch (role) {
      case 'super_admin': return 'bg-red-600'
      case 'brand_manager': return 'bg-blue-600'
      case 'content_editor': return 'bg-green-600'
      default: return 'bg-gray-600'
    }
  }

  // ← ما نرجعش الـ UI المختلف قبل mount عشان نمنع hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
        <aside className="w-64 bg-slate-900 h-screen flex-shrink-0" />
        <div className="flex-1 flex flex-col">
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 h-[57px]" />
          <main className="flex-1 bg-gray-50 dark:bg-gray-950 p-6">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors" dir="rtl">
      <aside 
        className={`bg-slate-900 text-white transition-all duration-300 h-screen flex-shrink-0 sticky top-0 overflow-hidden ${isOpen ? 'w-64' : 'w-0'}`}
      >
        <div className="flex flex-col h-full w-64">
          <div className="p-6 flex-shrink-0">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold">UNO & SAMIR</h1>
              <p className="text-slate-400 text-sm">لوحة التحكم</p>
              <p className="text-slate-500 text-xs mt-1">{userName}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs text-white ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </span>
            </div>
          </div>

          <nav 
            className="flex-1 overflow-y-auto px-6 pb-2 space-y-2"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#475569 transparent',
            }}
          >
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              const isOrders = item.href === '/admin/orders'
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={isOrders ? reset : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {isOrders && <OrderBadge count={count} />}
                </Link>
              )
            })}
          </nav>

          <div className="p-6 flex-shrink-0 border-t border-slate-800">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors w-full">
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-900 dark:border-gray-800 border-b border-gray-200 px-6 py-3 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors flex-shrink-0"
              title={isOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
            >
              {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <OrderBell count={count} onReset={reset} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-950 transition-colors">
          {children}
        </main>
      </div>
    </div>
  )
}