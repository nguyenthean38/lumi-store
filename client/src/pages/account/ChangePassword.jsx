import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useFetch';
import { Button, Input } from '../../components/ui';

export default function ChangePassword() {
  useDocumentTitle('Đổi mật khẩu');
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (form.newPassword.length < 6) errs.newPassword = 'Mật khẩu mới cần ít nhất 6 ký tự';
    if (form.confirm !== form.newPassword) errs.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await api.put('/auth/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Đổi mật khẩu thành công');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setErrors(err.fields);
      if (!Object.keys(err.fields).length) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card p-6">
      <h1 className="mb-5 text-lg font-bold text-slate-900">Đổi mật khẩu</h1>
      <div className="grid max-w-md gap-4">
        <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={form.currentPassword} error={errors.currentPassword} onChange={set('currentPassword')} />
        <Input label="Mật khẩu mới" type="password" autoComplete="new-password" value={form.newPassword} error={errors.newPassword} onChange={set('newPassword')} hint="Ít nhất 6 ký tự" />
        <Input label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={set('confirm')} />
        <div><Button type="submit" loading={saving}>Cập nhật mật khẩu</Button></div>
      </div>
    </form>
  );
}
