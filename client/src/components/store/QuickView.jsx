import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck, Truck } from 'lucide-react';
import { Button, Modal, Price, QuantityStepper, Stars } from '../ui';
import { useAddToCart } from './ProductCard';
import { cn } from '../../lib/format';

export default function QuickView({ product: p, onClose }) {
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const addToCart = useAddToCart();
  if (!p) return null;
  const out = p.stock <= 0;

  return (
    <Modal open={!!p} onClose={onClose} size="xl" title="Xem nhanh">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <img src={p.images?.[img] || p.image} alt={p.name} className="aspect-square w-full rounded-xl bg-slate-100 object-cover" />
          <div className="mt-3 flex gap-2">
            {p.images?.map((src, i) => (
              <button key={src} onClick={() => setImg(i)} className={cn('size-16 overflow-hidden rounded-lg border-2', i === img ? 'border-brand-500' : 'border-transparent')}>
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{p.brand}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{p.name}</h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Stars value={p.ratingAvg} /> <span>{p.ratingCount} đánh giá</span> · <span>Đã bán {p.sold}</span>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <Price value={p.finalPrice} original={p.price} size="lg" />
            {p.discountPercent > 0 && <p className="mt-1 text-sm font-medium text-sale">Tiết kiệm {p.discountPercent}%</p>}
          </div>
          {p.shortDesc && <p className="mt-4 text-sm text-slate-600">{p.shortDesc}</p>}
          <div className="mt-5 flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(99, p.stock))} />
            <span className={cn('text-sm', out ? 'text-rose-600' : p.stock <= 5 ? 'text-orange-600' : 'text-slate-500')}>
              {out ? 'Tạm hết hàng' : p.stock <= 5 ? `Chỉ còn ${p.stock} sản phẩm` : `Còn ${p.stock} sản phẩm`}
            </span>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              size="lg"
              className="flex-1"
              disabled={out}
              onClick={() => {
                if (addToCart(p, qty)) onClose();
              }}
            >
              Thêm vào giỏ
            </Button>
            <Link to={`/products/${p.slug}`} onClick={onClose} className="inline-flex h-12 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Chi tiết
            </Link>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-500" /> Hàng chính hãng, bảo hành 12 tháng</li>
            <li className="flex items-center gap-2"><Truck className="size-4 text-emerald-500" /> Giao nhanh 2h nội thành</li>
            <li className="flex items-center gap-2"><Check className="size-4 text-emerald-500" /> Đổi trả miễn phí 30 ngày</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
