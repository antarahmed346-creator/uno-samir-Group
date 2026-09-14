"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { localize } from "@/lib/i18n";

export default function CartIcon({ locale = 'ar' }: { locale?: string }) {
  const totalItems = useCartStore((s) => s.getTotalItems());

  return (
    <Link href={localize("/cart", locale)} className="relative group">
      <div
        className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors active:scale-95 hover:scale-105 [transition-property:background-color,transform] duration-150"
      >
        <ShoppingBag className="w-5 h-5 text-gray-700" />
      </div>

      <span
        className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white transition-transform duration-200 ${
          totalItems > 0 ? 'scale-100' : 'scale-0'
        }`}
      >
        {totalItems > 9 ? "9+" : totalItems}
      </span>
    </Link>
  );
}