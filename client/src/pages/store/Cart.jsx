import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useDocumentTitle } from '../../hooks/useFetch';
import { useQuote } from '../../hooks/useQuote';
import { Button, EmptyState, QuantityStepper } from '../../components/ui';
import FreeShipBar from '../../components/store/FreeShipBar';
import { CouponBox, Totals } from '../../components/store/OrderSummary';
import { formatVND } from '../../lib/format';

export default function Cart() {
  useDocumentTitle('Giỏ hàng');
  const cart = useCart();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const { quote, loading } = useQuote();

  if (!cart.items.length) {
    return (
      <div className="container-page py-10">
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title="Giỏ hàng của bạn đang trống"
            description="Hàng ngàn sản phẩm công nghệ đang chờ bạn khám phá. Thêm sản phẩm vào giỏ để bắt đầu mua sắm!"
            action={<Button onClick={() => nav('/products')}>Tiếp tục mua sắm</Button>}
          />
        </div>
      </div>
    );
  }

  const lineFor = (id) => quote?.items.find((l) => l.productId === id);
  const unavailable = quote?.items.filter((l) => !l.removed && !l.available) || [];

  const removeLine = (id) => {
    const line = cart.remove(id);
    toast.info('Đã xoá sản phẩm khỏi giỏ', { action: { label: 'Hoàn tác', onClick: () => cart.restore(line) } });
  };

  return (
    <div className="container-page py-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Giỏ hàng <span className="text-base font-medium text-slate-500">({cart.count} sản phẩm)</span></h1>
        <button
          onClick={async () => {
            if (await confirm({ title: 'Xoá toàn bộ giỏ hàng?', message: 'Tất cả sản phẩm sẽ bị xoá khỏi giỏ.', confirmText: 'Xoá tất cả', tone: 'danger' })) cart.clear();
          }}
          className="text-sm font-medium text-slate-500 hover:text-rose-600"
        >
          Xoá tất cả
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <FreeShipBar subtotal={quote?.subtotal ?? cart.subtotal} />
          {unavailable.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>Một số sản phẩm đã hết hàng và sẽ không được tính vào đơn. Vui lòng xoá để tiếp tục thanh toán.</p>
            </div>
          )}
          <ul className="card divide-y divide-slate-100">
            {cart.items.map((i) => {
              const l = lineFor(i.productId);
              const out = l && !l.available;
              return (
                <li key={i.productId} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <Link to={`/products/${i.slug}`} className="shrink-0">
                    <img src={i.image} alt={i.name} className={`size-20 rounded-xl bg-slate-100 object-cover sm:size-24 ${out ? 'opacity-50 grayscale' : ''}`} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <Link to={`/products/${i.slug}`} className="line-clamp-2 flex-1 font-medium text-slate-800 hover:text-brand-600">{i.name}</Link>
                        <button onClick={() => removeLine(i.productId)} className="-mt-1 -mr-1 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:hidden" aria-label={`Xoá ${i.name}`}>
                          <Trash2 className="size-4.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm">
                        <span className="font-semibold text-slate-900">{formatVND(i.price)}</span>
                        {i.originalPrice > i.price && <span className="ml-2 text-xs text-slate-400 line-through">{formatVND(i.originalPrice)}</span>}
                      </p>
                      {out ? (
                        <p className="mt-1 text-xs font-semibold text-rose-600">Đã hết hàng</p>
                      ) : i.stock != null && i.stock <= 5 ? (
                        <p className="mt-1 text-xs font-medium text-orange-600">Chỉ còn {i.stock} sản phẩm</p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-4">
                      <QuantityStepper size="sm" value={i.quantity} max={Math.max(1, Math.min(99, i.stock ?? 99))} onChange={(v) => cart.setQuantity(i.productId, v)} />
                      <p className="text-right font-bold whitespace-nowrap text-slate-900 sm:w-28">{formatVND(i.price * i.quantity)}</p>
                      <button onClick={() => removeLine(i.productId)} className="hidden rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:inline-flex" aria-label={`Xoá ${i.name}`}>
                        <Trash2 className="size-4.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
            <ArrowLeft className="size-4" /> Tiếp tục mua sắm
          </Link>
        </div>

        <aside className="card sticky top-36 space-y-4 p-5">
          <h2 className="text-lg font-bold text-slate-900">Tóm tắt đơn hàng</h2>
          <CouponBox quote={quote} />
          <Totals quote={quote} loading={loading} fallbackSubtotal={cart.subtotal} />
          <Button size="lg" className="w-full" disabled={unavailable.length > 0} onClick={() => nav('/checkout')}>
            Tiến hành thanh toán
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-emerald-500" /> Thanh toán an toàn & bảo mật
          </p>
        </aside>
      </div>
    </div>
  );
}
