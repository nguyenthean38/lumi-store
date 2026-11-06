import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

/** Re-price the local cart on the server (stock, sale price, coupon, shipping). */
export function useQuote() {
  const cart = useCart();
  const toast = useToast();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const shownWarnings = useRef(new Set());
  const key = JSON.stringify([cart.items.map((i) => [i.productId, i.quantity]), cart.coupon]);

  useEffect(() => {
    if (!cart.items.length) {
      setQuote(null);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .post('/cart/quote', { items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), couponCode: cart.coupon || null })
        .then((q) => {
          if (!alive) return;
          setQuote(q);
          cart.syncFromQuote(q);
          q.warnings.forEach((w) => {
            if (!shownWarnings.current.has(w.message)) {
              shownWarnings.current.add(w.message);
              toast.info(w.message);
            }
          });
        })
        .catch((e) => alive && toast.error(e.message))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading };
}
