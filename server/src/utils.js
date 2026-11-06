const db = require('./db');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Validate req data with a zod schema; throws a 400 with field errors (Vietnamese messages). */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new HttpError(400, Object.values(fields)[0] || 'Dữ liệu không hợp lệ', fields);
  }
  return result.data;
}

/** Turn "Tai nghe Bluetooth Đen" into "tai-nghe-bluetooth-den". */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Strip accents for accent-insensitive search ("tai nghe" matches "Tai nghe"). */
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

function uniqueSlug(table, base, excludeId) {
  let slug = slugify(base) || 'item';
  let candidate = slug;
  let i = 2;
  const stmt = db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id IS NOT ?`);
  while (stmt.get(candidate, excludeId ?? null)) {
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

const SETTING_DEFAULTS = {
  store_name: 'Lumi Store',
  hotline: '1900 6868',
  email: 'hotro@lumistore.vn',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  shipping_fee: '30000',
  free_shipping_threshold: '500000',
  bank_name: 'Vietcombank',
  bank_bin: '970436',
  bank_account: '0123456789',
  bank_owner: 'CONG TY LUMI STORE',
  flash_sale_end: '',
  low_stock_threshold: '5',
};

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function serializeProduct(p) {
  if (!p) return p;
  const images = safeJson(p.images, []);
  const effective = p.sale_price != null && p.sale_price < p.price ? p.sale_price : p.price;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    shortDesc: p.short_desc,
    description: p.description,
    price: p.price,
    salePrice: p.sale_price,
    finalPrice: effective,
    discountPercent: effective < p.price ? Math.round((1 - effective / p.price) * 100) : 0,
    stock: p.stock,
    sold: p.sold,
    ratingAvg: Math.round((p.rating_avg || 0) * 10) / 10,
    ratingCount: p.rating_count,
    images,
    image: images[0] || null,
    specs: safeJson(p.specs, []),
    tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    isActive: !!p.is_active,
    isFeatured: !!p.is_featured,
    isFlashSale: !!p.is_flash_sale,
    categoryId: p.category_id,
    categoryName: p.category_name,
    categorySlug: p.category_slug,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function safeJson(text, fallback) {
  try {
    const v = JSON.parse(text);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
  };
}

function recalcProductRating(productId) {
  const r = db
    .prepare('SELECT AVG(rating) avg, COUNT(*) c FROM reviews WHERE product_id = ? AND is_hidden = 0')
    .get(productId);
  db.prepare('UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?').run(r.avg || 0, r.c, productId);
}

function generateOrderCode() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `LM${ymd}${rand}`;
}

function paginate(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = {
  HttpError,
  validate,
  slugify,
  normalizeText,
  uniqueSlug,
  getSettings,
  SETTING_DEFAULTS,
  serializeProduct,
  safeJson,
  publicUser,
  recalcProductRating,
  generateOrderCode,
  paginate,
};
