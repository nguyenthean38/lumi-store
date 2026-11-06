const db = require('../db');
const { getSettings, safeJson } = require('../utils');

function nowIso() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Returns { coupon } or { error } for a code against a subtotal. */
function checkCoupon(code, subtotal) {
  if (!code) return {};
  const c = db.prepare('SELECT * FROM coupons WHERE code = ?').get(String(code).trim());
  if (!c || !c.is_active) return { error: 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng' };
  const now = nowIso();
  if (c.starts_at && c.starts_at > now) return { error: 'Mã giảm giá chưa đến thời gian áp dụng' };
  if (c.expires_at && c.expires_at < now) return { error: 'Mã giảm giá đã hết hạn' };
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return { error: 'Mã giảm giá đã hết lượt sử dụng' };
  if (subtotal < c.min_order) {
    return {
      error: `Đơn hàng cần tối thiểu ${c.min_order.toLocaleString('vi-VN')}₫ để dùng mã này`,
    };
  }
  return { coupon: c };
}

function couponDiscount(c, subtotal) {
  if (!c) return 0;
  if (c.type === 'percent') {
    let d = Math.floor((subtotal * c.value) / 100);
    if (c.max_discount) d = Math.min(d, c.max_discount);
    return d;
  }
  if (c.type === 'fixed') return Math.min(c.value, subtotal);
  return 0;
}

/**
 * Price a cart on the server. Never trust client prices.
 * items: [{ productId, quantity }]
 */
function quote(items, couponCode) {
  const settings = getSettings();
  const merged = new Map();
  for (const it of items || []) {
    const id = Number(it.productId);
    const qty = Math.max(0, Math.floor(Number(it.quantity) || 0));
    if (!id || !qty) continue;
    merged.set(id, (merged.get(id) || 0) + qty);
  }

  const lines = [];
  const warnings = [];
  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  for (const [productId, quantity] of merged) {
    const p = getProduct.get(productId);
    if (!p || !p.is_active) {
      warnings.push({ productId, message: 'Sản phẩm không còn kinh doanh và đã bị loại khỏi giỏ' });
      lines.push({ productId, quantity, available: false, removed: true });
      continue;
    }
    const price = p.sale_price != null && p.sale_price < p.price ? p.sale_price : p.price;
    let qty = quantity;
    let available = true;
    if (p.stock <= 0) {
      available = false;
      warnings.push({ productId, message: `"${p.name}" đã hết hàng` });
    } else if (qty > p.stock) {
      qty = p.stock;
      warnings.push({ productId, message: `"${p.name}" chỉ còn ${p.stock} sản phẩm, số lượng đã được điều chỉnh` });
    }
    lines.push({
      productId,
      name: p.name,
      slug: p.slug,
      image: safeJson(p.images, [])[0] || null,
      price,
      originalPrice: p.price,
      quantity: qty,
      requestedQuantity: quantity,
      stock: p.stock,
      available,
      lineTotal: available ? price * qty : 0,
    });
  }

  const subtotal = lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
  const { coupon, error: couponError } = checkCoupon(couponCode, subtotal);
  const discount = couponDiscount(coupon, subtotal);
  const baseShipping = Number(settings.shipping_fee) || 0;
  const threshold = Number(settings.free_shipping_threshold) || 0;
  let shippingFee = subtotal === 0 ? 0 : subtotal >= threshold && threshold > 0 ? 0 : baseShipping;
  if (coupon && coupon.type === 'freeship') shippingFee = 0;
  const total = Math.max(0, subtotal - discount + shippingFee);

  return {
    items: lines,
    subtotal,
    discount,
    shippingFee,
    total,
    coupon: coupon
      ? { code: coupon.code, description: coupon.description, type: coupon.type, value: coupon.value }
      : null,
    couponError: couponCode ? couponError || null : null,
    warnings,
    freeShippingThreshold: threshold,
    amountToFreeShip: Math.max(0, threshold - subtotal),
    _coupon: coupon || null,
  };
}

module.exports = { quote, checkCoupon, couponDiscount, nowIso };
