import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, PageLoader } from '../../components/ui';
import { EMAIL_RE } from '../../lib/format';

export default function AdminLogin() {
  const { user, ready, login, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const target = next && next.startsWith('/admin') ? next : '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Đăng nhập quản trị | Lumi Admin';
  }, []);

  if (!ready) return <PageLoader />;
  if (user?.role === 'admin') return <Navigate to={target} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Email không hợp lệ';
    if (!password) errs.password = 'Vui lòng nhập mật khẩu';
    setErrors(errs);
    setError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== 'admin') {
        setError('Tài khoản này không có quyền quản trị.');
        return;
      }
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />
        <Link to="/" className="relative flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-11 rounded-xl ring-2 ring-white/30" />
          <span className="text-xl font-extrabold">Lumi Store</span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold">Quản lý cửa hàng nhanh, gọn, chính xác.</h2>
          <p className="mt-4 text-lg text-white/80">Theo dõi doanh thu, xử lý đơn hàng, cập nhật tồn kho và chăm sóc khách hàng ở một nơi.</p>
          <ul className="mt-8 space-y-3 text-white/90">
            {['Bảng điều khiển doanh thu theo thời gian thực', 'Xử lý đơn theo quy trình rõ ràng', 'Cảnh báo sắp hết hàng tự động'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-emerald-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} Lumi Store</p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/favicon.svg" alt="" className="size-12 rounded-xl" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Đăng nhập quản trị</h1>
          <p className="mt-1.5 text-sm text-slate-500">Khu vực dành riêng cho quản trị viên cửa hàng.</p>

          {user && user.role !== 'admin' && (
            <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <ShieldAlert className="size-5 shrink-0" />
              <div>
                Bạn đang đăng nhập bằng tài khoản khách hàng <b>{user.email}</b>, tài khoản này không có quyền truy cập trang quản trị.{' '}
                <button onClick={logout} className="font-semibold underline">
                  Đăng xuất
                </button>{' '}
                để dùng tài khoản khác.
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              leftIcon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="admin@lumi.vn"
              autoFocus
            />
            <Input
              label="Mật khẩu"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
              right={
                <button type="button" onClick={() => setShow(!show)} className="rounded-lg p-2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-3.5 text-xs text-brand-800">
            <b>Tài khoản demo:</b> admin@lumi.vn / admin123{' '}
            <button
              type="button"
              className="ml-1 font-semibold underline"
              onClick={() => {
                setEmail('admin@lumi.vn');
                setPassword('admin123');
              }}
            >
              Điền nhanh
            </button>
          </div>
          <Link to="/" className="mt-6 block text-center text-sm font-medium text-slate-500 hover:text-brand-600">
            ← Quay lại cửa hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
