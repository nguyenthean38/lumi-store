import { Link } from 'react-router-dom';
import { Check, CircleX, ClipboardCheck, Copy, PackageCheck, Truck } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui';
import { cn, formatDate, formatVND, ORDER_STATUS, ORDER_STEPS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../lib/format';

const STEP_ICON = { pending: ClipboardCheck, confirmed: Check, shipping: Truck, delivered: PackageCheck };

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'slate' };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, tone: 'slate' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Horizontal progress (pending → delivered) plus the detailed history log. */
export function OrderTimeline({ order }) {
  const cancelled = order.status === 'cancelled';
  const reached = cancelled ? -1 : ORDER_STEPS.indexOf(order.status);
  const timeOf = (st) => order.history?.find((h) => h.status === st)?.createdAt;

  return (
    <div>
      {cancelled ? (
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 text-rose-700">
          <CircleX className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">Đơn hàng đã bị huỷ</p>
            {order.cancelReason && <p className="text-sm">Lý do: {order.cancelReason}</p>}
          </div>
        </div>
      ) : (
        <ol className="flex items-start">
          {ORDER_STEPS.map((st, i) => {
            const Icon = STEP_ICON[st];
            const done = i <= reached;
            return (
              <li key={st} className="relative flex flex-1 flex-col items-center text-center">
                {i > 0 && <span className={cn('absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded-full', i <= reached ? 'bg-emerald-500' : 'bg-slate-200')} />}
                <span className={cn('relative z-10 flex size-10 items-center justify-center rounded-full ring-4 ring-white', done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400')}>
                  <Icon className="size-5" />
                </span>
                <span className={cn('mt-2 text-xs font-semibold sm:text-sm', done ? 'text-slate-800' : 'text-slate-400')}>{ORDER_STATUS[st].label}</span>
                {timeOf(st) && <span className="hidden text-[11px] text-slate-400 sm:block">{formatDate(timeOf(st), true)}</span>}
              </li>
            );
          })}
        </ol>
      )}
      {order.history?.length > 0 && (
        <ul className="mt-6 space-y-3 border-l-2 border-slate-100 pl-4">
          {[...order.history].reverse().map((h, i) => (
            <li key={i} className="relative">
              <span className={cn('absolute top-1.5 -left-[22px] size-2.5 rounded-full ring-4 ring-white', i === 0 ? 'bg-brand-500' : 'bg-slate-300')} />
              <p className={cn('text-sm', i === 0 ? 'font-semibold text-slate-900' : 'text-slate-600')}>{h.note}</p>
              <p className="text-xs text-slate-400">{formatDate(h.createdAt, true)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrderItems({ items, renderAction }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-3 py-3">
          {i.slug ? (
            <Link to={`/products/${i.slug}`}><img src={i.image} alt="" className="size-16 rounded-lg bg-slate-100 object-cover" /></Link>
          ) : (
            <img src={i.image} alt="" className="size-16 rounded-lg bg-slate-100 object-cover" />
          )}
          <div className="min-w-0 flex-1">
            {i.slug ? (
              <Link to={`/products/${i.slug}`} className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-brand-600">{i.name}</Link>
            ) : (
              <p className="line-clamp-2 text-sm font-medium text-slate-800">{i.name}</p>
            )}
            <p className="text-xs text-slate-500">{formatVND(i.price)} × {i.quantity}</p>
            {renderAction?.(i)}
          </div>
          <p className="text-sm font-semibold text-slate-900">{formatVND(i.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }) {
  const row = 'flex justify-between text-sm';
  return (
    <div className="space-y-2">
      <div className={row}><span className="text-slate-500">Tạm tính</span><span>{formatVND(order.subtotal)}</span></div>
      {order.discount > 0 && (
        <div className={row}><span className="text-slate-500">Giảm giá {order.couponCode && `(${order.couponCode})`}</span><span className="text-emerald-600">-{formatVND(order.discount)}</span></div>
      )}
      <div className={row}><span className="text-slate-500">Phí vận chuyển</span><span>{order.shippingFee ? formatVND(order.shippingFee) : 'Miễn phí'}</span></div>
      <div className="flex justify-between border-t border-slate-100 pt-2"><span className="font-semibold">Tổng cộng</span><span className="text-lg font-extrabold text-sale">{formatVND(order.total)}</span></div>
    </div>
  );
}

export function ShippingInfo({ order }) {
  return (
    <dl className="space-y-2 text-sm">
      <div><dt className="text-xs text-slate-500">Người nhận</dt><dd className="font-medium text-slate-800">{order.customerName} · {order.phone}</dd></div>
      <div><dt className="text-xs text-slate-500">Địa chỉ</dt><dd className="text-slate-700">{order.fullAddress}</dd></div>
      <div><dt className="text-xs text-slate-500">Thanh toán</dt><dd className="flex flex-wrap items-center gap-2 text-slate-700">{PAYMENT_METHOD[order.paymentMethod]} <PaymentBadge status={order.paymentStatus} /></dd></div>
      {order.note && <div><dt className="text-xs text-slate-500">Ghi chú</dt><dd className="text-slate-700">{order.note}</dd></div>}
    </dl>
  );
}

/** VietQR (img.vietqr.io) for bank transfer; amount + order code are pre-filled. */
export function PaymentInstructions({ order }) {
  const { settings } = useSettings();
  const toast = useToast();
  if (order.paymentStatus === 'paid' || order.status === 'cancelled') return null;
  if (order.paymentMethod === 'cod') return null;
  const bank = settings.bank;
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast.success('Đã sao chép'));

  if (order.paymentMethod === 'bank' && bank?.account) {
    const qr = `https://img.vietqr.io/image/${bank.bin}-${bank.account}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(order.code)}&accountName=${encodeURIComponent(bank.owner || '')}`;
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
        <h3 className="font-bold text-slate-900">Quét mã để chuyển khoản</h3>
        <p className="mt-1 text-sm text-slate-600">Mở app ngân hàng → Quét QR. Số tiền và nội dung đã được điền sẵn.</p>
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <img src={qr} alt={`Mã VietQR thanh toán đơn ${order.code}`} className="size-48 rounded-xl bg-white p-2 shadow-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <dl className="w-full space-y-2 text-sm">
            {[
              ['Ngân hàng', bank.name],
              ['Số tài khoản', bank.account, true],
              ['Chủ tài khoản', bank.owner],
              ['Số tiền', formatVND(order.total), false, String(order.total)],
              ['Nội dung', order.code, true],
            ].map(([k, v, canCopy, raw]) => (
              <div key={k} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="flex items-center gap-2 font-semibold text-slate-900">
                  {v}
                  {(canCopy || raw) && (
                    <button onClick={() => copy(raw || v)} aria-label={`Sao chép ${k}`} className="text-brand-600 hover:text-brand-700"><Copy className="size-3.5" /></button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 text-xs text-slate-500">Đơn hàng sẽ được xác nhận ngay khi cửa hàng nhận được thanh toán.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 text-sm text-slate-700">
      <h3 className="font-bold text-slate-900">Thanh toán qua ví điện tử</h3>
      <p className="mt-1">Nhân viên Lumi sẽ gửi liên kết thanh toán tới số điện thoại <b>{order.phone}</b> trong ít phút. Nội dung thanh toán: <b>{order.code}</b>.</p>
    </div>
  );
}
