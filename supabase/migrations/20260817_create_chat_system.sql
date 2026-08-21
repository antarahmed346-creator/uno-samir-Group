-- ============================================================
-- Migration: نظام الشات المباشر بين العميل والمطعم
-- Feature:   شات عائم في الموقع العام + صندوق وارد في لوحة التحكم
-- Safe:      كل الأوامر بصيغة IF NOT EXISTS / DROP-IF-EXISTS-then-CREATE
--            — ممكن تتشغل أكتر من مرة من غير ما تعمل مشكلة أو تمسح بيانات
-- How to run: افتح Supabase Dashboard → SQL Editor → الصق الكود كامل → Run
--
-- ⚠️ خطوة يدوية إضافية لازم تعملها من الـ Dashboard (مش SQL):
--    Authentication → Settings → فعّل "Allow anonymous sign-ins"
--    ليه محتاجها: شرح كامل في نهاية الملف تحت "ليه Anonymous Auth؟"
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── الجداول ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT,
  customer_phone TEXT,
  -- 🔒 إضافة عن قصد فوق طلبك الأصلي: بتربط المحادثة بجلسة العميل
  -- المجهولة (Supabase Anonymous Auth) بدل ما تكون القراءة مفتوحة
  -- للجميع. من غيرها، أي حد يعرف رابط الـ Supabase بتاعك (public
  -- anon key) يقدر يقرا كل أسماء وأرقام تليفونات ورسايل كل
  -- العملاء. التفاصيل كاملة في آخر الملف.
  customer_uid UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES admin_users(id),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer','admin')),
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── الفهارس (أداء) ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_uid ON chat_conversations(customer_uid);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_to ON chat_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);

-- ─── Trigger: أي رسالة جديدة من العميل → المحادثة ترجع "open" تلقائي
--     + تحديث updated_at عشان قايمة الأدمن ترتب بالأحدث نشاطًا ───

CREATE OR REPLACE FUNCTION touch_chat_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = NOW(),
      status = CASE WHEN NEW.sender_type = 'customer' THEN 'open' ELSE status END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_touch_chat_conversation ON chat_messages;
CREATE TRIGGER trg_touch_chat_conversation
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION touch_chat_conversation_on_new_message();

-- ─── Row Level Security ───────────────────────────────────────

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- العميل يشوف بس المحادثة بتاعته (customer_uid = هوية جلسته
-- المجهولة)، والأدمن النشط يشوف كل المحادثات
DROP POLICY IF EXISTS chat_conversations_select ON chat_conversations;
CREATE POLICY chat_conversations_select ON chat_conversations
  FOR SELECT
  USING (
    customer_uid = auth.uid()
    OR EXISTS (SELECT 1 FROM admin_users a WHERE a.id = auth.uid() AND a.is_active = true)
  );

-- تحديث الحالة/التخصيص (استلام المحادثة / قفلها) — الأدمن بس
DROP POLICY IF EXISTS chat_conversations_update_admin ON chat_conversations;
CREATE POLICY chat_conversations_update_admin ON chat_conversations
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users a WHERE a.id = auth.uid() AND a.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users a WHERE a.id = auth.uid() AND a.is_active = true));

-- إنشاء محادثة جديدة بيحصل بس من خلال الـ API route (service role
-- بيتخطى RLS تلقائيًا) عشان نطبّق rate limiting على السبام —
-- فمفيش سياسة INSERT هنا للعميل عن قصد

-- رسايل المحادثة: نفس منطق القراءة (صاحب المحادثة أو أدمن نشط)
DROP POLICY IF EXISTS chat_messages_select ON chat_messages;
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (
          c.customer_uid = auth.uid()
          OR EXISTS (SELECT 1 FROM admin_users a WHERE a.id = auth.uid() AND a.is_active = true)
        )
    )
  );

-- إرسال رسالة كأدمن (مباشر من المتصفح، زي باقي صفحات لوحة
-- التحكم) — لازم يكون الأدمن نفسه وsender_type = admin
-- رسايل العميل بتتبعت عن طريق الـ API route (service role)
DROP POLICY IF EXISTS chat_messages_insert_admin ON chat_messages;
CREATE POLICY chat_messages_insert_admin ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_type = 'admin'
    AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM admin_users a WHERE a.id = auth.uid() AND a.is_active = true)
  );

-- ─── تفعيل Realtime ───────────────────────────────────────────
-- (DO block عشان يفضل آمن يتشغل أكتر من مرة من غير ما يرمي error
--  "already member of publication" لو كانت مفعّلة قبل كده)

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================
-- ليه Anonymous Auth؟ (خطوة الـ Dashboard المذكورة فوق)
-- ============================================================
-- الموقع مفيهوش نظام حسابات عملاء (guest checkout بس، زي الطلبات
-- والتتبع بالتليفون). لو خلّينا قراءة chat_messages/chat_conversations
-- مفتوحة للجميع (USING (true))، أي حد عنده رابط الـ Supabase
-- والـ anon key بتاعك (وهو أصلاً ظاهر لأي حد في كود الموقع) يقدر
-- يسحب كل أسماء وأرقام تليفونات ومحتوى رسايل كل عملائك من غير أي
-- حماية. ده مختلف عن customer_notifications الموجودة قبل كده
-- لأنها معلومات عامة (عروض) مش بيانات شخصية لعميل.
--
-- الحل: Supabase Anonymous Sign-in — بيدي كل زائر "هوية" حقيقية
-- (auth.uid()) من غير ما يعمل حساب أو يكتب باسورد، ومعاها نقدر
-- نربط كل محادثة بصاحبها فعليًا في RLS. لازم تفعّلها مرة واحدة من
-- Dashboard (مش حاجة SQL) عشان الشات يشتغل للعملاء. لو مش مفعّلة،
-- الأدمن (لوحة التحكم) هيشتغل عادي، بس شات العميل مش هيقدر يبدأ.
-- ============================================================
