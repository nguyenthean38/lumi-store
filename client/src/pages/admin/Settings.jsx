import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { Button, ErrorState, Input, PageLoader } from '../../components/ui';
import { PageHeader, Panel } from '../../components/admin/AdminUI';

const FIELDS = ['store_name', 'hotline', 'email', 'address', 'shipping_fee', 'free_shipping_threshold', 'bank_name', 'bank_bin', 'bank_account', 'bank_owner', 'low_stock_threshold'];

export default function Settings() {
  const toast = useToast();
  const { reload: reloadPublic } = useSettings();
  const [form, setForm] = useState(null);
  const [initial, setInitial] = useState(null);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setError(null);
    api
      .get('/admin/settings')
      .then((s) => {
        const f = Object.fromEntries(FIELDS.map((k) => [k, s[k] ?? '']));
        setForm(f);
        setInitial(f);
      })
      .catch(setError);
  };
  useEffect(load, []);

  const dirty = useMemo(() => form && JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!form) return <PageLoader />;

  const set = (k) => (e) => {
    const numeric = ['shipping_fee', 'free_shipping_threshold', 'low_stock_threshold', 'bank_bin', 'bank_account'];
    const v = numeric.includes(k) ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.store_name.trim().length < 2) return setErrors({ store_name: 'Vui lòng nhập tên cửa hàng' });
    setSaving(true);
    try {
      const s = await api.put('/admin/settings', form);
      const f = Object.fromEntries(FIELDS.map((k) => [k, s[k] ?? '']));
      setForm(f);
      setInitial(f);
      reloadPublic?.();
      toast.success('Đã lưu cài đặt');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const qr =
    form.bank_bin && form.bank_account
      ? `https://img.vietqr.io/image/${form.bank_bin}-${form.bank_account}-compact2.png?amount=100000&addInfo=${encodeURIComponent('LM DEMO')}&accountName=${encodeURIComponent(form.bank_owner)}`
      : null;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title="Cài đặt cửa hàng"
        description="Thông tin hiển thị cho khách và quy tắc vận chuyển"
        actions={
          <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>
            {dirty ? 'Lưu thay đổi' : 'Đã lưu'}
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Thông tin cửa hàng">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="Tên cửa hàng" required value={form.store_name} onChange={set('store_name')} error={errors.store_name} />
            <Input label="Hotline" value={form.hotline} onChange={set('hotline')} error={errors.hotline} />
            <Input label="Email hỗ trợ" type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input className="sm:col-span-2" label="Địa chỉ" value={form.address} onChange={set('address')} error={errors.address} />
          </div>
        </Panel>

        <Panel title="Vận chuyển & tồn kho">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phí vận chuyển mặc định" inputMode="numeric" value={form.shipping_fee} onChange={set('shipping_fee')} error={errors.shipping_fee} right={<span className="pr-3 text-sm font-semibold text-slate-400">₫</span>} hint={formatVND(form.shipping_fee)} />
            <Input label="Miễn phí ship cho đơn từ" inputMode="numeric" value={form.free_shipping_threshold} onChange={set('free_shipping_threshold')} error={errors.free_shipping_threshold} right={<span className="pr-3 text-sm font-semibold text-slate-400">₫</span>} hint={Number(form.free_shipping_threshold) > 0 ? formatVND(form.free_shipping_threshold) : 'Nhập 0 để tắt miễn phí ship'} />
            <Input label="Ngưỡng cảnh báo sắp hết hàng" inputMode="numeric" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} error={errors.low_stock_threshold} hint="Sản phẩm có tồn kho ≤ ngưỡng sẽ hiện cảnh báo trên Tổng quan" />
          </div>
        </Panel>

        <Panel title="Tài khoản nhận chuyển khoản (VietQR)" className="lg:col-span-2">
          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Tên ngân hàng" value={form.bank_name} onChange={set('bank_name')} error={errors.bank_name} placeholder="Vietcombank" />
              <Input label="Mã BIN ngân hàng" inputMode="numeric" value={form.bank_bin} onChange={set('bank_bin')} error={errors.bank_bin} hint="VD: Vietcombank 970436, Techcombank 970407" />
              <Input label="Số tài khoản" inputMode="numeric" value={form.bank_account} onChange={set('bank_account')} error={errors.bank_account} />
              <Input label="Chủ tài khoản" value={form.bank_owner} onChange={(e) => set('bank_owner')({ target: { value: e.target.value.toUpperCase() } })} error={errors.bank_owner} hint="Viết hoa không dấu" />
            </div>
            <div className="text-center">
              <span className="label">Xem trước mã QR</span>
              {qr ? <img src={qr} alt="Mã VietQR xem trước" className="mx-auto w-full max-w-52 rounded-xl border border-slate-200 bg-white p-2" /> : <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">Nhập BIN và số tài khoản</div>}
              <p className="mt-1.5 text-xs text-slate-400">Mẫu với số tiền 100.000₫</p>
            </div>
          </div>
        </Panel>
      </div>
    </form>
  );
}
