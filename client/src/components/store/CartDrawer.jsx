import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { Button, Drawer, EmptyState, QuantityStepper } from '../ui';
import FreeShipBar from './FreeShipBar';
import { formatVND } from '../../lib/format';

export default function CartDrawer() {
  const cart = useCart();
  const toast = useToast();
  const nav = useNavigate();

  const go = (path) => {
    cart.closeDrawer();
    nav(path);
  };

  const removeLine = (id) => {
    const line = cart.remove(id);
    toast.info('Đã xoá sản phẩm khỏi giỏ', { action: { label: 'Hoàn tác', onClick: () => cart.restore(line) } });
  };

  return (
    <Drawer
      open={cart.drawerOpen}
      onClose={cart.closeDrawer}
      title={`Giỏ hàng (${cart.count})`}
      footer={
        cart.items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-600">Tạm tính</span>
              <span className="text-xl font-bold text-slate-900">{formatVND(cart.subtotal)}</span>
            </div>
            <p className="text-xs text-slate-500">Phí vận chuyển và mã giảm giá được tính ở bước tiếp theo.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => go('/cart')}>
                Xem giỏ hàng
              </Button>
              <Button onClick={() => go('/checkout')}>Thanh toán</Button>
            </div>
          </div>
        )
      }
    >
      {cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Giỏ hàng đang trống"
          description="Khám phá hàng ngàn sản phẩm công nghệ chính hãng với giá tốt."
          action={<Button onClick={() => go('/products')}>Mua sắm ngay</Button>}
        />
      ) : (
        <div className="p-4">
          <FreeShipBar subtotal={cart.subtotal} className="mb-4" />
          <ul className="divide-y divide-slate-100">
            {cart.items.map((i) => (
              <li key={i.productId} className="flex gap-3 py-3">
                <Link to={`/products/${i.slug}`} onClick={cart.closeDrawer} className="shrink-0">
                  <img src={i.image} alt={i.name} className="size-20 rounded-xl bg-slate-100 object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${i.slug}`} onClick={cart.closeDrawer} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-brand-600">
                    {i.name}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-sale">{formatVND(i.price)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper size="sm" value={i.quantity} max={Math.max(1, Math.min(99, i.stock ?? 99))} onChange={(v) => cart.setQuantity(i.productId, v)} />
                    <button onClick={() => removeLine(i.productId)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xoá ${i.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}
