import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  TicketPercent,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useFetch';

const NAV = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag, badge: 'pending' },
  { to: '/admin/products', label: 'Sản phẩm', icon: Package },
  { to: '/admin/categories', label: 'Danh mục', icon: FolderTree },
  { to: '/admin/customers', label: 'Khách hàng', icon: Users },
  { to: '/admin/coupons', label: 'Mã giảm giá', icon: TicketPercent },
  { to: '/admin/reviews', label: 'Đánh giá', icon: MessageSquareText },
  { to: '/admin/banners', label: 'Banner', icon: ImageIcon },
  { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

const TITLES = [
  [/^\/admin\/products\/new/, 'Thêm sản phẩm'],
  [/^\/admin\/products\/\d+/, 'Chỉnh sửa sản phẩm'],
  [/^\/admin\/orders\/\d+/, 'Chi tiết đơn hàng'],
  [/^\/admin\/customers\/\d+/, 'Chi tiết khách hàng'],
  ...NAV.slice(1).map((n) => [new RegExp(`^${n.to}`), n.label]),
  [/^\/admin\/?$/, 'Tổng quan'],
];

function Brand({ collapsed }) {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 px-1">
      <img src="/favicon.svg" alt="" className="size-9 rounded-xl" />
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-base font-extrabold text-slate-900">Lumi Admin</span>
          <span className="block text-[11px] font-medium text-slate-500">Quản trị cửa hàng</span>
        </span>
      )}
    </Link>
  );
}

function NavItems({ collapsed, pending, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Điều hướng quản trị">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          title={collapsed ? n.label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
              isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              collapsed && 'justify-center px-0'
            )
          }
        >
          {({ isActive }) => (
            <>
              <n.icon className="size-5 shrink-0" />
              {!collapsed && <span className="flex-1">{n.label}</span>}
              {n.badge === 'pending' && pending > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs font-bold tabular-nums',
                    isActive ? 'bg-white/25 text-white' : 'bg-orange-500 text-white',
                    collapsed && 'absolute top-1 right-1 min-w-4 px-1 text-[10px]'
                  )}
                  aria-label={`${pending} đơn chờ xác nhận`}
                >
                  {pending > 99 ? '99+' : pending}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useLocalStorage('lumi_admin_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshBadge = useCallback(() => {
    api
      .get('/admin/orders', { status: 'pending', limit: 1 })
      .then((d) => setPending(d.total))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBadge();
    const t = setInterval(refreshBadge, 60000);
    return () => clearInterval(t);
  }, [refreshBadge]);

  useEffect(() => setMobileOpen(false), [loc.pathname]);

  const title = TITLES.find(([re]) => re.test(loc.pathname))?.[1] || 'Quản trị';
  useEffect(() => {
    document.title = `${title} | Lumi Admin`;
  }, [title]);

  const doLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex print:hidden',
          collapsed ? 'w-[76px]' : 'w-64'
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-slate-100', collapsed ? 'justify-center px-2' : 'px-4')}>
          <Brand collapsed={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavItems collapsed={collapsed} pending={pending} />
        </div>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              collapsed && 'justify-center px-0'
            )}
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            {!collapsed && 'Thu gọn'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-slide-up flex-col bg-white shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Brand />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavItems pending={pending} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64', 'print:pl-0')}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở menu">
            <Menu className="size-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">{title}</h1>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-brand-700 sm:inline-flex"
          >
            <ExternalLink className="size-4" />
            Xem cửa hàng
          </a>
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
              {(user?.name || 'A').trim().split(/\s+/).pop()[0]?.toUpperCase()}
            </span>
            <span className="hidden leading-tight md:block">
              <span className="block text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="block text-xs text-slate-500">{user?.email}</span>
            </span>
            <button onClick={doLogout} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut className="size-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 print:p-0">
          <Outlet context={{ refreshBadge }} />
        </main>
      </div>
    </div>
  );
}
