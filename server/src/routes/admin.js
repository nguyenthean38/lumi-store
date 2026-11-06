const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { z } = require('zod');
const db = require('../db');
const {
  HttpError,
  validate,
  uniqueSlug,
  serializeProduct,
  normalizeText,
  getSettings,
  SETTING_DEFAULTS,
  publicUser,
  recalcProductRating,
  paginate,
} = require('../utils');
const { requireAdmin } = require('../middleware/auth');
const { serializeOrder, getOrderByCode, cancelOrder } = require('./orders');

const router = express.Router();
router.use(requireAdmin);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* =========================================================
 * Dashboard
 * ======================================================= */
router.get('/stats', (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = `-${days - 1} days`;
  const prevFrom = `-${days * 2 - 1} days`;

  const periodAgg = (fromMod, toMod) =>
    db
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END), 0) revenue,
                COUNT(*) orders,
                COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 END), 0) cancelled
         FROM orders WHERE date(created_at) >= date('now', ?) AND date(created_at) < date('now', ?)`
      )
      .get(fromMod, toMod);
  const cur = periodAgg(since, '+1 day');
  const prev = periodAgg(prevFrom, since);
  const customers = (fromMod, toMod) =>
    db
      .prepare(
        `SELECT COUNT(*) n FROM users WHERE role = 'customer' AND date(created_at) >= date('now', ?) AND date(created_at) < date('now', ?)`
      )
      .get(fromMod, toMod).n;
  const curCustomers = customers(since, '+1 day');
  const prevCustomers = customers(prevFrom, since);
  const change = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 1000) / 10);
  const curAov = cur.orders - cur.cancelled > 0 ? Math.round(cur.revenue / (cur.orders - cur.cancelled)) : 0;
  const prevAov = prev.orders - prev.cancelled > 0 ? Math.round(prev.revenue / (prev.orders - prev.cancelled)) : 0;

  const seriesRows = db
    .prepare(
      `SELECT date(created_at) d, COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END),0) revenue, COUNT(*) orders
       FROM orders WHERE date(created_at) >= date('now', ?) GROUP BY d`
    )
    .all(since);
  const byDay = new Map(seriesRows.map((r) => [r.d, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = db.prepare("SELECT date('now', ?) d").get(`-${i} days`).d;
    const r = byDay.get(d);
    series.push({ date: d, revenue: r?.revenue || 0, orders: r?.orders || 0 });
  }

  const statusCounts = Object.fromEntries(
    db.prepare('SELECT status, COUNT(*) n FROM orders GROUP BY status').all().map((r) => [r.status, r.n])
  );

  const topProducts = db
    .prepare(
      `SELECT oi.product_id id, oi.name, MAX(oi.image) image, SUM(oi.quantity) qty, SUM(oi.price * oi.quantity) revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled' AND date(o.created_at) >= date('now', ?)
       GROUP BY oi.product_id, oi.name ORDER BY qty DESC LIMIT 5`
    )
    .all(since);

  const categoryRevenue = db
    .prepare(
      `SELECT COALESCE(c.name, 'Khác') name, SUM(oi.price * oi.quantity) revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.status <> 'cancelled' AND date(o.created_at) >= date('now', ?)
       GROUP BY c.name ORDER BY revenue DESC`
    )
    .all(since);

  const threshold = Number(getSettings().low_stock_threshold) || 5;
  const lowStock = db
    .prepare(
      'SELECT id, name, slug, stock, images FROM products WHERE is_active = 1 AND stock <= ? ORDER BY stock ASC, name LIMIT 8'
    )
    .all(threshold)
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, stock: p.stock, image: JSON.parse(p.images || '[]')[0] || null }));

  const recentOrders = db
    .prepare(
      `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) item_count FROM orders o
       ORDER BY o.created_at DESC, o.id DESC LIMIT 6`
    )
    .all()
    .map((o) => serializeOrder(o));

  const pendingReviews = db.prepare("SELECT COUNT(*) n FROM reviews WHERE date(created_at) >= date('now','-7 days')").get().n;

  res.json({
    days,
    kpis: {
      revenue: { value: cur.revenue, change: change(cur.revenue, prev.revenue) },
      orders: { value: cur.orders, change: change(cur.orders, prev.orders) },
      customers: { value: curCustomers, change: change(curCustomers, prevCustomers) },
      aov: { value: curAov, change: change(curAov, prevAov) },
    },
    totals: {
      products: db.prepare('SELECT COUNT(*) n FROM products').get().n,
      customers: db.prepare("SELECT COUNT(*) n FROM users WHERE role='customer'").get().n,
      pendingOrders: statusCounts.pending || 0,
      newReviews: pendingReviews,
    },
    series,
    statusCounts,
    topProducts,
    categoryRevenue,
    lowStock,
    lowStockThreshold: threshold,
    recentOrders,
  });
});

/* =========================================================
 * Upload
 * ======================================================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Chỉ chấp nhận file ảnh (JPG, PNG, WEBP, GIF, SVG)'));
  },
});

router.post('/upload', upload.array('files', 8), (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'Chưa chọn file ảnh nào');
  res.status(201).json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
});

/* =========================================================
 * Products
 * ======================================================= */
const optionalInt = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : v),
  z.coerce.number().int('Giá trị phải là số nguyên').min(0, 'Giá trị không được âm').nullable()
);

const productSchema = z
  .object({
    name: z.string({ error: 'Vui lòng nhập tên sản phẩm' }).trim().min(2, 'Tên sản phẩm cần ít nhất 2 ký tự').max(200),
    categoryId: z.coerce.number().int().positive('Vui lòng chọn danh mục'),
    sku: z.string().trim().max(50).optional().or(z.literal('')),
    brand: z.string().trim().max(60).optional().or(z.literal('')),
    shortDesc: z.string().trim().max(300).optional().or(z.literal('')),
    description: z.string().trim().max(10000).optional().or(z.literal('')),
    price: z.coerce.number({ error: 'Vui lòng nhập giá bán' }).int('Giá phải là số nguyên').min(0, 'Giá không được âm'),
    salePrice: optionalInt.optional(),
    stock: z.coerce.number().int('Tồn kho phải là số nguyên').min(0, 'Tồn kho không được âm'),
    images: z.array(z.string().max(500)).max(10).optional(),
    specs: z.array(z.object({ label: z.string().trim().max(60), value: z.string().trim().max(200) })).max(30).optional(),
    tags: z.string().trim().max(300).optional().or(z.literal('')),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isFlashSale: z.boolean().optional(),
  })
  .refine((d) => d.salePrice == null || d.salePrice < d.price, {
    message: 'Giá khuyến mãi phải nhỏ hơn giá gốc',
    path: ['salePrice'],
  });

const PRODUCT_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

function buildSearchText(d, categoryName) {
  return normalizeText([d.name, d.brand, d.tags, d.sku, categoryName].filter(Boolean).join(' '));
}

router.get('/products', (req, res) => {
  const { page, limit, offset } = paginate({ ...req.query, limit: req.query.limit || 20 });
  const where = ['1=1'];
  const params = {};
  if (req.query.q) {
    where.push('(p.search_text LIKE @q OR p.sku LIKE @rawq)');
    params.q = `%${normalizeText(req.query.q)}%`;
    params.rawq = `%${req.query.q}%`;
  }
  if (req.query.categoryId) {
    where.push('p.category_id = @cat');
    params.cat = Number(req.query.categoryId);
  }
  const threshold = Number(getSettings().low_stock_threshold) || 5;
  switch (req.query.status) {
    case 'active':
      where.push('p.is_active = 1');
      break;
    case 'inactive':
      where.push('p.is_active = 0');
      break;
    case 'out':
      where.push('p.stock = 0');
      break;
    case 'low':
      where.push(`p.stock > 0 AND p.stock <= ${threshold}`);
      break;
    default:
  }
  const sorts = {
    newest: 'p.id DESC',
    name: 'p.name ASC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    stock_asc: 'p.stock ASC',
    sold: 'p.sold DESC',
  };
  const sort = sorts[req.query.sort] || sorts.newest;
  const w = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) n FROM products p WHERE ${w}`).get(params).n;
  const rows = db.prepare(`${PRODUCT_SELECT} WHERE ${w} ORDER BY ${sort} LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
  res.json({ items: rows.map(serializeProduct), page, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/products/:id', (req, res) => {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(Number(req.params.id));
  if (!row) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  res.json(serializeProduct(row));
});

function assertSkuFree(sku, excludeId) {
  if (!sku) return;
  const dup = db.prepare('SELECT id FROM products WHERE sku = ? AND id IS NOT ?').get(sku, excludeId ?? null);
  if (dup) throw new HttpError(409, 'Mã SKU đã tồn tại', { sku: 'Mã SKU đã tồn tại' });
}

function productParams(d) {
  const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(d.categoryId);
  if (!cat) throw new HttpError(400, 'Danh mục không tồn tại', { categoryId: 'Danh mục không tồn tại' });
  return {
    category_id: d.categoryId,
    name: d.name,
    sku: d.sku || null,
    brand: d.brand || null,
    short_desc: d.shortDesc || null,
    description: d.description || null,
    price: d.price,
    sale_price: d.salePrice ?? null,
    stock: d.stock,
    images: JSON.stringify(d.images || []),
    specs: JSON.stringify((d.specs || []).filter((s) => s.label && s.value)),
    tags: d.tags || null,
    search_text: buildSearchText(d, cat.name),
    is_active: d.isActive === false ? 0 : 1,
    is_featured: d.isFeatured ? 1 : 0,
    is_flash_sale: d.isFlashSale ? 1 : 0,
  };
}

router.post('/products', (req, res) => {
  const d = validate(productSchema, req.body);
  assertSkuFree(d.sku);
  const p = productParams(d);
  p.slug = uniqueSlug('products', d.name);
  const cols = Object.keys(p);
  const info = db
    .prepare(`INSERT INTO products (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`)
    .run(p);
  res.status(201).json(serializeProduct(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(info.lastInsertRowid)));
});

router.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  const d = validate(productSchema, req.body);
  assertSkuFree(d.sku, id);
  const p = productParams(d);
  if (d.name !== existing.name) p.slug = uniqueSlug('products', d.name, id);
  const sets = Object.keys(p).map((c) => `${c} = @${c}`);
  db.prepare(`UPDATE products SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run({ ...p, id });
  res.json(serializeProduct(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id)));
});

/** Quick inline edits from the product table (stock, price, toggles). */
router.patch('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  const d = validate(
    z.object({
      stock: z.coerce.number().int().min(0, 'Tồn kho không được âm').optional(),
      price: z.coerce.number().int().min(0).optional(),
      salePrice: optionalInt.optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      isFlashSale: z.boolean().optional(),
    }),
    req.body
  );
  const map = { stock: 'stock', price: 'price', salePrice: 'sale_price', isActive: 'is_active', isFeatured: 'is_featured', isFlashSale: 'is_flash_sale' };
  const sets = [];
  const params = { id };
  for (const [k, col] of Object.entries(map)) {
    if (d[k] === undefined) continue;
    sets.push(`${col} = @${col}`);
    params[col] = typeof d[k] === 'boolean' ? (d[k] ? 1 : 0) : d[k];
  }
  const price = params.price ?? existing.price;
  const sale = 'sale_price' in params ? params.sale_price : existing.sale_price;
  if (sale != null && sale >= price) throw new HttpError(400, 'Giá khuyến mãi phải nhỏ hơn giá gốc');
  if (sets.length) db.prepare(`UPDATE products SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
  res.json(serializeProduct(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id)));
});

/** Products that were ever ordered are hidden instead of deleted to keep order history intact. */
function removeProduct(id) {
  const used = db.prepare('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1').get(id);
  if (used) {
    db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    return 'hidden';
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return 'deleted';
}

router.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(id)) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  const result = removeProduct(id);
  res.json({
    result,
    message: result === 'hidden' ? 'Sản phẩm đã có đơn hàng nên được chuyển sang trạng thái ẩn thay vì xoá' : 'Đã xoá sản phẩm',
  });
});

router.post('/products/bulk', (req, res) => {
  const d = validate(
    z.object({
      ids: z.array(z.coerce.number().int().positive()).min(1, 'Chưa chọn sản phẩm nào').max(200),
      action: z.enum(['activate', 'deactivate', 'feature', 'unfeature', 'delete']),
    }),
    req.body
  );
  const tx = db.transaction(() => {
    let hidden = 0;
    let deleted = 0;
    for (const id of d.ids) {
      if (d.action === 'delete') {
        if (!db.prepare('SELECT id FROM products WHERE id = ?').get(id)) continue;
        removeProduct(id) === 'hidden' ? hidden++ : deleted++;
      } else {
        const [col, val] = {
          activate: ['is_active', 1],
          deactivate: ['is_active', 0],
          feature: ['is_featured', 1],
          unfeature: ['is_featured', 0],
        }[d.action];
        db.prepare(`UPDATE products SET ${col} = ?, updated_at = datetime('now') WHERE id = ?`).run(val, id);
      }
    }
    return { hidden, deleted };
  });
  res.json({ ok: true, ...tx() });
});

/* =========================================================
 * Categories
 * ======================================================= */
const categorySchema = z.object({
  name: z.string({ error: 'Vui lòng nhập tên danh mục' }).trim().min(2, 'Tên danh mục cần ít nhất 2 ký tự').max(80),
  icon: z.string().trim().max(20).optional().or(z.literal('')),
  color: z.string().trim().max(20).optional().or(z.literal('')),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
const mapCategory = (c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  icon: c.icon,
  color: c.color,
  description: c.description,
  sortOrder: c.sort_order,
  isActive: !!c.is_active,
  productCount: c.product_count ?? 0,
});

router.get('/categories', (_req, res) => {
  const rows = db
    .prepare('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) product_count FROM categories c ORDER BY sort_order, name')
    .all();
  res.json(rows.map(mapCategory));
});

router.post('/categories', (req, res) => {
  const d = validate(categorySchema, req.body);
  const info = db
    .prepare('INSERT INTO categories (name, slug, icon, color, description, sort_order, is_active) VALUES (?,?,?,?,?,?,?)')
    .run(d.name, uniqueSlug('categories', d.name), d.icon || null, d.color || null, d.description || null, d.sortOrder ?? 0, d.isActive === false ? 0 : 1);
  res.status(201).json(mapCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid)));
});

router.put('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!c) throw new HttpError(404, 'Không tìm thấy danh mục');
  const d = validate(categorySchema, req.body);
  const slug = d.name !== c.name ? uniqueSlug('categories', d.name, id) : c.slug;
  db.prepare('UPDATE categories SET name=?, slug=?, icon=?, color=?, description=?, sort_order=?, is_active=? WHERE id=?').run(
    d.name,
    slug,
    d.icon || null,
    d.color || null,
    d.description || null,
    d.sortOrder ?? c.sort_order,
    d.isActive === false ? 0 : 1,
    id
  );
  res.json(mapCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(id)));
});

router.delete('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const n = db.prepare('SELECT COUNT(*) n FROM products WHERE category_id = ?').get(id).n;
  if (n > 0) throw new HttpError(400, `Danh mục đang có ${n} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước khi xoá.`);
  const r = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!r.changes) throw new HttpError(404, 'Không tìm thấy danh mục');
  res.json({ ok: true });
});

/* =========================================================
 * Orders
 * ======================================================= */
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
const STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};

function orderFilters(query) {
  const where = ['1=1'];
  const params = {};
  if (query.status) {
    where.push('o.status = @status');
    params.status = String(query.status);
  }
  if (query.paymentStatus) {
    where.push('o.payment_status = @ps');
    params.ps = String(query.paymentStatus);
  }
  if (query.paymentMethod) {
    where.push('o.payment_method = @pm');
    params.pm = String(query.paymentMethod);
  }
  if (query.q) {
    where.push('(o.code LIKE @q OR o.customer_name LIKE @q OR o.phone LIKE @q OR o.email LIKE @q)');
    params.q = `%${String(query.q).trim()}%`;
  }
  if (query.province) {
    where.push('o.province = @province');
    params.province = String(query.province);
  }
  if (query.from) {
    where.push('date(o.created_at) >= date(@from)');
    params.from = String(query.from);
  }
  if (query.to) {
    where.push('date(o.created_at) <= date(@to)');
    params.to = String(query.to);
  }
  return { where: where.join(' AND '), params };
}

router.get('/orders', (req, res) => {
  const { page, limit, offset } = paginate({ ...req.query, limit: req.query.limit || 15 });
  const { where, params } = orderFilters(req.query);
  const total = db.prepare(`SELECT COUNT(*) n FROM orders o WHERE ${where}`).get(params).n;
  const rows = db
    .prepare(
      `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) item_count FROM orders o
       WHERE ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });
  const { status, ...rest } = req.query;
  const f2 = orderFilters({ ...rest });
  const counts = db.prepare(`SELECT o.status, COUNT(*) n FROM orders o WHERE ${f2.where} GROUP BY o.status`).all(f2.params);
  const provinces = db.prepare('SELECT DISTINCT province FROM orders ORDER BY province').all().map((r) => r.province);
  res.json({
    items: rows.map((o) => serializeOrder(o)),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    statusCounts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
    provinces,
  });
});

router.get('/orders/export', (req, res) => {
  const { where, params } = orderFilters(req.query);
  const rows = db
    .prepare(
      `SELECT o.*, (SELECT GROUP_CONCAT(name || ' x' || quantity, '; ') FROM order_items WHERE order_id = o.id) items
       FROM orders o WHERE ${where} ORDER BY o.created_at DESC`
    )
    .all(params);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Mã đơn', 'Ngày đặt', 'Khách hàng', 'SĐT', 'Email', 'Địa chỉ', 'Sản phẩm', 'Tạm tính', 'Giảm giá', 'Phí ship', 'Tổng tiền', 'Thanh toán', 'TT thanh toán', 'Trạng thái'];
  const lines = rows.map((o) =>
    [
      o.code,
      o.created_at,
      o.customer_name,
      o.phone,
      o.email,
      [o.street, o.ward, o.province].filter(Boolean).join(', '),
      o.items,
      o.subtotal,
      o.discount,
      o.shipping_fee,
      o.total,
      { cod: 'COD', bank: 'Chuyển khoản', ewallet: 'Ví điện tử' }[o.payment_method],
      { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' }[o.payment_status],
      STATUS_LABEL[o.status],
    ]
      .map(esc)
      .join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="don-hang-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + [header.map(esc).join(','), ...lines].join('\r\n'));
});

function findOrder(id) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));
  if (!o) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  return o;
}

router.get('/orders/:id', (req, res) => {
  const o = findOrder(req.params.id);
  const order = getOrderByCode(o.code);
  order.allowedTransitions = TRANSITIONS[o.status];
  if (o.user_id) {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(o.user_id);
    order.customer = publicUser(u);
    order.customerOrderCount = db.prepare('SELECT COUNT(*) n FROM orders WHERE user_id = ?').get(o.user_id).n;
  }
  res.json({ order });
});

router.patch('/orders/:id/status', (req, res) => {
  const o = findOrder(req.params.id);
  const d = validate(
    z.object({
      status: z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']),
      note: z.string().trim().max(300).optional().or(z.literal('')),
    }),
    req.body
  );
  if (!TRANSITIONS[o.status].includes(d.status)) {
    throw new HttpError(400, `Không thể chuyển đơn từ "${STATUS_LABEL[o.status]}" sang "${STATUS_LABEL[d.status]}"`);
  }
  if (d.status === 'cancelled') {
    cancelOrder(o, d.note || 'Cửa hàng huỷ đơn', req.user.name);
  } else {
    const tx = db.transaction(() => {
      // COD orders are paid on delivery
      const paid = d.status === 'delivered' && o.payment_method === 'cod' ? ", payment_status = 'paid'" : '';
      db.prepare(`UPDATE orders SET status = ?${paid}, updated_at = datetime('now') WHERE id = ?`).run(d.status, o.id);
      const defaultNote = {
        confirmed: 'Cửa hàng đã xác nhận đơn và đang chuẩn bị hàng',
        shipping: 'Đơn hàng đã được giao cho đơn vị vận chuyển',
        delivered: 'Giao hàng thành công',
      }[d.status];
      db.prepare('INSERT INTO order_history (order_id, status, note, actor) VALUES (?, ?, ?, ?)').run(
        o.id,
        d.status,
        d.note || defaultNote,
        req.user.name
      );
    });
    tx();
  }
  const order = getOrderByCode(o.code);
  order.allowedTransitions = TRANSITIONS[order.status];
  res.json({ order });
});

router.patch('/orders/:id/payment', (req, res) => {
  const o = findOrder(req.params.id);
  const d = validate(z.object({ paymentStatus: z.enum(['unpaid', 'paid', 'refunded']) }), req.body);
  db.prepare("UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?").run(d.paymentStatus, o.id);
  const label = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' }[d.paymentStatus];
  db.prepare('INSERT INTO order_history (order_id, status, note, actor) VALUES (?, ?, ?, ?)').run(
    o.id,
    o.status,
    `Cập nhật thanh toán: ${label}`,
    req.user.name
  );
  const order = getOrderByCode(o.code);
  order.allowedTransitions = TRANSITIONS[order.status];
  res.json({ order });
});

/* =========================================================
 * Customers
 * ======================================================= */
router.get('/customers', (req, res) => {
  const { page, limit, offset } = paginate({ ...req.query, limit: req.query.limit || 15 });
  const where = ["u.role = 'customer'"];
  const params = {};
  if (req.query.q) {
    where.push('(u.name LIKE @q OR u.email LIKE @q OR u.phone LIKE @q)');
    params.q = `%${String(req.query.q).trim()}%`;
  }
  if (req.query.status) {
    where.push('u.status = @status');
    params.status = String(req.query.status);
  }
  const w = where.join(' AND ');
  const sorts = { newest: 'u.id DESC', spent: 'spent DESC', orders: 'order_count DESC', name: 'u.name ASC' };
  const total = db.prepare(`SELECT COUNT(*) n FROM users u WHERE ${w}`).get(params).n;
  const rows = db
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) order_count,
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id = u.id AND o.status = 'delivered') spent,
        (SELECT MAX(created_at) FROM orders o WHERE o.user_id = u.id) last_order
       FROM users u WHERE ${w} ORDER BY ${sorts[req.query.sort] || sorts.newest} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });
  res.json({
    items: rows.map((u) => ({ ...publicUser(u), orderCount: u.order_count, spent: u.spent, lastOrderAt: u.last_order })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.get('/customers/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!u) throw new HttpError(404, 'Không tìm thấy khách hàng');
  const orders = db
    .prepare(
      `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) item_count FROM orders o
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .all(u.id)
    .map((o) => serializeOrder(o));
  const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(u.id).map((a) => ({
    id: a.id,
    fullName: a.full_name,
    phone: a.phone,
    fullAddress: [a.street, a.ward, a.province].filter(Boolean).join(', '),
    isDefault: !!a.is_default,
  }));
  const spent = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  res.json({ customer: publicUser(u), orders, addresses, spent });
});

router.patch('/customers/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!u) throw new HttpError(404, 'Không tìm thấy khách hàng');
  if (u.role === 'admin') throw new HttpError(400, 'Không thể khoá tài khoản quản trị');
  const d = validate(z.object({ status: z.enum(['active', 'locked']) }), req.body);
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(d.status, u.id);
  res.json({ customer: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)) });
});

/* =========================================================
 * Coupons
 * ======================================================= */
const dateField = z.preprocess((v) => (v === '' || v == null ? null : v), z.string().max(30).nullable()).optional();
const couponSchema = z
  .object({
    code: z
      .string({ error: 'Vui lòng nhập mã' })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, 'Mã chỉ gồm chữ, số, gạch ngang (3-30 ký tự)'),
    description: z.string().trim().max(200).optional().or(z.literal('')),
    type: z.enum(['percent', 'fixed', 'freeship'], { error: 'Vui lòng chọn loại giảm giá' }),
    value: z.coerce.number().int().min(0, 'Giá trị không được âm').default(0),
    maxDiscount: optionalInt.optional(),
    minOrder: z.coerce.number().int().min(0).default(0),
    usageLimit: optionalInt.optional(),
    startsAt: dateField,
    expiresAt: dateField,
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.type !== 'percent' || (d.value >= 1 && d.value <= 100), {
    message: 'Phần trăm giảm phải từ 1 đến 100',
    path: ['value'],
  })
  .refine((d) => d.type !== 'fixed' || d.value > 0, { message: 'Vui lòng nhập số tiền giảm', path: ['value'] })
  .refine((d) => !d.startsAt || !d.expiresAt || d.startsAt <= d.expiresAt, {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['expiresAt'],
  });

const normDate = (v, end) => {
  if (!v) return null;
  const s = String(v).replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} ${end ? '23:59:59' : '00:00:00'}`;
  return s.length === 16 ? `${s}:00` : s;
};
const mapCoupon = (c) => ({
  id: c.id,
  code: c.code,
  description: c.description,
  type: c.type,
  value: c.value,
  maxDiscount: c.max_discount,
  minOrder: c.min_order,
  usageLimit: c.usage_limit,
  usedCount: c.used_count,
  startsAt: c.starts_at,
  expiresAt: c.expires_at,
  isActive: !!c.is_active,
  createdAt: c.created_at,
});

router.get('/coupons', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all().map(mapCoupon));
});

function couponParams(d) {
  return [
    d.code,
    d.description || null,
    d.type,
    d.type === 'freeship' ? 0 : d.value,
    d.type === 'percent' ? d.maxDiscount ?? null : null,
    d.minOrder || 0,
    d.usageLimit ?? null,
    normDate(d.startsAt, false),
    normDate(d.expiresAt, true),
    d.isActive === false ? 0 : 1,
  ];
}

router.post('/coupons', (req, res) => {
  const d = validate(couponSchema, req.body);
  if (db.prepare('SELECT id FROM coupons WHERE code = ?').get(d.code)) throw new HttpError(409, 'Mã giảm giá đã tồn tại', { code: 'Mã giảm giá đã tồn tại' });
  const info = db
    .prepare(
      'INSERT INTO coupons (code, description, type, value, max_discount, min_order, usage_limit, starts_at, expires_at, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)'
    )
    .run(...couponParams(d));
  res.status(201).json(mapCoupon(db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid)));
});

router.put('/coupons/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM coupons WHERE id = ?').get(id)) throw new HttpError(404, 'Không tìm thấy mã giảm giá');
  const d = validate(couponSchema, req.body);
  if (db.prepare('SELECT id FROM coupons WHERE code = ? AND id <> ?').get(d.code, id)) throw new HttpError(409, 'Mã giảm giá đã tồn tại', { code: 'Mã giảm giá đã tồn tại' });
  db.prepare(
    'UPDATE coupons SET code=?, description=?, type=?, value=?, max_discount=?, min_order=?, usage_limit=?, starts_at=?, expires_at=?, is_active=? WHERE id=?'
  ).run(...couponParams(d), id);
  res.json(mapCoupon(db.prepare('SELECT * FROM coupons WHERE id = ?').get(id)));
});

router.delete('/coupons/:id', (req, res) => {
  const r = db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Không tìm thấy mã giảm giá');
  res.json({ ok: true });
});

/* =========================================================
 * Reviews
 * ======================================================= */
router.get('/reviews', (req, res) => {
  const { page, limit, offset } = paginate({ ...req.query, limit: req.query.limit || 15 });
  const where = ['1=1'];
  const params = {};
  if (req.query.rating) {
    where.push('r.rating = @rating');
    params.rating = Number(req.query.rating);
  }
  if (req.query.visibility === 'hidden') where.push('r.is_hidden = 1');
  if (req.query.visibility === 'visible') where.push('r.is_hidden = 0');
  if (req.query.q) {
    where.push('(r.comment LIKE @q OR p.name LIKE @q OR u.name LIKE @q)');
    params.q = `%${String(req.query.q).trim()}%`;
  }
  const w = where.join(' AND ');
  const base = 'FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id';
  const total = db.prepare(`SELECT COUNT(*) n ${base} WHERE ${w}`).get(params).n;
  const rows = db
    .prepare(
      `SELECT r.*, u.name user_name, u.email user_email, p.name product_name, p.slug product_slug, p.images product_images
       ${base} WHERE ${w} ORDER BY r.created_at DESC, r.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      isHidden: !!r.is_hidden,
      createdAt: r.created_at,
      userName: r.user_name,
      userEmail: r.user_email,
      productId: r.product_id,
      productName: r.product_name,
      productSlug: r.product_slug,
      productImage: JSON.parse(r.product_images || '[]')[0] || null,
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.patch('/reviews/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new HttpError(404, 'Không tìm thấy đánh giá');
  const d = validate(z.object({ isHidden: z.boolean() }), req.body);
  db.prepare('UPDATE reviews SET is_hidden = ? WHERE id = ?').run(d.isHidden ? 1 : 0, r.id);
  recalcProductRating(r.product_id);
  res.json({ ok: true });
});

router.delete('/reviews/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new HttpError(404, 'Không tìm thấy đánh giá');
  db.prepare('DELETE FROM reviews WHERE id = ?').run(r.id);
  recalcProductRating(r.product_id);
  res.json({ ok: true });
});

/* =========================================================
 * Banners
 * ======================================================= */
const bannerSchema = z.object({
  title: z.string({ error: 'Vui lòng nhập tiêu đề' }).trim().min(2, 'Vui lòng nhập tiêu đề').max(120),
  subtitle: z.string().trim().max(300).optional().or(z.literal('')),
  image: z.string().trim().max(500).optional().or(z.literal('')),
  link: z.string().trim().max(300).optional().or(z.literal('')),
  buttonText: z.string().trim().max(40).optional().or(z.literal('')),
  color: z.string().trim().max(120).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
const mapBanner = (b) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  image: b.image,
  link: b.link,
  buttonText: b.button_text,
  color: b.color,
  sortOrder: b.sort_order,
  isActive: !!b.is_active,
});
const bannerParams = (d) => [
  d.title,
  d.subtitle || null,
  d.image || null,
  d.link || null,
  d.buttonText || null,
  d.color || null,
  d.sortOrder ?? 0,
  d.isActive === false ? 0 : 1,
];

router.get('/banners', (_req, res) => {
  res.json(db.prepare('SELECT * FROM banners ORDER BY sort_order, id').all().map(mapBanner));
});
router.post('/banners', (req, res) => {
  const d = validate(bannerSchema, req.body);
  const info = db
    .prepare('INSERT INTO banners (title, subtitle, image, link, button_text, color, sort_order, is_active) VALUES (?,?,?,?,?,?,?,?)')
    .run(...bannerParams(d));
  res.status(201).json(mapBanner(db.prepare('SELECT * FROM banners WHERE id = ?').get(info.lastInsertRowid)));
});
router.put('/banners/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM banners WHERE id = ?').get(id)) throw new HttpError(404, 'Không tìm thấy banner');
  const d = validate(bannerSchema, req.body);
  db.prepare('UPDATE banners SET title=?, subtitle=?, image=?, link=?, button_text=?, color=?, sort_order=?, is_active=? WHERE id=?').run(
    ...bannerParams(d),
    id
  );
  res.json(mapBanner(db.prepare('SELECT * FROM banners WHERE id = ?').get(id)));
});
router.delete('/banners/:id', (req, res) => {
  const r = db.prepare('DELETE FROM banners WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Không tìm thấy banner');
  res.json({ ok: true });
});

/* =========================================================
 * Settings
 * ======================================================= */
router.get('/settings', (_req, res) => res.json(getSettings()));

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const numeric = ['shipping_fee', 'free_shipping_threshold', 'low_stock_threshold'];
  const fields = {};
  for (const key of Object.keys(SETTING_DEFAULTS)) {
    if (body[key] === undefined) continue;
    const v = String(body[key]).trim().slice(0, 300);
    if (numeric.includes(key) && !/^\d+$/.test(v)) throw new HttpError(400, 'Giá trị phải là số không âm', { [key]: 'Giá trị phải là số không âm' });
    if (key === 'store_name' && v.length < 2) throw new HttpError(400, 'Vui lòng nhập tên cửa hàng', { store_name: 'Vui lòng nhập tên cửa hàng' });
    fields[key] = v;
  }
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.transaction(() => Object.entries(fields).forEach(([k, v]) => up.run(k, v)))();
  res.json(getSettings());
});

module.exports = router;
