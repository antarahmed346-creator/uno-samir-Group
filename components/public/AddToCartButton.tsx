"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, X, Check } from "lucide-react";
import { useCartStore, CartCustomization, CartProduct } from "@/lib/store/cart";
import Image from "next/image";

// ─── Helper: read locale from cookie ───────────────────────────────────────
function useLocale() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === 'undefined') return 'ar'
      const match = document.cookie.match(/locale=([^;]+)/)
      return match ? match[1] : 'ar'
    },
    () => 'ar'
  )
}

// ─── Helper: translate text ────────────────────────────────────────────────
function t(ar: string | null | undefined, en: string | null | undefined, locale: string, fallback?: string): string {
  if (locale === 'en') {
    return en || ar || fallback || ''
  }
  return ar || en || fallback || ''
}

interface CustomizationGroup {
  id: string;
  name: string;
  name_ar: string | null;
  name_en: string | null;  // ← أضفنا name_en
  required: boolean;
  min_select: number;
  max_select: number;
  options: {
    id: string;
    name: string;
    name_ar: string | null;
    name_en: string | null;  // ← أضفنا name_en
    price_adjustment: number;
  }[];
}

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    name_ar: string | null;
    name_en: string | null;  // ← أضفنا name_en
    price: number;
    image_url: string | null;
    brand_id: string;
    brand_name: string;
    brand_name_ar: string | null;
    brand_name_en: string | null;  // ← أضفنا brand_name_en
  };
  customizationGroups?: CustomizationGroup[];
  // WHAT: نسخة أصغر تتناسب مع كروت المنتجات الصغيرة (الرئيسية/المنيو)
  // WHY:  الزرار كان بنفس حجمه في كل مكان — في الكروت الصغيرة (اسم
  //       المنتج نفسه text-[11px]) كان بيبان ضخم وغير متناسق جداً
  compact?: boolean;
}

export default function AddToCartButton({
  product,
  customizationGroups = [],
  compact = false,
}: AddToCartButtonProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const hasCustomizations = customizationGroups.length > 0;

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= maxSelect) {
        return { ...prev, [groupId]: [...current.slice(1), optionId] };
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const getUnitPrice = () => {
    let price = product.price;
    customizationGroups.forEach((group) => {
      const selected = selectedOptions[group.id] || [];
      selected.forEach((optId) => {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) price += opt.price_adjustment || 0;
      });
    });
    return price;
  };

  const isValid = () => {
    if (!hasCustomizations) return true;
    return customizationGroups.every((group) => {
      if (!group.required) return true;
      const selected = selectedOptions[group.id] || [];
      return selected.length >= group.min_select;
    });
  };

  const handleAdd = () => {
    if (hasCustomizations && !isOpen) {
      setIsOpen(true);
      return;
    }
    if (!isValid()) return;

    setIsAdding(true);

    const customizations: CartCustomization[] = [];
    customizationGroups.forEach((group) => {
      const selected = selectedOptions[group.id] || [];
      selected.forEach((optId) => {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          customizations.push({
            groupId: group.id,
            groupName: group.name,
            groupNameAr: group.name_ar || group.name,
            optionId: opt.id,
            optionName: opt.name,
            optionNameAr: opt.name_ar || opt.name,
            priceAdjustment: opt.price_adjustment || 0,
          });
        }
      });
    });

    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      name_ar: product.name_ar,
      name_en: product.name_en || null,
      price: product.price,
      image_url: product.image_url,
      brand_id: product.brand_id,
      brand_name: product.brand_name,
      brand_name_ar: product.brand_name_ar,
      brand_name_en: product.brand_name_en || null,
    };

    addItem(cartProduct, customizations, quantity);

    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
        setQuantity(1);
        setSelectedOptions({});
      }, 1200);
    }, 400);
  };

  const productName = t(product.name_ar, product.name_en, locale, product.name)

  return (
    <>
      <motion.button
        onClick={handleAdd}
        disabled={isAdding}
        whileTap={{ scale: 0.95 }}
        className={
          compact
            ? "w-full bg-[#D4AF37] hover:bg-[#c49b2a] disabled:opacity-70 text-black font-semibold px-2 py-1.5 rounded-full text-[10.5px] transition-all active:scale-95 flex items-center justify-center gap-1"
            : "w-full bg-[#D4AF37] hover:bg-[#c49b2a] disabled:opacity-70 text-black font-semibold px-6 py-3 rounded-full text-sm transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2"
        }
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.span
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}
            >
              <Check className={compact ? "w-3.5 h-3.5" : "w-5 h-5"} />
              <span>{isRTL ? 'تم الإضافة' : 'Added!'}</span>
            </motion.span>
          ) : isAdding ? (
            <motion.span
              key="adding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}
            >
              <span className={compact ? "w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" : "w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"} />
              <span>{isRTL ? 'جاري الإضافة...' : 'Adding...'}</span>
            </motion.span>
          ) : (
            <motion.span
              key="add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}
            >
              <Plus className={compact ? "w-3.5 h-3.5" : "w-5 h-5"} />
              <span>{hasCustomizations ? (isRTL ? "اختيار التخصيصات" : "Customize") : (isRTL ? "أضف للسلة" : "Add to Cart")}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && hasCustomizations && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#111111] w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#D4AF37]/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="sticky top-0 bg-[#111111]/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg font-cairo">
                    {productName}
                  </h3>
                  <p className="text-[#D4AF37] font-semibold">
                    {getUnitPrice() * quantity} {isRTL ? 'ج.م' : 'EGP'}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {product.image_url && (
                <div className="px-6 pt-4">
                  <div className="relative h-48 rounded-2xl overflow-hidden">
                    <Image
                      src={product.image_url || '/placeholder-food.jpg'}
                      alt={productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                {customizationGroups.map((group) => {
                  const selected = selectedOptions[group.id] || [];
                  return (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-semibold font-cairo">
                          {t(group.name_ar, group.name_en, locale, group.name)}
                          {group.required && (
                            <span className="text-red-400 text-sm mr-1">*</span>
                          )}
                        </h4>
                        <span className="text-white/50 text-xs">
                          {isRTL 
                            ? (group.max_select === 1 ? "اختر واحد" : `اختر حتى ${group.max_select}`)
                            : (group.max_select === 1 ? "Choose 1" : `Choose up to ${group.max_select}`)
                          }
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.options.map((option) => {
                          const isSelected = selected.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              onClick={() =>
                                toggleOption(group.id, option.id, group.max_select)
                              }
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                                  : "border-white/10 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "border-[#D4AF37] bg-[#D4AF37]"
                                      : "border-white/30"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-black" />
                                  )}
                                </div>
                                <span className="text-white/90 text-sm">
                                  {t(option.name_ar, option.name_en, locale, option.name)}
                                </span>
                              </div>
                              {option.price_adjustment > 0 && (
                                <span className="text-[#D4AF37] text-sm font-medium">
                                  +{option.price_adjustment} {isRTL ? 'ج.م' : 'EGP'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {group.required && selected.length < group.min_select && (
                        <p className="text-red-400 text-xs">
                          {isRTL 
                            ? `مطلوب اختيار ${group.min_select} على الأقل`
                            : `Please select at least ${group.min_select}`
                          }
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-white font-semibold">{isRTL ? 'الكمية' : 'Quantity'}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold w-6 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-[#111111]/95 backdrop-blur-md p-6 border-t border-white/10">
                <button
                  onClick={handleAdd}
                  disabled={!isValid() || isAdding}
                  className="w-full bg-[#D4AF37] hover:bg-[#c49b2a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>
                    {isRTL 
                      ? `أضف للسلة — ${getUnitPrice() * quantity} ج.م`
                      : `Add to Cart — ${getUnitPrice() * quantity} EGP`
                    }
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}