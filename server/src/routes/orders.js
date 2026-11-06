const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { HttpError, validate, generateOrderCode, safeJson } = require('../utils');
const { optionalAuth } = require('../middleware/auth');
const { quote } = require('../services/pricing');
const { PHONE_RE } = require('./auth');

const router = express.Router();

const itemsSchema = z
  .array(
    z.object({
      productId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().min(1, 'Số lượng tối thiểu là 1').max(99, 'Số lượng tối đa là 99'),
    })
  )
  .max(50, 'Giỏ hàng quá nhiều sản phẩm');

router.post('/cart/quote', (req, res) => {
  const data = validate(z.object({ items: itemsSchema, couponCode: z.string().trim().max(30).optional().nullable() }), req.body);
  const q = quote(data.items, data.couponCode);
  delete q._coupon;
  res.json(q);
});

const orderSchema = z.object({
  items: itemsSchema.min(1, 'Giỏ hàng đang trống'),
  couponCode: z.string().trim().max(30).optional().nullable(),
  customerName: z.string({ error: 'Vui lòng nhập họ tên người nhận' }).trim().min(2, 'Vui lòng nhập họ tên người nhận').max(80),
  phone: z.string({ error: 'Vui lòng nhập số điện thoại' }).trim().regex(PHONE_RE, 'Số điện thoại không hợp lệ (VD: 0912345678)'),
  email: z.string().trim().email('Email không hợp lệ').optional().or(z.literal('')),
  province: z.string({ error: 'Vui lòng chọn Tỉnh/Thành phố' }).trim().min(1, 'Vui lòng chọn Tỉnh/Thành phố'),
  ward: z.string({ error: 'Vui lòng nhập Phường/Xã' }).trim().min(2, 'Vui lòng nhập Phường/Xã').max(80),
  street: z.string({ error: 'Vui lòng nhập địa chỉ cụ thể' }).trim().min(3, 'Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường)').max(200),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  paymentMethod: z.enum(['cod', 'bank', 'ewallet'], { error: 'Vui lòng chọn phương thức thanh toán' }),
  saveAddress: z.boolean().optional(),
});

router.post('/orders', optionalAuth, (req, res) => {
  const data = validate(orderSchema, req.body);

  const place = db.transaction(() => {
    const q = quote(data.items, data.couponCode);
    if (data.couponCode && q.couponError) throw new HttpError(400, q.couponError, { couponCode: q.couponError });
    const unavailable = q.items.filter((l) => !l.available || l.quantity < l.requestedQuantity);
    if (unavailable.length) {
      throw new HttpError(409, 'Một số sản phẩm đã thay đổi tồn kho. Vui lòng kiểm tra lại giỏ hàng.', {
        warnings: q.warnings,
      });
    }

    let code;
    do code = generateOrderCode();
    while (db.prepare('SELECT 1 FROM orders WHERE code = ?').get(code));

    const info = db
      .prepare(
        `INSERT INTO orders (code, user_id, customer_name, phone, email, province, ward, street, note,
          payment_method, subtotal, discount, shipping_fee, total, coupon_code)
         VALUES (@code, @userId, @customerName, @phone, @email, @province, @ward, @street, @note,
          @paymentMethod, @subtotal, @discount, @shippingFee, @total, @couponCode)`
      )
      .run({
        code,
        userId: req.user?.id ?? null,
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || req.user?.email || null,
        province: data.province,
        ward: data.ward,
        street: data.street,
        note: data.note || null,
        paymentMethod: data.paymentMethod,
        subtotal: q.subtotal,
        discount: q.discount,
        shippingFee: q.shippingFee,
        total: q.total,
        couponCode: q.coupon?.code || null,
      });
    const orderId = info.lastInsertRowid;

    const insItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, image, price, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    );
    // Conditional decrement guards against overselling even under concurrent requests.
    const decStock = db.prepare('UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ? AND stock >= ?');
    for (const l of q.items) {
      insItem.run(orderId, l.productId, l.name, l.image, l.price, l.quantity);
      const r = decStock.run(l.quantity, l.quantity, l.productId, l.quantity);
      if (r.changes === 0) throw new HttpError(409, `"${l.name}" không đủ tồn kho`);
    }
    if (q._coupon) db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(q._coupon.id);
    db.prepare('INSERT INTO order_history (order_id, status, note, actor) VALUES (?, ?, ?, ?)').run(
      orderId,
      'pending',
      'Đơn hàng đã được tạo',
      req.user ? req.user.name : 'Khách'
    );

    if (req.user && data.saveAddress) {
      const dup = db
        .prepare('SELECT id FROM addresses WHERE user_id = ? AND street = ? AND ward = ? AND province = ?')
        .get(req.user.id, data.street, data.ward, data.province);
      if (!dup) {
        const hasAny = db.prepare('SELECT COUNT(*) n FROM addresses WHERE user_id = ?').get(req.user.id).n;
        db.prepare(
          'INSERT INTO addresses (user_id, full_name, phone, province, ward, street, is_default) VALUES (?,?,?,?,?,?,?)'
        ).run(req.user.id, data.customerName, data.phone, data.province, data.ward, data.street, hasAny ? 0 : 1);
      }
    }
    return code;
  });

  const code = place();
  res.status(201).json({ order: getOrderByCode(code) });
});

/** Guest order tracking: needs both the code and the phone number used. */
router.get('/orders/track', (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').trim();
  if (!code || !phone) throw new HttpError(400, 'Vui lòng nhập mã đơn hàng và số điện thoại');
  const order = getOrderByCode(code);
  if (!order || order.phone !== phone) throw new HttpError(404, 'Không tìm thấy đơn hàng phù hợp');
  res.json({ order });
});

function getOrderByCode(code) {
  const o = db.prepare('SELECT * FROM orders WHERE code = ?').get(code);
  return o ? serializeOrder(o, true) : null;
}

function serializeOrder(o, withDetails = false) {
  const out = {
    id: o.id,
    code: o.code,
    userId: o.user_id,
    customerName: o.customer_name,
    phone: o.phone,
    email: o.email,
    province: o.province,
    ward: o.ward,
    street: o.street,
    fullAddress: [o.street, o.ward, o.province].filter(Boolean).join(', '),
    note: o.note,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    status: o.status,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shipping_fee,
    total: o.total,
    couponCode: o.coupon_code,
    cancelReason: o.cancel_reason,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    itemCount: o.item_count,
  };
  if (withDetails) {
    out.items = db
      .prepare(
        `SELECT oi.*, p.slug FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
      )
      .all(o.id)
      .map((i) => ({
        id: i.id,
        productId: i.product_id,
        name: i.name,
        image: i.image,
        slug: i.slug,
        price: i.price,
        quantity: i.quantity,
        lineTotal: i.price * i.quantity,
      }));
    out.history = db
      .prepare('SELECT * FROM order_history WHERE order_id = ? ORDER BY id')
      .all(o.id)
      .map((h) => ({ status: h.status, note: h.note, actor: h.actor, createdAt: h.created_at }));
  }
  return out;
}

/** Cancel an order and put stock back. Used by both customers and admins. */
function cancelOrder(order, reason, actor) {
  const tx = db.transaction(() => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const restock = db.prepare('UPDATE products SET stock = stock + ?, sold = MAX(0, sold - ?) WHERE id = ?');
    for (const i of items) if (i.product_id) restock.run(i.quantity, i.quantity, i.product_id);
    if (order.coupon_code) {
      db.prepare('UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE code = ?').run(order.coupon_code);
    }
    const paymentStatus = order.payment_status === 'paid' ? 'refunded' : order.payment_status;
    db.prepare(
      "UPDATE orders SET status = 'cancelled', cancel_reason = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(reason || null, paymentStatus, order.id);
    db.prepare('INSERT INTO order_history (order_id, status, note, actor) VALUES (?, ?, ?, ?)').run(
      order.id,
      'cancelled',
      reason ? `Huỷ đơn: ${reason}` : 'Đơn hàng đã bị huỷ',
      actor
    );
  });
  tx();
}

module.exports = router;
module.exports.serializeOrder = serializeOrder;
module.exports.getOrderByCode = getOrderByCode;
module.exports.cancelOrder = cancelOrder;
module.exports.safeJson = safeJson;
