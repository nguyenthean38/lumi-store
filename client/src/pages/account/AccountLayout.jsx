import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Heart, KeyRound, LogOut, MapPin, Package, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, formatDate } from '../../lib/format';

const LINKS = [
  { to: '/account', end: true, label: 'Thông tin tài khoản', icon: User },
  { to: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/account/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
  { to: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { to: '/account/password', label: 'Đổi mật khẩu', icon: KeyRound },
];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="container-page py-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="card min-w-0 p-3 lg:sticky lg:top-36">
          <div className="flex items-center gap-3 border-b border-slate-100 px-2 pt-1 pb-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white">{user.name.trim().split(' ').pop()[0]}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">Thành viên từ {formatDate(user.createdAt)}</p>
            </div>
          </div>
          <nav className="scrollbar-none mt-2 flex gap-1 overflow-x-auto lg:flex-col">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50')}>
                <l.icon className="size-4.5" /> {l.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                logout();
                nav('/');
              }}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="size-4.5" /> Đăng xuất
            </button>
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
