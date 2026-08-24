'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function SignOutButton({ locale = 'ar' }: { locale?: string }) {
  const router = useRouter()
  const isRTL = locale !== 'en'

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-[12px] font-bold text-red-500 hover:text-red-600 transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      {isRTL ? 'تسجيل خروج' : 'Sign out'}
    </button>
  )
}
