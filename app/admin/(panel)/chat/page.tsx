'use client'

// WHAT: لوحة الشات — الأدمن يشوف كل المحادثات ويرد عليها في الوقت الفعلي
// WHY:  بدونها، الأدمن مش هيعرف الرسايل الجاية من عملاء الموقع
// KILL: من غيرها، نظام الشات بتاع العميل يشتغل بس من غير إنترفيس للرد

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { MessageCircle, Loader2, Send, X, Check, RefreshCw, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatConversation, ChatMessage, ChatStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'

const STATUS_LABEL: Record<ChatStatus, string> = { open: 'مفتوح', closed: 'مغلق' }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

export default function AdminChatPage() {
  const supabase = createBrowserClient()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Read search params for ?conversation= direct link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const convId = params.get('conversation')
      if (convId) setSelectedId(convId)
    }
  }, [])

  // Get current admin UID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentAdminId(data.user?.id ?? null)
    })
  }, [supabase])

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoadingConvos(true)
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      toast.error('فشل تحميل المحادثات')
    } else {
      setConversations((data || []) as ChatConversation[])
    }
    setLoadingConvos(false)
  }, [supabase])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Realtime: new conversations + status updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        loadConversations()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadConversations])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedId) return
    setLoadingMsgs(true)
    supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data || []) as ChatMessage[])
        setLoadingMsgs(false)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
  }, [selectedId, supabase])

  // Realtime: new messages in selected conversation
  useEffect(() => {
    if (!selectedId) return
    const channel = supabase
      .channel(`admin-chat-msgs-${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId, supabase])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !selectedId || !currentAdminId || sending) return
    setSending(true)
    const messageText = text.trim()
    setText('')

    const { data: msg, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: selectedId,
        sender_type: 'admin',
        sender_id: currentAdminId,
        message: messageText,
      })
      .select()
      .single()

    if (error) {
      toast.error('فشل إرسال الرسالة')
      setText(messageText)
    } else if (msg) {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg as ChatMessage])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
    setSending(false)
  }

  async function toggleStatus(id: string, current: ChatStatus) {
    const next: ChatStatus = current === 'open' ? 'closed' : 'open'
    const { error } = await supabase
      .from('chat_conversations')
      .update({ status: next })
      .eq('id', id)

    if (error) {
      toast.error('فشل تحديث الحالة')
    } else {
      setConversations((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: next } : c)
      )
      toast.success(next === 'closed' ? '✅ تم إغلاق المحادثة' : '✅ تم إعادة فتح المحادثة')
    }
  }

  const selectedConvo = conversations.find((c) => c.id === selectedId) ?? null

  return (
    <div dir="rtl" className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* ── Conversations List ── */}
      <aside className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            المحادثات
          </h2>
          <button
            onClick={loadConversations}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-800">
          {loadingConvos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">لا توجد محادثات</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedId === c.id ? 'bg-orange-50 dark:bg-orange-900/20 border-r-2 border-orange-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm truncate">{c.customer_name || 'بدون اسم'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    c.status === 'open'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  }`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{c.customer_phone || ''}</p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{formatDate(c.updated_at)}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Messages Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-950">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">اختر محادثة من القائمة</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedConvo?.customer_name || 'بدون اسم'}</p>
                  {selectedConvo?.customer_phone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span dir="ltr">{selectedConvo.customer_phone}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedConvo && toggleStatus(selectedConvo.id, selectedConvo.status)}
                  className="text-xs h-8"
                >
                  {selectedConvo?.status === 'open' ? (
                    <><X className="w-3 h-3 ms-1" />إغلاق</>
                  ) : (
                    <><Check className="w-3 h-3 ms-1" />إعادة فتح</>
                  )}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">لا توجد رسايل</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        m.sender_type === 'admin'
                          ? 'bg-orange-500 text-white rounded-bl-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-br-sm shadow-sm'
                      }`}
                    >
                      {m.message}
                      <p className={`text-[10px] mt-1 ${m.sender_type === 'admin' ? 'text-orange-100' : 'text-gray-400'}`}>
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {selectedConvo?.status === 'open' ? (
              <form
                onSubmit={handleSend}
                className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 flex items-center gap-2 flex-shrink-0"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب ردك..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="w-10 h-10 flex-shrink-0 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-gray-400 flex-shrink-0">
                المحادثة مغلقة — اضغط &quot;إعادة فتح&quot; للرد
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
