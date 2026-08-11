'use client'

// WHAT: زرار دعم عائم بيوصّل العميل بواتساب المطعم مباشرة
// WHY:  نفس فكرة السماعة الحمراء في matrouhmarket — حل سريع
//       لعميل محتاج مساعدة فورية من غير ما يدور في القائمة
// KILL: من غيره، العميل المحتاج مساعدة هيقفل الموقع ويسيب الطلب

import { Headset } from 'lucide-react'

// ⚠️ لازم تستبدل الرقم ده برقم واتساب المطعم الحقيقي
const SUPPORT_WHATSAPP_NUMBER = '201000000000'

export default function SupportFab() {
  return (
    <a
      href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      className="md:hidden fixed bottom-[92px] left-3 z-40 w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40"
      aria-label="تواصل معانا على واتساب"
    >
      <Headset className="w-5 h-5" />
    </a>
  )
}
