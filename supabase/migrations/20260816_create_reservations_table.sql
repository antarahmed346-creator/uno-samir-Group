-- WHAT: بيعمل جدول reservations لنظام حجز طاولات مستقل لبراند "على الروف" بس
-- WHY:  "على الروف" كافيه بجلسة، عكس باقي البراندات اللي مطاعم توصيل فقط،
--       فمحتاج نظام حجز مواعيد منفصل تماماً عن نظام orders
-- KILL: من غيره مفيش مكان يتخزن فيه الحجوزات، والميزة كلها مش هتشتغل
-- NOTE: نفس فلسفة الأمان المستخدمة في جدول orders بالظبط —
--       RLS مفعّل، مفيش قراءة عامة، القراءة للأدمن بس،
--       والإنشاء/التحديث بيحصلوا فقط عن طريق service role من الـ API routes
--       (اللي بيتجاوز RLS تلقائياً)، مش عن طريق policies عامة

-- احتياطي: نتأكد إن extension توليد الـ UUID موجودة قبل ما نستخدمها
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index لتسريع فلترة لوحة التحكم بالتاريخ والحالة (زي ما هي مطلوبة في الأدمن)
CREATE INDEX IF NOT EXISTS idx_reservations_brand_date
  ON reservations (brand_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON reservations (status);

-- ─── Row Level Security ──────────────────────────────────────────────────
-- WHAT: نفس فلسفة الأمان بتاعة جدول orders بالظبط
-- WHY:  الحجوزات فيها بيانات عميل (اسم + تليفون) — مينفعش أي حد يقدر
--       يقراها من غير ما يكون أدمن مسجل دخول فعلاً
-- KILL: من غيره أي حد معاه الـ anon key (زي أي زائر للموقع) هيقدر
--       يقرا كل الحجوزات وبيانات العملاء

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- مفيش أي policy لقراءة عامة (anon) ولا حتى INSERT عام —
-- الإنشاء بيحصل فقط عن طريق service role في app/api/reservations (POST)،
-- وده بيتجاوز RLS تلقائياً، تماماً زي ما بيحصل في app/api/orders (POST)

-- الأدمن النشط بس (الموجود في admin_users) يقدر يقرا الحجوزات
DROP POLICY IF EXISTS "Active admins can view reservations" ON reservations;
CREATE POLICY "Active admins can view reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
        AND admin_users.is_active = true
    )
  );
