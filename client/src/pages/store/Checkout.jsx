import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote, ChevronLeft, Info, Lock, MapPin, QrCode, Smartphone, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useFetch';
import { useQuote } from '../../hooks/useQuote';
import { Button, Checkbox, Input, Select, Textarea } from '../../components/ui';
import { CouponBox, Totals } from '../../components/store/OrderSummary';
import { PROVINCES } from '../../lib/provinces';
import { cn, EMAIL_RE, formatVND, PHONE_RE } from '../../lib/format';

const PAYMENTS = [
  { value: 'cod', icon: Banknote, title: 'Thanh toán khi nhận hàng (COD)', desc: 'Kiểm tra hàng rồi mới thanh toán cho shipper.' },
  { value: 'bank', icon: QrCode, title: 'Chuyển khoản ngân hàng – VietQR', desc: 'Quét mã QR bằng app ngân hàng bất kỳ, xác nhận tự động.' },
  { value: 'ewallet', icon: Wallet, title: 'Ví điện tử', desc: 'Thanh toán qua ví điện tử phổ biến.' },
];

const EMPTY = { customerName: '', phone: '', email: '', province: '', ward: '', street: '', note: '' };

function validateField(name, v) {
  const s = String(v || '').trim();
  switch (name) {
    case 'customerName':
      return s.length < 2 ? 'Vui lòng nhập họ tên người nhận' : '';
    case 'phone':
      return !s ? 'Vui lòng nhập số điện thoại' : !PHONE_RE.test(s.replace(/\s/g, '')) ? 'Số điện thoại không hợp lệ (VD: 0912345678)' : '';
    case 'email':
      return s && !EMAIL_RE.test(s) ? 'Email không hợp lệ' : '';
    case 'province':
      return !s ? 'Vui lòng chọn Tỉnh/Thành phố' : '';
    case 'ward':
      return s.length < 2 ? 'Vui lòng nhập Phường/Xã' : '';
    case 'street':
      return s.length < 3 ? 'Vui lòng nhập số nhà, tên đường' : '';
    default:
      return '';
  }
}

export default function Checkout() {
  useDocumentTitle('Thanh toán');
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const { quote, loading } = useQuote();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [payment, setPayment] = useState('cod');
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef({});
  const placed = useRef(false);

  // Prefill from account + default address
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, customerName: f.customerName || user.name, phone: f.phone || user.phone || '', email: f.email || user.email }));
    api
      .get('/me/addresses')
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) pickAddress(def);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const pickAddress = (a) => {
    setAddressId(a.id);
    setForm((f) => ({ ...f, customerName: a.fullName, phone: a.phone, province: a.province, ward: a.ward || '', street: a.street }));
    setErrors({});
  };

  const set = (name) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [name]: v }));
    if (['province', 'ward', 'street', 'customerName', 'phone'].includes(name)) setAddressId(null);
    if (touched[name] || errors[name]) setErrors((er) => ({ ...er, [name]: validateField(name, v) }));
  };
  const blur = (name) => () => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((er) => ({ ...er, [name]: validateField(name, form[name]) }));
  };

  const unavailable = useMemo(() => quote?.items.filter((l) => !l.removed && !l.available) || [], [quote]);

  if (!cart.items.length && !placed.current) return <Navigate to="/cart" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    Object.keys(EMPTY).forEach((k) => {
      const m = validateField(k, form[k]);
      if (m) errs[k] = m;
    });
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    const first = Object.keys(EMPTY).find((k) => errs[k]);
    if (first) {
      refs.current[first]?.focus();
      refs.current[first]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Vui lòng kiểm tra lại thông tin giao hàng');
      return;
    }
    if (unavailable.length) {
      toast.error('Giỏ hàng có sản phẩm đã hết hàng. Vui lòng quay lại giỏ hàng để điều chỉnh.');
      return;
    }
    setSubmitting(true);
    try {
      const { order } = await api.post('/orders', {
        ...form,
        phone: form.phone.replace(/\s/g, ''),
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: cart.coupon || null,
        paymentMethod: payment,
        saveAddress: !!user && !addressId && saveAddress,
      });
      placed.current = true;
      sessionStorage.setItem('lumi_last_order', JSON.stringify(order));
      cart.clear();
      nav(`/order-success/${order.code}`, { replace: true, state: { order } });
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors((er) => ({ ...er, ...err.fields }));
      if (err.status === 409 && err.warnings?.length) {
        err.warnings.forEach((w) => toast.error(w.message));
        nav('/cart');
      } else toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reg = (name) => ({
    ref: (el) => (refs.current[name] = el),
    value: form[name],
    onChange: set(name),
    onBlur: blur(name),
    error: errors[name],
    name,
  });

  return (
    <div className="container-page py-6">
      <Link to="/cart" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ChevronLeft className="size-4" /> Quay lại giỏ hàng
      </Link>
      <h1 className="mb-5 text-2xl font-bold text-slate-900">Thanh toán</h1>

      <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          {!user && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm">
              <Info className="size-5 shrink-0 text-brand-600" />
              <p className="flex-1 text-brand-900">
                Bạn có thể <b>đặt hàng ngay không cần tài khoản</b>. Đăng nhập để dùng địa chỉ đã lưu và theo dõi đơn dễ hơn.
              </p>
              <Link to="/login?next=/checkout" className="font-semibold text-brand-700 hover:underline">Đăng nhập</Link>
            </div>
          )}

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs text-white">1</span> Thông tin giao hàng
            </h2>

            {addresses.length > 0 && (
              <div className="mb-5">
                <p className="label">Địa chỉ đã lưu</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {addresses.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => pickAddress(a)}
                      className={cn('rounded-xl border-2 p-3 text-left text-sm transition', addressId === a.id ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300')}
                    >
                      <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <MapPin className="size-3.5 text-brand-500" /> {a.fullName} · {a.phone}
                      </p>
                      <p className="mt-1 line-clamp-2 text-slate-500">{[a.street, a.ward, a.province].filter(Boolean).join(', ')}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Hoặc chỉnh sửa thông tin bên dưới để giao tới địa chỉ khác.</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Họ tên người nhận" required autoComplete="name" placeholder="Nguyễn Văn A" {...reg('customerName')} />
              <Input
                label="Số điện thoại"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0912 345 678"
                hint="Shipper sẽ gọi số này khi giao hàng"
                leftIcon={Smartphone}
                {...reg('phone')}
              />
              <Input label="Email" optional type="email" autoComplete="email" placeholder="email@example.com" hint="Nhận xác nhận đơn hàng qua email" className="sm:col-span-2" {...reg('email')} />
              <Select label="Tỉnh / Thành phố" required placeholder="— Chọn Tỉnh/Thành phố —" autoComplete="address-level1" {...reg('province')}>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
              <Input label="Phường / Xã" required placeholder="VD: Phường Bến Thành" autoComplete="address-level3" hint="Theo địa giới hành chính mới (không còn cấp quận/huyện)" {...reg('ward')} />
              <Input label="Địa chỉ cụ thể" required placeholder="Số nhà, tên đường, toà nhà…" autoComplete="street-address" className="sm:col-span-2" {...reg('street')} />
              <Textarea label="Ghi chú cho đơn hàng" optional rows={2} placeholder="VD: Giao giờ hành chính, gọi trước khi giao…" className="sm:col-span-2" {...reg('note')} />
            </div>
            {user && !addressId && (
              <Checkbox className="mt-4" checked={saveAddress} onChange={setSaveAddress} label="Lưu địa chỉ này vào sổ địa chỉ" />
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs text-white">2</span> Phương thức thanh toán
            </h2>
            <div className="space-y-2.5" role="radiogroup" aria-label="Phương thức thanh toán">
              {PAYMENTS.map((p) => (
                <label key={p.value} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition', payment === p.value ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300')}>
                  <input type="radio" name="payment" value={p.value} checked={payment === p.value} onChange={() => setPayment(p.value)} className="mt-1 size-4 accent-brand-600" />
                  <p.icon className={cn('mt-0.5 size-5 shrink-0', payment === p.value ? 'text-brand-600' : 'text-slate-400')} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{p.title}</span>
                    <span className="block text-xs text-slate-500">{p.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="card sticky top-36 space-y-4 p-5">
          <h2 className="text-base font-bold text-slate-900">Đơn hàng ({cart.count} sản phẩm)</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {cart.items.map((i) => {
              const l = quote?.items.find((x) => x.productId === i.productId);
              return (
                <li key={i.productId} className="flex gap-3">
                  <span className="relative shrink-0">
                    <img src={i.image} alt="" className="size-14 rounded-lg bg-slate-100 object-cover" />
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-white">{i.quantity}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm text-slate-700">{i.name}</span>
                    {l && !l.available && <span className="text-xs font-semibold text-rose-600">Hết hàng</span>}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{formatVND(i.price * i.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <CouponBox quote={quote} />
          <Totals quote={quote} loading={loading} fallbackSubtotal={cart.subtotal} />
          <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={unavailable.length > 0}>
            <Lock className="size-4" /> Đặt hàng · {formatVND(quote?.total ?? cart.subtotal)}
          </Button>
          <p className="text-center text-xs leading-5 text-slate-500">
            Bằng việc đặt hàng, bạn đồng ý với điều khoản mua hàng của Lumi Store. Bạn có thể huỷ đơn miễn phí khi đơn chưa được xác nhận.
          </p>
        </aside>
      </form>
    </div>
  );
}
