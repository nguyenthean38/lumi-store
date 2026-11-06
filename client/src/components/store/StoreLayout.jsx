import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import CategoryIcon from '../CategoryIcon';
import {
  ChevronDown,
  Flame,
  Headphones,
  Heart,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import SearchBox from './SearchBox';
import CartDrawer from './CartDrawer';
import { cn, formatVND } from '../../lib/format';

export function Logo({ className, light }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2', className)} aria-label="Lumi Store – Trang chủ">
      <img src="/favicon.svg" alt="" className="size-9" />
      <span className={cn('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
        Lumi<span className="text-brand-600">.</span>
      </span>
    </Link>
  );
}

function AccountMenu() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!user)
    return (
      <Link to="/login" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:flex">
        <User className="size-5" />
        <span className="leading-tight">
          <span className="block text-xs font-normal text-slate-500">Xin chào</span>Đăng nhập
        </span>
      </Link>
    );

  const items = [
    { to: '/account', label: 'Tài khoản của tôi', icon: User },
    { to: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
    { to: '/account/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
    { to: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  ];
  return (
    <div ref={ref} className="relative hidden md:block">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{user.name.trim().split(' ').pop()[0]}</span>
        <span className="max-w-28 truncate">{user.name.split(' ').pop()}</span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <LayoutDashboard className="size-4" /> Trang quản trị
            </Link>
          )}
          {items.map((i) => (
            <Link key={i.to} to={i.to} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <i.icon className="size-4 text-slate-400" /> {i.label}
            </Link>
          ))}
          <button
            onClick={() => {
              logout();
              setOpen(false);
              nav('/');
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function CartButton({ className }) {
  const { count, openDrawer, bump } = useCart();
  return (
    <button onClick={openDrawer} className={cn('relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100', className)} aria-label={`Giỏ hàng, ${count} sản phẩm`}>
      <span className="relative">
        <ShoppingCart className="size-6" />
        {count > 0 && (
          <span key={bump} className="absolute -top-2 -right-2.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-sale px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      <span className="hidden text-sm font-semibold lg:inline">Giỏ hàng</span>
    </button>
  );
}

function Header() {
  const { categories, settings } = useSettings();
  const { user } = useAuth();
  const loc = useLocation();
  const activeCat = new URLSearchParams(loc.search).get('category');
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="hidden bg-slate-900 text-xs text-slate-300 sm:block">
        <div className="container-page flex h-8 items-center justify-between gap-4">
          <p className="truncate">
            <Truck className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />Miễn phí vận chuyển cho đơn từ <b className="text-white">{formatVND(settings.freeShippingThreshold)}</b> · Đổi trả 30 ngày · Hàng chính hãng 100%
          </p>
          <div className="flex shrink-0 items-center gap-4">
            <Link to="/track" className="hover:text-white">Tra cứu đơn hàng</Link>
            <span>Hotline: <b className="text-white">{settings.hotline}</b></span>
          </div>
        </div>
      </div>
      <div className="container-page flex h-16 items-center gap-3 md:gap-6">
        <Logo />
        <SearchBox className="hidden flex-1 md:block md:max-w-xl lg:max-w-2xl" />
        <div className="ml-auto flex items-center gap-1">
          {user && (
            <Link to="/account/wishlist" className="hidden rounded-xl p-2.5 text-slate-700 hover:bg-slate-100 md:block" aria-label="Sản phẩm yêu thích">
              <Heart className="size-6" />
            </Link>
          )}
          <AccountMenu />
          <CartButton />
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchBox />
      </div>
      <nav className="hidden border-t border-slate-100 md:block" aria-label="Danh mục">
        <div className="container-page scrollbar-none flex h-11 items-center gap-1 overflow-x-auto">
          <NavLink to="/products" end className={({ isActive }) => cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold', isActive && !activeCat && !loc.search ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100')}>
            <LayoutGrid className="size-4" /> Tất cả
          </NavLink>
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', activeCat === c.slug ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
              <CategoryIcon icon={c.icon} /> {c.name}
            </Link>
          ))}
          <Link to="/products?onSale=1" className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-sale hover:bg-rose-50">
            <Flame className="size-4" aria-hidden /> Khuyến mãi
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  const { settings, categories } = useSettings();
  return (
    <footer className="mt-16 bg-slate-900 pb-20 text-slate-400 md:pb-0">
      <div className="border-b border-slate-800">
        <div className="container-page grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {[
            [Truck, 'Giao nhanh 2h', 'Nội thành HCM & Hà Nội'],
            [ShieldCheck, 'Chính hãng 100%', 'Bảo hành 12 tháng'],
            [RotateCcw, 'Đổi trả 30 ngày', 'Miễn phí nếu lỗi NSX'],
            [Headphones, `Hotline ${settings.hotline}`, '8:00 – 22:00 mỗi ngày'],
          ].map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-brand-400">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t}</p>
                <p className="text-xs">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-3 text-sm leading-6">Cửa hàng công nghệ & phong cách sống. Mang công nghệ tốt nhất đến gần hơn với mọi người.</p>
          <p className="mt-3 text-sm">{settings.address}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Danh mục</p>
          <ul className="space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link to={`/products?category=${c.slug}`} className="hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Hỗ trợ khách hàng</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/track" className="hover:text-white">Tra cứu đơn hàng</Link></li>
            <li><Link to="/account/orders" className="hover:text-white">Lịch sử mua hàng</Link></li>
            <li><span>Chính sách đổi trả 30 ngày</span></li>
            <li><span>Chính sách bảo hành</span></li>
            <li><span>Email: {settings.email}</span></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Thanh toán an toàn</p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {['COD', 'VietQR', 'Ví điện tử', 'Thẻ ATM'].map((m) => (
              <span key={m} className="rounded-md border border-slate-700 px-2.5 py-1.5 text-slate-300">{m}</span>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5">Thông tin của bạn được mã hoá và bảo mật. Chúng tôi không lưu thông tin thẻ.</p>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs">© {new Date().getFullYear()} {settings.storeName}. Dự án demo – dữ liệu sản phẩm là minh hoạ.</div>
    </footer>
  );
}

function MobileNav() {
  const { count, openDrawer } = useCart();
  const { user } = useAuth();
  const item = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium';
  const cls = ({ isActive }) => cn(item, isActive ? 'text-brand-600' : 'text-slate-500');
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Điều hướng nhanh">
      <NavLink to="/" end className={cls}><Home className="size-5" /> Trang chủ</NavLink>
      <NavLink to="/products" className={cls}><LayoutGrid className="size-5" /> Sản phẩm</NavLink>
      <button onClick={openDrawer} className={cn(item, 'relative text-slate-500')}>
        <span className="relative">
          <ShoppingCart className="size-5" />
          {count > 0 && <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[10px] font-bold text-white">{count}</span>}
        </span>
        Giỏ hàng
      </button>
      <NavLink to={user ? '/account' : '/login'} className={cls}><User className="size-5" /> {user ? 'Tài khoản' : 'Đăng nhập'}</NavLink>
    </nav>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Bỏ qua tới nội dung</a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <CartDrawer />
    </div>
  );
}
