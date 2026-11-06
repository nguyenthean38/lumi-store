import { useMemo, useRef, useState } from 'react';
import { formatCompactVND, formatVND } from '../../lib/format';

// Single-series chart colour (dataviz reference slot 1) + recessive chrome.
const SERIES = '#2a78d6';
const GRID = '#e8eaee';
const MUTED = '#64748b';

function niceMax(v) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

const shortDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

/**
 * Revenue over time: 2px line + faint area, solid hairline grid,
 * crosshair that snaps to the nearest day with a tooltip (value first).
 */
export function RevenueChart({ series, height = 260 }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const pad = { l: 52, r: 16, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const { max, pts, ticks } = useMemo(() => {
    const m = niceMax(Math.max(...series.map((s) => s.revenue), 0) * 1.05);
    const n = series.length;
    const p = series.map((s, i) => ({
      ...s,
      x: pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw),
      y: pad.t + ih - (s.revenue / m) * ih,
    }));
    return { max: m, pts: p, ticks: [0, 0.25, 0.5, 0.75, 1].map((t) => t * m) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, height]);

  if (!series.length) return null;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  const area = `${line}L${pts[pts.length - 1].x},${pad.t + ih}L${pts[0].x},${pad.t + ih}Z`;
  const labelEvery = Math.ceil(series.length / 7);

  const onMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(pts[best].x - x)) best = i;
    });
    setHover(best);
  };
  const hp = hover != null ? pts[hover] : null;

  return (
    <div ref={wrapRef} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Biểu đồ doanh thu theo ngày">
        <defs>
          <linearGradient id="rev-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={SERIES} stopOpacity="0.16" />
            <stop offset="1" stopColor={SERIES} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={pad.l - 8} y={y} dy="0.32em" textAnchor="end" fontSize="11" fill={MUTED}>
                {formatCompactVND(t)}
              </text>
            </g>
          );
        })}
        {pts.map((p, i) =>
          i % labelEvery === 0 || i === pts.length - 1 ? (
            <text key={p.date} x={p.x} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>
              {shortDate(p.date)}
            </text>
          ) : null
        )}
        <path d={area} fill="url(#rev-area)" />
        <path d={line} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hp && (
          <g>
            <line x1={hp.x} x2={hp.x} y1={pad.t} y2={pad.t + ih} stroke="#94a3b8" strokeWidth="1" />
            <circle cx={hp.x} cy={hp.y} r="5" fill={SERIES} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop"
          style={{
            left: `${(hp.x / W) * 100}%`,
            transform: hp.x > W * 0.65 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <div className="text-slate-500">{shortDate(hp.date)}/{hp.date.slice(0, 4)}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded" style={{ background: SERIES }} />
            <span className="text-sm font-bold text-slate-900">{formatVND(hp.revenue)}</span>
          </div>
          <div className="mt-0.5 text-slate-500">{hp.orders} đơn hàng</div>
        </div>
      )}
    </div>
  );
}

/**
 * Ranked horizontal bars (one colour, value labels as text).
 * items: [{ label, value, display? }]
 */
export function BarList({ items, format = (v) => v, color = SERIES, emptyText = 'Chưa có dữ liệu' }) {
  const [hover, setHover] = useState(null);
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {items.map((it, idx) => (
        <li
          key={it.label}
          className="group"
          onPointerEnter={() => setHover(idx)}
          onPointerLeave={() => setHover(null)}
          tabIndex={0}
          onFocus={() => setHover(idx)}
          onBlur={() => setHover(null)}
          aria-label={`${it.label}: ${format(it.value)} (${Math.round((it.value / total) * 100)}%)`}
        >
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate text-slate-700">
              {it.icon && <span>{it.icon}</span>}
              <span className="truncate">{it.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
              {format(it.value)}
              <span className="ml-1.5 text-xs font-normal text-slate-500">{Math.round((it.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2.5 w-full rounded-r bg-slate-100">
            <div
              className="h-full rounded-r-[4px] transition-[filter]"
              style={{
                width: `${Math.max(1.5, (it.value / max) * 100)}%`,
                background: it.color || color,
                filter: hover === idx ? 'brightness(1.12)' : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny inline sparkline for KPI cards (no axes; tooltip-free by design: the KPI tile carries the number). */
export function Sparkline({ values, color = SERIES, className }) {
  if (!values?.length) return null;
  const W = 120;
  const H = 32;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * W},${H - 2 - (v / max) * (H - 4)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
