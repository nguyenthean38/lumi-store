const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { HttpError, validate, serializeProduct, recalcProductRating, paginate } = require('../utils');
const { requireAuth } = require('../middleware/auth');
const { serializeOrder, getOrderByCode, cancelOrder } = require('./orders');
const { PHONE_RE } = require('./auth');

const router = express.Router();
router.use(requireAuth);

/* ---------- Addresses ---------- */
const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên người nhận').max(80),
  phone: z.string().trim().regex(PHONE_RE, 'Số điện thoại không hợp lệ'),
  province: z.string().trim().min(1, 'Vui lòng chọn Tỉnh/Thành phố'),
  ward: z.string().trim().min(2, 'Vui lòng nhập Phường/Xã').max(80),
  street: z.string().trim().min(3, 'Vui lòng nhập địa chỉ cụ thể'),
  isDefault: z.boolean().optional(),
});

const mapAddress = (a) => ({
  id: a.id,
  fullName: a.full_name,
  phone: a.phone,
  province: a.province,
  ward: a.ward,
  street: a.street,
  isDefault: !!a.is_default,
});

router.get('/addresses', (req, res) => {
  const rows = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id);
  res.json(rows.map(mapAddress));
});

function saveAddress(userId, data, id) {
  const tx = db.transaction(() => {
    const count = db.prepare('SELECT COUNT(*) n FROM addresses WHERE user_id = ?').get(userId).n;
    const makeDefault = data.isDefault || count === 0 || (id && count === 1);
    if (makeDefault) db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
    const values = [data.fullName, data.phone, data.province, data.ward, data.street];
    if (id) {
      db.prepare(
        `UPDATE addresses SET full_name=?, phone=?, province=?, ward=?, street=?${makeDefault ? ', is_default=1' : ''}
         WHERE id=? AND user_id=?`
      ).run(...values, id, userId);
      return id;
    }
    return db
      .prepare('INSERT INTO addresses (full_name, phone, province, ward, street, is_default, user_id) VALUES (?,?,?,?,?,?,?)')
      .run(...values, makeDefault ? 1 : 0, userId).lastInsertRowid;
  });
  return tx();
}

router.post('/addresses', (req, res) => {
  const data = validate(addressSchema, req.body);
  const id = saveAddress(req.user.id, data);
  res.status(201).json(mapAddress(db.prepare('SELECT * FROM addresses WHERE id = ?').get(id)));
});

router.put('/addresses/:id', (req, res) => {
  const id = Number(req.params.id);
  const own = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!own) throw new HttpError(404, 'Không tìm thấy địa chỉ');
  const data = validate(addressSchema, req.body);
  saveAddress(req.user.id, data, id);
  res.json(mapAddress(db.prepare('SELECT * FROM addresses WHERE id = ?').get(id)));
});

router.delete('/addresses/:id', (req, res) => {
  const id = Number(req.params.id);
  const own = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!own) throw new HttpError(404, 'Không tìm thấy địa chỉ');
  db.prepare('DELETE FROM addresses WHERE id = ?').run(id);
  if (own.is_default) {
    const next = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
    if (next) db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(next.id);
  }
  res.json({ ok: true });
});

/* ---------- Wishlist ---------- */
router.get('/wishlist', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM wishlist w
       JOIN products p ON p.id = w.product_id LEFT JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = ? AND p.is_active = 1 ORDER BY w.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows.map(serializeProduct));
});

router.get('/wishlist/ids', (req, res) => {
  res.json(db.prepare('SELECT product_id FROM wishlist WHERE user_id = ?').all(req.user.id).map((r) => r.product_id));
});

router.post('/wishlist/:productId', (req, res) => {
  const pid = Number(req.params.productId);
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(pid)) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, pid);
  res.status(201).json({ ok: true });
});

router.delete('/wishlist/:productId', (req, res) => {
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, Number(req.params.productId));
  res.json({ ok: true });
});

/* ---------- Orders ---------- */
router.get('/orders', (req, res) => {
  const { page, limit, offset } = paginate({ ...req.query, limit: req.query.limit || 10 });
  const params = [req.user.id];
  let extra = '';
  if (req.query.status) {
    extra = ' AND o.status = ?';
    params.push(String(req.query.status));
  }
  const total = db.prepare(`SELECT COUNT(*) n FROM orders o WHERE o.user_id = ?${extra}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_count FROM orders o
       WHERE o.user_id = ?${extra} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const firstItems = db.prepare('SELECT name, image, quantity, price FROM order_items WHERE order_id = ? ORDER BY id LIMIT 3');
  const counts = db.prepare('SELECT status, COUNT(*) n FROM orders WHERE user_id = ? GROUP BY status').all(req.user.id);
  res.json({
    items: rows.map((o) => ({ ...serializeOrder(o), previewItems: firstItems.all(o.id) })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    statusCounts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
  });
});

function ownOrder(req) {
  const order = db.prepare('SELECT * FROM orders WHERE code = ? AND user_id = ?').get(req.params.code, req.user.id);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  return order;
}

router.get('/orders/:code', (req, res) => {
  const order = ownOrder(req);
  const out = getOrderByCode(order.code);
  // which products may still be reviewed by this user
  if (order.status === 'delivered') {
    const reviewed = new Set(
      db.prepare('SELECT product_id FROM reviews WHERE user_id = ?').all(req.user.id).map((r) => r.product_id)
    );
    out.items = out.items.map((i) => ({ ...i, canReview: !!i.productId && !reviewed.has(i.productId) }));
  }
  res.json({ order: out });
});

router.post('/orders/:code/cancel', (req, res) => {
  const order = ownOrder(req);
  if (order.status !== 'pending') {
    throw new HttpError(400, 'Chỉ có thể huỷ đơn khi đơn đang chờ xác nhận. Vui lòng liên hệ hotline để được hỗ trợ.');
  }
  const { reason } = validate(z.object({ reason: z.string().trim().max(200).optional() }), req.body || {});
  cancelOrder(order, reason || 'Khách hàng huỷ đơn', req.user.name);
  res.json({ order: getOrderByCode(order.code) });
});

/* ---------- Reviews ---------- */
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Vui lòng chọn số sao').max(5),
  comment: z.string().trim().max(1000, 'Nhận xét tối đa 1000 ký tự').optional().or(z.literal('')),
});

router.post('/reviews/:productId', (req, res) => {
  const pid = Number(req.params.productId);
  const data = validate(reviewSchema, req.body);
  const bought = db
    .prepare(
      `SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered' LIMIT 1`
    )
    .get(req.user.id, pid);
  if (!bought) throw new HttpError(403, 'Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng thành công');
  const exists = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?').get(req.user.id, pid);
  if (exists) {
    db.prepare("UPDATE reviews SET rating = ?, comment = ?, created_at = datetime('now') WHERE id = ?").run(
      data.rating,
      data.comment || null,
      exists.id
    );
  } else {
    db.prepare('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(
      pid,
      req.user.id,
      data.rating,
      data.comment || null
    );
  }
  recalcProductRating(pid);
  res.status(201).json({ ok: true });
});

module.exports = router;
