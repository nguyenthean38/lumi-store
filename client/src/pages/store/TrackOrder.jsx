import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useFetch';
import { Button, Input } from '../../components/ui';
import { OrderItems, OrderTimeline, OrderTotals, PaymentInstructions, ShippingInfo, StatusBadge } from '../../components/store/OrderParts';
import { formatDate } from '../../lib/format';

export default function TrackOrder() {
  useDocumentTitle('Tra cứu đơn hàng');
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookup = async (c = code, p = phone) => {
    if (!c.trim() || !p.trim()) {
      setError('Vui lòng nhập mã đơn hàng và số điện thoại');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const d = await api.get('/orders/track', { code: c.trim().toUpperCase(), phone: p.trim() });
      setOrder(d.order);
      setParams({ code: d.order.code, phone: p.trim() }, { replace: true });
    } catch (e) {
      setOrder(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get('code') && params.get('phone')) lookup(params.get('code'), params.get('phone'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><PackageSearch className="size-6" /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tra cứu đơn hàng</h1>
            <p className="text-sm text-slate-500">Nhập mã đơn (VD: LM2611…) và số điện thoại đặt hàng.</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
        >
          <Input aria-label="Mã đơn hàng" placeholder="Mã đơn hàng" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} inputClassName="font-mono uppercase" />
          <Input aria-label="Số điện thoại" placeholder="Số điện thoại" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" icon={Search} loading={loading}>Tra cứu</Button>
        </form>
        {error && <p className="mt-3 text-sm font-medium text-rose-600" role="alert">{error}</p>}
      </div>

      {order && (
        <div className="card mt-6 animate-slide-up space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-lg font-bold text-slate-900">{order.code}</p>
              <p className="text-sm text-slate-500">Đặt lúc {formatDate(order.createdAt, true)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <OrderTimeline order={order} />
          <PaymentInstructions order={order} />
          <div className="grid gap-6 sm:grid-cols-2">
            <ShippingInfo order={order} />
            <OrderTotals order={order} />
          </div>
          <OrderItems items={order.items} />
        </div>
      )}
    </div>
  );
}
