import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Button, ErrorState, Input, PageLoader, Select, Switch, Textarea } from '../../components/ui';
import { ImageUploader, Panel } from '../../components/admin/AdminUI';

const EMPTY = {
  name: '',
  categoryId: '',
  sku: '',
  brand: '',
  shortDesc: '',
  description: '',
  price: '',
  salePrice: '',
  stock: '0',
  images: [],
  specs: [],
  tags: '',
  isActive: true,
  isFeatured: false,
  isFlashSale: false,
};

function fromProduct(p) {
  return {
    name: p.name || '',
    categoryId: p.categoryId ? String(p.categoryId) : '',
    sku: p.sku || '',
    brand: p.brand || '',
    shortDesc: p.shortDesc || '',
    description: p.description || '',
    price: String(p.price ?? ''),
    salePrice: p.salePrice != null ? String(p.salePrice) : '',
    stock: String(p.stock ?? 0),
    images: p.images || [],
    specs: (p.specs || []).map((s) => ({ ...s })),
    tags: (p.tags || []).join(', '),
    isActive: !!p.isActive,
    isFeatured: !!p.isFeatured,
    isFlashSale: !!p.isFlashSale,
  };
}

const digits = (v) => v.replace(/\D/g, '');

/** Money input that shows thousands separators while storing plain digits. */
function MoneyInput({ value, onChange, ...props }) {
  const shown = value === '' ? '' : Number(value).toLocaleString('vi-VN');
  return (
    <Input
      inputMode="numeric"
      value={shown}
      onChange={(e) => onChange(digits(e.target.value))}
      right={<span className="pr-3 text-sm font-semibold text-slate-400">₫</span>}
      {...props}
    />
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [initial, setInitial] = useState(EMPTY);
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([api.get('/admin/categories'), isNew ? null : api.get(`/admin/products/${id}`)])
      .then(([cats, p]) => {
        setCategories(cats);
        const f = p ? fromProduct(p) : { ...EMPTY, categoryId: cats[0] ? String(cats[0].id) : '' };
        setForm(f);
        setInitial(f);
        setProduct(p);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => {
      if (savedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const setE = (k) => (e) => set(k)(e.target.value);

  const price = Number(form.price) || 0;
  const sale = form.salePrice === '' ? null : Number(form.salePrice);
  const discount = sale != null && price > 0 && sale < price ? Math.round((1 - sale / price) * 100) : 0;

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Tên sản phẩm cần ít nhất 2 ký tự';
    if (!form.categoryId) e.categoryId = 'Vui lòng chọn danh mục';
    if (form.price === '') e.price = 'Vui lòng nhập giá bán';
    if (sale != null && sale >= price) e.salePrice = 'Giá khuyến mãi phải nhỏ hơn giá gốc';
    if (form.stock === '') e.stock = 'Vui lòng nhập tồn kho';
    return e;
  };

  const submit = async (ev) => {
    ev?.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0]);
      return;
    }
    const payload = {
      ...form,
      categoryId: Number(form.categoryId),
      price: Number(form.price),
      salePrice: form.salePrice === '' ? null : Number(form.salePrice),
      stock: Number(form.stock),
      specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
    };
    setSaving(true);
    try {
      const saved = isNew ? await api.post('/admin/products', payload) : await api.put(`/admin/products/${id}`, payload);
      savedRef.current = true;
      toast.success(isNew ? `Đã thêm sản phẩm "${saved.name}"` : 'Đã lưu thay đổi');
      navigate('/admin/products');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang?')) return;
    navigate('/admin/products');
  };

  if (loading) return <PageLoader />;
  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  const updateSpec = (i, k, v) => set('specs')(form.specs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={leave} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Quay lại">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{isNew ? 'Thêm sản phẩm mới' : form.name || 'Chỉnh sửa sản phẩm'}</h1>
            <p className="text-sm text-slate-500">
              {isNew ? 'Điền thông tin và lưu để đăng bán' : `Mã #${id}${product?.sold ? ` · Đã bán ${product.sold}` : ''}`}
              {dirty && <span className="ml-2 font-medium text-amber-600">● Chưa lưu</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && product?.isActive && (
            <a href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" icon={ExternalLink}>Xem trên shop</Button>
            </a>
          )}
          <Button type="submit" icon={Save} loading={saving}>
            {isNew ? 'Thêm sản phẩm' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Thông tin cơ bản">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input className="sm:col-span-2" label="Tên sản phẩm" required value={form.name} onChange={setE('name')} error={errors.name} placeholder="VD: Tai nghe Aura Buds Pro 3" maxLength={200} />
              <Select label="Danh mục" required value={form.categoryId} onChange={setE('categoryId')} error={errors.categoryId} placeholder="-- Chọn danh mục --">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input label="Thương hiệu" optional value={form.brand} onChange={setE('brand')} error={errors.brand} placeholder="VD: Aura" />
              <Input label="Mã SKU" optional value={form.sku} onChange={setE('sku')} error={errors.sku} placeholder="VD: LM-03011" hint="Mã quản lý kho, không trùng lặp" />
              <Input label="Từ khoá (tags)" optional value={form.tags} onChange={setE('tags')} error={errors.tags} placeholder="tai nghe, chong on" hint="Phân cách bằng dấu phẩy, giúp tìm kiếm tốt hơn" />
              <Input className="sm:col-span-2" label="Mô tả ngắn" optional value={form.shortDesc} onChange={setE('shortDesc')} error={errors.shortDesc} maxLength={300} placeholder="Hiển thị dưới tên sản phẩm" />
              <Textarea className="sm:col-span-2" label="Mô tả chi tiết" optional rows={8} value={form.description} onChange={setE('description')} error={errors.description} placeholder="Giới thiệu, điểm nổi bật, bộ sản phẩm gồm..." hint="Xuống dòng sẽ được giữ nguyên. Dùng “• ” để tạo gạch đầu dòng." />
            </div>
          </Panel>

          <Panel title="Hình ảnh">
            <ImageUploader value={form.images} onChange={set('images')} />
          </Panel>

          <Panel
            title="Thông số kỹ thuật"
            action={
              <Button size="xs" variant="soft" icon={Plus} onClick={() => set('specs')([...form.specs, { label: '', value: '' }])}>
                Thêm dòng
              </Button>
            }
          >
            {form.specs.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thông số. Nhấn “Thêm dòng” để bổ sung (VD: Pin – 5000mAh).</p>
            ) : (
              <div className="space-y-2">
                {form.specs.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input w-2/5" placeholder="Tên thông số" value={s.label} onChange={(e) => updateSpec(i, 'label', e.target.value)} aria-label={`Tên thông số ${i + 1}`} />
                    <input className="input flex-1" placeholder="Giá trị" value={s.value} onChange={(e) => updateSpec(i, 'value', e.target.value)} aria-label={`Giá trị thông số ${i + 1}`} />
                    <button type="button" onClick={() => set('specs')(form.specs.filter((_, j) => j !== i))} className="rounded-xl px-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Xoá dòng">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Giá & tồn kho">
            <div className="space-y-4">
              <MoneyInput label="Giá gốc" required value={form.price} onChange={set('price')} error={errors.price} placeholder="0" />
              <MoneyInput label="Giá khuyến mãi" optional value={form.salePrice} onChange={set('salePrice')} error={errors.salePrice} placeholder="Để trống nếu không giảm" />
              {discount > 0 ? (
                <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  Giảm <b>{discount}%</b> · khách tiết kiệm {formatVND(price - sale)}
                </div>
              ) : (
                price > 0 && <p className="text-sm text-slate-500">Khách sẽ trả {formatVND(price)}</p>
              )}
              <Input label="Tồn kho" required inputMode="numeric" value={form.stock} onChange={(e) => set('stock')(digits(e.target.value))} error={errors.stock} hint={form.stock === '0' ? 'Sản phẩm sẽ hiển thị “Hết hàng”' : undefined} />
            </div>
          </Panel>

          <Panel title="Hiển thị">
            <div className="space-y-4">
              <Switch checked={form.isActive} onChange={set('isActive')} label="Đang bán" description="Tắt để ẩn sản phẩm khỏi cửa hàng" />
              <Switch checked={form.isFeatured} onChange={set('isFeatured')} label="Sản phẩm nổi bật" description="Xuất hiện ở mục “Gợi ý cho bạn” trên trang chủ" />
              <Switch checked={form.isFlashSale} onChange={set('isFlashSale')} label="Flash sale" description="Hiển thị trong khu vực Flash sale đếm ngược" />
            </div>
          </Panel>

          {form.images[0] && (
            <Panel title="Xem trước thẻ sản phẩm">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={form.images[0]} alt="" className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-800">{form.name || 'Tên sản phẩm'}</p>
                  <p className="mt-1 font-bold text-rose-600">{formatVND(sale ?? price)}</p>
                  {discount > 0 && <p className="text-xs text-slate-400 line-through">{formatVND(price)}</p>}
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-5 flex justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <Button variant="secondary" onClick={leave}>Huỷ</Button>
        <Button type="submit" icon={Save} loading={saving}>Lưu</Button>
      </div>
      <p className="mt-4 hidden text-right text-xs text-slate-400 lg:block">
        <Link to="/admin/products" onClick={(e) => { e.preventDefault(); leave(); }} className="hover:text-slate-600">← Quay lại danh sách</Link>
      </p>
    </form>
  );
}
