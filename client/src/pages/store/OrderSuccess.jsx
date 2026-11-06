import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useFetch';
import { Button } from '../../components/ui';
import { OrderItems, OrderTotals, PaymentInstructions, ShippingInfo } from '../../components/store/OrderParts';
import NotFound from './NotFound';

export default function OrderSuccess() {
  useDocumentTitle('Đặt hàng thành công');
  const { code } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const order = useMemo(() => {
    if (state?.order?.code === code) return state.order;
    try {
      const o = JSON.parse(sessionStorage.getItem('lumi_last_order'));
      return o?.code === code ? o : null;
    } catch {
      return null;
    }
  }, [state, code]);

  if (!order) return <NotFound title="Không tìm thấy thông tin đơn hàng" description="Bạn có thể tra cứu đơn bằng mã đơn và số điện thoại." action={<Link to="/track"><Button>Tra cứu đơn hàng</Button></Link>} />;

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-8 text-center text-white">
          <CheckCircle2 className="mx-auto size-14 animate-pop" />
          <h1 className="mt-3 text-2xl font-extrabold">Đặt hàng thành công!</h1>
          <p className="mt-1 text-white/90">Cảm ơn {order.customerName}. Chúng tôi sẽ gọi xác nhận trong ít phút.</p>
          <button
            onClick={() => navigator.clipboard?.writeText(order.code).then(() => toast.success('Đã sao chép mã đơn'))}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 font-mono text-lg font-bold backdrop-blur hover:bg-white/30"
          >
            {order.code} <Copy className="size-4" />
          </button>
          <p className="mt-2 text-xs text-white/80">Lưu lại mã đơn và số điện thoại để tra cứu đơn hàng</p>
        </div>
        <div className="space-y-6 p-6">
          <PaymentInstructions order={order} />
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-bold text-slate-900">Thông tin nhận hàng</h2>
              <ShippingInfo order={order} />
            </div>
            <div>
              <h2 className="mb-2 font-bold text-slate-900">Thanh toán</h2>
              <OrderTotals order={order} />
            </div>
          </div>
          <div>
            <h2 className="mb-1 font-bold text-slate-900">Sản phẩm</h2>
            <OrderItems items={order.items} />
          </div>
          <div className="flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-5">
            <Link to="/products"><Button variant="secondary">Tiếp tục mua sắm</Button></Link>
            {user ? (
              <Link to={`/account/orders/${order.code}`}><Button>Theo dõi đơn hàng</Button></Link>
            ) : (
              <Link to={`/track?code=${order.code}&phone=${order.phone}`}><Button>Theo dõi đơn hàng</Button></Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
