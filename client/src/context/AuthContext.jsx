import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [wishlist, setWishlist] = useState(() => new Set());

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setWishlist(new Set());
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api
      .get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, [logout]);

  useEffect(() => {
    if (user?.role === 'customer') {
      api.get('/me/wishlist/ids').then((ids) => setWishlist(new Set(ids))).catch(() => {});
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (payload) => {
    const d = await api.post('/auth/register', payload);
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  /** Returns the new state (true = liked). Throws if not logged in. */
  const toggleWishlist = useCallback(
    async (productId) => {
      const liked = wishlist.has(productId);
      setWishlist((s) => {
        const n = new Set(s);
        liked ? n.delete(productId) : n.add(productId);
        return n;
      });
      try {
        if (liked) await api.del(`/me/wishlist/${productId}`);
        else await api.post(`/me/wishlist/${productId}`);
        return !liked;
      } catch (e) {
        setWishlist((s) => {
          const n = new Set(s);
          liked ? n.add(productId) : n.delete(productId);
          return n;
        });
        throw e;
      }
    },
    [wishlist]
  );

  const value = useMemo(
    () => ({ user, setUser, ready, login, register, logout, wishlist, toggleWishlist, isAdmin: user?.role === 'admin' }),
    [user, ready, login, register, logout, wishlist, toggleWishlist]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
