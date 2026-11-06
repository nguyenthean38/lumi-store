import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Package, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { cn, formatVND } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, EmptyState, ErrorState, Pagination, Switch } from '../../components/ui';
import { FilterSelect, PageHeader, SearchBox, TableSkeleton, TableWrap, Td, Th, Thumb } from '../../components/admin/AdminUI';

function StockCell({ product, onSaved }) {
  const toast = useToast();
  const [val, setVal] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(String(product.stock)), [product.stock]);

  const commit = async () => {
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error('Tồn kho phải là số không âm');
      setVal(String(product.stock));
      return;
    }
    if (n === product.stock) return;
    setSaving(true);
    try {
      const p = await api.patch(`/admin/products/${product.id}`, { stock: n });
      onSaved(p);
      toast.success(`Đã cập nhật tồn kho "${product.name}" → ${n}`);
    } catch (e) {
      toast.error(e.message);
      setVal(String(product.stock));
    } finally {
      setSaving(false);
    }
  };

  const tone = product.stock === 0 ? 'border-rose-300 bg-rose-50 text-rose-700' : product.stock <= 5 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200';
  return (
    <input
      value={val}
      inputMode="numeric"
      disabled={saving}
      aria-label={`Tồn kho ${product.name}`}
      title="Sửa trực tiếp, nhấn Enter để lưu"
      onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setVal(String(product.stock));
          e.currentTarget.blur();
        }
      }}
      className={cn('h-9 w-20 rounded-lg border px-2 text-center text-sm font-semibold tabular-nums focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none disabled:opacity-50', tone)}
    />
  );
}

export default function Products() {
  const toast = useToast();
  const confirm = useConfirm();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const dq = useDebounce(q, 350);
  const filters = {
    q: sp.get('q') || '',
    categoryId: sp.get('categoryId') || '',
    status: sp.get('status') || '',
    sort: sp.get('sort') || 'newest',
    page: Number(sp.get('page')) || 1,
  };
  const setFilter = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    if (k !== 'page') n.delete('page');
    setSp(n, { replace: true });
  };
  useEffect(() => {
    if (dq !== filters.q) setFilter('q', dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const { data: categories } = useFetch(() => api.get('/admin/categories'), []);
  const { data, loading, error, reload, setData } = useFetch(
    () => api.get('/admin/products', { ...filters, limit: 15 }),
    [filters.q, filters.categoryId, filters.status, filters.sort, filters.page]
  );
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(null);
  useEffect(() => setSelected(new Set()), [data?.page, filters.q, filters.categoryId, filters.status]);

  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every((p) => selected.has(p.id));
  const replaceItem = (p) => setData((d) => ({ ...d, items: d.items.map((x) => (x.id === p.id ? p : x)) }));

  const toggle = async (p, field) => {
    const key = `${p.id}-${field}`;
    setBusy(key);
    try {
      const updated = await api.patch(`/admin/products/${p.id}`, { [field]: !p[field] });
      replaceItem(updated);
      toast.success(field === 'isActive' ? (updated.isActive ? 'Đã hiển thị sản phẩm' : 'Đã ẩn sản phẩm') : updated.isFeatured ? 'Đã đánh dấu nổi bật' : 'Đã bỏ nổi bật');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p) => {
    const ok = await confirm({
      title: `Xoá "${p.name}"?`,
      message: p.sold > 0 ? 'Sản phẩm đã có đơn hàng nên sẽ được chuyển sang trạng thái ẩn để giữ lịch sử đơn.' : 'Sản phẩm chưa từng được bán. Hành động này không thể hoàn tác.',
      confirmText: p.sold > 0 ? 'Ẩn sản phẩm' : 'Xoá vĩnh viễn',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const r = await api.del(`/admin/products/${p.id}`);
      toast.success(r.message);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const bulk = async (action) => {
    const ids = [...selected];
    const labels = { activate: 'hiển thị', deactivate: 'ẩn', feature: 'đánh dấu nổi bật', unfeature: 'bỏ nổi bật', delete: 'xoá' };
    const ok = await confirm({
      title: `${labels[action][0].toUpperCase()}${labels[action].slice(1)} ${ids.length} sản phẩm?`,
      message: action === 'delete' ? 'Sản phẩm đã có đơn hàng sẽ được ẩn thay vì xoá. Sản phẩm chưa bán sẽ bị xoá vĩnh viễn.' : undefined,
      confirmText: 'Xác nhận',
      tone: action === 'delete' ? 'danger' : undefined,
    });
    if (!ok) return;
    setBusy('bulk');
    try {
      const r = await api.post('/admin/products/bulk', { ids, action });
      toast.success(action === 'delete' ? `Đã xoá ${r.deleted}, ẩn ${r.hidden} sản phẩm` : `Đã ${labels[action]} ${ids.length} sản phẩm`);
      setSelected(new Set());
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const hasFilters = filters.q || filters.categoryId || filters.status;
  const catOptions = useMemo(() => categories || [], [categories]);

  return (
    <div>
      <PageHeader
        title="Sản phẩm"
        description={data ? `${data.total} sản phẩm` : 'Quản lý danh sách sản phẩm, giá và tồn kho'}
        actions={
          <Link to="/admin/products/new">
            <Button icon={Plus}>Thêm sản phẩm</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên, SKU, thương hiệu..." className="min-w-56 flex-1" />
        <FilterSelect label="Danh mục" value={filters.categoryId} onChange={(v) => setFilter('categoryId', v)}>
          <option value="">Tất cả danh mục</option>
          {catOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Trạng thái" value={filters.status} onChange={(v) => setFilter('status', v)}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Đang ẩn</option>
          <option value="low">Sắp hết hàng</option>
          <option value="out">Hết hàng</option>
        </FilterSelect>
        <FilterSelect label="Sắp xếp" value={filters.sort} onChange={(v) => setFilter('sort', v)}>
          <option value="newest">Mới nhất</option>
          <option value="name">Tên A → Z</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="stock_asc">Tồn kho ít nhất</option>
          <option value="sold">Bán chạy nhất</option>
        </FilterSelect>
        {hasFilters && (
          <Button
            variant="ghost"
            icon={X}
            onClick={() => {
              setQ('');
              setSp(new URLSearchParams(), { replace: true });
            }}
          >
            Xoá lọc
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 shadow-sm">
          <span className="mr-2 text-sm font-semibold text-brand-800">Đã chọn {selected.size}</span>
          <Button size="sm" variant="secondary" icon={Eye} onClick={() => bulk('activate')} disabled={busy === 'bulk'}>Hiển thị</Button>
          <Button size="sm" variant="secondary" icon={EyeOff} onClick={() => bulk('deactivate')} disabled={busy === 'bulk'}>Ẩn</Button>
          <Button size="sm" variant="secondary" icon={Star} onClick={() => bulk('feature')} disabled={busy === 'bulk'}>Nổi bật</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk('unfeature')} disabled={busy === 'bulk'}>Bỏ nổi bật</Button>
          <Button size="sm" variant="danger-soft" icon={Trash2} onClick={() => bulk('delete')} disabled={busy === 'bulk'}>Xoá</Button>
          <button className="ml-auto text-sm font-medium text-slate-500 hover:text-slate-700" onClick={() => setSelected(new Set())}>
            Bỏ chọn
          </button>
        </div>
      )}

      {error ? (
        <div className="card">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : !loading && items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title={hasFilters ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
            description={hasFilters ? 'Thử đổi từ khoá hoặc bộ lọc.' : 'Bắt đầu bằng cách thêm sản phẩm đầu tiên.'}
            action={!hasFilters && <Link to="/admin/products/new"><Button icon={Plus}>Thêm sản phẩm</Button></Link>}
          />
        </div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  className="size-4 accent-brand-600"
                  checked={allChecked}
                  onChange={(e) => setSelected(e.target.checked ? new Set(items.map((p) => p.id)) : new Set())}
                />
              </Th>
              <Th>Sản phẩm</Th>
              <Th>Danh mục</Th>
              <Th className="text-right">Giá bán</Th>
              <Th className="text-center">Tồn kho</Th>
              <Th className="text-right">Đã bán</Th>
              <Th className="text-center">Hiển thị</Th>
              <Th className="text-center">Nổi bật</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          {loading && !data ? (
            <TableSkeleton cols={9} />
          ) : (
            <tbody className={cn(loading && 'opacity-60 transition-opacity')}>
              {items.map((p) => (
                <tr key={p.id} className={cn('hover:bg-slate-50/70', selected.has(p.id) && 'bg-brand-50/40')}>
                  <Td>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${p.name}`}
                      className="size-4 accent-brand-600"
                      checked={selected.has(p.id)}
                      onChange={(e) =>
                        setSelected((s) => {
                          const n = new Set(s);
                          e.target.checked ? n.add(p.id) : n.delete(p.id);
                          return n;
                        })
                      }
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Thumb src={p.image} />
                      <div className="min-w-0">
                        <Link to={`/admin/products/${p.id}`} className="line-clamp-1 font-semibold text-slate-800 hover:text-brand-600">
                          {p.name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span>{p.sku || '—'}</span>
                          {p.brand && <span>· {p.brand}</span>}
                          {p.isFlashSale && <Badge tone="orange" className="px-1.5! py-0! text-[10px]">Flash sale</Badge>}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">{p.categoryName || '—'}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <div className="font-semibold text-slate-900 tabular-nums">{formatVND(p.finalPrice)}</div>
                    {p.discountPercent > 0 && (
                      <div className="text-xs text-slate-400 tabular-nums">
                        <span className="line-through">{formatVND(p.price)}</span> <span className="font-semibold text-rose-600">-{p.discountPercent}%</span>
                      </div>
                    )}
                  </Td>
                  <Td className="text-center">
                    <StockCell product={p} onSaved={replaceItem} />
                  </Td>
                  <Td className="text-right text-slate-600 tabular-nums">{p.sold.toLocaleString('vi-VN')}</Td>
                  <Td className="text-center">
                    <div className="inline-flex">
                      <Switch checked={p.isActive} disabled={busy === `${p.id}-isActive`} onChange={() => toggle(p, 'isActive')} />
                    </div>
                  </Td>
                  <Td className="text-center">
                    <button
                      onClick={() => toggle(p, 'isFeatured')}
                      disabled={busy === `${p.id}-isFeatured`}
                      className={cn('rounded-lg p-1.5 transition', p.isFeatured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500')}
                      aria-label={p.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                      title={p.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                    >
                      <Star className="size-5" fill={p.isFeatured ? 'currentColor' : 'none'} />
                    </button>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <Link to={`/admin/products/${p.id}`} className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600" title="Sửa" aria-label={`Sửa ${p.name}`}>
                      <Pencil className="size-4" />
                    </Link>
                    <button onClick={() => remove(p)} className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Xoá" aria-label={`Xoá ${p.name}`}>
                      <Trash2 className="size-4" />
                    </button>
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
