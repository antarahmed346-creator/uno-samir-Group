// WHAT: AI-powered menu import API with rate limiting
// WHY:  Processes menu images via OCR + Claude AI; rate limited to prevent API cost overruns
// KILL: Remove rate limit → someone can rack up thousands in Claude + Vision API costs

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// WHAT: Zod schema for import request validation
// WHY:  Prevents malformed requests from reaching the AI pipeline
// KILL: Without validation, invalid data wastes expensive AI API calls
const importSchema = z.object({
  imageUrl: z.string().url(),
  brandId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // ─── Auth Check ─────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── Rate Limit Check ───────────────────────────────────────────────
    const identifier = getClientIdentifier(request, user.id)
    const result = await checkRateLimit(rateLimiters.aiImport, identifier)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Max 10 imports per hour.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
          remaining: result.remaining,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)) },
        }
      )
    }

    // ─── Input Validation ───────────────────────────────────────────────
    const body = await request.json()
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { imageUrl, brandId } = parsed.data

    // ─── Verify Admin Access to Brand ─────────────────────────────────
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, brand_id')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const canAccessBrand =
      adminUser.role === 'super_admin' ||
      adminUser.brand_id === brandId

    if (!canAccessBrand) {
      return NextResponse.json({ error: 'Forbidden: No access to this brand' }, { status: 403 })
    }

    // ─── TODO: OCR + Claude AI Processing ───────────────────────────────
    // Placeholder for actual implementation
    console.log('[AI Import] Processing image:', imageUrl, 'for brand:', brandId)

    return NextResponse.json(
      {
        success: true,
        message: 'Import request accepted',
        imageUrl,  // ← استخدمنا imageUrl هنا
        brandId,   // ← استخدمنا brandId هنا
        items: [],
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
    console.error('[AI Import Error]', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during import' },
      { status: 500 }
    )
  }
}