'use client'

import { Suspense, lazy } from 'react'

const HomepageManager = lazy(() => import('@/components/admin/HomepageManager'))

export default function HomepagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    }>
      <HomepageManager />
    </Suspense>
  )
}