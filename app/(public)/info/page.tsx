// WHAT: صفحة "القائمة" — معلومات عن المجموعة، الدعم، والروابط المهمة
// WHY:  في تطبيقات زي matrouhmarket الصفحة دي بتبقى بروفايل مستخدم،
//       لكن موقعنا مفيهوش تسجيل دخول للعميل (الطلب برقم تليفون بس)،
//       فبدلناها بصفحة معلومات ودعم — نفس المكان في القائمة السفلية
//       بس بمحتوى يناسب الموقع فعلاً
// KILL: من غيرها، زرار "القائمة" في الشريط السفلي هيوديك لصفحة فاضية

import Link from 'next/link'
import { Phone, MessageCircle, FileText, Shield, MapPin, UtensilsCrossed } from 'lucide-react'

const SUPPORT_WHATSAPP_NUMBER = '201000000000' // ⚠️ استبدله برقم المطعم الحقيقي
const SUPPORT_PHONE_NUMBER = '+20 100 000 0000' // ⚠️ استبدله برقم المطعم الحقيقي

export default function InfoPage() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto min-h-[70vh]">
      <div className="bg-gradient-to-l from-red-600 to-orange-600 px-6 py-8 text-white flex items-center gap-4 md:rounded-2xl md:mt-4">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <div>
          <div className="font-extrabold text-[15px]">UNO & SAMIR GROUP</div>
          <div className="text-[11.5px] opacity-85 mt-0.5">مجموعة مطاعم مرسى مطروح</div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-400 font-bold mb-2 px-1">التواصل والدعم</p>
        <div className="bg-gray-50 rounded-2xl overflow-hidden">
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 text-[13px] font-semibold"
          >
            <MessageCircle className="w-[18px] h-[18px] text-green-600" /> تواصل معانا على واتساب
          </a>
          <a
            href={`tel:${SUPPORT_PHONE_NUMBER}`}
            className="flex items-center gap-3 px-4 py-4 text-[13px] font-semibold"
          >
            <Phone className="w-[18px] h-[18px] text-gray-600" /> اتصل بينا مباشرة
          </a>
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-400 font-bold mb-2 px-1">فروعنا</p>
        <div className="bg-gray-50 rounded-2xl px-4 py-4 flex items-start gap-3 text-[13px] font-semibold">
          <MapPin className="w-[18px] h-[18px] text-red-600 flex-shrink-0 mt-0.5" />
          مرسى مطروح، مصر — بيتزا أونو، فطير سمير، أونو كريب، على الروف
        </div>
      </div>

      <div className="px-4 mt-5 mb-8">
        <p className="text-[11px] text-gray-400 font-bold mb-2 px-1">قانوني</p>
        <div className="bg-gray-50 rounded-2xl overflow-hidden">
          <Link href="/terms" className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 text-[13px] font-semibold">
            <FileText className="w-[18px] h-[18px] text-gray-500" /> الشروط والأحكام
          </Link>
          <Link href="/privacy" className="flex items-center gap-3 px-4 py-4 text-[13px] font-semibold">
            <Shield className="w-[18px] h-[18px] text-gray-500" /> سياسة الخصوصية
          </Link>
        </div>
      </div>
    </div>
  )
}
