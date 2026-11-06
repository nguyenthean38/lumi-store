export const formatVND = (n) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}₫`;

/** 1250000 -> "1,25 tr" ; 950000 -> "950K" — for compact chart labels. */
export function formatCompactVND(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(v);
}

/** Server stores UTC "YYYY-MM-DD HH:mm:ss". */
export function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const iso = /Z|[+-]\d\d:?\d\d$/.test(s) ? s : `${String(s).replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(s, withTime = false) {
  const d = parseDate(s);
  if (!d) return '';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(s) {
  const d = parseDate(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDate(s);
}

export const ORDER_STATUS = {
  pending: { label: 'Chờ xác nhận', tone: 'amber' },
  confirmed: { label: 'Đã xác nhận', tone: 'sky' },
  shipping: { label: 'Đang giao', tone: 'violet' },
  delivered: { label: 'Đã giao', tone: 'emerald' },
  cancelled: { label: 'Đã huỷ', tone: 'rose' },
};
export const ORDER_STEPS = ['pending', 'confirmed', 'shipping', 'delivered'];

export const PAYMENT_METHOD = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank: 'Chuyển khoản ngân hàng (VietQR)',
  ewallet: 'Ví điện tử',
};
export const PAYMENT_STATUS = {
  unpaid: { label: 'Chưa thanh toán', tone: 'slate' },
  paid: { label: 'Đã thanh toán', tone: 'emerald' },
  refunded: { label: 'Đã hoàn tiền', tone: 'sky' },
};

export const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function imageUrl(src) {
  return src || '/favicon.svg';
}

export const cn = (...cls) => cls.filter(Boolean).join(' ');
