import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, ShoppingCart, Zap } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Price, Skeleton, Stars } from '../ui';
import { cn } from '../../lib/format';

export function useWishlistToggle() {
  const { user, toggleWishlist } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  return async (product) => {
    if (!user) {
      toast.info('Đăng nhập để lưu sản phẩm yêu thích', { action: { label: 'Đăng nhập', onClick: () => nav('/login') } });
      return;
    }
    try {
      const liked = await toggleWishlist(product.id);
      toast.success(liked ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích');
    } catch (e) {
      toast.error(e.message);
    }
  };
}

export function useAddToCart() {
  const { add, openDrawer } = useCart();
  const toast = useToast();
  return (product, qty = 1, { silent } = {}) => {
    if (product.stock <= 0) {
      toast.error('Sản phẩm tạm hết hàng');
      return false;
    }
    add(product, qty);
    if (!silent) toast.success(`Đã thêm “${product.name}” vào giỏ`, { action: { label: 'Xem giỏ', onClick: openDrawer } });
    return true;
  };
}

export default function ProductCard({ product: p, onQuickView, className }) {
  const { wishlist } = useAuth();
  const toggleWish = useWishlistToggle();
  const addToCart = useAddToCart();
  const liked = wishlist.has(p.id);
  const out = p.stock <= 0;
  const second = p.images?.[1];

  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card', className)}>
      <Link to={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        <img src={p.image} alt={p.name} loading="lazy" className={cn('size-full object-cover transition duration-500', second && 'group-hover:opacity-0', out && 'opacity-60 grayscale')} />
        {second && <img src={second} alt="" loading="lazy" aria-hidden className="absolute inset-0 size-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          {p.discountPercent > 0 && <span className="rounded-md bg-sale px-1.5 py-0.5 text-xs font-bold text-white">-{p.discountPercent}%</span>}
          {p.isFlashSale && !out && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
              <Zap className="size-3" fill="currentColor" /> Flash
            </span>
          )}
        </div>
        {out && (
          <span className="absolute inset-x-0 bottom-3 mx-auto w-max rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">Tạm hết hàng</span>
        )}
      </Link>

      <button
        onClick={() => toggleWish(p)}
        aria-label={liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        aria-pressed={liked}
        className={cn(
          'absolute top-2.5 right-2.5 flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110',
          liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'
        )}
      >
        <Heart className="size-4.5" fill={liked ? 'currentColor' : 'none'} />
      </button>
      {onQuickView && (
        <button
          onClick={() => onQuickView(p)}
          className="absolute top-[calc(50%-1.25rem)] left-1/2 hidden -translate-x-1/2 translate-y-2 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 opacity-0 shadow-pop transition group-hover:translate-y-0 group-hover:opacity-100 hover:text-brand-600 md:inline-flex"
        >
          <Eye className="size-4" /> Xem nhanh
        </button>
      )}

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        {p.brand && <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{p.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 font-medium text-slate-800">
          <Link to={`/products/${p.slug}`} className="hover:text-brand-600">
            {p.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
          {p.ratingCount > 0 ? (
            <>
              <Stars value={p.ratingAvg} />
              <span>({p.ratingCount})</span>
            </>
          ) : (
            <span className="whitespace-nowrap text-slate-400">Chưa có đánh giá</span>
          )}
          {p.sold > 0 && <span className="ml-auto whitespace-nowrap">Đã bán {p.sold >= 1000 ? `${(p.sold / 1000).toFixed(1)}k` : p.sold}</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <Price value={p.finalPrice} original={p.price} />
          <button
            onClick={() => addToCart(p)}
            disabled={out}
            aria-label={`Thêm ${p.name} vào giỏ`}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-50 disabled:hover:text-brand-600"
          >
            <ShoppingCart className="size-4.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, count = 8, onQuickView, className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4', className)}>
      {loading && !products?.length
        ? Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products?.map((p) => <ProductCard key={p.id} product={p} onQuickView={onQuickView} />)}
    </div>
  );
}
