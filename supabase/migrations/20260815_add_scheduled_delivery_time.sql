-- WHAT: بيضيف عمود scheduled_delivery_time لجدول orders
-- WHY:  العميل بقى يقدر يحدد ميعاد توصيل معين بدل "أسرع وقت ممكن" بس
-- KILL: من غيره الطلبات المجدولة مش هتتسجل ولوحة التحكم مش هتقدر تميزها
-- NOTE: NULL = العميل اختار "أسرع وقت ممكن" (السلوك الافتراضي القديم)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS scheduled_delivery_time TIMESTAMPTZ;

-- Index اختياري لتسريع فلترة/ترتيب الطلبات المجدولة في لوحة التحكم
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_delivery_time
  ON orders (scheduled_delivery_time)
  WHERE scheduled_delivery_time IS NOT NULL;
