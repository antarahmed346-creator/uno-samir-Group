'use client'

// WHAT: بيشغّل تحديثات المنتجات الفورية للبراند الحالي
// WHY:  useRealtimeStatus (فحص حالة الاتصال) شغال أصلاً مرة واحدة
//       بس من RealtimeConnectionBanner في layout.tsx — تشغيله هنا
//       كمان كان بيعمل نسختين شغالين في نفس الوقت على كل صفحة،
//       وده اللي كان بيسبب حلقة إعادة اتصال لا نهائية وبيقفّل المتصفح
// KILL: من غيره، الأسعار والمنتجات مش هتتحدث لحظياً للعميل

import { useRealtimeMenu } from '@/lib/hooks/useRealtimeMenu'

interface RealtimeProviderProps {
  brandId?: string
  children: React.ReactNode
}

export default function RealtimeProvider({ brandId, children }: RealtimeProviderProps) {
  useRealtimeMenu({ brandId, enabled: true })
  return <>{children}</>
}