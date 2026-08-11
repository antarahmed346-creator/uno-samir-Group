'use client'

import { Globe } from 'lucide-react'

interface LanguageSwitcherProps {
  currentLocale: string
  currentPath: string
}

export default function LanguageSwitcher({ currentLocale, currentPath }: LanguageSwitcherProps) {
  const isEnglish = currentLocale === 'en'
  const otherLocale = isEnglish ? 'ar' : 'en'
  
  let targetPath = currentPath
  
  if (isEnglish) {
    targetPath = currentPath.replace(/^\/en/, '') || '/'
  } else {
    targetPath = `/en${currentPath}`
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Set cookie before redirect so layout.tsx reads it correctly
    document.cookie = `locale=${otherLocale}; path=/; max-age=${60 * 60 * 24 * 365}`
    window.location.href = targetPath
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-sm font-medium cursor-pointer"
    >
      <Globe className="w-4 h-4" />
      <span>{otherLocale === 'ar' ? 'العربية' : 'English'}</span>
    </button>
  )
}