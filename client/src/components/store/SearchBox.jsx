import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatVND, cn } from '../../lib/format';
import { useDebounce, useLocalStorage } from '../../hooks/useFetch';

const POPULAR = ['tai nghe', 'sạc nhanh', 'laptop', 'đồng hồ', 'robot hút bụi'];

export default function SearchBox({ className, autoFocus }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [history, setHistory] = useLocalStorage('lumi_search_history', []);
  const debounced = useDebounce(q.trim(), 220);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!debounced) {
      setItems([]);
      return;
    }
    let alive = true;
    api
      .get('/products/suggest', { q: debounced })
      .then((r) => alive && setItems(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [debounced]);

  useEffect(() => {
    const onClick = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    // "/" focuses search from anywhere (like many shops & GitHub)
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const submit = (term) => {
    const t = (term ?? q).trim();
    if (!t) return;
    setHistory((h) => [t, ...h.filter((x) => x !== t)].slice(0, 6));
    setOpen(false);
    setQ(t);
    inputRef.current?.blur();
    nav(`/products?q=${encodeURIComponent(t)}`);
  };

  const goProduct = (p) => {
    setOpen(false);
    setQ('');
    nav(`/products/${p.slug}`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) goProduct(items[active]);
      else submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && (q.trim() ? items.length > 0 || debounced : true);

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Tìm sản phẩm, thương hiệu…"
          title="Mẹo: nhấn phím / để tìm nhanh"
          aria-label="Tìm kiếm sản phẩm"
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100/80 pr-24 pl-10 text-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
        />
        {q && (
          <button
            type="button"
            aria-label="Xoá từ khoá"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-[4.6rem] -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        )}
        <button type="submit" className="absolute top-1 right-1 bottom-1 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
          Tìm
        </button>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
          {q.trim() ? (
            items.length ? (
              <ul className="py-1.5">
                {items.map((p, i) => (
                  <li key={p.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => goProduct(p)}
                      className={cn('flex w-full items-center gap-3 px-3 py-2 text-left', active === i ? 'bg-brand-50' : 'hover:bg-slate-50')}
                    >
                      <img src={p.image} alt="" className="size-11 shrink-0 rounded-lg bg-slate-100 object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-500">{p.categoryName}</span>
                      </span>
                      <span className="text-sm font-bold text-sale">{formatVND(p.finalPrice)}</span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-slate-100">
                  <button onClick={() => submit()} className="w-full px-3 py-2.5 text-left text-sm font-semibold text-brand-600 hover:bg-slate-50">
                    Xem tất cả kết quả cho “{q.trim()}”
                  </button>
                </li>
              </ul>
            ) : (
              <p className="px-4 py-5 text-center text-sm text-slate-500">Không tìm thấy sản phẩm phù hợp với “{q.trim()}”</p>
            )
          ) : (
            <div className="space-y-4 p-4">
              {history.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Tìm kiếm gần đây</p>
                    <button onClick={() => setHistory([])} className="text-xs text-slate-400 hover:text-rose-500">
                      Xoá
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((h) => (
                      <button key={h} onClick={() => submit(h)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                        <Clock className="size-3.5" /> {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Từ khoá phổ biến</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((h) => (
                    <button key={h} onClick={() => submit(h)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-700">
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
