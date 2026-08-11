'use client'

// WHAT: زرار تبديل الوضع الليلي (شمس/قمر)
// WHY:  عنصر واحد قابل لإعادة الاستخدام في الداشبورد والموقع العام
// KILL: من غيره، محدش يقدر يبدّل الوضع فعلياً

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ${className}`}
    >
      <Sun className="w-[18px] h-[18px] text-amber-500 absolute transition-all scale-100 dark:scale-0 dark:-rotate-90" />
      <Moon className="w-[18px] h-[18px] text-indigo-400 absolute transition-all scale-0 dark:scale-100 rotate-90 dark:rotate-0" />
    </button>
  )
}
