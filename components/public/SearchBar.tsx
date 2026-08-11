'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  currentLocale?: string
}

export default function SearchBar({ currentLocale = 'ar' }: SearchBarProps) {
  const [q, setQ] = useState('')
  const router = useRouter()
  const isRTL = currentLocale === 'ar'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      const prefix = currentLocale === 'en' ? '/en' : ''
      router.push(`${prefix}/search?q=${encodeURIComponent(q.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden sm:block flex-1 max-w-md mx-4">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={isRTL ? 'دور على أكلتك...' : 'Search for food...'}
        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all bg-gray-50"
        style={{ paddingRight: isRTL ? '1rem' : '2.5rem', paddingLeft: isRTL ? '2.5rem' : '1rem' }}
      />
      <button
        type="submit"
        className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition ${isRTL ? 'left-3' : 'right-3'}`}
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  )
}