import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, RotateCcw, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { Button, ErrorState, Modal, PageLoader, StarInput, Textarea } from '../../components/ui';
import { OrderItems, OrderTimeline, OrderTotals, PaymentInstructions, ShippingInfo, StatusBadge } from '../../components/store/OrderParts';
import { formatDate } from '../../lib/format';

const REASONS = ['Tôi muốn thay đổi địa chỉ giao hàng', 'Tôi muốn đổi sản phẩm khác', 'Tôi tìm được giá tốt hơn', 'Tôi không còn nhu cầu', 'Khác'];

export default function MyOrderDetail() {
  const { code } = useParams();
  useDocumentTitle(`Đơn hàng ${code}`);
  const toast = useToast();
  const cart = useCart();
  const nav = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(() => api.get(`/me/orders/${code}`), [code]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  if (loading && !data) return <PageLoader />;
  const o = data.order;

  const cancel = async () => {
    setBusy(true);
    try {
      const d = await api.post(`/me/orders/${code}/cancel`, { reason });
      setData({ order: d.order });
      setCancelOpen(false);
      toast.success('Đã huỷ đơn hàng');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reorder = async () => {
    try {
      const ids = o.items.map((i) => i.productId).filter(Boolean);
      const { items } = await api.get('/products', { ids: ids.join(','), limit: 50 });
      let added = 0;
      o.items.forEach((it) => {
        const p = items.find((x) => x.id === it.productId);
        if (p && p.stock > 0) {
          cart.add(p, Math.min(it.quantity, p.stock));
          added++;
        }
      });
      if (added) {
        toast.success(`Đã thêm ${added} sản phẩm vào giỏ`);
        nav('/cart');
      } else toast.error('Các sản phẩm trong đơn hiện đã hết hàng');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      await api.post(`/me/reviews/${review.productId}`, { rating, comment });
      toast.success('Cảm ơn bạn đã đánh giá!');
      setReview(null);
      setComment('');
      setRating(5);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ChevronLeft className="size-4" /> Đơn hàng của tôi
      </Link>
      <div className="card space-y-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-lg font-bold text-slate-900">{o.code}</h1>
            <p className="text-sm text-slate-500">Đặt lúc {formatDate(o.createdAt, true)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} />
            {o.status === 'pending' && <Button variant="danger-soft" size="sm" onClick={() => setCancelOpen(true)}>Huỷ đơn</Button>}
            {(o.status === 'delivered' || o.status === 'cancelled') && <Button variant="soft" size="sm" icon={RotateCcw} onClick={reorder}>Mua lại</Button>}
          </div>
        </div>
        <OrderTimeline order={o} />
      </div>

      <PaymentInstructions order={o} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-bold text-slate-900">Thông tin nhận hàng</h2>
          <ShippingInfo order={o} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold text-slate-900">Thanh toán</h2>
          <OrderTotals order={o} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 font-bold text-slate-900">Sản phẩm</h2>
        <OrderItems
          items={o.items}
          renderAction={(i) =>
            i.canReview ? (
              <button onClick={() => setReview(i)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
                <Star className="size-3.5" fill="currentColor" /> Viết đánh giá
              </button>
            ) : o.status === 'delivered' && i.productId ? (
              <span className="mt-1 inline-block text-xs text-emerald-600">✓ Đã đánh giá</span>
            ) : null
          }
        />
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Huỷ đơn hàng"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>Không huỷ</Button>
            <Button variant="danger" loading={busy} onClick={cancel}>Xác nhận huỷ</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">Vui lòng cho chúng tôi biết lý do bạn muốn huỷ đơn:</p>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-brand-600" /> {r}
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title="Đánh giá sản phẩm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReview(null)}>Để sau</Button>
            <Button loading={busy} onClick={submitReview}>Gửi đánh giá</Button>
          </>
        }
      >
        {review && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={review.image} alt="" className="size-14 rounded-lg bg-slate-100 object-cover" />
              <p className="text-sm font-medium text-slate-800">{review.name}</p>
            </div>
            <StarInput value={rating} onChange={setRating} />
            <Textarea label="Chia sẻ cảm nhận của bạn" optional rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Chất lượng sản phẩm, đóng gói, giao hàng…" hint={`${comment.length}/1000`} />
          </div>
        )}
      </Modal>
    </div>
  );
}
