import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, Checkbox, EmptyState, ErrorState, Input, Modal, Select, Skeleton } from '../../components/ui';
import { PROVINCES } from '../../lib/provinces';
import { PHONE_RE } from '../../lib/format';

const EMPTY = { fullName: '', phone: '', province: '', ward: '', street: '', isDefault: false };

export default function Addresses() {
  useDocumentTitle('Sổ địa chỉ');
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch(() => api.get('/me/addresses'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const open = (a) => {
    setEditing(a || {});
    setForm(a ? { fullName: a.fullName, phone: a.phone, province: a.province, ward: a.ward || '', street: a.street, isDefault: a.isDefault } : EMPTY);
    setErrors({});
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    const errs = {};
    if (form.fullName.trim().length < 2) errs.fullName = 'Vui lòng nhập họ tên';
    if (!PHONE_RE.test(form.phone.replace(/\s/g, ''))) errs.phone = 'Số điện thoại không hợp lệ';
    if (!form.province) errs.province = 'Vui lòng chọn Tỉnh/Thành phố';
    if (form.ward.trim().length < 2) errs.ward = 'Vui lòng nhập Phường/Xã';
    if (form.street.trim().length < 3) errs.street = 'Vui lòng nhập địa chỉ cụ thể';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = { ...form, phone: form.phone.replace(/\s/g, '') };
      if (editing.id) await api.put(`/me/addresses/${editing.id}`, body);
      else await api.post('/me/addresses', body);
      toast.success('Đã lưu địa chỉ');
      setEditing(null);
      reload();
    } catch (e) {
      setErrors(e.fields);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    if (!(await confirm({ title: 'Xoá địa chỉ này?', message: [a.street, a.ward, a.province].join(', '), confirmText: 'Xoá', tone: 'danger' }))) return;
    try {
      await api.del(`/me/addresses/${a.id}`);
      toast.success('Đã xoá địa chỉ');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const makeDefault = async (a) => {
    try {
      await api.put(`/me/addresses/${a.id}`, { ...a, ward: a.ward || '', isDefault: true });
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <h1 className="text-lg font-bold text-slate-900">Sổ địa chỉ</h1>
        <Button size="sm" icon={Plus} onClick={() => open(null)}>Thêm địa chỉ</Button>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3 p-4">{[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !data.length ? (
        <EmptyState icon={MapPin} title="Chưa có địa chỉ nào" description="Thêm địa chỉ để thanh toán nhanh hơn ở lần mua tiếp theo." action={<Button icon={Plus} onClick={() => open(null)}>Thêm địa chỉ</Button>} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                  {a.fullName} <span className="font-normal text-slate-400">|</span> <span className="font-normal text-slate-600">{a.phone}</span>
                  {a.isDefault && <Badge tone="brand">Mặc định</Badge>}
                </p>
                <p className="mt-1 text-sm text-slate-600">{[a.street, a.ward, a.province].filter(Boolean).join(', ')}</p>
              </div>
              <div className="flex items-center gap-1">
                {!a.isDefault && <Button variant="ghost" size="sm" onClick={() => makeDefault(a)}>Đặt mặc định</Button>}
                <Button variant="ghost" size="icon-sm" aria-label="Sửa" onClick={() => open(a)}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Xoá" onClick={() => remove(a)} className="hover:text-rose-600"><Trash2 className="size-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Huỷ</Button>
            <Button loading={saving} onClick={save}>Lưu địa chỉ</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Họ tên người nhận" required value={form.fullName} error={errors.fullName} onChange={set('fullName')} />
          <Input label="Số điện thoại" required type="tel" value={form.phone} error={errors.phone} onChange={set('phone')} />
          <Select label="Tỉnh / Thành phố" required placeholder="— Chọn —" value={form.province} error={errors.province} onChange={set('province')}>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Phường / Xã" required value={form.ward} error={errors.ward} onChange={set('ward')} placeholder="VD: Phường Bến Thành" />
          <Input label="Địa chỉ cụ thể" required className="sm:col-span-2" value={form.street} error={errors.street} onChange={set('street')} placeholder="Số nhà, tên đường" />
          <Checkbox className="sm:col-span-2" checked={form.isDefault} onChange={(v) => setForm({ ...form, isDefault: v })} label="Đặt làm địa chỉ mặc định" />
        </div>
      </Modal>
    </div>
  );
}
