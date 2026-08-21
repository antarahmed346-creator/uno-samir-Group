// WHAT: Next.js middleware with rate limiting for admin login
// WHY:  Protects /admin/login from brute force attacks before reaching the page
// KILL: Remove rate limit → brute force attacks possible on admin panel

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── API routes: skip middleware processing ───────────────────────────
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // ─── Admin routes: Auth + Rate Limiting ───────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Rate limit login POST requests only (not page views)
    if (pathname === '/admin/login' && request.method === 'POST') {
      const identifier = getClientIdentifier(request)
      const result = await checkRateLimit(rateLimiters.adminLogin, identifier)

      if (!result.allowed) {
        // WHAT: Return 429 Too Many Requests with retry-after header
        // WHY:  Tells the client exactly when they can retry; prevents spam
        // KILL: Without retry-after, client doesn't know when to stop trying
        const response = NextResponse.json(
          {
            error: 'Too many login attempts. Please try again later.',
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
          },
          { status: 429 }
        )
        response.headers.set('Retry-After', String(Math.ceil((result.reset - Date.now()) / 1000)))
        return response
      }
    }

    return handleAdminAuth(request)
  }

  // ─── Public routes: Language handling ─────────────────────────────────
  const isEnglish = pathname.startsWith('/en')

  if (isEnglish) {
    const newPath = pathname.replace(/^\/en/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = newPath
    const response = NextResponse.rewrite(url)
    response.cookies.set('locale', 'en', { path: '/', maxAge: 60 * 60 * 24 * 365 })
    return response
  }

  const response = NextResponse.next()
  response.cookies.set('locale', 'ar', { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}

async function handleAdminAuth(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options: CookieOptions
          }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (pathname === '/admin/login') {
    return response
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(
      new URL(`/admin/login?redirect=${encodeURIComponent(pathname)}`, request.url)
    )
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('role, brand_access, is_active')
    .eq('id', user.id)
    .single()

  if (adminError || !adminUser || !adminUser.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL('/admin/login?error=unauthorized', request.url)
    )
  }

  response.headers.set('x-admin-role', adminUser.role)
  response.headers.set('x-admin-brand-id', adminUser.brand_access?.join(',') ?? 'all')
  return response
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}