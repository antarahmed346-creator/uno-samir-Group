-- ============================================================
-- Migration: أعمدة الكوبون/الخصم الناقصة من جدول orders
-- Problem:   الكود بيحاول يحفظ coupon_code و discount_amount مع كل
--            طلب، بس الجدول الحقيقي في قاعدة البيانات معندوش الأعمدة
--            دي أصلاً — رسالة الخطأ كانت:
--            "Could not find the 'coupon_code' column of 'orders'"
-- Safe:      كل الأوامر IF NOT EXISTS — آمن تشغله حتى لو بعض الأعمدة
--            موجودة فعلاً
-- How to run: افتح Supabase Dashboard → SQL Editor → الصق الكود كامل → Run
-- ============================================================

-- WHAT: كل عمود هنا بالظبط زي ما الكود في app/api/orders/route.ts
--       بيحاول يكتبه — أضفناهم كلهم دفعة واحدة عشان مانوصلش لنفس
--       المشكلة تاني مع عمود تاني ناقص
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_uid UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_time TIMESTAMPTZ;

COMMENT ON COLUMN orders.coupon_code IS 'كود الكوبون المستخدم (لو في)، بيتحط في جدول offers مش coupons';
COMMENT ON COLUMN orders.discount_amount IS 'قيمة الخصم الفعلية اللي اتطبقت على الطلب ده';
