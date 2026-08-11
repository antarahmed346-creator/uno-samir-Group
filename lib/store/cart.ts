import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────

export interface CartProduct {
  id: string
  name: string
  name_ar: string | null
  name_en: string | null  // ← أضفنا name_en
  price: number
  image_url: string | null
  brand_id: string
  brand_name: string
  brand_name_ar: string | null
  brand_name_en: string | null  // ← أضفنا brand_name_en
}

export interface CartCustomization {
  groupId?: string
  groupName?: string
  groupNameAr?: string | null
  optionId?: string
  optionName: string
  optionNameAr?: string | null
  price?: number
  priceAdjustment?: number
}

export interface CartItem {
  cartItemId: string
  productId: string  // ← أضفنا productId
  product: CartProduct
  customizations: CartCustomization[]
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: CartProduct, customizations: CartCustomization[], quantity: number) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  removeItem: (cartItemId: string) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

// ─── Helper ────────────────────────────────────────────────────

function generateCartItemId(productId: string, customizations: CartCustomization[]): string {
  const customizationKey = customizations
    .map((c) => `${c.groupId}-${c.optionId}`)
    .sort()
    .join('|')
  return `${productId}::${customizationKey}`
}

// ─── Store ─────────────────────────────────────────────────────

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, customizations, quantity) => {
        const cartItemId = generateCartItemId(product.id, customizations)
        const { items } = get()

        const existingIndex = items.findIndex((i) => i.cartItemId === cartItemId)

        if (existingIndex >= 0) {
          const updated = [...items]
          updated[existingIndex].quantity += quantity
          updated[existingIndex].totalPrice = updated[existingIndex].unitPrice * updated[existingIndex].quantity
          set({ items: updated })
          return
        }

        const unitPrice = product.price + customizations.reduce((sum, c) => sum + (c.priceAdjustment || 0), 0)
        const totalPrice = unitPrice * quantity

        const newItem: CartItem = {
          cartItemId,
          productId: product.id,  // ← أضفنا productId
          product,
          customizations,
          quantity,
          unitPrice,
          totalPrice,
        }

        set({ items: [...items, newItem] })
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity < 1) {
          get().removeItem(cartItemId)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity,
                  totalPrice: item.unitPrice * quantity,
                }
              : item
          ),
        }))
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0)
      },
    }),
    {
      name: 'uno-cart-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
)