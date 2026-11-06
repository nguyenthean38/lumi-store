const express = require('express');
const db = require('../db');
const { HttpError, serializeProduct, getSettings, normalizeText, paginate } = require('../utils');

const router = express.Router();

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

router.get('/settings', (_req, res) => {
  const s = getSettings();
  res.json({
    storeName: s.store_name,
    hotline: s.hotline,
    email: s.email,
    address: s.address,
    shippingFee: Number(s.shipping_fee),
    freeShippingThreshold: Number(s.free_shipping_threshold),
    bank: { name: s.bank_name, bin: s.bank_bin, account: s.bank_account, owner: s.bank_owner },
    flashSaleEnd: s.flash_sale_end || null,
  });
});

router.get('/provinces', (_req, res) => res.json(require('../provinces')));

router.get('/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
       FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name`
    )
    .all();
  res.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      description: c.description,
      productCount: c.product_count,
    }))
  );
});

router.get('/banners', (_req, res) => {
  const rows = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order, id').all();
  res.json(
    rows.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      image: b.image,
      link: b.link,
      buttonText: b.button_text,
      color: b.color,
    }))
  );
});

/** Active, still-usable coupons shown on the storefront so shoppers can copy them. */
router.get('/coupons/public', (_req, res) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const rows = db
    .prepare(
      `SELECT * FROM coupons WHERE is_active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (expires_at IS NULL OR expires_at >= ?)
       AND (usage_limit IS NULL OR used_count < usage_limit) ORDER BY min_order ASC LIMIT 6`
    )
    .all(now, now);
  res.json(
    rows.map((c) => ({
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      maxDiscount: c.max_discount,
      minOrder: c.min_order,
      expiresAt: c.expires_at,
    }))
  );
});

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  best: 'p.sold DESC, p.id DESC',
  price_asc: 'COALESCE(MIN(p.sale_price, p.price), p.price) ASC',
  price_desc: 'COALESCE(MIN(p.sale_price, p.price), p.price) DESC',
  rating: 'p.rating_avg DESC, p.rating_count DESC',
  discount: '(p.price - COALESCE(p.sale_price, p.price)) * 1.0 / p.price DESC',
};

router.get('/products', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = ['p.is_active = 1'];
  const params = {};
  const q = String(req.query.q || '').trim();
  if (q) {
    // every word must match (accent-insensitive)
    normalizeText(q)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .forEach((w, i) => {
        where.push(`p.search_text LIKE @q${i}`);
        params[`q${i}`] = `%${w}%`;
      });
  }
  if (req.query.category) {
    where.push('c.slug = @category');
    params.category = String(req.query.category);
  }
  if (req.query.brand) {
    const brands = String(req.query.brand).split(',').filter(Boolean);
    where.push(`p.brand IN (${brands.map((_, i) => `@b${i}`).join(',')})`);
    brands.forEach((b, i) => (params[`b${i}`] = b));
  }
  const priceExpr = 'COALESCE(MIN(p.sale_price, p.price), p.price)';
  if (req.query.minPrice) {
    where.push(`${priceExpr} >= @minPrice`);
    params.minPrice = Number(req.query.minPrice) || 0;
  }
  if (req.query.maxPrice) {
    where.push(`${priceExpr} <= @maxPrice`);
    params.maxPrice = Number(req.query.maxPrice) || 0;
  }
  if (req.query.rating) {
    where.push('p.rating_avg >= @rating');
    params.rating = Number(req.query.rating) || 0;
  }
  if (req.query.inStock === '1') where.push('p.stock > 0');
  if (req.query.onSale === '1') where.push('p.sale_price IS NOT NULL AND p.sale_price < p.price');
  if (req.query.featured === '1') where.push('p.is_featured = 1');
  if (req.query.flash === '1') where.push('p.is_flash_sale = 1');
  if (req.query.ids) {
    const ids = String(req.query.ids)
      .split(',')
      .map(Number)
      .filter(Boolean)
      .slice(0, 50);
    if (ids.length) where.push(`p.id IN (${ids.join(',')})`);
  }

  const sort = SORTS[req.query.sort] || SORTS.newest;
  const whereSql = where.join(' AND ');
  const total = db
    .prepare(`SELECT COUNT(*) n FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${whereSql}`)
    .get(params).n;
  const rows = db
    .prepare(`${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY ${sort} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });

  // brand facets for the current category/search (ignoring brand filter itself)
  const facetWhere = where.filter((w) => !w.startsWith('p.brand IN'));
  const facetParams = Object.fromEntries(Object.entries(params).filter(([k]) => !/^b\d+$/.test(k)));
  const brands = db
    .prepare(
      `SELECT p.brand, COUNT(*) n FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${facetWhere.join(' AND ')} AND p.brand IS NOT NULL AND p.brand <> ''
       GROUP BY p.brand ORDER BY n DESC, p.brand`
    )
    .all(facetParams);

  res.json({
    items: rows.map(serializeProduct),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    brands: brands.map((b) => ({ name: b.brand, count: b.n })),
  });
});

router.get('/products/suggest', (req, res) => {
  const q = normalizeText(String(req.query.q || '').trim());
  if (!q) return res.json([]);
  const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const where = words.map((_, i) => `p.search_text LIKE @w${i}`).join(' AND ');
  const params = Object.fromEntries(words.map((w, i) => [`w${i}`, `%${w}%`]));
  const rows = db
    .prepare(`${PRODUCT_SELECT} WHERE p.is_active = 1 AND ${where} ORDER BY p.sold DESC LIMIT 6`)
    .all(params);
  res.json(
    rows.map((r) => {
      const p = serializeProduct(r);
      return { id: p.id, name: p.name, slug: p.slug, image: p.image, finalPrice: p.finalPrice, price: p.price, categoryName: p.categoryName };
    })
  );
});

router.get('/products/:slug', (req, res) => {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_active = 1`).get(req.params.slug);
  if (!row) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  const product = serializeProduct(row);
  const related = db
    .prepare(`${PRODUCT_SELECT} WHERE p.is_active = 1 AND p.category_id = ? AND p.id <> ? ORDER BY p.sold DESC LIMIT 8`)
    .all(row.category_id, row.id)
    .map(serializeProduct);
  const dist = db
    .prepare('SELECT rating, COUNT(*) n FROM reviews WHERE product_id = ? AND is_hidden = 0 GROUP BY rating')
    .all(row.id);
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.forEach((d) => (ratingDistribution[d.rating] = d.n));
  res.json({ product, related, ratingDistribution });
});

router.get('/products/:id/reviews', (req, res) => {
  const { page, limit, offset } = paginate({ ...req.query, limit: req.query.limit || 5 });
  const id = Number(req.params.id);
  const params = [id];
  let extra = '';
  if (req.query.rating) {
    extra = ' AND r.rating = ?';
    params.push(Number(req.query.rating));
  }
  const total = db.prepare(`SELECT COUNT(*) n FROM reviews r WHERE r.product_id = ? AND r.is_hidden = 0${extra}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.is_hidden = 0${extra} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      userName: r.user_name,
      createdAt: r.created_at,
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

module.exports = router;
