// app/api/push/unsubscribe/route.ts
// WHAT: بيمسح اشتراك الإشعارات — لما العميل يقفل الإشعارات من إعداداته

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = unsubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const serviceClient = getServiceClient()
    const { error } = await serviceClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', parsed.data.endpoint)

    if (error) {
      console.error('[Push Unsubscribe] Error:', error)
      return Response.json({ error: 'فشل إلغاء الاشتراك' }, { status: 500 })
    }

    return Response.json({ data: { unsubscribed: true } }, { status: 200 })
  } catch (err) {
    console.error('[Push Unsubscribe] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
