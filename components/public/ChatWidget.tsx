'use client'

// WHAT: شات عائم بيوصّل العميل بالمطعم مباشرة (لحظي عبر Supabase
//       Realtime)، جنب زرار الدعم بتاع الواتساب بالظبط
// WHY:  مش كل عميل عايز يكلم واتساب أو يستنى مكالمة — شات مباشر
//       في الموقع أسرع وأسهل، والرسايل بتوصل فورًا للأدمن
// KILL: من غيره، العميل المحتاج يسأل سؤال بسيط هيضطر يقفل الموقع
//       ويفتح واتساب أو يسيب السؤال أصلاً
//
// 🔒 الأمان: الموقع مفيهوش حسابات عملاء، فبنستخدم Supabase Anonymous
// Auth (signInAnonymously) عشان نديله هوية حقيقية (auth.uid()) من
// غير باسورد أو تسجيل — ده اللي بيخلي RLS يقدر يقصر قراءة كل محادثة
// على صاحبها بس. لازم "Allow anonymous sign-ins" يكون مفعّل في
// Supabase Dashboard (تفاصيل في supabase-chat-system.sql)

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserClient } from '@/lib/supabase/client'
import type { ChatMessage, ChatStatus } from '@/lib/types'

const CONVERSATION_KEY = 'uno-samir-chat-conversation-id'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [customerUid, setCustomerUid] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationStatus, setConversationStatus] = useState<ChatStatus | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unread, setUnread] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [text, setText] = useState('')
  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createBrowserClient())

  // WHAT: فحص صامت عند تحميل الصفحة — لو العميل عنده جلسة ومحادثة
  //       سابقة (من زيارة قبل كده)، نجيبها من غير ما ننشئ جلسة جديدة
  useEffect(() => {
    let cancelled = false
    const supabase = supabaseRef.current

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const cachedId = localStorage.getItem(CONVERSATION_KEY)

      if (session?.user && cachedId) {
        setCustomerUid(session.user.id)
        setConversationId(cachedId)

        const { data: convo } = await supabase
          .from('chat_conversations')
          .select('status')
          .eq('id', cachedId)
          .maybeSingle()

        const { data: history } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', cachedId)
          .order('created_at', { ascending: true })

        if (!cancelled) {
          if (convo) setConversationStatus(convo.status as ChatStatus)
          setMessages((history as ChatMessage[]) || [])
        }
      }
      if (!cancelled) setReady(true)
    }

    // WHAT: بنستنى ثانيتين قبل ما نبدأ الفحص، بدل ما يبدأ فوراً لحظة
    //       ما أي صفحة عامة تفتح
    // WHY:  الشات موجود في كل صفحة في الموقع، ودي 3 طلبات شبكة
    //       (auth + استعلامين) بتحصل تلقائي حتى لو العميل هيفتح
    //       الشات ولا لأ — التأخير البسيط ده بيخلي المحتوى الأساسي
    //       للصفحة (صور، منتجات) يستحوذ على الموارد الأول
    const initTimer = setTimeout(init, 2000)
    return () => {
      cancelled = true
      clearTimeout(initTimer)
    }
  }, [])

  // WHAT: تحديث لحظي — رسايل جديدة + تغيير حالة المحادثة (اتقفلت/اتفتحت)
  useEffect(() => {
    if (!conversationId) return
    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`chat-widget-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
          if (msg.sender_type === 'admin') {
            setOpen((currentlyOpen) => {
              if (!currentlyOpen) setUnread((prev) => prev + 1)
              return currentlyOpen
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const convo = payload.new as { status: ChatStatus }
          setConversationStatus(convo.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    if (open) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages.length])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function ensureCustomerSession(): Promise<string | null> {
    const supabase = supabaseRef.current
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session.user.id

    const { data, error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError || !data.user) {
      setError('الشات مش متاح دلوقتي، جرب تاني بعدين أو كلمنا واتساب')
      return null
    }
    return data.user.id
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !text.trim() || starting) return
    setStarting(true)
    setError(null)
    try {
      const uid = await ensureCustomerSession()
      if (!uid) return
      setCustomerUid(uid)

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_uid: uid,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          message: text.trim(),
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'فشل بدء المحادثة')

      const convId = result.data.conversation_id as string
      localStorage.setItem(CONVERSATION_KEY, convId)
      setConversationId(convId)
      setConversationStatus('open')
      setMessages([result.data.message])
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني')
    } finally {
      setStarting(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !conversationId || !customerUid || sending) return
    setSending(true)
    setError(null)
    const messageText = text.trim()
    setText('')
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_uid: customerUid,
          conversation_id: conversationId,
          message: messageText,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'فشل إرسال الرسالة')

      setMessages((prev) =>
        prev.some((m) => m.id === result.data.message.id) ? prev : [...prev, result.data.message]
      )
      setConversationStatus('open')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني')
      setText(messageText)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[92px] md:bottom-6 right-3 md:right-6 z-40 w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/40"
        aria-label="تواصل معانا"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            dir="rtl"
            className="fixed bottom-[150px] md:bottom-24 right-3 md:right-6 z-40 w-[calc(100vw-1.5rem)] max-w-sm h-[70vh] max-h-[520px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                U
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">تواصل معانا</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">هنرد عليك في أقرب وقت</p>
              </div>
            </div>

            {!ready ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : !conversationId ? (
              // ── ما فيش محادثة لسه: فورم أول رسالة ──
              <form onSubmit={handleStart} className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  قبل ما نبدأ، محتاجين اسمك ورقم تليفونك:
                </p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  required
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم التليفون"
                  type="tel"
                  dir="ltr"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-transparent text-right focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  required
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  required
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={starting}
                  className="mt-auto w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                >
                  {starting && <Loader2 className="w-4 h-4 animate-spin" />}
                  إرسال
                </button>
              </form>
            ) : (
              // ── فيه محادثة: تريد الرسايل ──
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          m.sender_type === 'customer'
                            ? 'bg-orange-500 text-white rounded-bl-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-br-sm'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {conversationStatus === 'closed' && (
                  <p className="px-4 py-1.5 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    المحادثة اتقفلت — اكتب رسالة جديدة لو محتاج حاجة تانية
                  </p>
                )}
                {error && <p className="px-4 py-1 text-xs text-red-600 flex-shrink-0">{error}</p>}

                <form
                  onSubmit={handleSend}
                  className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-shrink-0"
                >
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="w-9 h-9 flex-shrink-0 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                    aria-label="إرسال"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
