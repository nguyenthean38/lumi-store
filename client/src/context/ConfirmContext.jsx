import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '../components/ui';

const ConfirmContext = createContext(null);

/**
 * const confirm = useConfirm();
 * if (await confirm({ title: 'Xoá?', message: '...', confirmText: 'Xoá', tone: 'danger' })) { ... }
 */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((o) => {
    setOpts(o);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)} size="sm">
        {opts && (
          <div className="flex gap-4 pt-2">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                opts.tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'
              }`}
            >
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">{opts.title}</h3>
              {opts.message && <p className="mt-1.5 text-sm text-slate-600">{opts.message}</p>}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => close(false)}>
                  {opts.cancelText || 'Huỷ'}
                </Button>
                <Button variant={opts.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                  {opts.confirmText || 'Đồng ý'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
