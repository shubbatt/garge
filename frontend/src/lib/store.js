import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) => {
                localStorage.setItem('token', token);
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem('token');
                set({ user: null, token: null, isAuthenticated: false });
            },

            updateUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);

export const useUIStore = create((set) => ({
    sidebarOpen: true,
    sidebarCollapsed: false,

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

export const usePOSStore = create((set, get) => ({
    cart: [],
    customer: null,

    addToCart: (item) => {
        const cart = get().cart;
        const existingIndex = cart.findIndex((i) => i.inventoryItemId === item.id);

        if (existingIndex > -1) {
            const newCart = [...cart];
            newCart[existingIndex].quantity += 1;
            set({ cart: newCart });
        } else {
            set({
                cart: [
                    ...cart,
                    {
                        inventoryItemId: item.id,
                        name: item.name,
                        sku: item.sku,
                        unitPrice: item.sellingPrice,
                        quantity: 1,
                        maxStock: item.currentStock,
                        discount: 0,
                    },
                ],
            });
        }
    },

    updateQuantity: (index, quantity) => {
        const cart = get().cart;
        const newCart = [...cart];
        newCart[index].quantity = Math.max(1, Math.min(quantity, newCart[index].maxStock));
        set({ cart: newCart });
    },

    updateDiscount: (index, discount) => {
        const cart = get().cart;
        const newCart = [...cart];
        newCart[index].discount = Math.max(0, discount);
        set({ cart: newCart });
    },

    removeFromCart: (index) => {
        set({ cart: get().cart.filter((_, i) => i !== index) });
    },

    setCustomer: (customer) => set({ customer }),

    clearCart: () => set({ cart: [], customer: null }),

    getSubtotal: () => {
        return get().cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice) - item.discount, 0);
    },
}));
