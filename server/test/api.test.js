// Integration tests: run with `npm test` (uses a throwaway database file).
const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lumi-test-'));
process.env.DB_FILE = path.join(tmp, 'test.db');
process.env.NODE_ENV = 'test';

const request = require('supertest');
const db = require('../src/db');
require('../src/seed').seed();
const app = require('../src/app')();

let adminToken;
let customerToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const product = (slug) => db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
const address = { customerName: 'Khách Test', phone: '0987654321', province: 'Thành phố Hà Nội', ward: 'Phường Ba Đình', street: '1 Hùng Vương' };

before(async () => {
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@lumi.vn', password: 'admin123' })).body.token;
  customerToken = (await request(app).post('/api/auth/login').send({ email: 'khach@lumi.vn', password: '123456' })).body.token;
  assert.ok(adminToken && customerToken);
});

after(() => {
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('catalog: list, accent-insensitive search, filters', async () => {
  const all = await request(app).get('/api/products?limit=100');
  assert.equal(all.status, 200);
  assert.ok(all.body.total >= 30);

  const search = await request(app).get('/api/products').query({ q: 'dong ho' });
  assert.ok(search.body.items.length > 0);
  assert.ok(search.body.items.every((p) => /đồng hồ|watch/i.test(p.name + p.categoryName)));

  const cheap = await request(app).get('/api/products').query({ maxPrice: 1000000, limit: 100 });
  assert.ok(cheap.body.items.every((p) => p.finalPrice <= 1000000));

  const detail = await request(app).get('/api/products/lumi-sac-nhanh-gan-65w');
  assert.equal(detail.status, 200);
  assert.equal(detail.body.product.finalPrice, 490000);
  assert.ok(Array.isArray(detail.body.related));

  assert.equal((await request(app).get('/api/products/khong-ton-tai')).status, 404);
});

test('quote: server prices, coupon rules and free shipping', async () => {
  const p = product('pixo-cap-usb-c-ben-du-2m'); // 149.000đ
  const small = await request(app).post('/api/cart/quote').send({ items: [{ productId: p.id, quantity: 1 }], couponCode: 'LUMI10' });
  assert.equal(small.body.subtotal, 149000);
  assert.equal(small.body.shippingFee, 30000);
  assert.match(small.body.couponError, /tối thiểu/);

  const freeship = await request(app).post('/api/cart/quote').send({ items: [{ productId: p.id, quantity: 1 }], couponCode: 'freeship' });
  assert.equal(freeship.body.shippingFee, 0);
  assert.equal(freeship.body.total, 149000);

  const big = product('nova-x15-pro-256gb');
  const pct = await request(app).post('/api/cart/quote').send({ items: [{ productId: big.id, quantity: 1 }], couponCode: 'LUMI10' });
  assert.equal(pct.body.discount, 200000); // 10% capped at 200K
  assert.equal(pct.body.shippingFee, 0); // above free-shipping threshold

  const expired = await request(app).post('/api/cart/quote').send({ items: [{ productId: big.id, quantity: 1 }], couponCode: 'TET2026' });
  assert.ok(expired.body.couponError);
});

test('guest checkout decrements stock, tracking needs the right phone', async () => {
  const p = product('lumi-pin-du-phong-20000mah');
  const res = await request(app)
    .post('/api/orders')
    .send({ ...address, items: [{ productId: p.id, quantity: 2 }], paymentMethod: 'bank' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const order = res.body.order;
  assert.equal(order.total, 690000 * 2);
  assert.equal(order.status, 'pending');
  assert.equal(product('lumi-pin-du-phong-20000mah').stock, p.stock - 2);

  assert.equal((await request(app).get('/api/orders/track').query({ code: order.code, phone: '0900000000' })).status, 404);
  const ok = await request(app).get('/api/orders/track').query({ code: order.code, phone: address.phone });
  assert.equal(ok.body.order.code, order.code);
  assert.equal(ok.body.order.history.length, 1);
});

test('checkout rejects invalid data and overselling', async () => {
  const bad = await request(app).post('/api/orders').send({ items: [], paymentMethod: 'cod' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields);

  const badPhone = await request(app)
    .post('/api/orders')
    .send({ ...address, phone: '12345', items: [{ productId: 1, quantity: 1 }], paymentMethod: 'cod' });
  assert.equal(badPhone.status, 400);
  assert.ok(badPhone.body.fields.phone);

  const scarce = product('lumi-de-sac-khong-day-3in1'); // stock 2
  const over = await request(app)
    .post('/api/orders')
    .send({ ...address, items: [{ productId: scarce.id, quantity: scarce.stock + 1 }], paymentMethod: 'cod' });
  assert.equal(over.status, 409);
  assert.equal(product('lumi-de-sac-khong-day-3in1').stock, scarce.stock);

  const outOfStock = product('orbit-ghe-gaming-ergo'); // stock 0
  const none = await request(app).post('/api/orders').send({ ...address, items: [{ productId: outOfStock.id, quantity: 1 }], paymentMethod: 'cod' });
  assert.equal(none.status, 409);
});

test('customer can cancel a pending order and stock is restored', async () => {
  const p = product('pixo-buds-lite');
  const res = await request(app)
    .post('/api/orders')
    .set(auth(customerToken))
    .send({ ...address, items: [{ productId: p.id, quantity: 3 }], paymentMethod: 'cod', couponCode: 'FREESHIP' });
  assert.equal(res.status, 201);
  const code = res.body.order.code;
  assert.equal(product('pixo-buds-lite').stock, p.stock - 3);

  const mine = await request(app).get('/api/me/orders').set(auth(customerToken));
  assert.ok(mine.body.items.some((o) => o.code === code));

  const cancel = await request(app).post(`/api/me/orders/${code}/cancel`).set(auth(customerToken)).send({ reason: 'Đổi ý' });
  assert.equal(cancel.body.order.status, 'cancelled');
  assert.equal(product('pixo-buds-lite').stock, p.stock);

  const again = await request(app).post(`/api/me/orders/${code}/cancel`).set(auth(customerToken)).send({});
  assert.equal(again.status, 400);
});

test('reviews only allowed after delivery', async () => {
  const delivered = product('lumi-sac-nhanh-gan-65w'); // the demo customer has a delivered order with this product
  const ok = await request(app).post(`/api/me/reviews/${delivered.id}`).set(auth(customerToken)).send({ rating: 5, comment: 'Tốt' });
  assert.equal(ok.status, 201);

  const notBought = product('aura-fold-z');
  const reg = await request(app).post('/api/auth/register').send({ name: 'Người Mới', email: 'moi@test.vn', password: '123456' });
  assert.equal(reg.status, 201);
  const denied = await request(app).post(`/api/me/reviews/${notBought.id}`).set(auth(reg.body.token)).send({ rating: 4 });
  assert.equal(denied.status, 403);

  const dup = await request(app).post('/api/auth/register').send({ name: 'Người Mới', email: 'MOI@test.vn', password: '123456' });
  assert.equal(dup.status, 409);
});

test('admin area is protected', async () => {
  assert.equal((await request(app).get('/api/admin/stats')).status, 401);
  assert.equal((await request(app).get('/api/admin/stats').set(auth(customerToken))).status, 403);
  const stats = await request(app).get('/api/admin/stats?days=30').set(auth(adminToken));
  assert.equal(stats.status, 200);
  assert.equal(stats.body.series.length, 30);
  assert.ok(stats.body.kpis.revenue.value > 0);
});

test('admin order workflow enforces transitions; COD paid on delivery', async () => {
  const p = product('lumi-o-cam-thong-minh');
  const { body } = await request(app).post('/api/orders').send({ ...address, items: [{ productId: p.id, quantity: 1 }], paymentMethod: 'cod' });
  const id = body.order.id;
  const step = (status) => request(app).patch(`/api/admin/orders/${id}/status`).set(auth(adminToken)).send({ status });

  assert.equal((await step('delivered')).status, 400); // cannot skip steps
  assert.equal((await step('confirmed')).body.order.status, 'confirmed');
  assert.equal((await step('shipping')).body.order.status, 'shipping');
  const done = await step('delivered');
  assert.equal(done.body.order.status, 'delivered');
  assert.equal(done.body.order.paymentStatus, 'paid');
  assert.equal((await step('cancelled')).status, 400);

  const csv = await request(app).get('/api/admin/orders/export?status=delivered').set(auth(adminToken));
  assert.equal(csv.status, 200);
  assert.match(csv.headers['content-type'], /text\/csv/);
});

test('admin product CRUD; products with orders are hidden instead of deleted', async () => {
  const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
  const bad = await request(app).post('/api/admin/products').set(auth(adminToken)).send({ name: 'X', categoryId: cat.id, price: 100, salePrice: 200, stock: 1 });
  assert.equal(bad.status, 400);

  const created = await request(app)
    .post('/api/admin/products')
    .set(auth(adminToken))
    .send({ name: 'Sản phẩm thử nghiệm', categoryId: cat.id, price: 500000, salePrice: 450000, stock: 10, sku: 'TEST-1', specs: [{ label: 'Màu', value: 'Đen' }] });
  assert.equal(created.status, 201);
  assert.equal(created.body.slug, 'san-pham-thu-nghiem');
  assert.equal(created.body.discountPercent, 10);

  const search = await request(app).get('/api/products').query({ q: 'thu nghiem' });
  assert.ok(search.body.items.some((x) => x.id === created.body.id));

  const patched = await request(app).patch(`/api/admin/products/${created.body.id}`).set(auth(adminToken)).send({ stock: 3 });
  assert.equal(patched.body.stock, 3);

  const del = await request(app).delete(`/api/admin/products/${created.body.id}`).set(auth(adminToken));
  assert.equal(del.body.result, 'deleted');

  const used = product('lumi-sac-nhanh-gan-65w');
  const hide = await request(app).delete(`/api/admin/products/${used.id}`).set(auth(adminToken));
  assert.equal(hide.body.result, 'hidden');
  assert.equal((await request(app).get('/api/products/lumi-sac-nhanh-gan-65w')).status, 404);
});

test('locked customers cannot log in', async () => {
  const locked = db.prepare("SELECT * FROM users WHERE status = 'locked' LIMIT 1").get();
  const res = await request(app).post('/api/auth/login').send({ email: locked.email, password: '123456' });
  assert.equal(res.status, 403);
});

test('forgot / reset password flow', async () => {
  const f = await request(app).post('/api/auth/forgot-password').send({ email: 'moi@test.vn' });
  assert.ok(f.body.devResetToken);
  const r = await request(app).post('/api/auth/reset-password').send({ token: f.body.devResetToken, password: 'matkhaumoi' });
  assert.equal(r.status, 200);
  const login = await request(app).post('/api/auth/login').send({ email: 'moi@test.vn', password: 'matkhaumoi' });
  assert.equal(login.status, 200);
  const reuse = await request(app).post('/api/auth/reset-password').send({ token: f.body.devResetToken, password: 'khac123' });
  assert.equal(reuse.status, 400);
});
