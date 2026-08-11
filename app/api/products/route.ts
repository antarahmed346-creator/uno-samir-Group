// WHAT: Public products API with rate limiting
// WHY:  Serves menu data to public pages; rate limited to prevent scraping
// KILL: Remove rate limit → competitors can scrape your entire menu in seconds

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // ─── Rate Limit Check ───────────────────────────────────────────────
    const identifier = getClientIdentifier(request)
    const result = await checkRateLimit(rateLimiters.publicApi, identifier)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)) },
        }
      )
    }

    // ─── Query Parameters ───────────────────────────────────────────────
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    // ─── Database Query ─────────────────────────────────────────────────
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [] } }
    )

    let query = supabase
      .from('products')
      .select('*, categories(name_ar, name_en)')
      .eq('status', 'available')

    if (brandId) query = query.eq('brand_id', brandId)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (search) {
      query = query.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .order('display_order', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Products API Error]', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json(
      {
        data,
        pagination: {
          limit,
          offset,
          total: count,
          hasMore: data.length === limit,
        },
        rateLimit: {
          remaining: result.remaining,
          reset: new Date(result.reset).toISOString(),
        },
      },
      {
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
        },
      }
    )

  } catch (error) {
    console.error('[Products API Error]', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}