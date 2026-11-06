import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Banknote, Clock, Package, Receipt, ShoppingBag, Star, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { formatCompactVND, formatVND, ORDER_STATUS, timeAgo } from '../../lib/format';
import { Badge, ErrorState, Skeleton, Tabs } from '../../components/ui';
import { ChangePill, OrderStatusBadge, Panel, Thumb } from '../../components/admin/AdminUI';
import { BarList, RevenueChart, Sparkline } from '../../components/admin/Charts';

function Kpi({ icon: Icon, label, value, change, spark, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" />
        </div>
        <ChangePill value={change} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums" title={String(value)}>{value}</p>
      {spark && <Sparkline values={spark} className="mt-2 h-8 w-full" />}
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/stats', { days }), [days]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const k = data?.kpis;
  const vsText = `so với ${days} ngày trước đó`;
  const statusOrder = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Xin chào</h1>
          <p className="mt-0.5 text-sm text-slate-500">Tình hình kinh doanh của cửa hàng trong {days} ngày gần nhất.</p>
        </div>
        <Tabs
          value={days}
          onChange={setDays}
          className="rounded-xl border border-slate-200 bg-white p-1"
          tabs={[
            { value: 7, label: '7 ngày' },
            { value: 30, label: '30 ngày' },
            { value: 90, label: '90 ngày' },
          ]}
        />
      </div>

      {data?.totals?.pendingOrders > 0 && (
        <Link
          to="/admin/orders?status=pending"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100"
        >
          <Clock className="size-5 shrink-0 text-amber-600" />
          <span className="flex-1">
            Có <b>{data.totals.pendingOrders} đơn hàng</b> đang chờ xác nhận. Xử lý sớm để khách nhận hàng nhanh hơn.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
        ) : (
          <>
            <Kpi icon={Banknote} label="Doanh thu" value={formatVND(k.revenue.value)} change={k.revenue.change} spark={data.series.map((s) => s.revenue)} hint={vsText} />
            <Kpi icon={ShoppingBag} label="Đơn hàng" value={k.orders.value.toLocaleString('vi-VN')} change={k.orders.change} spark={data.series.map((s) => s.orders)} hint={vsText} />
            <Kpi icon={UserPlus} label="Khách hàng mới" value={k.customers.value.toLocaleString('vi-VN')} change={k.customers.change} hint={`${data.totals.customers} khách hàng · ${vsText}`} />
            <Kpi icon={Receipt} label="Giá trị TB / đơn" value={formatVND(k.aov.value)} change={k.aov.change} hint={vsText} />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Doanh thu theo ngày"
          action={data && <span className="text-xs text-slate-500">Tổng {formatCompactVND(k.revenue.value)} · không tính đơn huỷ</span>}
        >
          {loading && !data ? <Skeleton className="h-64" /> : <RevenueChart series={data.series} />}
        </Panel>
        <Panel title="Trạng thái đơn hàng" action={<Link to="/admin/orders" className="text-xs font-semibold text-brand-600 hover:underline">Xem tất cả</Link>}>
          {loading && !data ? (
            <Skeleton className="h-56" />
          ) : (
            <BarList
              format={(v) => `${v.toLocaleString('vi-VN')} đơn`}
              items={statusOrder.map((s) => ({ label: ORDER_STATUS[s].label, value: data.statusCounts[s] || 0 }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Doanh thu theo danh mục">
          {loading && !data ? (
            <Skeleton className="h-56" />
          ) : (
            <BarList format={formatCompactVND} items={data.categoryRevenue.map((c) => ({ label: c.name, value: c.revenue }))} emptyText="Chưa có doanh thu trong kỳ" />
          )}
        </Panel>
        <Panel title="Top 5 sản phẩm bán chạy" bodyClassName="p-0">
          {loading && !data ? (
            <div className="p-5">
              <Skeleton className="h-56" />
            </div>
          ) : data.topProducts.length ? (
            <ol className="divide-y divide-slate-100">
              {data.topProducts.map((p, i) => (
                <li key={p.id ?? p.name} className="flex items-center gap-3 px-5 py-3">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
                  <Thumb src={p.image} className="size-10" />
                  <div className="min-w-0 flex-1">
                    {p.id ? (
                      <Link to={`/admin/products/${p.id}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-600">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-semibold text-slate-800">{p.name}</span>
                    )}
                    <span className="text-xs text-slate-500">Đã bán {p.qty}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCompactVND(p.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">Chưa có đơn hàng trong kỳ</p>
          )}
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" /> Sắp hết hàng
            </span>
          }
          action={data && <span className="text-xs text-slate-500">Tồn ≤ {data.lowStockThreshold}</span>}
          bodyClassName="p-0"
        >
          {loading && !data ? (
            <div className="p-5">
              <Skeleton className="h-56" />
            </div>
          ) : data.lowStock.length ? (
            <ul className="divide-y divide-slate-100">
              {data.lowStock.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <Thumb src={p.image} className="size-9" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{p.name}</span>
                    <Badge tone={p.stock === 0 ? 'rose' : 'amber'}>{p.stock === 0 ? 'Hết hàng' : `Còn ${p.stock}`}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
              <Package className="size-4" /> Tồn kho đều ổn định
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Đơn hàng gần đây" action={<Link to="/admin/orders" className="text-xs font-semibold text-brand-600 hover:underline">Xem tất cả</Link>} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <th className="px-5 py-2.5">Mã đơn</th>
                <th className="px-5 py-2.5">Khách hàng</th>
                <th className="px-5 py-2.5">Thời gian</th>
                <th className="px-5 py-2.5 text-right">Tổng tiền</th>
                <th className="px-5 py-2.5">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-5 py-3">
                        <Skeleton className="h-5" />
                      </td>
                    </tr>
                  ))
                : data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link to={`/admin/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">
                          {o.code}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{o.customerName}</td>
                      <td className="px-5 py-3 text-slate-500">{timeAgo(o.createdAt)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">{formatVND(o.total)}</td>
                      <td className="px-5 py-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {data && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Star className="size-3.5" /> {data.totals.newReviews} đánh giá mới trong 7 ngày · {data.totals.products} sản phẩm trong kho
        </p>
      )}
    </div>
  );
}
