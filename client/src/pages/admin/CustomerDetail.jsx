import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, MapPin, Phone, Unlock } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { formatDate, formatVND } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, ErrorState, PageLoader } from '../../components/ui';
import { OrderStatusBadge, Panel } from '../../components/admin/AdminUI';
import { Avatar, toggleLock } from '../../components/admin/customer';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload, setData } = useFetch(() => api.get(`/admin/customers/${id}`), [id]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { customer: c, orders, addresses, spent } = data;
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;

  const lock = async () => {
    const updated = await toggleLock(c, { confirm, toast });
    if (updated) setData((d) => ({ ...d, customer: updated }));
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Quay lại">
            <ArrowLeft className="size-5" />
          </button>
          <Avatar name={c.name} className="size-12 text-lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{c.name}</h1>
              {c.role === 'admin' ? <Badge tone="brand">Quản trị</Badge> : c.status === 'active' ? <Badge tone="emerald" dot>Hoạt động</Badge> : <Badge tone="rose" dot>Đã khoá</Badge>}
            </div>
            <p className="text-sm text-slate-500">Khách hàng từ {formatDate(c.createdAt)}</p>
          </div>
        </div>
        {c.role !== 'admin' && (
          <Button variant={c.status === 'active' ? 'danger-soft' : 'soft'} icon={c.status === 'active' ? Lock : Unlock} onClick={lock}>
            {c.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá'}
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Tổng chi tiêu', formatVND(spent)],
          ['Số đơn hàng', orders.length],
          ['Đã giao', delivered],
          ['Đã huỷ', cancelled],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-sm text-slate-500">{l}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Panel title="Liên hệ">
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2.5"><Mail className="size-4 text-slate-400" /><a href={`mailto:${c.email}`} className="text-slate-700 hover:text-brand-600">{c.email}</a></p>
              <p className="flex items-center gap-2.5"><Phone className="size-4 text-slate-400" />{c.phone ? <a href={`tel:${c.phone}`} className="text-slate-700 hover:text-brand-600">{c.phone}</a> : <span className="text-slate-400">Chưa cập nhật</span>}</p>
            </div>
          </Panel>
          <Panel title={`Sổ địa chỉ (${addresses.length})`}>
            {addresses.length ? (
              <ul className="space-y-3">
                {addresses.map((a) => (
                  <li key={a.id} className="flex gap-2.5 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>
                      <b className="text-slate-800">{a.fullName}</b> · {a.phone} {a.isDefault && <Badge tone="brand" className="ml-1">Mặc định</Badge>}
                      <br />
                      <span className="text-slate-600">{a.fullAddress}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Chưa lưu địa chỉ nào.</p>
            )}
          </Panel>
        </div>
        <Panel className="lg:col-span-2" title="Lịch sử đơn hàng" bodyClassName="p-0">
          {orders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-5 py-2.5">Mã đơn</th>
                    <th className="px-5 py-2.5">Ngày đặt</th>
                    <th className="px-5 py-2.5 text-center">SL</th>
                    <th className="px-5 py-2.5 text-right">Tổng tiền</th>
                    <th className="px-5 py-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">{o.code}</Link></td>
                      <td className="px-5 py-3 text-slate-600">{formatDate(o.createdAt, true)}</td>
                      <td className="px-5 py-3 text-center tabular-nums">{o.itemCount}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatVND(o.total)}</td>
                      <td className="px-5 py-3"><OrderStatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">Khách hàng chưa có đơn hàng nào.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
