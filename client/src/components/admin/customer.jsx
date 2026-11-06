import { api } from '../../lib/api';
import { cn } from '../../lib/format';

export function Avatar({ name, className }) {
  const letter = (name || '?').trim().split(/\s+/).pop()[0]?.toUpperCase();
  const hues = ['from-brand-500 to-violet-500', 'from-sky-500 to-cyan-500', 'from-rose-500 to-orange-400', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500'];
  const h = hues[(name || '').length % hues.length];
  return <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white', h, className)}>{letter}</span>;
}

export async function toggleLock(customer, { confirm, toast }) {
  const locking = customer.status === 'active';
  const ok = await confirm({
    title: locking ? `Khoá tài khoản ${customer.name}?` : `Mở khoá tài khoản ${customer.name}?`,
    message: locking ? 'Khách hàng sẽ không thể đăng nhập và đặt hàng bằng tài khoản này.' : 'Khách hàng sẽ đăng nhập và mua sắm bình thường.',
    confirmText: locking ? 'Khoá tài khoản' : 'Mở khoá',
    tone: locking ? 'danger' : undefined,
  });
  if (!ok) return null;
  try {
    const r = await api.patch(`/admin/customers/${customer.id}`, { status: locking ? 'locked' : 'active' });
    toast.success(locking ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
    return r.customer;
  } catch (e) {
    toast.error(e.message);
    return null;
  }
}

