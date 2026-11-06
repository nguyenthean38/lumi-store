import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const DEFAULTS = {
  storeName: 'Lumi Store',
  hotline: '1900 6868',
  email: 'hotro@lumistore.vn',
  address: '',
  shippingFee: 30000,
  freeShippingThreshold: 500000,
  bank: null,
  flashSaleEnd: null,
};

const SettingsContext = createContext({ settings: DEFAULTS, categories: [], reload: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [categories, setCategories] = useState([]);

  const reload = () => {
    api.get('/settings').then(setSettings).catch(() => {});
    api.get('/categories').then(setCategories).catch(() => {});
  };
  useEffect(reload, []);

  return <SettingsContext.Provider value={{ settings, categories, reload }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
