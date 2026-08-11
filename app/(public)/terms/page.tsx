// WHAT: صفحة الشروط والأحكام
// WHY:  رابط "الشروط والأحكام" في صفحة القائمة كان محتاج صفحة فعلية
//       عشان مايبقاش رابط بايظ (404)
// KILL: بدونها، رابط الشروط في /info هيدي صفحة غير موجودة

export default function TermsPage() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="text-xl font-extrabold mb-6">الشروط والأحكام</h1>
      <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4">
        <p>
          مرحباً بك في UNO &amp; SAMIR GROUP. باستخدامك لهذا الموقع وإتمام أي طلب، فإنك
          توافق على الشروط التالية.
        </p>
        <p>
          <strong className="text-gray-900">الطلبات:</strong> يتم تأكيد الطلب بعد مراجعة
          المطعم له. المطعم يحتفظ بحق رفض أو إلغاء أي طلب في حالات استثنائية (مثل عدم
          توفر منتج أو مشكلة في التوصيل).
        </p>
        <p>
          <strong className="text-gray-900">الأسعار:</strong> الأسعار المعروضة تشمل قيمة
          المنتج ولا تشمل رسوم التوصيل إلا إذا ذُكر خلاف ذلك عند إتمام الطلب.
        </p>
        <p>
          <strong className="text-gray-900">إلغاء الطلب:</strong> يمكن للعميل إلغاء الطلب
          مجاناً طالما لم يبدأ المطعم في تحضيره. بعد بدء التحضير، لا يمكن الإلغاء.
        </p>
        <p className="text-gray-400 text-xs pt-4">
          هذه نسخة أولية للشروط والأحكام — يُنصح بمراجعتها مع مستشار قانوني قبل الإطلاق الرسمي.
        </p>
      </div>
    </div>
  )
}
