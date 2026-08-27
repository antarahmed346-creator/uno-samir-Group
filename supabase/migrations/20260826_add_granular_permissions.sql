-- ============================================================
-- Migration: صلاحيات مرنة لكل قسم بدل الأدوار الثابتة
-- Feature:   السوبر أدمن يقدر يحدد بالظبط أي أقسام يقدر المستخدم
--            الجديد يوصلها (الطلبات، المنتجات، العروض...) بدل ما
--            يختار من 3 أدوار جاهزة بصلاحيات مجمّعة
-- Safe:      إضافة عمود جديد بس، مفيش حذف أو تعديل لأي بيانات موجودة
-- How to run: افتح Supabase Dashboard → SQL Editor → الصق الكود كامل → Run
-- ============================================================

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN admin_users.permissions IS
  'صلاحيات كل قسم على حدة لغير super_admin — مثال: {"orders": true, "products": true, "offers": false}. super_admin بيتجاهل العمود ده تماماً وعنده وصول كامل دايماً.';
