import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, Skeleton, Switch, Textarea } from '../../components/ui';
import { PageHeader } from '../../components/admin/AdminUI';
import CategoryIcon, { CATEGORY_ICONS, categoryIconKey } from '../../components/CategoryIcon';

const COLORS = ['#6366f1', '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

function CategoryModal({ open, onClose, initial, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() =>
    initial
      ? { name: initial.name, icon: categoryIconKey(initial.icon), color: initial.color || COLORS[0], description: initial.description || '', sortOrder: String(initial.sortOrder ?? 0), isActive: initial.isActive }
      : { name: '', icon: 'package', color: COLORS[0], description: '', sortOrder: '0', isActive: true }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErrors({ name: 'Tên danh mục cần ít nhất 2 ký tự' });
    setSaving(true);
    try {
      const body = { ...form, sortOrder: Number(form.sortOrder) || 0 };
      const saved = initial ? await api.put(`/admin/categories/${initial.id}`, body) : await api.post('/admin/categories', body);
      toast.success(initial ? 'Đã cập nhật danh mục' : `Đã thêm danh mục "${saved.name}"`);
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
      open={open}
      onClose={onClose}
      title={initial ? 'Sửa danh mục' : 'Thêm danh mục'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="cat-form" loading={saving}>{initial ? 'Lưu' : 'Thêm'}</Button>
        </>
      }
    >
      <form id="cat-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${form.color}1a`, color: form.color }}>
            <CategoryIcon icon={form.icon} className="size-8" />
          </div>
          <Input className="flex-1" label="Tên danh mục" required value={form.name} onChange={(e) => { set('name', e.target.value); setErrors({}); }} error={errors.name} autoFocus />
        </div>
        <div>
          <span className="label">Biểu tượng</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([key, { label }]) => (
              <button type="button" key={key} onClick={() => set('icon', key)} title={label} className={`flex size-10 items-center justify-center rounded-xl text-slate-700 transition ${form.icon === key ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500' : 'bg-slate-100 hover:bg-slate-200'}`} aria-label={`Biểu tượng ${label}`} aria-pressed={form.icon === key}>
                <CategoryIcon icon={key} className="size-5" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Màu chủ đạo</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button type="button" key={c} onClick={() => set('color', c)} className={`size-8 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-2' : ''}`} style={{ background: c, '--tw-ring-color': c }} aria-label={`Màu ${c}`} />
            ))}
            <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="size-8 cursor-pointer rounded-full border-0 bg-transparent" aria-label="Chọn màu khác" />
          </div>
        </div>
        <Textarea label="Mô tả" optional rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={300} />
        <div className="grid grid-cols-2 items-end gap-4">
          <Input label="Thứ tự hiển thị" inputMode="numeric" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value.replace(/[^\d-]/g, ''))} hint="Số nhỏ hiển thị trước" />
          <div className="pb-6">
            <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} label="Hiển thị" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Categories() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/categories'), []);
  const [modal, setModal] = useState({ open: false, item: null });

  const remove = async (c) => {
    const ok = await confirm({ title: `Xoá danh mục "${c.name}"?`, message: c.productCount ? `Danh mục đang có ${c.productCount} sản phẩm – bạn cần chuyển sản phẩm sang danh mục khác trước.` : 'Hành động này không thể hoàn tác.', confirmText: 'Xoá', tone: 'danger' });
    if (!ok) return;
    try {
      await api.del(`/admin/categories/${c.id}`);
      toast.success('Đã xoá danh mục');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader title="Danh mục" description="Nhóm sản phẩm hiển thị trên menu và trang chủ" actions={<Button icon={Plus} onClick={() => setModal({ open: true, item: null })}>Thêm danh mục</Button>} />
      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : !data.length ? (
        <div className="card"><EmptyState icon={FolderTree} title="Chưa có danh mục" description="Tạo danh mục để phân loại sản phẩm." action={<Button icon={Plus} onClick={() => setModal({ open: true, item: null })}>Thêm danh mục</Button>} /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="card flex gap-4 p-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${c.color || '#6366f1'}1a`, color: c.color || '#6366f1' }}><CategoryIcon icon={c.icon} className="size-7" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-bold text-slate-900">{c.name}</h3>
                  {!c.isActive && <Badge>Đang ẩn</Badge>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{c.description || 'Chưa có mô tả'}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Link to={`/admin/products?categoryId=${c.id}`} className="text-xs font-semibold text-brand-600 hover:underline">{c.productCount} sản phẩm</Link>
                  <span className="text-xs text-slate-400">Thứ tự {c.sortOrder}</span>
                  <div className="flex">
                    <button onClick={() => setModal({ open: true, item: c })} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600" aria-label={`Sửa ${c.name}`}><Pencil className="size-4" /></button>
                    <button onClick={() => remove(c)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xoá ${c.name}`}><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && <CategoryModal key={modal.item?.id ?? 'new'} open initial={modal.item} onClose={() => setModal({ open: false, item: null })} onSaved={reload} />}
    </div>
  );
}
