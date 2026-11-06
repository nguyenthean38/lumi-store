import { useState } from 'react';
import { Copy, Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { cn, formatDate, formatVND, parseDate } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, Select, Switch } from '../../components/ui';
import { PageHeader, TableSkeleton, TableWrap, Td, Th } from '../../components/admin/AdminUI';

function couponState(c) {
  const now = Date.now();
  if (!c.isActive) return { label: 'Tắt', tone: 'slate' };
  if (c.expiresAt && parseDate(c.expiresAt)?.getTime() < now) return { label: 'Hết hạn', tone: 'rose' };
  if (c.startsAt && parseDate(c.startsAt)?.getTime() > now) return { label: 'Chưa bắt đầu', tone: 'sky' };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { label: 'Hết lượt', tone: 'amber' };
  return { label: 'Đang chạy', tone: 'emerald' };
}

function describe(c) {
  if (c.type === 'freeship') return 'Miễn phí vận chuyển';
  if (c.type === 'percent') return `Giảm ${c.value}%${c.maxDiscount ? ` (tối đa ${formatVND(c.maxDiscount)})` : ''}`;
  return `Giảm ${formatVND(c.value)}`;
}

const digits = (v) => String(v ?? '').replace(/\D/g, '');

function CouponModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() =>
    initial
      ? {
          code: initial.code,
          description: initial.description || '',
          type: initial.type,
          value: String(initial.value ?? ''),
          maxDiscount: initial.maxDiscount != null ? String(initial.maxDiscount) : '',
          minOrder: String(initial.minOrder ?? 0),
          usageLimit: initial.usageLimit != null ? String(initial.usageLimit) : '',
          startsAt: initial.startsAt ? initial.startsAt.slice(0, 10) : '',
          expiresAt: initial.expiresAt ? initial.expiresAt.slice(0, 10) : '',
          isActive: initial.isActive,
        }
      : { code: '', description: '', type: 'percent', value: '10', maxDiscount: '', minOrder: '0', usageLimit: '', startsAt: '', expiresAt: '', isActive: true }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[A-Z0-9_-]{3,30}$/.test(form.code)) errs.code = 'Mã chỉ gồm chữ in hoa, số, gạch ngang (3-30 ký tự)';
    if (form.type === 'percent' && !(Number(form.value) >= 1 && Number(form.value) <= 100)) errs.value = 'Phần trăm giảm phải từ 1 đến 100';
    if (form.type === 'fixed' && !(Number(form.value) > 0)) errs.value = 'Vui lòng nhập số tiền giảm';
    if (form.startsAt && form.expiresAt && form.startsAt > form.expiresAt) errs.expiresAt = 'Ngày kết thúc phải sau ngày bắt đầu';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        value: form.type === 'freeship' ? 0 : Number(form.value),
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        minOrder: Number(form.minOrder) || 0,
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      };
      if (initial) await api.put(`/admin/coupons/${initial.id}`, body);
      else await api.post('/admin/coupons', body);
      toast.success(initial ? 'Đã cập nhật mã giảm giá' : `Đã tạo mã ${form.code}`);
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
      onClose={onClose}
      title={initial ? `Sửa mã ${initial.code}` : 'Tạo mã giảm giá'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="coupon-form" loading={saving}>{initial ? 'Lưu' : 'Tạo mã'}</Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Mã" required value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} error={errors.code} placeholder="VD: SALE50K" className="sm:col-span-1" autoFocus inputClassName="font-mono font-semibold tracking-wider" />
        <Select label="Loại giảm giá" required value={form.type} onChange={(e) => set('type', e.target.value)}>
          <option value="percent">Giảm theo %</option>
          <option value="fixed">Giảm số tiền cố định</option>
          <option value="freeship">Miễn phí vận chuyển</option>
        </Select>
        <Input className="sm:col-span-2" label="Mô tả" optional value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={200} placeholder="Hiển thị cho khách, VD: Giảm 10% cho đơn từ 1 triệu" />
        {form.type !== 'freeship' && (
          <Input
            label={form.type === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm'}
            required
            inputMode="numeric"
            value={form.type === 'fixed' && form.value ? Number(form.value).toLocaleString('vi-VN') : form.value}
            onChange={(e) => set('value', digits(e.target.value))}
            error={errors.value}
            right={<span className="pr-3 text-sm font-semibold text-slate-400">{form.type === 'percent' ? '%' : '₫'}</span>}
          />
        )}
        {form.type === 'percent' && (
          <Input label="Giảm tối đa" optional inputMode="numeric" value={form.maxDiscount ? Number(form.maxDiscount).toLocaleString('vi-VN') : ''} onChange={(e) => set('maxDiscount', digits(e.target.value))} error={errors.maxDiscount} right={<span className="pr-3 text-sm font-semibold text-slate-400">₫</span>} placeholder="Không giới hạn" />
        )}
        <Input label="Đơn tối thiểu" inputMode="numeric" value={form.minOrder ? Number(form.minOrder).toLocaleString('vi-VN') : '0'} onChange={(e) => set('minOrder', digits(e.target.value))} error={errors.minOrder} right={<span className="pr-3 text-sm font-semibold text-slate-400">₫</span>} />
        <Input label="Giới hạn lượt dùng" optional inputMode="numeric" value={form.usageLimit} onChange={(e) => set('usageLimit', digits(e.target.value))} error={errors.usageLimit} placeholder="Không giới hạn" hint={initial ? `Đã dùng ${initial.usedCount} lượt` : undefined} />
        <Input label="Ngày bắt đầu" optional type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} error={errors.startsAt} />
        <Input label="Ngày kết thúc" optional type="date" value={form.expiresAt} min={form.startsAt || undefined} onChange={(e) => set('expiresAt', e.target.value)} error={errors.expiresAt} />
        <div className="sm:col-span-2">
          <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} label="Kích hoạt" description="Tắt để tạm dừng mã mà không xoá" />
        </div>
      </form>
    </Modal>
  );
}

export default function Coupons() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/coupons'), []);
  const [modal, setModal] = useState(null); // null | { item }

  const remove = async (c) => {
    if (!(await confirm({ title: `Xoá mã ${c.code}?`, message: 'Khách hàng sẽ không thể sử dụng mã này nữa. Đơn hàng cũ không bị ảnh hưởng.', confirmText: 'Xoá', tone: 'danger' }))) return;
    try {
      await api.del(`/admin/coupons/${c.id}`);
      toast.success('Đã xoá mã giảm giá');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const copy = (code) => {
    navigator.clipboard?.writeText(code).then(() => toast.success(`Đã sao chép ${code}`), () => {});
  };

  return (
    <div>
      <PageHeader title="Mã giảm giá" description="Tạo khuyến mãi theo %, số tiền hoặc miễn phí vận chuyển" actions={<Button icon={Plus} onClick={() => setModal({ item: null })}>Tạo mã</Button>} />
      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : !loading && data?.length === 0 ? (
        <div className="card"><EmptyState icon={TicketPercent} title="Chưa có mã giảm giá" description="Tạo mã đầu tiên để kích cầu mua sắm." action={<Button icon={Plus} onClick={() => setModal({ item: null })}>Tạo mã</Button>} /></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Mã</Th>
              <Th>Ưu đãi</Th>
              <Th className="text-right">Đơn tối thiểu</Th>
              <Th>Lượt dùng</Th>
              <Th>Thời hạn</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          {loading && !data ? (
            <TableSkeleton cols={7} />
          ) : (
            <tbody>
              {data.map((c) => {
                const st = couponState(c);
                const pct = c.usageLimit ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : null;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <button onClick={() => copy(c.code)} className="group inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-brand-700" title="Sao chép">
                        {c.code}
                        <Copy className="size-3.5 opacity-50 group-hover:opacity-100" />
                      </button>
                      {c.description && <p className="mt-1 max-w-56 truncate text-xs text-slate-500" title={c.description}>{c.description}</p>}
                    </Td>
                    <Td className="max-w-52 min-w-40 font-medium text-slate-800">{describe(c)}</Td>
                    <Td className="text-right whitespace-nowrap tabular-nums">{c.minOrder ? formatVND(c.minOrder) : '—'}</Td>
                    <Td className="min-w-32">
                      <div className="text-sm tabular-nums">
                        {c.usedCount}
                        <span className="text-slate-400"> / {c.usageLimit ?? '∞'}</span>
                      </div>
                      {pct != null && (
                        <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100">
                          <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-slate-500">
                      {c.startsAt || c.expiresAt ? (
                        <>
                          <span className="block">Từ {c.startsAt ? formatDate(c.startsAt) : 'ngay'}</span>
                          <span className="block">Đến {c.expiresAt ? formatDate(c.expiresAt) : 'không hạn'}</span>
                        </>
                      ) : (
                        'Không giới hạn'
                      )}
                    </Td>
                    <Td><Badge tone={st.tone} dot>{st.label}</Badge></Td>
                    <Td className="text-right whitespace-nowrap">
                      <button onClick={() => setModal({ item: c })} className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600" aria-label={`Sửa ${c.code}`}><Pencil className="size-4" /></button>
                      <button onClick={() => remove(c)} className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Xoá ${c.code}`}><Trash2 className="size-4" /></button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </TableWrap>
      )}
      {modal && <CouponModal key={modal.item?.id ?? 'new'} initial={modal.item} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}
