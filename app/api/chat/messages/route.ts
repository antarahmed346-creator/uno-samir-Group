// app/api/chat/messages/route.ts
// WHAT: Handles customer chat messages — creates new conversations or adds to existing ones
// WHY:  Customer messages go through this API (service role) so RLS doesn't block INSERT
//       Admin messages are sent directly from the browser (admin RLS policy allows admin INSERT)
// SECURITY: Rate limited per IP, validates customer_uid matches the Supabase auth session

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const newConversationSchema = z.object({
  customer_uid: z.string().uuid(),
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(8).max(20),
  message: z.string().min(1).max(2000),
})

const existingConversationSchema = z.object({
  customer_uid: z.string().uuid(),
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
})

// POST /api/chat/messages
export async function POST(request: NextRequest) {
  try {
    // Rate limit per IP
    const identifier = getClientIdentifier(request)
    const rl = await checkRateLimit(rateLimiters.chatMessage, identifier)
    if (!rl.allowed) {
      return Response.json(
        { error: 'كتير أوي، استنى شوية قبل ما تبعت رسالة تانية' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const serviceClient = getServiceClient()

    // ─── Case 1: Start a new conversation ─────────────────────────────
    if (!body.conversation_id) {
      const parsed = newConversationSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { customer_uid, customer_name, customer_phone, message } = parsed.data

      // Create conversation
      const { data: conversation, error: convError } = await serviceClient
        .from('chat_conversations')
        .insert({
          customer_uid,
          customer_name,
          customer_phone,
          status: 'open',
        })
        .select()
        .single()

      if (convError || !conversation) {
        console.error('[Chat POST] Conversation create error:', convError)
        return Response.json({ error: 'Failed to start conversation' }, { status: 500 })
      }

      // Insert first message
      const { data: msg, error: msgError } = await serviceClient
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          sender_id: customer_uid,
          message,
        })
        .select()
        .single()

      if (msgError || !msg) {
        console.error('[Chat POST] Message insert error:', msgError)
        return Response.json({ error: 'Failed to send message' }, { status: 500 })
      }

      return Response.json(
        { data: { conversation_id: conversation.id, message: msg } },
        { status: 201 }
      )
    }

    // ─── Case 2: Add to existing conversation ─────────────────────────
    const parsed = existingConversationSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { customer_uid, conversation_id, message } = parsed.data

    // Verify this conversation belongs to this customer
    const { data: convo, error: convoError } = await serviceClient
      .from('chat_conversations')
      .select('id, customer_uid')
      .eq('id', conversation_id)
      .maybeSingle()

    if (convoError || !convo) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (convo.customer_uid !== customer_uid) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: msg, error: msgError } = await serviceClient
      .from('chat_messages')
      .insert({
        conversation_id,
        sender_type: 'customer',
        sender_id: customer_uid,
        message,
      })
      .select()
      .single()

    if (msgError || !msg) {
      console.error('[Chat POST] Message insert error:', msgError)
      return Response.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return Response.json({ data: { conversation_id, message: msg } }, { status: 201 })
  } catch (err) {
    console.error('[Chat POST] Unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
