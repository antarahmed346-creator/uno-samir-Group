-- ============================================================
-- Migration: إضافة حقول الموقع الجغرافي لجدول brands
-- Feature:   كل براند (بيتزا أونو / فطير سمير / أونو كريب / على الروف)
--            له لوكيشن خاص بيه يظهر في صفحته العامة
-- Safe:      كل الأوامر IF NOT EXISTS — ممكن تتشغل أكتر من مرة
--            من غير ما تعمل مشكلة أو تمسح أي بيانات موجودة
-- How to run: افتح Supabase Dashboard → SQL Editor → الصق الكود ده → Run
-- ============================================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

COMMENT ON COLUMN brands.address IS 'العنوان النصي للفرع — بيظهر في صفحة البراند العامة';
COMMENT ON COLUMN brands.latitude IS 'خط العرض — لعرض خريطة مصغرة embed';
COMMENT ON COLUMN brands.longitude IS 'خط الطول — لعرض خريطة مصغرة embed';
COMMENT ON COLUMN brands.google_maps_url IS 'رابط جوجل ماب الكامل (زرار "افتح في خرائط جوجل")';
