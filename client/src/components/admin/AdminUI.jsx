import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Link2, Search, Star, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { cn, ORDER_STATUS, PAYMENT_STATUS } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Skeleton } from '../ui';

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName }) {
  return (
    <section className={cn('card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function TableWrap({ children, className }) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className }) {
  return (
    <th className={cn('bg-slate-50 px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }) {
  return (
    <td className={cn('border-t border-slate-100 px-4 py-3 align-middle', className)} {...props}>
      {children}
    </td>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <Td key={c}>
              <Skeleton className={cn('h-4', c === 0 ? 'w-40' : 'w-20')} />
            </Td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
          aria-label="Xoá từ khoá"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Compact select used in filter bars (no label). */
export function FilterSelect({ value, onChange, children, className, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn('input w-auto min-w-36 py-2.5', className)}
    >
      {children}
    </select>
  );
}

export function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'slate' };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, tone: 'slate' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Thumb({ src, alt = '', className }) {
  return (
    <img
      src={src || '/favicon.svg'}
      alt={alt}
      loading="lazy"
      className={cn('size-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover', className)}
    />
  );
}

export function ChangePill({ value }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(value).toLocaleString('vi-VN')}%
    </span>
  );
}

/**
 * Multi-image manager: upload, paste URL, reorder (drag or arrows), set main (first), remove.
 */
export function ImageUploader({ value = [], onChange, max = 10, single = false }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [dragIdx, setDragIdx] = useState(null);

  const limit = single ? 1 : max;

  const upload = async (files) => {
    if (!files?.length) return;
    const list = [...files].slice(0, limit - (single ? 0 : value.length));
    if (!list.length) return toast.error(`Tối đa ${limit} ảnh`);
    const big = list.find((f) => f.size > 3 * 1024 * 1024);
    if (big) return toast.error(`Ảnh "${big.name}" vượt quá 3MB`);
    setUploading(true);
    try {
      const { urls } = await api.upload(list);
      onChange(single ? urls.slice(0, 1) : [...value, ...urls]);
      toast.success(`Đã tải lên ${urls.length} ảnh`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    if (!/^(https?:\/\/|\/)/.test(u)) return toast.error('URL ảnh phải bắt đầu bằng http(s):// hoặc /');
    if (!single && value.length >= limit) return toast.error(`Tối đa ${limit} ảnh`);
    onChange(single ? [u] : [...value, u]);
    setUrl('');
  };

  const move = (from, to) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
        }}
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5"
      >
        {value.map((src, i) => (
          <div
            key={`${src}-${i}`}
            draggable={!single}
            onDragStart={() => setDragIdx(i)}
            onDragEnd={() => setDragIdx(null)}
            onDrop={(e) => {
              if (dragIdx != null) {
                e.preventDefault();
                e.stopPropagation();
                move(dragIdx, i);
                setDragIdx(null);
              }
            }}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-xl border bg-slate-50',
              i === 0 && !single ? 'border-brand-400 ring-2 ring-brand-500/20' : 'border-slate-200',
              dragIdx === i && 'opacity-50'
            )}
          >
            <img src={src} alt={`Ảnh ${i + 1}`} className="size-full object-cover" />
            {i === 0 && !single && (
              <span className="absolute top-1.5 left-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Ảnh chính</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {!single ? (
                <div className="flex gap-1">
                  <span className="hidden cursor-grab rounded bg-white/90 p-1 text-slate-600 sm:block" title="Kéo để sắp xếp">
                    <GripVertical className="size-3.5" />
                  </span>
                  {i > 0 && (
                    <button type="button" onClick={() => move(i, 0)} className="rounded bg-white/90 p-1 text-amber-600 hover:bg-white" title="Đặt làm ảnh chính" aria-label="Đặt làm ảnh chính">
                      <Star className="size-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="rounded bg-white/90 p-1 text-rose-600 hover:bg-white"
                title="Xoá ảnh"
                aria-label="Xoá ảnh"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {value.length < limit || single ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600 disabled:opacity-60"
          >
            <ImagePlus className="size-6" />
            <span className="px-2 text-center text-xs font-medium">{uploading ? 'Đang tải...' : single && value.length ? 'Đổi ảnh' : 'Tải ảnh / kéo thả'}</span>
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        multiple={!single}
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="Hoặc dán URL ảnh (https://...)"
            className="input pl-9"
          />
        </div>
        <Button variant="secondary" onClick={addUrl} disabled={!url.trim()}>
          Thêm
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {single ? 'JPG, PNG, WEBP tối đa 3MB.' : `JPG, PNG, WEBP tối đa 3MB/ảnh, tối đa ${limit} ảnh. Ảnh đầu tiên là ảnh chính – kéo thả để sắp xếp.`}
      </p>
    </div>
  );
}
