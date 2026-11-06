import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ShoppingBag, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { cn, formatDate, formatVND, ORDER_STATUS } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Button, EmptyState, ErrorState, Pagination, Tabs } from '../../components/ui';
import { FilterSelect, OrderStatusBadge, PageHeader, PaymentBadge, SearchBox, TableSkeleton, TableWrap, Td, Th } from '../../components/admin/AdminUI';

const PM_SHORT = { cod: 'COD', bank: 'Chuyển khoản', ewallet: 'Ví điện tử' };

export default function Orders() {
  const toast = useToast();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const dq = useDebounce(q, 350);
  const f = {
    status: sp.get('status') || '',
    q: sp.get('q') || '',
    from: sp.get('from') || '',
    to: sp.get('to') || '',
    province: sp.get('province') || '',
    paymentMethod: sp.get('paymentMethod') || '',
    page: Number(sp.get('page')) || 1,
  };
  const setFilter = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    if (k !== 'page') n.delete('page');
    setSp(n, { replace: true });
  };
  useEffect(() => {
    if (dq !== f.q) setFilter('q', dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/admin/orders', { ...f, limit: 15 }),
    [f.status, f.q, f.from, f.to, f.province, f.paymentMethod, f.page]
  );
  const [exporting, setExporting] = useState(false);

  const counts = data?.statusCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [{ value: '', label: 'Tất cả', count: data ? all : undefined }, ...Object.entries(ORDER_STATUS).map(([k, v]) => ({ value: k, label: v.label, count: data ? counts[k] || 0 : undefined }))];
  const hasFilters = f.q || f.from || f.to || f.province || f.paymentMethod;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { page, ...filters } = f;
      await api.download('/admin/orders/export', filters, `don-hang-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Đã xuất file CSV');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Đơn hàng"
        description={data ? `${data.total} đơn phù hợp` : 'Theo dõi và xử lý đơn hàng'}
        actions={<Button variant="secondary" icon={Download} loading={exporting} onClick={exportCsv}>Xuất CSV</Button>}
      />

      <Tabs tabs={tabs} value={f.status} onChange={(v) => setFilter('status', v)} className="mb-4 rounded-xl border border-slate-200 bg-white p-1" />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Mã đơn, tên, SĐT, email..." className="min-w-56 flex-1" />
        <div className="flex items-center gap-1.5">
          <input type="date" value={f.from} max={f.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className="input w-auto" aria-label="Từ ngày" />
          <span className="text-slate-400">–</span>
          <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className="input w-auto" aria-label="Đến ngày" />
        </div>
        <FilterSelect label="Tỉnh/Thành" value={f.province} onChange={(v) => setFilter('province', v)} className="max-w-56">
          <option value="">Mọi tỉnh/thành</option>
          {(data?.provinces || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Thanh toán" value={f.paymentMethod} onChange={(v) => setFilter('paymentMethod', v)}>
          <option value="">Mọi hình thức</option>
          <option value="cod">COD</option>
          <option value="bank">Chuyển khoản</option>
          <option value="ewallet">Ví điện tử</option>
        </FilterSelect>
        {hasFilters && (
          <Button variant="ghost" icon={X} onClick={() => { setQ(''); setSp(f.status ? new URLSearchParams({ status: f.status }) : new URLSearchParams(), { replace: true }); }}>
            Xoá lọc
          </Button>
        )}
      </div>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : !loading && data?.items.length === 0 ? (
        <div className="card"><EmptyState icon={ShoppingBag} title="Không có đơn hàng" description={hasFilters || f.status ? 'Không có đơn nào khớp bộ lọc hiện tại.' : 'Đơn hàng mới sẽ xuất hiện tại đây.'} /></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Mã đơn</Th>
              <Th>Khách hàng</Th>
              <Th>Ngày đặt</Th>
              <Th className="text-center">SL</Th>
              <Th className="text-right">Tổng tiền</Th>
              <Th>Thanh toán</Th>
              <Th>Trạng thái</Th>
            </tr>
          </thead>
          {loading && !data ? (
            <TableSkeleton cols={7} />
          ) : (
            <tbody className={cn(loading && 'opacity-60')}>
              {data.items.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                  <Td>
                    <Link to={`/admin/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-brand-600 hover:underline">{o.code}</Link>
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-800">{o.customerName}</div>
                    <div className="text-xs text-slate-500">{o.phone} · {o.province.replace(/^(Thành phố|Tỉnh) /, '')}</div>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">{formatDate(o.createdAt, true)}</Td>
                  <Td className="text-center text-slate-600 tabular-nums">{o.itemCount}</Td>
                  <Td className="text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums">{formatVND(o.total)}</Td>
                  <Td>
                    <div className="text-xs text-slate-500">{PM_SHORT[o.paymentMethod]}</div>
                    <PaymentBadge status={o.paymentStatus} />
                  </Td>
                  <Td><OrderStatusBadge status={o.status} /></Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrap>
      )}
      {data && <Pagination className="mt-5" page={data.page} totalPages={data.totalPages} onChange={(p) => setFilter('page', String(p))} />}
    </div>
  );
}
