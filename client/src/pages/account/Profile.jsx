import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Package, Truck } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { Button, Input } from '../../components/ui';
import { PHONE_RE } from '../../lib/format';

export default function Profile() {
  useDocumentTitle('Tài khoản');
  const { user, setUser, wishlist } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { data } = useFetch(() => api.get('/me/orders', { limit: 1 }), []);
  const counts = data?.statusCounts || {};

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Họ tên cần ít nhất 2 ký tự';
    if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, ''))) errs.phone = 'Số điện thoại không hợp lệ';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const d = await api.put('/auth/me', { name: form.name.trim(), phone: form.phone.replace(/\s/g, '') });
      setUser(d.user);
      toast.success('Đã cập nhật thông tin');
    } catch (err) {
      setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Chờ xác nhận', value: counts.pending || 0, icon: Clock, to: '/account/orders?status=pending', color: 'text-amber-600 bg-amber-50' },
    { label: 'Đang giao', value: (counts.shipping || 0) + (counts.confirmed || 0), icon: Truck, to: '/account/orders?status=shipping', color: 'text-violet-600 bg-violet-50' },
    { label: 'Đã giao', value: counts.delivered || 0, icon: Package, to: '/account/orders?status=delivered', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Yêu thích', value: wishlist.size, icon: Heart, to: '/account/wishlist', color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
            <span className={`flex size-10 items-center justify-center rounded-xl ${s.color}`}><s.icon className="size-5" /></span>
            <span>
              <span className="block text-xl font-bold text-slate-900">{s.value}</span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </span>
          </Link>
        ))}
      </div>
      <form onSubmit={save} className="card p-6">
        <h1 className="mb-5 text-lg font-bold text-slate-900">Thông tin cá nhân</h1>
        <div className="grid max-w-xl gap-4">
          <Input label="Họ và tên" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={user.email} disabled hint="Email dùng để đăng nhập, không thể thay đổi" />
          <Input label="Số điện thoại" type="tel" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div>
            <Button type="submit" loading={saving}>Lưu thay đổi</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
