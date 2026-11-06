import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, PackageCheck, Phone, Printer, Truck, User, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { cn, formatDate, formatVND, ORDER_STATUS, PAYMENT_METHOD } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Button, ErrorState, Modal, PageLoader, Textarea } from '../../components/ui';
import { OrderStatusBadge, Panel, PaymentBadge, Thumb } from '../../components/admin/AdminUI';

const ACTIONS = {
  confirmed: { label: 'Xác nhận đơn', icon: CheckCircle2, variant: 'primary', question: 'Xác nhận đơn hàng này?', message: 'Khách hàng sẽ thấy đơn chuyển sang “Đã xác nhận”.' },
  shipping: { label: 'Giao cho vận chuyển', icon: Truck, variant: 'primary', question: 'Chuyển đơn sang “Đang giao”?', message: 'Xác nhận hàng đã được bàn giao cho đơn vị vận chuyển.' },
  delivered: { label: 'Đã giao thành công', icon: PackageCheck, variant: 'primary', question: 'Xác nhận đã giao hàng thành công?', message: 'Đơn COD sẽ tự động chuyển sang “Đã thanh toán”. Không thể hoàn tác.' },
  cancelled: { label: 'Huỷ đơn', icon: XCircle, variant: 'danger-soft' },
};
const CANCEL_REASONS = ['Khách yêu cầu huỷ', 'Không liên lạc được khách', 'Hết hàng', 'Giao hàng thất bại', 'Nghi ngờ đơn ảo'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const outlet = useOutletContext();
  const { data, loading, error, reload, setData } = useFetch(() => api.get(`/admin/orders/${id}`), [id]);
  const [busy, setBusy] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const o = data.order;

  const changeStatus = async (status, note) => {
    setBusy(status);
    try {
      const r = await api.patch(`/admin/orders/${o.id}/status`, { status, note });
      setData({ order: { ...o, ...r.order } });
      toast.success(`Đơn ${o.code}: ${ORDER_STATUS[status].label}`);
      outlet?.refreshBadge?.();
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const act = async (status) => {
    if (status === 'cancelled') {
      setReason('');
      setCancelOpen(true);
      return;
    }
    const a = ACTIONS[status];
    if (await confirm({ title: a.question, message: a.message, confirmText: a.label })) changeStatus(status);
  };

  const setPayment = async (paymentStatus) => {
    if (paymentStatus === o.paymentStatus) return;
    setBusy('payment');
    try {
      const r = await api.patch(`/admin/orders/${o.id}/payment`, { paymentStatus });
      setData({ order: { ...o, ...r.order } });
      toast.success('Đã cập nhật trạng thái thanh toán');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const steps = ['pending', 'confirmed', 'shipping', 'delivered'];
  const reachedIdx = o.status === 'cancelled' ? -1 : steps.indexOf(o.status);

  return (
    <div>
      <style>{`@media print { @page { margin: 14mm } body { background: #fff } .no-print { display: none !important } .card { box-shadow: none !important } }`}</style>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="no-print rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Quay lại">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Đơn #{o.code}</h1>
              <OrderStatusBadge status={o.status} />
              <PaymentBadge status={o.paymentStatus} />
            </div>
            <p className="text-sm text-slate-500">Đặt lúc {formatDate(o.createdAt, true)}</p>
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>In đơn</Button>
          {o.allowedTransitions?.map((s) => {
            const a = ACTIONS[s];
            return (
              <Button key={s} variant={a.variant} icon={a.icon} loading={busy === s} disabled={!!busy} onClick={() => act(s)}>
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>

      {o.status !== 'cancelled' ? (
        <div className="no-print card mb-5 p-5">
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : i <= reachedIdx ? 'bg-brand-500' : 'bg-slate-200')} />
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', i <= reachedIdx ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400')}>
                    {i + 1}
                  </span>
                  <span className={cn('h-0.5 flex-1', i === steps.length - 1 ? 'bg-transparent' : i < reachedIdx ? 'bg-brand-500' : 'bg-slate-200')} />
                </div>
                <span className={cn('mt-2 text-xs font-semibold sm:text-sm', i <= reachedIdx ? 'text-slate-900' : 'text-slate-400')}>{ORDER_STATUS[s].label}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-800">
          <b>Đơn đã huỷ.</b> {o.cancelReason && `Lý do: ${o.cancelReason}.`} Tồn kho đã được hoàn lại.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title={`Sản phẩm (${o.items.length})`} bodyClassName="p-0">
            <ul className="divide-y divide-slate-100">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <Thumb src={i.image} className="size-14" />
                  <div className="min-w-0 flex-1">
                    {i.productId ? (
                      <Link to={`/admin/products/${i.productId}`} className="line-clamp-2 font-semibold text-slate-800 hover:text-brand-600">{i.name}</Link>
                    ) : (
                      <span className="line-clamp-2 font-semibold text-slate-800">{i.name}</span>
                    )}
                    <span className="text-sm text-slate-500">{formatVND(i.price)} × {i.quantity}</span>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatVND(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Tạm tính</dt><dd className="tabular-nums">{formatVND(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Giảm giá {o.couponCode && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">{o.couponCode}</span>}</dt><dd className="text-emerald-600 tabular-nums">-{formatVND(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Phí vận chuyển</dt><dd className="tabular-nums">{o.shippingFee ? formatVND(o.shippingFee) : 'Miễn phí'}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Tổng cộng</dt><dd className="text-brand-700 tabular-nums">{formatVND(o.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Lịch sử xử lý">
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
              {[...o.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute top-1 -left-[31px] size-3.5 rounded-full ring-4 ring-white', i === 0 ? (h.status === 'cancelled' ? 'bg-rose-500' : 'bg-brand-600') : 'bg-slate-300')} />
                  <p className="text-sm font-semibold text-slate-800">{h.note || ORDER_STATUS[h.status]?.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(h.createdAt, true)}{h.actor && ` · ${h.actor}`}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Khách hàng">
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2.5"><User className="mt-0.5 size-4 shrink-0 text-slate-400" /><span><b className="text-slate-800">{o.customerName}</b>{o.customer ? (<><br /><Link to={`/admin/customers/${o.customer.id}`} className="text-brand-600 hover:underline">{o.customer.email}</Link><span className="text-slate-500"> · {o.customerOrderCount} đơn</span></>) : <><br /><span className="text-slate-500">Khách vãng lai{o.email ? ` · ${o.email}` : ''}</span></>}</span></p>
              <p className="flex items-center gap-2.5"><Phone className="size-4 shrink-0 text-slate-400" /><a href={`tel:${o.phone}`} className="font-medium text-slate-800 hover:text-brand-600">{o.phone}</a></p>
              <p className="flex items-start gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" /><span className="text-slate-700">{o.fullAddress}</span></p>
              {o.note && <div className="rounded-xl bg-amber-50 p-3 text-amber-900"><b>Ghi chú của khách:</b> {o.note}</div>}
            </div>
          </Panel>

          <Panel title="Thanh toán">
            <p className="flex items-start gap-2.5 text-sm text-slate-700"><CreditCard className="mt-0.5 size-4 shrink-0 text-slate-400" />{PAYMENT_METHOD[o.paymentMethod]}</p>
            <div className="no-print mt-4">
              <span className="label">Trạng thái thanh toán</span>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                {[['unpaid', 'Chưa TT'], ['paid', 'Đã TT'], ['refunded', 'Hoàn tiền']].map(([v, l]) => (
                  <button key={v} disabled={busy === 'payment'} onClick={() => setPayment(v)} className={cn('rounded-lg py-2 text-xs font-semibold transition', o.paymentStatus === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Huỷ đơn ${o.code}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>Đóng</Button>
            <Button variant="danger" loading={busy === 'cancelled'} disabled={!reason.trim()} onClick={async () => { if (await changeStatus('cancelled', reason.trim())) setCancelOpen(false); }}>
              Xác nhận huỷ
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">Tồn kho và lượt dùng mã giảm giá sẽ được hoàn lại. Đơn đã thanh toán sẽ chuyển sang “Đã hoàn tiền”.</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CANCEL_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition', reason === r ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {r}
            </button>
          ))}
        </div>
        <Textarea label="Lý do huỷ" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Nhập lý do để lưu vào lịch sử đơn" />
      </Modal>
    </div>
  );
}
