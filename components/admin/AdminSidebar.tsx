'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Layers, Tag,
  ImageIcon, Users, LogOut, ChevronRight, ChevronLeft,
  Settings, GripVertical, Store, Package, Bell,
  MessageCircle, CalendarCheck, FileBarChart, Home,
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
  { href: '/admin/dashboard',    label: 'الرئيسية',         icon: LayoutDashboard, roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/orders',       label: 'الطلبات',           icon: Package,         roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/products',     label: 'المنتجات',          icon: ShoppingBag,     roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/categories',   label: 'الفئات',            icon: Layers,          roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/brands',       label: 'البراندات',         icon: Store,           roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/offers',       label: 'العروض',            icon: Tag,             roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/reservations', label: 'الحجوزات',          icon: CalendarCheck,   roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/reports',      label: 'التقارير',          icon: FileBarChart,    roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/chat',         label: 'الشات',             icon: MessageCircle,   roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/media',        label: 'الصور',             icon: ImageIcon,       roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/homepage',     label: 'الصفحة الرئيسية',  icon: Home,            roles: ['super_admin', 'brand_manager', 'content_editor'] },
  { href: '/admin/menu-builder', label: 'ترتيب القائمة',    icon: GripVertical,    roles: ['super_admin', 'brand_manager'] },
  { href: '/admin/users',        label: 'المستخدمين',        icon: Users,           roles: ['super_admin'] },
  { href: '/admin/settings',     label: 'الإعدادات',         icon: Settings,        roles: ['super_admin', 'brand_manager', 'content_editor'] },
]

export interface AdminSidebarProps {
  userRole: AdminRole
  userName: string
  userBrandId?: string[] | null
  children: React.ReactNode
}

function useRealtimeOrders(brandIds?: string[] | null) {
  // WHAT: Stable string key so the subscription doesn't recreate on every render
  // WHY:  brandIds is a new array reference each render; JSON.stringify gives a stable dep
  // FIX:  Bug fix — previously caused subscription recreation on every parent re-render
  const brandKey = useMemo(() => JSON.stringify(brandIds ?? null), [brandIds])

  const supabase = createBrowserClient()
  const router = useRouter()
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

    const parsedIds: string[] | null = JSON.parse(brandKey)
    let filter: string | undefined
    if (parsedIds && parsedIds.length === 1) {
      filter = `brand_id=eq.${parsedIds[0]}`
    } else if (parsedIds && parsedIds.length > 1) {
      filter = `brand_id=in.(${parsedIds.join(',')})`
    }

    const channel = supabase
      .channel('admin-orders-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter },
        (payload) => {
          const order = payload.new as {
            id: string; order_number: string; customer_name: string; total: number
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
            } catch { /* AudioContext failed */ }
          }

          toast.success(`طلب جديد! #${order.order_number || order.id.slice(0, 8)}`, {
            description: `${order.customer_name} — ${order.total?.toLocaleString('ar-EG') || '0'} ج.م`,
            duration: 6000,
            position: 'top-left',
            action: {
              label: 'عرض الطلب',
              // FIX: use router.push instead of window.location.href for SPA navigation
              onClick: () => router.push(`/admin/orders/${order.id}`),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandKey])

  return { count, reset: () => setCount(0) }
}

function useRealtimeChatNotify() {
  const supabase = createBrowserClient()
  const router = useRouter()
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

    const channel = supabase
      .channel('admin-chat-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'sender_type=eq.customer' },
        async (payload) => {
          const message = payload.new as { id: string; conversation_id: string; message: string }

          if (hasInteracted.current && audioCtxRef.current) {
            try {
              const ctx = audioCtxRef.current
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.type = 'sine'
              osc.frequency.setValueAtTime(660, ctx.currentTime)
              osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
              osc.start(ctx.currentTime)
              osc.stop(ctx.currentTime + 0.5)
            } catch { /* AudioContext failed */ }
          }

          const { data: convo } = await supabase
            .from('chat_conversations')
            .select('customer_name')
            .eq('id', message.conversation_id)
            .maybeSingle()

          toast.success(
            `💬 رسالة جديدة${convo?.customer_name ? ` من ${convo.customer_name}` : ''}`,
            {
              description: message.message.length > 60
                ? `${message.message.slice(0, 60)}…`
                : message.message,
              duration: 6000,
              position: 'top-left',
              action: {
                label: 'الرد',
                onClick: () => router.push(`/admin/chat?conversation=${message.conversation_id}`),
              },
            }
          )

          setCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('click', unlockAudio)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { count, reset: () => setCount(0) }
}

function NavBadge({ count }: { count: number }) {
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
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label={count > 0 ? `طلبات جديدة: ${count}` : 'لا توجد طلبات جديدة'}
    >
      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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

  const { count: ordersCount, reset: resetOrders } = useRealtimeOrders(userBrandId)
  const { count: chatCount, reset: resetChat } = useRealtimeChatNotify()

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  useEffect(() => { setMounted(true) }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  function getRoleLabel(role: AdminRole): string {
    switch (role) {
      case 'super_admin':    return 'Super Admin'
      case 'brand_manager':  return 'Brand Manager'
      case 'content_editor': return 'Content Editor'
      default: return role
    }
  }

  function getRoleBadgeColor(role: AdminRole): string {
    switch (role) {
      case 'super_admin':    return 'bg-red-600'
      case 'brand_manager':  return 'bg-blue-600'
      case 'content_editor': return 'bg-green-600'
      default: return 'bg-gray-600'
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
        <aside className="w-64 bg-slate-900 h-screen flex-shrink-0" />
        <div className="flex-1 flex flex-col">
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 h-[57px]" />
          <main className="flex-1 bg-gray-50 dark:bg-gray-950 p-6">{children}</main>
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
            className="flex-1 overflow-y-auto px-4 pb-2 space-y-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}
          >
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              const isOrders = item.href === '/admin/orders'
              const isChat   = item.href === '/admin/chat'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={isOrders ? resetOrders : isChat ? resetChat : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors relative ${
                    isActive ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  {isOrders && <NavBadge count={ordersCount} />}
                  {isChat   && <NavBadge count={chatCount} />}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 flex-shrink-0 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors w-full text-sm"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-900 dark:border-gray-800 border-b border-gray-200 px-6 py-3 flex items-center justify-between transition-colors">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors flex-shrink-0"
            title={isOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
          >
            {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <OrderBell count={ordersCount} onReset={resetOrders} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-950 transition-colors">
          {children}
        </main>
      </div>
    </div>
  )
}
