import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'lumi_cart_v1';
const MAX_QTY = 99;

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v?.items) ? v : { items: [], coupon: '' };
  } catch {
    return { items: [], coupon: '' };
  }
}

/**
 * The cart lives in localStorage so guests can shop without an account.
 * Each line keeps a snapshot (name, image, price) for instant rendering;
 * the server re-prices everything via /cart/quote before checkout.
 */
export function CartProvider({ children }) {
  const [state, setState] = useState(load);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  // keep tabs in sync
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setState(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((product, quantity = 1) => {
    setState((s) => {
      const max = Math.min(MAX_QTY, product.stock ?? MAX_QTY);
      const existing = s.items.find((i) => i.productId === product.id);
      const snapshot = {
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.finalPrice,
        originalPrice: product.price,
        stock: product.stock,
      };
      const items = existing
        ? s.items.map((i) => (i.productId === product.id ? { ...i, ...snapshot, quantity: Math.min(max, i.quantity + quantity) } : i))
        : [{ productId: product.id, quantity: Math.min(max, quantity), ...snapshot }, ...s.items];
      return { ...s, items };
    });
    setBump((b) => b + 1);
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, i.stock ?? MAX_QTY, quantity)) } : i
      ),
    }));
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  /** Removes a line and returns it so callers can offer "Hoàn tác" (undo). */
  const remove = useCallback((productId) => {
    const removed = stateRef.current.items.find((i) => i.productId === productId) || null;
    setState((s) => ({ ...s, items: s.items.filter((i) => i.productId !== productId) }));
    return removed;
  }, []);

  const restore = useCallback((line) => {
    if (!line) return;
    setState((s) => (s.items.some((i) => i.productId === line.productId) ? s : { ...s, items: [line, ...s.items] }));
  }, []);

  /** Apply server-side truth (prices/stock) to the local snapshot. */
  const syncFromQuote = useCallback((quote) => {
    setState((s) => {
      let changed = false;
      const items = s.items
        .filter((i) => {
          const q = quote.items.find((l) => l.productId === i.productId);
          if (q?.removed) {
            changed = true;
            return false;
          }
          return true;
        })
        .map((i) => {
          const q = quote.items.find((l) => l.productId === i.productId);
          if (!q || q.removed) return i;
          const next = { ...i, price: q.price, stock: q.stock, name: q.name, image: q.image, slug: q.slug };
          if (q.available && q.quantity !== i.quantity) next.quantity = Math.max(1, q.quantity);
          if (next.price !== i.price || next.stock !== i.stock || next.quantity !== i.quantity || next.name !== i.name || next.image !== i.image) changed = true;
          return next;
        });
      return changed ? { ...s, items } : s;
    });
  }, []);

  const clear = useCallback(() => setState({ items: [], coupon: '' }), []);
  const setCoupon = useCallback((coupon) => setState((s) => ({ ...s, coupon })), []);

  const count = state.items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = state.items.reduce((n, i) => n + i.price * i.quantity, 0);

  const value = useMemo(
    () => ({
      items: state.items,
      coupon: state.coupon,
      count,
      subtotal,
      add,
      setQuantity,
      remove,
      restore,
      clear,
      setCoupon,
      syncFromQuote,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      bump,
    }),
    [state, count, subtotal, add, setQuantity, remove, restore, clear, setCoupon, syncFromQuote, drawerOpen, bump]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
