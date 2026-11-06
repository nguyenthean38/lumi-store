import { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, Star, X } from 'lucide-react';
import { cn, formatVND } from '../../lib/format';

/* ---------------- Button ---------------- */
const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  'danger-soft': 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  accent: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/25',
  dark: 'bg-slate-900 text-white hover:bg-slate-800',
};
const SIZES = {
  xs: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'size-10 rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, icon: Icon, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition select-none disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className={size === 'lg' ? 'size-5' : 'size-4'} /> : null}
      {children}
    </button>
  );
});

/* ---------------- Form fields ---------------- */
export function Field({ label, error, hint, required, optional, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
          {optional && <span className="ml-1 text-xs font-normal text-slate-400">(không bắt buộc)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, optional, className, inputClassName, leftIcon: Left, right, id, ...props },
  ref
) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} optional={optional} className={className} htmlFor={fid}>
      <div className="relative">
        {Left && <Left className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />}
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          className={cn('input', error && 'input-error', Left && 'pl-9', right && 'pr-11', inputClassName)}
          {...props}
        />
        {right && <div className="absolute inset-y-0 right-1 flex items-center">{right}</div>}
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, optional, className, id, rows = 4, ...props }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} optional={optional} className={className} htmlFor={fid}>
      <textarea ref={ref} id={fid} rows={rows} aria-invalid={!!error} className={cn('input resize-y', error && 'input-error')} {...props} />
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, optional, className, id, children, placeholder, ...props },
  ref
) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} optional={optional} className={className} htmlFor={fid}>
      <select ref={ref} id={fid} aria-invalid={!!error} className={cn('input appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', error && 'input-error')} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </Field>
  );
});

export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cn('flex items-start gap-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-slate-300')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition', checked && 'translate-x-5')} />
      </button>
      {(label || description) && (
        <span className="text-sm">
          {label && <span className="block font-medium text-slate-800">{label}</span>}
          {description && <span className="block text-slate-500">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className, ...props }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700', className)}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-slate-300 accent-brand-600"
        {...props}
      />
      {label}
    </label>
  );
}

/* ---------------- Display ---------------- */
const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};

export function Badge({ tone = 'slate', children, className, dot }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cn('size-6 animate-spin text-brand-600', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Icon className="size-8" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-sm font-medium text-rose-600">{error?.message || 'Không tải được dữ liệu'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function Stars({ value = 0, size = 'sm', className }) {
  const s = size === 'lg' ? 'size-5' : size === 'md' ? 'size-4' : 'size-3.5';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className={cn('relative', s)}>
            <Star className={cn('absolute inset-0 text-slate-300', s)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn('text-amber-400', s)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const labels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" role="radiogroup" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} sao`}
            onClick={() => onChange(i)}
            className="transition hover:scale-110"
          >
            <Star className={cn('size-8', i <= value ? 'text-amber-400' : 'text-slate-300')} fill="currentColor" strokeWidth={0} />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-slate-600">{labels[value]}</span>
    </div>
  );
}

export function Price({ value, original, size = 'md', className }) {
  const big = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl', xl: 'text-3xl' }[size];
  const hasSale = original && original > value;
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-bold', hasSale ? 'text-sale' : 'text-slate-900', big)}>{formatVND(value)}</span>
      {hasSale && <span className="text-xs text-slate-400 line-through sm:text-sm">{formatVND(original)}</span>}
    </span>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  return (
    <div className={cn('inline-flex items-center rounded-xl border border-slate-300 bg-white', h)}>
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={cn('flex h-full items-center justify-center text-slate-600 hover:text-brand-600 disabled:opacity-35', w)}
      >
        <Minus className="size-4" />
      </button>
      <input
        aria-label="Số lượng"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="h-full w-10 border-x border-slate-200 text-center text-sm font-semibold focus:outline-none"
      />
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={cn('flex h-full items-center justify-center text-slate-600 hover:text-brand-600 disabled:opacity-35', w)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/* ---------------- Pagination ---------------- */
export function Pagination({ page, totalPages, onChange, className }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = [];
  const add = (p) => pages.push(p);
  const window = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= window) add(p);
    else if (pages[pages.length - 1] !== '…') add('…');
  }
  const btn = 'flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition';
  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Phân trang">
      <button className={cn(btn, 'text-slate-600 hover:bg-slate-100 disabled:opacity-40')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, p === page ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100')}
          >
            {p}
          </button>
        )
      )}
      <button className={cn(btn, 'text-slate-600 hover:bg-slate-100 disabled:opacity-40')} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Trang sau">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

/* ---------------- Overlays ---------------- */
function useLockBody(open) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscape(open, onClose) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && ref.current?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
}

export function Modal({ open, onClose, title, children, footer, size = 'md', className }) {
  useLockBody(open);
  useEscape(open, onClose);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl', w, className)}>
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 'max-w-md' }) {
  useLockBody(open);
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={onClose} />
      <div
        className={cn(
          'absolute inset-y-0 flex w-full flex-col bg-white shadow-pop',
          width,
          side === 'right' ? 'right-0 animate-slide-left' : 'left-0 animate-slide-up'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-slate-100 p-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('scrollbar-none flex gap-1 overflow-x-auto', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
            value === t.value ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cn('rounded-full px-1.5 text-xs', value === t.value ? 'bg-white/25' : 'bg-slate-200 text-slate-600')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
