import { create } from 'zustand';
import { useCatalogoEquiposStore } from './catalogoEquiposStore';

interface CartItem {
  id: string;
  qty: number;
}

interface CartState {
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
}

// Lee el ítem desde el catálogo real (tabla catalogo_equipos), no de un mock.
const findCatalogItem = (id: string) =>
  useCatalogoEquiposStore.getState().items.find((i) => i.id === id);

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  cartOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),

  addToCart: (id) => set((state) => {
    const item = findCatalogItem(id);
    if (!item || item.stock <= 0) return state;

    const existing = state.cart.find(c => c.id === id);
    if (existing) {
      if (existing.qty < item.stock) {
        return {
          cart: state.cart.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c),
          cartOpen: true,
        };
      }
      return state;
    }
    return { cart: [...state.cart, { id, qty: 1 }], cartOpen: true };
  }),

  updateQty: (id, delta) => set((state) => {
    const item = findCatalogItem(id);
    const maxStock = item?.stock ?? Infinity;

    const newCart = state.cart.map(c => {
      if (c.id === id) {
        const newQty = c.qty + delta;
        if (newQty <= 0) return { ...c, qty: 0 };
        if (newQty > maxStock) return { ...c, qty: maxStock };
        return { ...c, qty: newQty };
      }
      return c;
    }).filter(c => c.qty > 0);

    return { cart: newCart };
  }),

  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter(c => c.id !== id)
  })),

  clearCart: () => set({ cart: [] }),

  cartTotal: () => get().cart.reduce((sum, item) => sum + item.qty, 0)
}));
