-- ============================================================
-- Migration: إشعارات Push + ربط الطلبات بهوية العميل
-- Feature:   العميل يقدر ياخد إشعار حتى لو قافل الموقع تماماً — لما
--            حالة طلبه تتغير (اتقبل، بيتحضر، في الطريق...)
-- Safe:      كل الأوامر IF NOT EXISTS / DROP-IF-EXISTS-then-CREATE
-- How to run: افتح Supabase Dashboard → SQL Editor → الصق الكود كامل → Run
-- ============================================================

-- ─── 1) ربط الطلب بهوية العميل (auth.uid) ─────────────────────
-- WHAT: عمود جديد في orders يحفظ مين اللي عمل الطلب فعلياً
-- WHY:  من غيره، لما حالة الطلب تتغير، مش هنعرف نبعت الإشعار لمين
-- NOTE: العميل ممكن يكون anonymous (بدون تسجيل دخول) أو مسجل بجوجل —
--       الاتنين ليهم auth.uid() حقيقي في Supabase، فمفيش فرق هنا
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_uid UUID;

CREATE INDEX IF NOT EXISTS idx_orders_customer_uid ON orders(customer_uid);

COMMENT ON COLUMN orders.customer_uid IS 'هوية العميل في Supabase Auth (anonymous أو مسجل بجوجل) — نستخدمها لمعرفة مين نبعتله إشعار Push';


-- ─── 2) جدول اشتراكات الإشعارات (push_subscriptions) ──────────
-- WHAT: كل مرة العميل يوافق على الإشعارات من متصفح/جهاز، بيتسجل
--       صف جديد هنا — عميل واحد ممكن يكون ليه أكتر من صف (موبايل +
--       لابتوب مثلاً)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_uid UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer_uid ON push_subscriptions(customer_uid);

COMMENT ON TABLE push_subscriptions IS 'اشتراكات Web Push — endpoint + مفاتيح التشفير اللي المتصفح بيديها لما العميل يوافق على الإشعارات';

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- الإنشاء/الحذف بيحصل بس عن طريق service role في app/api/push/*
-- (بيتجاوز RLS تلقائياً)، فمفيش داعي لـ policy عامة INSERT/DELETE هنا.
-- بس العميل يقدر يشوف اشتراكاته هو بس (لو احتجنا ده في الواجهة لاحقاً)
DROP POLICY IF EXISTS "Customers can view their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Customers can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (customer_uid = auth.uid());

-- الأدمن النشط يقدر يشوف الاشتراكات كلها (لو احتجنا ده للدعم الفني)
DROP POLICY IF EXISTS "Active admins can view all push subscriptions" ON push_subscriptions;
CREATE POLICY "Active admins can view all push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
        AND admin_users.is_active = true
    )
  );
