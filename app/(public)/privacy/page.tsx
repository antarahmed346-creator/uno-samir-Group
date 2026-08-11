// WHAT: صفحة سياسة الخصوصية
// WHY:  رابط "سياسة الخصوصية" في صفحة القائمة كان محتاج صفحة فعلية
//       عشان مايبقاش رابط بايظ (404)
// KILL: بدونها، رابط الخصوصية في /info هيدي صفحة غير موجودة

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="text-xl font-extrabold mb-6">سياسة الخصوصية</h1>
      <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4">
        <p>
          نحن في UNO &amp; SAMIR GROUP نحترم خصوصيتك. هذه الصفحة توضح البيانات التي نجمعها
          وكيف نستخدمها.
        </p>
        <p>
          <strong className="text-gray-900">البيانات التي نجمعها:</strong> الاسم، رقم
          التليفون، وعنوان التوصيل — فقط عند إتمام طلب، عشان نقدر نوصله لك.
        </p>
        <p>
          <strong className="text-gray-900">استخدام البيانات:</strong> بياناتك تُستخدم
          حصرياً لتنفيذ طلبك والتواصل معك بخصوصه. لا نشارك بياناتك مع أي طرف ثالث لأغراض
          تسويقية.
        </p>
        <p>
          <strong className="text-gray-900">المفضلة:</strong> قائمة المفضلة الخاصة بك
          محفوظة على جهازك فقط (المتصفح)، ولا يتم إرسالها لأي سيرفر.
        </p>
        <p className="text-gray-400 text-xs pt-4">
          هذه نسخة أولية لسياسة الخصوصية — يُنصح بمراجعتها مع مستشار قانوني قبل الإطلاق الرسمي.
        </p>
      </div>
    </div>
  )
}
