// WHAT: Cloudinary media upload API with rate limiting
// WHY:  Handles image uploads to Cloudinary; rate limited to prevent storage abuse
// KILL: Remove rate limit → someone can upload GBs of images to your Cloudinary account

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { v2 as cloudinary } from 'cloudinary'

// WHAT: Configure Cloudinary SDK
// WHY:  Server-side only — API secret never exposed to browser
// KILL: Hardcoded credentials = security breach; missing config = upload failures
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// WHAT: Allowed MIME types for upload validation
// WHY:  Prevents malicious file uploads (executables, scripts, etc.)
// KILL: Without MIME validation, attackers can upload malware disguised as images
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
    const result = await checkRateLimit(rateLimiters.mediaUpload, identifier)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Max 20 uploads per hour.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
          remaining: result.remaining,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)) },
        }
      )
    }

    // ─── File Validation ────────────────────────────────────────────────
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // ─── Upload to Cloudinary ───────────────────────────────────────────
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'uno-group/products',
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, crop: 'limit' },
          ],
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })

    return NextResponse.json(
      {
        success: true,
        data: uploadResult,
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
    console.error('[Media Upload Error]', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during upload' },
      { status: 500 }
    )
  }
}