import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, ShoppingBag, Truck, User } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useFetch';
import { Button, Input } from '../../components/ui';
import { EMAIL_RE, PHONE_RE } from '../../lib/format';

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="container-page flex justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200/70 md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-8 text-white md:flex">
          <div>
            <p className="text-sm font-semibold opacity-80">Lumi Store</p>
            <h2 className="mt-3 text-3xl leading-tight font-extrabold">Công nghệ tốt nhất,<br />giá tốt nhất.</h2>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Truck className="size-4" /> Freeship cho đơn từ 500K</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4" /> Hàng chính hãng, bảo hành 12 tháng</li>
            <li className="flex items-center gap-2"><Lock className="size-4" /> Bảo mật thông tin tuyệt đối</li>
          </ul>
          <ShoppingBag className="pointer-events-none absolute -right-8 bottom-16 size-44 text-white/10" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="p-6 sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      leftIcon={Lock}
      right={
        <button type="button" onClick={() => setShow((s) => !s)} className="rounded-lg p-2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}

export function Login() {
  useDocumentTitle('Đăng nhập');
  const { login, user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Email không hợp lệ';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const u = await login(form.email.trim(), form.password);
      toast.success(`Chào mừng trở lại, ${u.name.split(' ').pop()}!`);
      nav(next, { replace: true });
    } catch (err) {
      setErrors({ form: err.message, ...err.fields });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Đăng nhập"
      subtitle="Theo dõi đơn hàng, lưu sản phẩm yêu thích và thanh toán nhanh hơn."
      footer={<>Chưa có tài khoản? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-600 hover:underline">Đăng ký ngay</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700" role="alert">{errors.form}</p>}
        <Input label="Email" type="email" autoComplete="email" leftIcon={Mail} placeholder="email@example.com" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
        <PasswordInput label="Mật khẩu" autoComplete="current-password" placeholder="••••••" value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">Quên mật khẩu?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Đăng nhập</Button>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
          Tài khoản demo: <b>khach@lumi.vn</b> / <b>123456</b>
        </p>
      </form>
    </Shell>
  );
}

function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function Register() {
  useDocumentTitle('Đăng ký');
  const { register, user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to={next} replace />;

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: '' });
  };
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Họ tên cần ít nhất 2 ký tự';
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Email không hợp lệ';
    if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, ''))) errs.phone = 'Số điện thoại không hợp lệ';
    if (form.password.length < 6) errs.password = 'Mật khẩu cần ít nhất 6 ký tự';
    if (form.confirm !== form.password) errs.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.replace(/\s/g, ''), password: form.password });
      toast.success('Tạo tài khoản thành công! Dùng mã CHAOBAN50K để giảm 50K cho đơn đầu tiên.', { duration: 6000 });
      nav(next, { replace: true });
    } catch (err) {
      setErrors({ form: Object.keys(err.fields).length ? '' : err.message, ...err.fields });
    } finally {
      setLoading(false);
    }
  };
  const st = strength(form.password);
  const stLabel = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][st];
  const stColor = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'][st];

  return (
    <Shell title="Tạo tài khoản" subtitle="Chỉ mất 30 giây. Nhận ngay mã giảm 50K cho đơn đầu tiên." footer={<>Đã có tài khoản? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700" role="alert">{errors.form}</p>}
        <Input label="Họ và tên" required autoComplete="name" leftIcon={User} placeholder="Nguyễn Văn A" value={form.name} error={errors.name} onChange={set('name')} autoFocus />
        <Input label="Email" required type="email" autoComplete="email" leftIcon={Mail} placeholder="email@example.com" value={form.email} error={errors.email} onChange={set('email')} />
        <Input label="Số điện thoại" optional type="tel" autoComplete="tel" leftIcon={Phone} placeholder="0912 345 678" value={form.phone} error={errors.phone} onChange={set('phone')} />
        <div>
          <PasswordInput label="Mật khẩu" required autoComplete="new-password" placeholder="Ít nhất 6 ký tự" value={form.password} error={errors.password} onChange={set('password')} />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < st ? stColor : 'bg-slate-200'}`} />)}
              </div>
              <span className="text-xs text-slate-500">{stLabel}</span>
            </div>
          )}
        </div>
        <PasswordInput label="Nhập lại mật khẩu" required autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={set('confirm')} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Tạo tài khoản</Button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  useDocumentTitle('Quên mật khẩu');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError('Email không hợp lệ');
    setLoading(true);
    setError('');
    try {
      setResult(await api.post('/auth/forgot-password', { email: email.trim() }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title="Quên mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu." footer={<Link to="/login" className="font-semibold text-brand-600 hover:underline">← Quay lại đăng nhập</Link>}>
      {result ? (
        <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{result.message}</p>
          {result.devResetToken && (
            <p className="rounded-lg bg-white p-3 text-slate-600">
              <b>Chế độ demo</b> (chưa cấu hình gửi email):{' '}
              <Link to={`/reset-password?token=${result.devResetToken}`} className="font-semibold text-brand-600 underline">Bấm vào đây để đặt lại mật khẩu</Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input label="Email" type="email" autoComplete="email" leftIcon={Mail} value={email} error={error} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Gửi hướng dẫn</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  useDocumentTitle('Đặt lại mật khẩu');
  const [params] = useSearchParams();
  const toast = useToast();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (pw.length < 6) errs.pw = 'Mật khẩu cần ít nhất 6 ký tự';
    if (confirm !== pw) errs.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: params.get('token') || '', password: pw });
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      nav('/login');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title="Đặt lại mật khẩu" subtitle="Tạo mật khẩu mới cho tài khoản của bạn.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700" role="alert">{errors.form}</p>}
        <PasswordInput label="Mật khẩu mới" autoComplete="new-password" value={pw} error={errors.pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        <PasswordInput label="Nhập lại mật khẩu" autoComplete="new-password" value={confirm} error={errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Cập nhật mật khẩu</Button>
      </form>
    </Shell>
  );
}
