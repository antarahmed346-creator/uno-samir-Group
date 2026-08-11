'use client'

// WHAT: بيدير حالة النايت مود في كل الموقع (عام + داشبورد)
// WHY:  عايزين مصدر واحد للحقيقة — لو غيرت الوضع من الداشبورد،
//       يفضل نفس الوضع لو رحت الموقع العام والعكس
// KILL: من غيره، كل صفحة هتحتاج تدير حالة النايت مود لوحدها
//       وهيحصل تعارض بين الصفحات

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// WHAT: بيحط قيمة الثيم في كوكي عشان السيرفر يعرفها من أول تحميل
// WHY:  من غير كده، هتشوف "فلاش" — الصفحة تفتح فاتحة، وبعد ثانية
//       تتحول غامقة. الكوكي بيخلي السيرفر يرندر الوضع الصح من البداية
function setThemeCookie(theme: Theme) {
  document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme: Theme
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      setThemeCookie(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme لازم يتستخدم جوا ThemeProvider')
  }
  return ctx
}
