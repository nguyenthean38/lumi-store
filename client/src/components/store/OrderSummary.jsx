import { useState } from 'react';
import { Check, Loader2, Tag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/format';

export function CouponBox({ quote }) {
  const cart = useCart();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const apply = async (e) => {
    e?.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setChecking(true);
    setError('');
    try {
      const q = await api.post('/cart/quote', { items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), couponCode: c });
      if (q.couponError) setError(q.couponError);
      else {
        cart.setCoupon(c);
        setCode('');
        toast.success(`Đã áp dụng mã ${c}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  if (cart.coupon && quote?.coupon) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <Check className="size-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-emerald-800">{quote.coupon.code}</p>
          <p className="truncate text-xs text-emerald-700">{quote.coupon.description}</p>
        </div>
        <button onClick={() => cart.setCoupon('')} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Bỏ mã giảm giá">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* not a <form>: this box sits inside the checkout form */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && apply(e)}
            placeholder="Nhập mã giảm giá"
            aria-label="Mã giảm giá"
            className={`input pl-9 font-mono uppercase ${error ? 'input-error' : ''}`}
          />
        </div>
        <button type="button" onClick={apply} disabled={!code.trim() || checking} className="inline-flex h-11 items-center gap-1 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {checking && <Loader2 className="size-4 animate-spin" />} Áp dụng
        </button>
      </div>
      {(error || (cart.coupon && quote?.couponError)) && (
        <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
          {error || quote.couponError}
          {cart.coupon && quote?.couponError && (
            <button onClick={() => cart.setCoupon('')} className="ml-2 underline">Bỏ mã</button>
          )}
        </p>
      )}
    </div>
  );
}

export function Totals({ quote, loading, fallbackSubtotal }) {
  const row = 'flex items-center justify-between text-sm';
  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  return (
    <div className="space-y-2.5">
      <div className={row}>
        <span className="text-slate-600">Tạm tính</span>
        <span className="font-medium text-slate-900">{formatVND(subtotal)}</span>
      </div>
      {quote?.discount > 0 && (
        <div className={row}>
          <span className="text-slate-600">Giảm giá</span>
          <span className="font-medium text-emerald-600">-{formatVND(quote.discount)}</span>
        </div>
      )}
      <div className={row}>
        <span className="text-slate-600">Phí vận chuyển</span>
        <span className="font-medium text-slate-900">{!quote ? '—' : quote.shippingFee === 0 ? <span className="text-emerald-600">Miễn phí</span> : formatVND(quote.shippingFee)}</span>
      </div>
      <div className="flex items-end justify-between border-t border-dashed border-slate-200 pt-3">
        <span className="font-semibold text-slate-900">Tổng cộng</span>
        <span className="flex items-center gap-2 text-2xl font-extrabold text-sale">
          {loading && <Loader2 className="size-4 animate-spin text-slate-400" />}
          {formatVND(quote?.total ?? subtotal)}
        </span>
      </div>
      <p className="text-right text-xs text-slate-400">Đã bao gồm VAT (nếu có)</p>
    </div>
  );
}
