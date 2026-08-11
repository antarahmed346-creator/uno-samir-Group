"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, ClipboardList, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumbers = searchParams.getAll("order");
  const phone = searchParams.get("phone") || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-[#D4AF37]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-white font-cairo mb-2">
            تم تأكيد طلبك!
          </h1>
          <p className="text-white/60 mb-8">
            شكراً لاختيارك UNO GROUP. فريقنا بيتابع معاك دلوقتي.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 mb-8"
        >
          {orderNumbers.map((num, idx) => (
            <div
              key={idx}
              className="bg-white/[0.04] border border-[#D4AF37]/30 rounded-2xl p-5"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-white/60 text-sm">رقم الطلب</span>
              </div>
              <p className="text-2xl font-bold text-[#D4AF37] font-mono tracking-wider">
                #{num}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-white/40 mx-auto mb-2" />
            <p className="text-white/60 text-xs mb-1">وقت التوصيل المتوقع</p>
            <p className="text-white font-semibold text-sm">30–45 دقيقة</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
            <MapPin className="w-5 h-5 text-white/40 mx-auto mb-2" />
            <p className="text-white/60 text-xs mb-1">حالة الطلب</p>
            <p className="text-white font-semibold text-sm">قيد الانتظار</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {phone && (
            <Link
              href={`/track-order?phone=${encodeURIComponent(phone)}`}
              className="block w-full bg-[#D4AF37] hover:bg-[#c49b2a] text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
            >
              <ClipboardList className="w-5 h-5" />
              <span>تتبع طلبك</span>
            </Link>
          )}

          <Link
            href="/"
            className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>العودة للرئيسية</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/30 text-xs mt-8"
        >
          لو عندك أي استفسار، اتصل بينا على الرقم الموحد
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" dir="rtl">
          <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}