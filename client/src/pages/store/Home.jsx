import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Copy, Headphones, Sparkles, Ticket, Watch, Zap } from 'lucide-react';
import CategoryIcon from '../../components/CategoryIcon';
import { api } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import ProductCard, { ProductGrid, useAddToCart } from '../../components/store/ProductCard';
import QuickView from '../../components/store/QuickView';
import { Price, Skeleton, Tabs } from '../../components/ui';
import { cn, formatVND } from '../../lib/format';
import { getRecent } from '../../lib/recent';

function HeroCarousel({ banners }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = banners.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n, paused]);

  if (!n) return <Skeleton className="aspect-[12/5] w-full rounded-2xl" />;
  return (
    <div className="group relative overflow-hidden rounded-2xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, idx) => (
          <div key={b.id} className="relative aspect-[16/10] w-full shrink-0 sm:aspect-[12/5]" style={{ background: b.color || '#4f46e5' }} aria-hidden={idx !== i}>
            {b.image && <img src={b.image} alt="" className="absolute inset-0 size-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
            <div className="relative flex h-full max-w-[62%] flex-col justify-center p-5 text-white sm:p-10">
              <span className="mb-3 inline-flex w-max items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="size-3.5" /> Ưu đãi độc quyền
              </span>
              <h2 className="text-xl leading-tight font-extrabold sm:text-4xl">{b.title}</h2>
              {b.subtitle && <p className="mt-2 line-clamp-2 text-sm text-white/90 sm:mt-3 sm:text-base">{b.subtitle}</p>}
              {b.link && (
                <Link to={b.link} tabIndex={idx === i ? 0 : -1} className="mt-4 inline-flex w-max items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:gap-3 sm:mt-6 sm:px-5 sm:py-3">
                  {b.buttonText || 'Xem ngay'} <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button onClick={() => setI((i - 1 + n) % n)} aria-label="Banner trước" className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-800 opacity-0 shadow transition group-hover:opacity-100 sm:flex">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => setI((i + 1) % n)} aria-label="Banner sau" className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-800 opacity-0 shadow transition group-hover:opacity-100 sm:flex">
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, idx) => (
              <button key={b.id} onClick={() => setI(idx)} aria-label={`Banner ${idx + 1}`} className={cn('h-1.5 rounded-full bg-white transition-all', idx === i ? 'w-6' : 'w-1.5 opacity-60')} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function useCountdown(end) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = useMemo(() => {
    const e = end ? new Date(end).getTime() : NaN;
    if (!Number.isNaN(e) && e > Date.now()) return e;
    const d = new Date();
    d.setHours(23, 59, 59, 999); // default: flash sale ends at midnight
    return d.getTime();
  }, [end]);
  const left = Math.max(0, target - now);
  return [Math.floor(left / 3600e3), Math.floor((left % 3600e3) / 60e3), Math.floor((left % 60e3) / 1000)];
}

function FlashSale({ onQuickView }) {
  const { settings } = useSettings();
  const { data, loading } = useFetch(() => api.get('/products', { flash: 1, limit: 10, sort: 'discount' }), []);
  const [h, m, s] = useCountdown(settings.flashSaleEnd);
  const addToCart = useAddToCart();
  if (!loading && !data?.items?.length) return null;
  const box = 'flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-900 px-1.5 text-sm font-bold text-white tabular-nums';
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-5">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-white italic sm:text-2xl">
          <Zap className="size-6 text-yellow-300" fill="currentColor" /> FLASH SALE
        </h2>
        <div className="flex items-center gap-1.5" aria-label="Thời gian còn lại">
          <span className="mr-1 text-sm font-medium text-white/90">Kết thúc sau</span>
          <span className={box}>{String(h).padStart(2, '0')}</span>
          <span className="font-bold text-white">:</span>
          <span className={box}>{String(m).padStart(2, '0')}</span>
          <span className="font-bold text-white">:</span>
          <span className={box}>{String(s).padStart(2, '0')}</span>
        </div>
        <Link to="/products?flash=1" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline">
          Xem tất cả <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="scrollbar-none -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {(loading ? Array.from({ length: 5 }) : data.items).map((p, i) =>
          !p ? (
            <Skeleton key={i} className="h-72 w-44 shrink-0 rounded-xl bg-white/60 sm:w-52" />
          ) : (
            <div key={p.id} className="flex w-44 shrink-0 snap-start flex-col rounded-xl bg-white p-2.5 sm:w-52">
              <Link to={`/products/${p.slug}`} className="relative block overflow-hidden rounded-lg">
                <img src={p.image} alt={p.name} className="aspect-square w-full bg-slate-100 object-cover transition hover:scale-105" loading="lazy" />
                {p.discountPercent > 0 && <span className="absolute top-1.5 left-1.5 rounded-md bg-sale px-1.5 py-0.5 text-xs font-bold text-white">-{p.discountPercent}%</span>}
              </Link>
              <Link to={`/products/${p.slug}`} className="mt-2 line-clamp-2 min-h-10 text-sm font-medium text-slate-800 hover:text-brand-600">
                {p.name}
              </Link>
              <Price value={p.finalPrice} original={p.price} className="mt-1" />
              <SoldBar sold={p.sold} stock={p.stock} />
              <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="mt-2 h-9 rounded-lg bg-orange-50 text-sm font-semibold text-orange-600 transition hover:bg-orange-500 hover:text-white disabled:opacity-50">
                {p.stock > 0 ? 'Mua ngay' : 'Hết hàng'}
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function SoldBar({ sold, stock }) {
  const pct = sold + stock > 0 ? Math.round((sold / (sold + stock)) * 100) : 0;
  const label = stock <= 0 ? 'Đã bán hết' : stock <= 5 ? `Sắp hết – còn ${stock}` : `Đã bán ${sold}`;
  return (
    <div className="relative mt-2 h-5 overflow-hidden rounded-full bg-rose-100">
      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-400" style={{ width: `${Math.max(8, pct)}%` }} />
      <span className="relative flex h-full items-center justify-center text-[11px] font-bold text-rose-950">{label}</span>
    </div>
  );
}

function CouponStrip() {
  const { data } = useFetch(() => api.get('/coupons/public'), []);
  const toast = useToast();
  if (!data?.length) return null;
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã ${code}. Dán mã ở bước thanh toán nhé!`);
    } catch {
      toast.info(`Mã của bạn: ${code}`);
    }
  };
  const label = (c) =>
    c.type === 'freeship' ? 'Miễn phí ship' : c.type === 'percent' ? `Giảm ${c.value}%` : `Giảm ${formatVND(c.value)}`;
  return (
    <section>
      <SectionTitle icon={Ticket} title="Mã giảm giá cho bạn" />
      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        {data.slice(0, 4).map((c) => (
          <div key={c.code} className="relative flex w-72 shrink-0 overflow-hidden rounded-xl border border-dashed border-brand-300 bg-white sm:w-auto">
            <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-brand-600 p-2 text-center text-white">
              <Ticket className="size-6" />
              <span className="mt-1 text-[11px] leading-tight font-bold">{label(c)}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3">
              <div>
                <p className="font-mono text-sm font-bold text-slate-900">{c.code}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{c.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{c.minOrder ? `Đơn từ ${formatVND(c.minOrder)}` : 'Mọi đơn hàng'}</span>
                <button onClick={() => copy(c.code)} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100">
                  <Copy className="size-3" /> Sao chép
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, title, to, linkText = 'Xem tất cả' }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
        {Icon && <Icon className="size-5 text-brand-600" />} {title}
      </h2>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {linkText} <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

const TABS = [
  { value: 'best', label: 'Bán chạy' },
  { value: 'newest', label: 'Hàng mới' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'discount', label: 'Giảm sâu' },
];

export default function Home() {
  useDocumentTitle('Công nghệ cho cuộc sống');
  const { categories } = useSettings();
  const [tab, setTab] = useState('best');
  const [quick, setQuick] = useState(null);
  const banners = useFetch(() => api.get('/banners'), []);
  const featured = useFetch(() => api.get('/products', { featured: 1, limit: 8, sort: 'best' }), []);
  const tabbed = useFetch(() => api.get('/products', { sort: tab, limit: 8 }), [tab]);
  const recentIds = useMemo(() => getRecent(), []);
  const recent = useFetch(() => (recentIds.length ? api.get('/products', { ids: recentIds.join(','), limit: 12 }) : Promise.resolve({ items: [] })), []);
  const recentSorted = useMemo(() => {
    const items = recent.data?.items || [];
    return recentIds.map((id) => items.find((p) => p.id === id)).filter(Boolean).slice(0, 6);
  }, [recent.data, recentIds]);

  return (
    <div className="container-page space-y-10 py-5 sm:py-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <HeroCarousel banners={banners.data || []} />
        <div className="hidden grid-rows-2 gap-4 lg:grid">
          <Link to="/products?category=am-thanh" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 p-5 text-white">
            <p className="text-xs font-semibold uppercase opacity-90">Âm thanh đỉnh cao</p>
            <p className="mt-1 text-xl leading-tight font-extrabold">Tai nghe giảm<br />đến 30%</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">Mua ngay <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
            <Headphones className="absolute -right-3 -bottom-5 size-28 text-white/25 transition group-hover:scale-110" strokeWidth={1.25} aria-hidden />
          </Link>
          <Link to="/products?category=dong-ho-thong-minh" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
            <p className="text-xs font-semibold uppercase opacity-90">Sống khoẻ mỗi ngày</p>
            <p className="mt-1 text-xl leading-tight font-extrabold">Đồng hồ thông minh<br />chỉ từ 790K</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">Khám phá <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
            <Watch className="absolute -right-3 -bottom-5 size-28 text-white/25 transition group-hover:scale-110" strokeWidth={1.25} aria-hidden />
          </Link>
        </div>
      </div>

      <section aria-label="Danh mục nổi bật">
        <SectionTitle title="Danh mục nổi bật" to="/products" />
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
          {(categories.length ? categories : Array.from({ length: 8 })).map((c, i) =>
            c ? (
              <Link key={c.id} to={`/products?category=${c.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-card hover:ring-brand-200">
                <span className="flex size-12 items-center justify-center rounded-2xl transition group-hover:scale-110 sm:size-14" style={{ background: `${c.color}14`, color: c.color }}>
                  <CategoryIcon icon={c.icon} className="size-6 sm:size-7" />
                </span>
                <span className="line-clamp-2 text-xs font-semibold text-slate-700 sm:text-sm">{c.name}</span>
              </Link>
            ) : (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            )
          )}
        </div>
      </section>

      <FlashSale onQuickView={setQuick} />

      <CouponStrip />

      <section>
        <SectionTitle icon={Sparkles} title="Gợi ý dành cho bạn" to="/products?featured=1" />
        <ProductGrid products={featured.data?.items} loading={featured.loading} onQuickView={setQuick} />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Khám phá thêm</h2>
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
        </div>
        <div className={cn('transition-opacity', tabbed.loading && tabbed.data && 'opacity-50')}>
          <ProductGrid products={tabbed.data?.items} loading={tabbed.loading} onQuickView={setQuick} />
        </div>
        <div className="mt-6 text-center">
          <Link to={`/products?sort=${tab}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700">
            Xem thêm sản phẩm <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {recentSorted.length > 0 && (
        <section>
          <SectionTitle title="Sản phẩm bạn đã xem" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recentSorted.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <QuickView key={quick?.id} product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
