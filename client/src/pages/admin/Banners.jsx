import { useState } from 'react';
import { Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { cn } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, Skeleton, Switch, Textarea } from '../../components/ui';
import { ImageUploader, PageHeader } from '../../components/admin/AdminUI';

const GRADIENTS = [
  'linear-gradient(120deg, #4f46e5, #7c3aed)',
  'linear-gradient(120deg, #0284c7, #0d9488)',
  'linear-gradient(120deg, #ea580c, #db2777)',
  'linear-gradient(120deg, #059669, #65a30d)',
  'linear-gradient(120deg, #0f172a, #334155)',
];

function BannerPreview({ b, className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl text-white', className)} style={{ background: b.color || GRADIENTS[0] }}>
      {b.image && <img src={b.image} alt="" className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
      <div className="relative flex h-full flex-col justify-center p-5">
        <p className="line-clamp-2 text-lg leading-tight font-extrabold drop-shadow">{b.title || 'Tiêu đề banner'}</p>
        {b.subtitle && <p className="mt-1 line-clamp-2 max-w-[75%] text-xs text-white/85">{b.subtitle}</p>}
        {b.buttonText && <span className="mt-3 inline-flex w-fit rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900">{b.buttonText}</span>}
      </div>
    </div>
  );
}

function BannerModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    subtitle: initial?.subtitle || '',
    image: initial?.image || '',
    link: initial?.link || '/products',
    buttonText: initial?.buttonText || 'Mua ngay',
    color: initial?.color || GRADIENTS[0],
    sortOrder: String(initial?.sortOrder ?? 0),
    isActive: initial?.isActive ?? true,
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 2) return setErrors({ title: 'Vui lòng nhập tiêu đề' });
    setSaving(true);
    try {
      const body = { ...form, sortOrder: Number(form.sortOrder) || 0 };
      if (initial) await api.put(`/admin/banners/${initial.id}`, body);
      else await api.post('/admin/banners', body);
      toast.success(initial ? 'Đã cập nhật banner' : 'Đã thêm banner');
      onSaved();
      onClose();
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={initial ? 'Sửa banner' : 'Thêm banner'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="banner-form" loading={saving}>{initial ? 'Lưu' : 'Thêm'}</Button>
        </>
      }
    >
      <BannerPreview b={form} className="mb-5 aspect-[12/5]" />
      <form id="banner-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input className="sm:col-span-2" label="Tiêu đề" required value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} maxLength={120} autoFocus />
        <Textarea className="sm:col-span-2" label="Mô tả phụ" optional rows={2} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} maxLength={300} />
        <Input label="Đường dẫn khi bấm" optional value={form.link} onChange={(e) => set('link', e.target.value)} error={errors.link} placeholder="/products?onSale=1" />
        <Input label="Chữ trên nút" optional value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} maxLength={40} />
        <div className="sm:col-span-2">
          <span className="label">Hình ảnh <span className="text-xs font-normal text-slate-400">(không bắt buộc – nên dùng tỉ lệ 12:5)</span></span>
          <ImageUploader single value={form.image ? [form.image] : []} onChange={(arr) => set('image', arr[0] || '')} />
        </div>
        <div className="sm:col-span-2">
          <span className="label">Màu nền (hiện khi không có ảnh)</span>
          <div className="flex flex-wrap gap-2">
            {GRADIENTS.map((g) => (
              <button type="button" key={g} onClick={() => set('color', g)} className={cn('h-9 w-16 rounded-lg transition', form.color === g && 'ring-2 ring-brand-500 ring-offset-2')} style={{ background: g }} aria-label="Chọn màu nền" />
            ))}
          </div>
          <input value={form.color} onChange={(e) => set('color', e.target.value)} className="input mt-2 font-mono text-xs" aria-label="CSS màu nền" placeholder="linear-gradient(...) hoặc #hex" />
        </div>
        <Input label="Thứ tự" inputMode="numeric" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value.replace(/[^\d-]/g, ''))} hint="Số nhỏ hiển thị trước" />
        <div className="flex items-center pt-5">
          <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} label="Hiển thị trên trang chủ" />
        </div>
      </form>
    </Modal>
  );
}

export default function Banners() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/banners'), []);
  const [modal, setModal] = useState(null);

  const remove = async (b) => {
    if (!(await confirm({ title: `Xoá banner "${b.title}"?`, confirmText: 'Xoá', tone: 'danger' }))) return;
    try {
      await api.del(`/admin/banners/${b.id}`);
      toast.success('Đã xoá banner');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader title="Banner trang chủ" description="Ảnh trình chiếu ở đầu trang chủ" actions={<Button icon={Plus} onClick={() => setModal({ item: null })}>Thêm banner</Button>} />
      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && !data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <div className="card"><EmptyState icon={ImageIcon} title="Chưa có banner" description="Thêm banner để quảng bá chương trình khuyến mãi." action={<Button icon={Plus} onClick={() => setModal({ item: null })}>Thêm banner</Button>} /></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <div key={b.id} className={cn('card overflow-hidden', !b.isActive && 'opacity-70')}>
              <BannerPreview b={b} className="aspect-[12/5] rounded-none" />
              <div className="flex items-center gap-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{b.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    #{b.sortOrder} · {b.link || 'Không có liên kết'}
                  </p>
                </div>
                {b.isActive ? <Badge tone="emerald" dot>Hiển thị</Badge> : <Badge>Ẩn</Badge>}
                <button onClick={() => setModal({ item: b })} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600" aria-label={`Sửa ${b.title}`}><Pencil className="size-4" /></button>
                <button onClick={() => remove(b)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xoá ${b.title}`}><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <BannerModal key={modal.item?.id ?? 'new'} initial={modal.item} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}
