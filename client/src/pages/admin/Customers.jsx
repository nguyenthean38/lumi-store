import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Unlock, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { cn, formatDate, formatVND, timeAgo } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, EmptyState, ErrorState, Pagination } from '../../components/ui';
import { FilterSelect, PageHeader, SearchBox, TableSkeleton, TableWrap, Td, Th } from '../../components/admin/AdminUI';
import { Avatar, toggleLock } from '../../components/admin/customer';

export default function Customers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const dq = useDebounce(q, 350);
  const f = { q: sp.get('q') || '', status: sp.get('status') || '', sort: sp.get('sort') || 'newest', page: Number(sp.get('page')) || 1 };
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

  const { data, loading, error, reload, setData } = useFetch(() => api.get('/admin/customers', { ...f, limit: 15 }), [f.q, f.status, f.sort, f.page]);

  const lock = async (c) => {
    const updated = await toggleLock(c, { confirm, toast });
    if (updated) setData((d) => ({ ...d, items: d.items.map((x) => (x.id === c.id ? { ...x, status: updated.status } : x)) }));
  };

  return (
    <div>
      <PageHeader title="Khách hàng" description={data ? `${data.total} khách hàng` : 'Quản lý tài khoản khách hàng'} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên, email, số điện thoại..." className="min-w-56 flex-1" />
        <FilterSelect label="Trạng thái" value={f.status} onChange={(v) => setFilter('status', v)}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đã khoá</option>
        </FilterSelect>
        <FilterSelect label="Sắp xếp" value={f.sort} onChange={(v) => setFilter('sort', v)}>
          <option value="newest">Mới đăng ký</option>
          <option value="spent">Chi tiêu nhiều nhất</option>
          <option value="orders">Nhiều đơn nhất</option>
          <option value="name">Tên A → Z</option>
        </FilterSelect>
      </div>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : !loading && data?.items.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="Không tìm thấy khách hàng" description="Thử từ khoá khác hoặc bỏ bộ lọc." /></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Khách hàng</Th>
              <Th className="text-center">Đơn hàng</Th>
              <Th className="text-right">Đã chi tiêu</Th>
              <Th>Đơn gần nhất</Th>
              <Th>Ngày đăng ký</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          {loading && !data ? (
            <TableSkeleton cols={7} />
          ) : (
            <tbody className={cn(loading && 'opacity-60')}>
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td>
                    <Link to={`/admin/customers/${c.id}`} className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <span className="max-w-60 min-w-0">
                        <span className="block truncate font-semibold text-slate-800 hover:text-brand-600">{c.name}</span>
                        <span className="block truncate text-xs text-slate-500">{c.email}</span>
                        {c.phone && <span className="block text-xs text-slate-400 tabular-nums">{c.phone}</span>}
                      </span>
                    </Link>
                  </Td>
                  <Td className="text-center tabular-nums">{c.orderCount}</Td>
                  <Td className="text-right font-semibold whitespace-nowrap tabular-nums">{formatVND(c.spent)}</Td>
                  <Td className="whitespace-nowrap text-slate-500">{c.lastOrderAt ? timeAgo(c.lastOrderAt) : '—'}</Td>
                  <Td className="whitespace-nowrap text-slate-500">{formatDate(c.createdAt)}</Td>
                  <Td>{c.status === 'active' ? <Badge tone="emerald" dot>Hoạt động</Badge> : <Badge tone="rose" dot>Đã khoá</Badge>}</Td>
                  <Td className="text-right">
                    <Button size="xs" variant={c.status === 'active' ? 'ghost' : 'soft'} icon={c.status === 'active' ? Lock : Unlock} onClick={() => lock(c)}>
                      {c.status === 'active' ? 'Khoá' : 'Mở khoá'}
                    </Button>
                  </Td>
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
