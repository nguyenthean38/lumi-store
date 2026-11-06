import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, MessageSquareText, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { cn, timeAgo } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, EmptyState, ErrorState, Pagination, Skeleton, Stars } from '../../components/ui';
import { FilterSelect, PageHeader, SearchBox, Thumb } from '../../components/admin/AdminUI';

export default function Reviews() {
  const toast = useToast();
  const confirm = useConfirm();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const dq = useDebounce(q, 350);
  const f = { q: sp.get('q') || '', rating: sp.get('rating') || '', visibility: sp.get('visibility') || '', page: Number(sp.get('page')) || 1 };
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

  const { data, loading, error, reload, setData } = useFetch(() => api.get('/admin/reviews', { ...f, limit: 12 }), [f.q, f.rating, f.visibility, f.page]);
  const [busy, setBusy] = useState(null);

  const toggleHidden = async (r) => {
    setBusy(r.id);
    try {
      await api.patch(`/admin/reviews/${r.id}`, { isHidden: !r.isHidden });
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === r.id ? { ...x, isHidden: !r.isHidden } : x)) }));
      toast.success(r.isHidden ? 'Đã hiển thị lại đánh giá' : 'Đã ẩn đánh giá khỏi trang sản phẩm');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r) => {
    if (!(await confirm({ title: 'Xoá đánh giá này?', message: `Đánh giá ${r.rating}★ của ${r.userName} sẽ bị xoá vĩnh viễn và điểm trung bình sản phẩm được tính lại.`, confirmText: 'Xoá', tone: 'danger' }))) return;
    try {
      await api.del(`/admin/reviews/${r.id}`);
      toast.success('Đã xoá đánh giá');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader title="Đánh giá" description={data ? `${data.total} đánh giá` : 'Kiểm duyệt đánh giá của khách hàng'} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Tìm theo nội dung, sản phẩm, khách hàng..." className="min-w-56 flex-1" />
        <FilterSelect label="Số sao" value={f.rating} onChange={(v) => setFilter('rating', v)}>
          <option value="">Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>{s} sao</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Hiển thị" value={f.visibility} onChange={(v) => setFilter('visibility', v)}>
          <option value="">Tất cả</option>
          <option value="visible">Đang hiển thị</option>
          <option value="hidden">Đã ẩn</option>
        </FilterSelect>
      </div>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && !data ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : data.items.length === 0 ? (
        <div className="card"><EmptyState icon={MessageSquareText} title="Không có đánh giá" description="Không có đánh giá nào khớp bộ lọc." /></div>
      ) : (
        <ul className={cn('space-y-3', loading && 'opacity-60')}>
          {data.items.map((r) => (
            <li key={r.id} className={cn('card flex flex-col gap-4 p-4 sm:flex-row', r.isHidden && 'bg-slate-50')}>
              <a href={`/products/${r.productSlug}`} target="_blank" rel="noreferrer" className="flex shrink-0 items-start gap-3 sm:w-64">
                <Thumb src={r.productImage} className="size-12" />
                <span className="line-clamp-2 text-sm font-semibold text-slate-700 hover:text-brand-600">{r.productName}</span>
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} size="md" />
                  <span className="text-sm font-semibold text-slate-800">{r.userName}</span>
                  <span className="text-xs text-slate-400">{r.userEmail} · {timeAgo(r.createdAt)}</span>
                  {r.isHidden && <Badge tone="slate">Đã ẩn</Badge>}
                </div>
                <p className={cn('mt-1.5 text-sm', r.comment ? 'text-slate-700' : 'text-slate-400 italic', r.isHidden && 'line-through decoration-slate-300')}>{r.comment || 'Không có nhận xét'}</p>
              </div>
              <div className="flex shrink-0 items-start gap-1.5">
                <Button size="sm" variant="secondary" icon={r.isHidden ? Eye : EyeOff} loading={busy === r.id} onClick={() => toggleHidden(r)}>
                  {r.isHidden ? 'Hiện' : 'Ẩn'}
                </Button>
                <Button size="sm" variant="danger-soft" icon={Trash2} onClick={() => remove(r)} aria-label="Xoá đánh giá" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination className="mt-5" page={data.page} totalPages={data.totalPages} onChange={(p) => setFilter('page', String(p))} />}
    </div>
  );
}
