"use client"

import { useOrderNotifications } from "../../lib/hooks/useOrderNotifications"
import { Bell } from "lucide-react"

interface OrderNotificationProps {
  brandId?: string | null
}

export default function OrderNotification({ brandId }: OrderNotificationProps) {
  const { newCount, resetCount } = useOrderNotifications(brandId || undefined)

  return (
    <button
      onClick={resetCount}
      className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label={newCount > 0 ? `طلبات جديدة: ${newCount}` : "لا توجد طلبات جديدة"}
    >
      <Bell className="w-5 h-5 text-gray-600" />
      {newCount > 0 && (
        <span className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {newCount > 9 ? "9+" : newCount}
        </span>
      )}
    </button>
  )
}