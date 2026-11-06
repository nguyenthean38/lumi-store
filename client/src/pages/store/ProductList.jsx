import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, SearchX, SlidersHorizontal, Star, X } from 'lucide-react';
import CategoryIcon from '../../components/CategoryIcon';
import { api } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { ProductGrid } from '../../components/store/ProductCard';
import QuickView from '../../components/store/QuickView';
import { Button, Checkbox, Drawer, EmptyState, ErrorState, Pagination } from '../../components/ui';
import { cn, formatVND } from '../../lib/format';

const SORTS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'discount', label: 'Giảm giá nhiều' },
];

const PRICE_RANGES = [
  { label: 'Dưới 1 triệu', min: '', max: '1000000' },
  { label: '1 – 5 triệu', min: '1000000', max: '5000000' },
  { label: '5 – 15 triệu', min: '5000000', max: '15000000' },
  { label: '15 – 30 triệu', min: '15000000', max: '30000000' },
  { label: 'Trên 30 triệu', min: '30000000', max: '' },
];

function Filters({ params, set, brands, categories }) {
  const [min, setMin] = useState(params.get('minPrice') || '');
  const [max, setMax] = useState(params.get('maxPrice') || '');
  useEffect(() => {
    setMin(params.get('minPrice') || '');
    setMax(params.get('maxPrice') || '');
  }, [params]);
  const activeBrands = (params.get('brand') || '').split(',').filter(Boolean);
  const cat = params.get('category');
  const toggleBrand = (b) => {
    const next = activeBrands.includes(b) ? activeBrands.filter((x) => x !== b) : [...activeBrands, b];
    set({ brand: next.join(',') });
  };
  const h = 'mb-2.5 text-sm font-bold text-slate-900';

  return (
    <div className="space-y-6">
      <div>
        <p className={h}>Danh mục</p>
        <ul className="space-y-0.5">
          <li>
            <button onClick={() => set({ category: '' })} className={cn('w-full rounded-lg px-2.5 py-1.5 text-left text-sm', !cat ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              Tất cả sản phẩm
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={() => set({ category: c.slug, brand: '' })} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm', cat === c.slug ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
                <CategoryIcon icon={c.icon} className="size-4 text-slate-400" />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-slate-400">{c.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className={h}>Khoảng giá</p>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_RANGES.map((r) => {
            const on = (params.get('minPrice') || '') === r.min && (params.get('maxPrice') || '') === r.max;
            return (
              <button
                key={r.label}
                onClick={() => set(on ? { minPrice: '', maxPrice: '' } : { minPrice: r.min, maxPrice: r.max })}
                className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium', on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ minPrice: min.replace(/\D/g, ''), maxPrice: max.replace(/\D/g, '') });
          }}
        >
          <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" placeholder="Từ ₫" aria-label="Giá từ" className="input h-9 px-2.5 py-1.5 text-xs" />
          <span className="text-slate-400">–</span>
          <input value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" placeholder="Đến ₫" aria-label="Giá đến" className="input h-9 px-2.5 py-1.5 text-xs" />
          <Button type="submit" size="sm" variant="soft">Áp dụng</Button>
        </form>
      </div>

      {brands.length > 0 && (
        <div>
          <p className={h}>Thương hiệu</p>
          <div className="space-y-2">
            {brands.map((b) => (
              <Checkbox key={b.name} checked={activeBrands.includes(b.name)} onChange={() => toggleBrand(b.name)} label={<span className="flex-1">{b.name} <span className="text-xs text-slate-400">({b.count})</span></span>} className="w-full" />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className={h}>Đánh giá</p>
        <div className="space-y-1">
          {[4, 3].map((r) => (
            <button key={r} onClick={() => set({ rating: params.get('rating') === String(r) ? '' : String(r) })} className={cn('flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm', params.get('rating') === String(r) ? 'bg-amber-50 font-semibold text-amber-700' : 'text-slate-600 hover:bg-slate-100')}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('size-4', i < r ? 'text-amber-400' : 'text-slate-300')} fill="currentColor" strokeWidth={0} />
              ))}
              <span>trở lên</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className={h}>Khác</p>
        <Checkbox checked={params.get('inStock') === '1'} onChange={(v) => set({ inStock: v ? '1' : '' })} label="Chỉ hiện hàng còn" />
        <Checkbox checked={params.get('onSale') === '1'} onChange={(v) => set({ onSale: v ? '1' : '' })} label="Đang giảm giá" />
        <Checkbox checked={params.get('flash') === '1'} onChange={(v) => set({ flash: v ? '1' : '' })} label="Flash sale" />
      </div>
    </div>
  );
}

export default function ProductList() {
  const [params, setParams] = useSearchParams();
  const { categories } = useSettings();
  const [filterOpen, setFilterOpen] = useState(false);
  const [quick, setQuick] = useState(null);
  const key = params.toString();
  const { data, loading, error, reload } = useFetch(() => api.get('/products', { ...Object.fromEntries(params), limit: 12 }), [key]);

  const cat = categories.find((c) => c.slug === params.get('category'));
  const q = params.get('q');
  const title = q ? `Kết quả cho “${q}”` : cat ? cat.name : params.get('onSale') ? 'Sản phẩm khuyến mãi' : params.get('flash') ? 'Flash sale' : 'Tất cả sản phẩm';
  useDocumentTitle(title);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  // removable chips for every active filter
  const chips = [];
  if (q) chips.push({ key: 'q', label: `“${q}”` });
  if (cat) chips.push({ key: 'category', label: cat.name });
  (params.get('brand') || '').split(',').filter(Boolean).forEach((b) =>
    chips.push({ key: 'brand', label: b, patch: { brand: (params.get('brand') || '').split(',').filter((x) => x && x !== b).join(',') } })
  );
  if (params.get('minPrice') || params.get('maxPrice')) {
    const a = params.get('minPrice');
    const b = params.get('maxPrice');
    chips.push({ key: 'price', label: a && b ? `${formatVND(a)} – ${formatVND(b)}` : a ? `Từ ${formatVND(a)}` : `Dưới ${formatVND(b)}`, patch: { minPrice: '', maxPrice: '' } });
  }
  if (params.get('rating')) chips.push({ key: 'rating', label: `Từ ${params.get('rating')} sao` });
  if (params.get('inStock')) chips.push({ key: 'inStock', label: 'Còn hàng' });
  if (params.get('onSale')) chips.push({ key: 'onSale', label: 'Đang giảm giá' });
  if (params.get('flash')) chips.push({ key: 'flash', label: 'Flash sale' });
  if (params.get('featured')) chips.push({ key: 'featured', label: 'Nổi bật' });

  const filterProps = { params, set, brands: data?.brands || [], categories };

  return (
    <div className="container-page py-5">
      <nav className="mb-3 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-600">Trang chủ</Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-slate-800">{title}</span>
      </nav>

      <div className="flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto p-4">
            <Filters {...filterProps} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
              <p className="text-sm text-slate-500">{loading && !data ? 'Đang tải…' : `${data?.total ?? 0} sản phẩm`}</p>
            </div>
            <Button variant="secondary" size="sm" icon={SlidersHorizontal} className="lg:hidden" onClick={() => setFilterOpen(true)}>
              Bộ lọc {chips.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{chips.length}</span>}
            </Button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="hidden sm:inline">Sắp xếp:</span>
              <select value={params.get('sort') || 'newest'} onChange={(e) => set({ sort: e.target.value })} className="input h-9 w-auto py-1.5 pr-8 text-sm" aria-label="Sắp xếp">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c, i) => (
                <button key={`${c.key}${i}`} onClick={() => set(c.patch || { [c.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-2 pl-3 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                  {c.label} <X className="size-3.5" />
                </button>
              ))}
              <button onClick={() => setParams(params.get('sort') ? { sort: params.get('sort') } : {})} className="text-xs font-semibold text-slate-500 hover:text-rose-600">
                Xoá tất cả
              </button>
            </div>
          )}

          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !loading && data?.items?.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={SearchX}
                title="Không tìm thấy sản phẩm phù hợp"
                description="Hãy thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác (VD: “tai nghe”, “sạc”)."
                action={<Button onClick={() => setParams({})}>Xem tất cả sản phẩm</Button>}
              />
            </div>
          ) : (
            <div className={cn('transition-opacity', loading && data && 'pointer-events-none opacity-50')}>
              <ProductGrid products={data?.items} loading={loading} count={12} onQuickView={setQuick} className="lg:grid-cols-3 xl:grid-cols-4" />
            </div>
          )}

          <Pagination
            className="mt-8"
            page={data?.page || 1}
            totalPages={data?.totalPages}
            onChange={(p) => {
              set({ page: String(p) });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </div>

      <Drawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Bộ lọc"
        footer={
          <Button className="w-full" onClick={() => setFilterOpen(false)}>
            Xem {data?.total ?? 0} sản phẩm
          </Button>
        }
      >
        <div className="p-4">
          <Filters {...filterProps} />
        </div>
      </Drawer>
      <QuickView key={quick?.id} product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
