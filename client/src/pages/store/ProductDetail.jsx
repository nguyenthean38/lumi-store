import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Heart, MessageSquareText, PackageCheck, RotateCcw, Share2, ShieldCheck, Truck } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import ProductCard, { useAddToCart, useWishlistToggle } from '../../components/store/ProductCard';
import { Button, EmptyState, Pagination, Price, QuantityStepper, Skeleton, Stars } from '../../components/ui';
import { cn, formatDate, formatVND } from '../../lib/format';
import { pushRecent } from '../../lib/recent';
import NotFound from './NotFound';

function Gallery({ images, name }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(null);
  const src = images[i] || images[0];
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <div className="scrollbar-none flex gap-2 overflow-x-auto sm:w-20 sm:flex-col">
        {images.map((im, idx) => (
          <button key={im} onClick={() => setI(idx)} onMouseEnter={() => setI(idx)} aria-label={`Ảnh ${idx + 1}`} className={cn('size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 sm:size-20', idx === i ? 'border-brand-500' : 'border-transparent hover:border-slate-300')}>
            <img src={im} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
      <div
        className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-slate-100"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <img
          src={src}
          alt={name}
          className="size-full object-cover transition-transform duration-200"
          style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
    </div>
  );
}

function Reviews({ product, distribution }) {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState('');
  const { data, loading } = useFetch(() => api.get(`/products/${product.id}/reviews`, { page, rating, limit: 5 }), [product.id, page, rating]);
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-8 md:grid-cols-[260px_1fr]">
      <div>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-extrabold text-slate-900">{product.ratingAvg || 0}</span>
          <span className="pb-1.5 text-slate-500">/ 5</span>
        </div>
        <Stars value={product.ratingAvg} size="lg" className="mt-1" />
        <p className="mt-1 text-sm text-slate-500">{product.ratingCount} đánh giá</p>
        <div className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = distribution[s] || 0;
            return (
              <button key={s} onClick={() => { setRating(rating === String(s) ? '' : String(s)); setPage(1); }} className={cn('flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-sm', rating === String(s) && 'bg-amber-50')}>
                <span className="w-8 text-slate-600">{s} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
                </span>
                <span className="w-8 text-right text-xs text-slate-500">{n}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          <BadgeCheck className="mr-1 inline size-4 text-emerald-500" />
          Chỉ khách hàng đã mua và nhận hàng mới có thể đánh giá. Bạn có thể đánh giá trong mục <Link to="/account/orders" className="font-semibold text-brand-600">Đơn hàng của tôi</Link>.
        </p>
      </div>
      <div>
        {loading && !data ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={MessageSquareText} title={rating ? `Chưa có đánh giá ${rating} sao` : 'Chưa có đánh giá nào'} description="Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((r) => (
              <li key={r.id} className="flex gap-3 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{r.userName.trim().split(' ').pop()[0]}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {r.userName} <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600"><BadgeCheck className="size-3.5" /> Đã mua hàng</span>
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination className="mt-4" page={page} totalPages={data?.totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const { wishlist } = useAuth();
  const toggleWish = useWishlistToggle();
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('desc');
  const { data, loading, error } = useFetch(() => api.get(`/products/${slug}`), [slug], { keepPrevious: false });
  const p = data?.product;
  useDocumentTitle(p?.name);

  useEffect(() => {
    if (p) pushRecent(p.id);
    setQty(1);
  }, [p]);

  if (error?.status === 404) return <NotFound title="Không tìm thấy sản phẩm" />;
  if (loading || !p) {
    return (
      <div className="container-page grid gap-8 py-6 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const out = p.stock <= 0;
  const liked = wishlist.has(p.id);
  const maxQty = Math.max(1, Math.min(99, p.stock));

  const buyNow = () => {
    if (addToCart(p, qty, { silent: true })) nav('/checkout');
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.name, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Đã sao chép liên kết sản phẩm');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="container-page pt-4 pb-28 md:pb-6">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-600">Trang chủ</Link>
        <ChevronRight className="size-3.5" />
        <Link to={`/products?category=${p.categorySlug}`} className="hover:text-brand-600">{p.categoryName}</Link>
        <ChevronRight className="size-3.5" />
        <span className="line-clamp-1 font-medium text-slate-800">{p.name}</span>
      </nav>

      <div className="card grid gap-8 p-4 sm:p-6 md:grid-cols-2">
        <Gallery images={p.images.length ? p.images : ['/favicon.svg']} name={p.name} />

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link to={`/products?brand=${encodeURIComponent(p.brand)}`} className="text-xs font-bold tracking-wider text-brand-600 uppercase hover:underline">{p.brand}</Link>
              <h1 className="mt-1 text-2xl leading-tight font-bold text-slate-900 sm:text-[28px]">{p.name}</h1>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggleWish(p)} aria-pressed={liked} aria-label="Yêu thích" className={cn('rounded-xl p-2.5 hover:bg-rose-50', liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500')}>
                <Heart className="size-5" fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button onClick={share} aria-label="Chia sẻ" className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <Share2 className="size-5" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {p.ratingCount > 0 ? (
              <button onClick={() => { setTab('reviews'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-1.5 hover:text-brand-600">
                <span className="font-semibold text-slate-800">{p.ratingAvg}</span> <Stars value={p.ratingAvg} /> <span>({p.ratingCount} đánh giá)</span>
              </button>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
            <span className="text-slate-300">|</span>
            <span>Đã bán {p.sold}</span>
            <span className="text-slate-300">|</span>
            <span>SKU: {p.sku}</span>
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 p-4">
            <Price value={p.finalPrice} original={p.price} size="xl" />
            {p.discountPercent > 0 && (
              <p className="mt-1 text-sm font-semibold text-sale">
                Tiết kiệm {formatVND(p.price - p.finalPrice)} (-{p.discountPercent}%)
              </p>
            )}
          </div>

          {p.specs.length > 0 && (
            <ul className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {p.specs.slice(0, 4).map((s) => (
                <li key={s.label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="block text-xs text-slate-500">{s.label}</span>
                  <span className="font-semibold text-slate-800">{s.value}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Số lượng</span>
            <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
            <span className={cn('text-sm', out ? 'font-semibold text-rose-600' : p.stock <= 5 ? 'font-semibold text-orange-600' : 'text-slate-500')}>
              {out ? 'Tạm hết hàng' : p.stock <= 5 ? `Chỉ còn ${p.stock} sản phẩm` : `${p.stock} sản phẩm có sẵn`}
            </span>
          </div>

          <div className="mt-6 hidden gap-3 md:flex">
            <Button size="lg" variant="soft" className="flex-1" disabled={out} onClick={() => addToCart(p, qty)}>
              Thêm vào giỏ
            </Button>
            <Button size="lg" variant="accent" className="flex-1" disabled={out} onClick={buyNow}>
              Mua ngay
            </Button>
          </div>

          <ul className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-2">
            <li className="flex items-start gap-2.5"><Truck className="mt-0.5 size-4.5 shrink-0 text-brand-500" /> <span>Miễn phí giao hàng cho đơn từ <b>{formatVND(settings.freeShippingThreshold)}</b></span></li>
            <li className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-brand-500" /> <span>Bảo hành chính hãng <b>12 tháng</b></span></li>
            <li className="flex items-start gap-2.5"><RotateCcw className="mt-0.5 size-4.5 shrink-0 text-brand-500" /> <span>Đổi trả miễn phí trong <b>30 ngày</b></span></li>
            <li className="flex items-start gap-2.5"><PackageCheck className="mt-0.5 size-4.5 shrink-0 text-brand-500" /> <span>Kiểm tra hàng trước khi thanh toán</span></li>
          </ul>
        </div>
      </div>

      <div id="tabs" className="card mt-6 scroll-mt-36">
        <div className="scrollbar-none flex overflow-x-auto border-b border-slate-100 px-2" role="tablist">
          {[
            ['desc', 'Mô tả sản phẩm'],
            ['specs', 'Thông số kỹ thuật'],
            ['reviews', `Đánh giá (${p.ratingCount})`],
          ].map(([v, l]) => (
            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cn('relative shrink-0 px-4 py-3.5 text-sm font-semibold', tab === v ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800')}>
              {l}
              {tab === v && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-6">
          {tab === 'desc' && <div className="prose-desc max-w-3xl">{p.description || 'Đang cập nhật mô tả.'}</div>}
          {tab === 'specs' &&
            (p.specs.length ? (
              <table className="w-full max-w-2xl overflow-hidden rounded-xl text-sm">
                <tbody>
                  {p.specs.map((s, i) => (
                    <tr key={s.label} className={i % 2 ? 'bg-white' : 'bg-slate-50'}>
                      <th className="w-2/5 px-4 py-3 text-left font-medium text-slate-500">{s.label}</th>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500">Đang cập nhật thông số.</p>
            ))}
          {tab === 'reviews' && <Reviews product={p} distribution={data.ratingDistribution} />}
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Sản phẩm tương tự</h2>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
            {data.related.slice(0, 8).map((r) => (
              <ProductCard key={r.id} product={r} className="w-44 shrink-0 snap-start sm:w-auto" />
            ))}
          </div>
        </section>
      )}

      {/* sticky buy bar on mobile, above the bottom navigation */}
      <div className="fixed inset-x-0 bottom-14 z-30 flex gap-2 border-t border-slate-200 bg-white p-3 md:hidden">
        <Button variant="soft" className="flex-1" disabled={out} onClick={() => addToCart(p, qty)}>
          Thêm vào giỏ
        </Button>
        <Button variant="accent" className="flex-1" disabled={out} onClick={buyNow}>
          {out ? 'Hết hàng' : 'Mua ngay'}
        </Button>
      </div>
    </div>
  );
}
