"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cart";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [locale, setLocale] = useState('ar');

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => {
    setMounted(true);
    const match = document.cookie.match(/locale=([^;]+)/);
    if (match) setLocale(match[1]);
  }, []);

  const isRTL = locale === 'ar';

  const totalPrice = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const displayItems = mounted ? items : [];

  const handleRemove = (cartItemId: string) => {
    setRemovingId(cartItemId);
    setTimeout(() => {
      removeItem(cartItemId);
      setRemovingId(null);
    }, 300);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center" suppressHydrationWarning>
        <ShoppingBag className="w-12 h-12 text-white/20 animate-pulse" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4" dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-white/30" />
          </div>
          <h1 className="text-2xl font-bold text-white font-cairo mb-2">
            {isRTL ? 'السلة فارغة' : 'Cart is Empty'}
          </h1>
          <p className="text-white/50 mb-8">
            {isRTL ? 'ابدأ طلبك بإضافة بعض الأطباق اللذيذة' : 'Start your order by adding some delicious dishes'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c49b2a] text-black font-semibold px-8 py-3 rounded-full transition-all hover:scale-[1.03]"
          >
            <span>{isRTL ? 'تصفح المنيو' : 'Browse Menu'}</span>
            <ArrowRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] pb-32" dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-cairo">
                {isRTL ? 'سلة المشتريات' : 'Shopping Cart'}
              </h1>
              <p className="text-white/50 text-sm">{totalItems} {isRTL ? 'عنصر' : 'items'}</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
            <span>{isRTL ? 'مواصلة التسوق' : 'Continue Shopping'}</span>
          </Link>
        </motion.div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {displayItems.map((item) => (
              <motion.div
                key={item.cartItemId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: removingId === item.cartItemId ? 0 : 1, y: 0, x: removingId === item.cartItemId ? (isRTL ? -100 : 100) : 0 }}
                exit={{ opacity: 0, x: isRTL ? -100 : 100, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name_ar || item.product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 80px, 96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-white font-semibold font-cairo text-sm sm:text-base truncate">
                          {isRTL ? (item.product.name_ar || item.product.name) : item.product.name}
                        </h3>
                        <p className="text-white/40 text-xs mt-0.5">
                          {isRTL ? (item.product.brand_name_ar || item.product.brand_name) : item.product.brand_name}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(item.cartItemId)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.customizations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.customizations.map((c, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] sm:text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full"
                          >
                            {isRTL ? (c.optionNameAr || c.optionName) : c.optionName}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[#D4AF37] font-bold">{item.totalPrice}</span>
                        <span className="text-white/40 text-sm">{isRTL ? 'ج.م' : 'EGP'}</span>
                      </div>

                      <div className="flex items-center gap-2 bg-white/10 rounded-full px-1 py-1">
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-white font-bold w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-[#111111]/95 backdrop-blur-xl border-t border-white/10 p-4 sm:p-6 z-50"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-white/50 text-sm">{isRTL ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-[#D4AF37]">
              {totalPrice} <span className="text-sm text-white/50">{isRTL ? 'ج.م' : 'EGP'}</span>
            </p>
          </div>
          <Link
            href="/checkout"
            className="bg-[#D4AF37] hover:bg-[#c49b2a] text-black font-bold px-8 py-4 rounded-xl transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20"
          >
            <span>{isRTL ? 'إتمام الطلب' : 'Checkout'}</span>
            <ArrowRight className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}