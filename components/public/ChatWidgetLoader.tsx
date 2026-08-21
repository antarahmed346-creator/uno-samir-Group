'use client'

// WHAT: Thin client-only wrapper that lazy-loads ChatWidget with ssr:false
// WHY:  ChatWidget calls createBrowserClient() (Supabase browser client,
//       touches document.cookie) as soon as it renders. Next.js still
//       server-renders 'use client' components for the initial HTML, so
//       without ssr:false that call would run in Node.js and throw
//       ("document is not defined") — crashing every public page.
// KILL: `dynamic(..., { ssr: false })` is NOT allowed inside a Server
//       Component (app/(public)/layout.tsx uses cookies()/headers(), so
//       it can't be 'use client'). This wrapper is what makes ssr:false
//       legal: the layout imports this plain client component instead.

import dynamic from 'next/dynamic'

const ChatWidget = dynamic(() => import('@/components/public/ChatWidget'), {
  ssr: false,
  loading: () => null,
})

export default function ChatWidgetLoader() {
  return <ChatWidget />
}
