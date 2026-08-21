-- ============================================================
-- Migration: جدول مواقع البراندات (brand_locations)
-- Feature:   كل براند ممكن يكون ليه أكتر من فرع/لوكيشن. كل فرع بيتحط
--            من الداشبورد (Super Admin بس) وله زرار "الموقع" في صفحة
--            البراند بياخد العميل مباشرة لجوجل ماب باللوكيشن ده
-- Safe:      كل الأوامر IF NOT EXISTS / DROP-IF-EXISTS-then-CREATE بصيغة
--            ممكن تتشغل أكتر من مرة من غير ما تعمل مشكلة أو تمسح بيانات
-- How to run: افتح Supabase Dashboard → SQL Editor → الصق الكود كامل → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  label_ar TEXT NOT NULL DEFAULT 'الفرع الرئيسي',
  label_en TEXT NOT NULL DEFAULT 'Main Branch',
  address TEXT,
  google_maps_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_locations_brand_id ON brand_locations(brand_id);

COMMENT ON TABLE brand_locations IS 'فروع/مواقع كل براند — واحد أو أكتر، يظهروا كزرار "الموقع" في صفحة البراند العامة';
COMMENT ON COLUMN brand_locations.google_maps_url IS 'رابط جوجل ماب الكامل — ده اللي الزرار بيوديك عليه علطول';
COMMENT ON COLUMN brand_locations.is_primary IS 'الفرع الرئيسي — لو البراند له فرع واحد بس، ده بيبقى هو تلقائياً';

ALTER TABLE brand_locations ENABLE ROW LEVEL SECURITY;

-- أي حد (حتى زائر مش مسجل دخول) يقدر يشوف المواقع — عشان زرار الموقع
-- يظهر لكل عملاء الموقع العام
DROP POLICY IF EXISTS "Public can view brand locations" ON brand_locations;
CREATE POLICY "Public can view brand locations"
  ON brand_locations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- الـ Super Admin بس (مش brand_manager ولا content_editor) يقدر يضيف/يعدل/يمسح
-- المواقع — زي ما اتطلب بالظبط: "فى الداشبورد السوبر ادمن يقدر يغير اللوكيشن"
DROP POLICY IF EXISTS "Super admins can manage brand locations" ON brand_locations;
CREATE POLICY "Super admins can manage brand locations"
  ON brand_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
        AND admin_users.is_active = true
        AND admin_users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
        AND admin_users.is_active = true
        AND admin_users.role = 'super_admin'
    )
  );
