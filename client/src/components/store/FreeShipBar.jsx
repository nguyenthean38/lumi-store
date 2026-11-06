import { Truck } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { formatVND } from '../../lib/format';

/** Progress toward free shipping – a gentle nudge that reduces surprise shipping costs. */
export default function FreeShipBar({ subtotal, className = '' }) {
  const { settings } = useSettings();
  const threshold = settings.freeShippingThreshold || 0;
  if (!threshold) return null;
  const left = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, (subtotal / threshold) * 100);
  return (
    <div className={`rounded-xl bg-emerald-50 p-3 ${className}`}>
      <p className="flex items-center gap-2 text-sm text-emerald-800">
        <Truck className="size-4 shrink-0" />
        {left > 0 ? (
          <span>
            Mua thêm <b>{formatVND(left)}</b> để được <b>miễn phí vận chuyển</b>
          </span>
        ) : (
          <span className="font-semibold">Tuyệt! Đơn hàng của bạn được miễn phí vận chuyển.</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
