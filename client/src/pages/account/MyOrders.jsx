import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { Button, EmptyState, ErrorState, Pagination, Skeleton, Tabs } from '../../components/ui';
import { StatusBadge } from '../../components/store/OrderParts';
import { formatDate, formatVND } from '../../lib/format';

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

export default function MyOrders() {
  useDocumentTitle('Đơn hàng của tôi');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useFetch(() => api.get('/me/orders', { status, page, limit: 8 }), [status, page]);
  const counts = data?.statusCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="card">
      <div className="border-b border-slate-100 p-4">
        <h1 className="mb-3 text-lg font-bold text-slate-900">Đơn hàng của tôi</h1>
        <Tabs tabs={TABS.map((t) => ({ ...t, count: t.value ? counts[t.value] || 0 : all }))} value={status} onChange={(v) => setParams(v ? { status: v } : {})} />
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !data.items.length ? (
        <EmptyState icon={Package} title="Chưa có đơn hàng nào" description="Các đơn hàng bạn đặt sẽ hiển thị ở đây." action={<Link to="/products"><Button>Mua sắm ngay</Button></Link>} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.items.map((o) => (
            <li key={o.id}>
              <Link to={`/account/orders/${o.code}`} className="block p-4 transition hover:bg-slate-50/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-mono font-bold text-slate-900">{o.code}</span>
                    <span className="ml-2 text-slate-400">{formatDate(o.createdAt, true)}</span>
                  </p>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {o.previewItems.map((it, i) => (
                      <img key={i} src={it.image} alt="" className="size-14 rounded-xl bg-slate-100 object-cover ring-2 ring-white" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm text-slate-700">{o.previewItems.map((i) => i.name).join(', ')}</p>
                    <p className="text-xs text-slate-500">{o.itemCount} sản phẩm</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Tổng tiền</p>
                    <p className="font-bold text-sale">{formatVND(o.total)}</p>
                  </div>
                  <ChevronRight className="size-5 text-slate-300" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination className="p-4" page={page} totalPages={data?.totalPages} onChange={(p) => setParams({ ...(status && { status }), page: String(p) })} />
    </div>
  );
}
