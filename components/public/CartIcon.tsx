"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";

export default function CartIcon() {
  const totalItems = useCartStore((s) => s.getTotalItems());

  return (
    <Link href="/cart" className="relative group">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
      >
        <ShoppingBag className="w-5 h-5 text-gray-700" />
      </motion.div>

      <AnimatePresence>
        {totalItems > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white"
          >
            {totalItems > 9 ? "9+" : totalItems}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}