/* Demo data. Run `npm run seed` to reset the database. */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { slugify, normalizeText, recalcProductRating } = require('./utils');

const PROVINCES = require('./provinces');

// Deterministic PRNG so the demo looks the same every time.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261106);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));

const CATEGORIES = [
  { name: 'Điện thoại', icon: 'smartphone', color: '#6366f1', description: 'Smartphone mới nhất, pin trâu, camera đẹp' },
  { name: 'Laptop', icon: 'laptop', color: '#0ea5e9', description: 'Laptop học tập, văn phòng và sáng tạo' },
  { name: 'Âm thanh', icon: 'headphones', color: '#f43f5e', description: 'Tai nghe, loa với âm thanh sống động' },
  { name: 'Đồng hồ thông minh', icon: 'watch', color: '#10b981', description: 'Theo dõi sức khoẻ 24/7' },
  { name: 'Nhà thông minh', icon: 'lightbulb', color: '#f59e0b', description: 'Biến ngôi nhà thành tổ ấm thông minh' },
  { name: 'Gaming', icon: 'gamepad', color: '#8b5cf6', description: 'Gear chiến game cho game thủ' },
  { name: 'Máy ảnh', icon: 'camera', color: '#ec4899', description: 'Lưu giữ mọi khoảnh khắc' },
  { name: 'Phụ kiện', icon: 'plug', color: '#14b8a6', description: 'Sạc, cáp, ốp lưng, balo công nghệ' },
];

// [categoryIndex, name, brand, emoji, price, salePrice, stock, specs, tags, featured, flash]
const PRODUCTS = [
  [0, 'Nova X15 Pro 256GB', 'Nova', '📱', 24990000, 22490000, 35, { 'Màn hình': '6.7" AMOLED 120Hz', Chip: 'Nova Fusion 9', RAM: '12GB', 'Bộ nhớ': '256GB', Pin: '5000mAh, sạc 67W', Camera: '200MP + 50MP + 12MP' }, 'flagship,5g,camera', 1, 1],
  [0, 'Nova X15 128GB', 'Nova', '📱', 18990000, null, 42, { 'Màn hình': '6.5" AMOLED 120Hz', Chip: 'Nova Fusion 8', RAM: '8GB', 'Bộ nhớ': '128GB', Pin: '4800mAh' }, '5g', 0, 0],
  [0, 'Pixo A7 Lite', 'Pixo', '📲', 4490000, 3790000, 120, { 'Màn hình': '6.6" IPS 90Hz', RAM: '6GB', 'Bộ nhớ': '128GB', Pin: '6000mAh' }, 'pin trau,gia re', 1, 1],
  [0, 'Aura Fold Z', 'Aura', '📱', 39990000, 36990000, 8, { 'Màn hình chính': '7.8" gập', 'Màn hình phụ': '6.3"', RAM: '16GB', 'Bộ nhớ': '512GB' }, 'gap,cao cap', 1, 0],
  [0, 'Pixo C3 Mini', 'Pixo', '📲', 2690000, null, 4, { 'Màn hình': '5.8" IPS', RAM: '4GB', 'Bộ nhớ': '64GB', Pin: '4000mAh' }, 'nho gon,gia re', 0, 0],

  [1, 'Zenith Book Air 14 M3', 'Zenith', '💻', 27990000, 25990000, 20, { CPU: 'Zenith M3 8 nhân', RAM: '16GB', SSD: '512GB', 'Màn hình': '14" 2.8K 120Hz', 'Trọng lượng': '1.2kg' }, 'mong nhe,van phong', 1, 0],
  [1, 'Zenith Book Pro 16', 'Zenith', '💻', 52990000, null, 6, { CPU: 'Zenith M3 Max', RAM: '32GB', SSD: '1TB', 'Màn hình': '16" Mini-LED' }, 'do hoa,sang tao', 1, 0],
  [1, 'Kairo Student 15', 'Kairo', '💻', 12490000, 10990000, 55, { CPU: 'Core i5 thế hệ 13', RAM: '8GB', SSD: '512GB', 'Màn hình': '15.6" FHD' }, 'hoc sinh,sinh vien', 0, 1],
  [1, 'Kairo Gaming G7 RTX', 'Kairo', '🖥️', 32990000, 29990000, 12, { CPU: 'Core i7 HX', GPU: 'RTX 4070 8GB', RAM: '16GB', 'Màn hình': '16" 240Hz' }, 'gaming,rtx', 1, 0],
  [1, 'Vela Tab S9 11"', 'Vela', '📟', 14990000, 13490000, 30, { 'Màn hình': '11" 2.5K 144Hz', Chip: 'Vela X2', 'Bộ nhớ': '256GB', 'Kèm bút': 'Có' }, 'may tinh bang,ve', 0, 0],

  [2, 'Aura Buds Pro 3 ANC', 'Aura', '🎧', 4990000, 3490000, 80, { 'Chống ồn': 'ANC thích ứng -48dB', Pin: '8h + 30h hộp sạc', 'Kết nối': 'Bluetooth 5.4', 'Chống nước': 'IP55' }, 'tai nghe,chong on', 1, 1],
  [2, 'Aura Max Over-Ear', 'Aura', '🎧', 8990000, null, 18, { 'Chống ồn': 'ANC 12 micro', Pin: '40 giờ', Driver: '40mm' }, 'tai nghe chup tai', 1, 0],
  [2, 'Orbit Boom Loa Bluetooth', 'Orbit', '🔊', 2490000, 1890000, 64, { 'Công suất': '30W', Pin: '20 giờ', 'Chống nước': 'IP67' }, 'loa,du lich', 0, 1],
  [2, 'Orbit Soundbar 2.1', 'Orbit', '📻', 6490000, 5490000, 15, { 'Công suất': '300W', 'Kết nối': 'HDMI eARC, Bluetooth', Subwoofer: 'Không dây' }, 'loa,tv', 0, 0],
  [2, 'Pixo Buds Lite', 'Pixo', '🎵', 590000, 449000, 200, { Pin: '6h + 24h', 'Kết nối': 'Bluetooth 5.3', 'Độ trễ': '60ms chế độ game' }, 'tai nghe,gia re', 0, 1],

  [3, 'Nova Watch 6 Classic', 'Nova', '⌚', 7990000, 6990000, 26, { 'Màn hình': '1.5" AMOLED', 'Cảm biến': 'Nhịp tim, SpO2, ECG', Pin: '3 ngày', 'Chống nước': '5ATM' }, 'dong ho,suc khoe', 1, 0],
  [3, 'Lumi Band 9', 'Lumi', '⌚', 990000, 790000, 150, { 'Màn hình': '1.6" AMOLED', Pin: '16 ngày', 'Chế độ thể thao': '150+' }, 'vong deo tay', 1, 1],
  [3, 'Vela Watch Ultra Titan', 'Vela', '⌚', 18990000, null, 3, { 'Vỏ': 'Titan', GPS: 'Băng tần kép', Pin: '60 giờ', 'Chống nước': '100m' }, 'the thao,lan', 0, 0],
  [3, 'Pixo Kids Watch 4G', 'Pixo', '⌚', 1590000, 1290000, 40, { 'Định vị': 'GPS + Wi-Fi', 'Gọi video': 'Có', Pin: '2 ngày' }, 'tre em,dinh vi', 0, 0],

  [4, 'Lumi Bulb RGB Wi-Fi (4 bóng)', 'Lumi', '💡', 690000, 499000, 90, { 'Công suất': '9W/bóng', 'Màu sắc': '16 triệu màu', 'Điều khiển': 'App, giọng nói' }, 'den,smart home', 1, 1],
  [4, 'Lumi Cam 360 2K', 'Lumi', '📹', 890000, 690000, 70, { 'Độ phân giải': '2K', 'Góc xoay': '360°', 'Hồng ngoại': '10m', 'Lưu trữ': 'Thẻ nhớ / Cloud' }, 'camera an ninh', 1, 0],
  [4, 'Orbit Robot Hút Bụi S8', 'Orbit', '🤖', 9990000, 7990000, 14, { 'Lực hút': '6000Pa', 'Lau nhà': 'Có, rung', 'Dẫn đường': 'LiDAR', Pin: '180 phút' }, 'robot,don nha', 1, 0],
  [4, 'Lumi Ổ Cắm Thông Minh', 'Lumi', '🔌', 290000, null, 110, { 'Dòng tối đa': '16A', 'Đo điện năng': 'Có', 'Hẹn giờ': 'Có' }, 'o cam,smart home', 0, 0],
  [4, 'Zenith Loa Thông Minh Home', 'Zenith', '🔈', 2290000, 1990000, 33, { 'Trợ lý': 'Giọng nói tiếng Việt', 'Kết nối': 'Wi-Fi, Bluetooth', 'Hub nhà thông minh': 'Có' }, 'loa,tro ly ao', 0, 0],

  [5, 'Kairo Tay Cầm Pro Wireless', 'Kairo', '🎮', 1490000, 1190000, 60, { 'Kết nối': '2.4GHz, Bluetooth, có dây', Pin: '30 giờ', 'Rung': 'HD Haptics' }, 'tay cam,pc,console', 1, 1],
  [5, 'Kairo Bàn Phím Cơ K75', 'Kairo', '⌨️', 1890000, 1590000, 45, { Switch: 'Hot-swap Linear', 'Layout': '75%', LED: 'RGB', 'Kết nối': '3 chế độ' }, 'ban phim co', 1, 0],
  [5, 'Kairo Chuột Gaming V2', 'Kairo', '🖱️', 990000, 790000, 75, { DPI: '26000', 'Trọng lượng': '58g', 'Kết nối': 'Không dây 4K Hz' }, 'chuot', 0, 1],
  [5, 'Zenith Màn Hình 27" 2K 170Hz', 'Zenith', '🖥️', 6490000, 5690000, 22, { 'Tấm nền': 'IPS', 'Độ phân giải': '2560x1440', 'Tần số quét': '170Hz', 'Phản hồi': '1ms' }, 'man hinh', 1, 0],
  [5, 'Orbit Ghế Gaming Ergo', 'Orbit', '🪑', 4990000, null, 0, { 'Chất liệu': 'Da PU + lưới', 'Ngả lưng': '155°', 'Tải trọng': '150kg' }, 'ghe,cong thai hoc', 0, 0],

  [6, 'Vela Alpha Mirrorless Kit', 'Vela', '📷', 21990000, 19990000, 10, { 'Cảm biến': 'APS-C 26MP', Video: '4K 60fps', 'Ống kính kèm': '18-55mm', 'Chống rung': 'IBIS 5 trục' }, 'may anh,quay phim', 1, 0],
  [6, 'Pixo Action Cam 5', 'Pixo', '🎥', 5490000, 4690000, 28, { Video: '5.3K 60fps', 'Chống nước': '10m không vỏ', 'Chống rung': 'HyperSmooth' }, 'action cam,du lich', 1, 1],
  [6, 'Vela Instant Mini', 'Vela', '📸', 1890000, null, 36, { 'Loại': 'Chụp in liền', 'Khổ ảnh': '54x86mm', Pin: '100 tấm' }, 'chup lay lien', 0, 0],
  [6, 'Orbit Gimbal Mobile 6', 'Orbit', '🤳', 2990000, 2490000, 25, { 'Trục': '3 trục', 'Tải trọng': '300g', 'Theo dõi': 'AI tracking' }, 'gimbal,quay video', 0, 0],

  [7, 'Lumi Sạc Nhanh GaN 65W', 'Lumi', '🔋', 690000, 490000, 180, { 'Công suất': '65W', 'Cổng': '2 USB-C + 1 USB-A', 'Công nghệ': 'GaN III' }, 'sac,gan', 1, 1],
  [7, 'Lumi Pin Dự Phòng 20000mAh', 'Lumi', '🔋', 890000, 690000, 140, { 'Dung lượng': '20000mAh', 'Sạc nhanh': '22.5W', 'Cổng': 'USB-C PD' }, 'pin du phong', 0, 0],
  [7, 'Pixo Cáp USB-C Bện Dù 2m', 'Pixo', '🧵', 190000, 149000, 300, { 'Chiều dài': '2m', 'Công suất': '100W', 'Chất liệu': 'Bện dù' }, 'cap sac', 0, 0],
  [7, 'Orbit Balo Laptop Chống Nước', 'Orbit', '🎒', 1290000, 990000, 50, { 'Ngăn laptop': 'Tối đa 16"', 'Chống nước': 'Có', 'Cổng sạc USB': 'Có' }, 'balo', 1, 0],
  [7, 'Lumi Đế Sạc Không Dây 3in1', 'Lumi', '⚡', 1190000, null, 2, { 'Sạc': 'Điện thoại + đồng hồ + tai nghe', 'Công suất': '15W' }, 'sac khong day', 0, 0],
  [7, 'Pixo Ốp Lưng MagSafe Trong Suốt', 'Pixo', '🛡️', 290000, 199000, 160, { 'Chất liệu': 'TPU + PC', 'Nam châm': 'Có', 'Chống ố vàng': 'Có' }, 'op lung', 0, 0],
];

const FIRST = ['Minh', 'Lan', 'Hùng', 'Thảo', 'Tuấn', 'Ngọc', 'Phúc', 'Hà', 'Quang', 'Mai', 'Đức', 'Trang', 'Khoa', 'Linh', 'Bảo', 'Vy', 'Nam', 'Yến', 'Long', 'Hương'];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Huỳnh'];
const MIDDLE = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Hoàng', 'Thanh', 'Gia', 'Quốc'];
const WARDS = ['Phường Bến Thành', 'Phường Ba Đình', 'Phường Hải Châu', 'Xã Tân Phú', 'Phường Thủ Dầu Một', 'Phường Ninh Kiều', 'Phường Hoàn Kiếm', 'Xã Hòa Vang', 'Phường Vĩnh Yên', 'Phường An Khánh'];
const STREETS = ['12 Lê Lợi', '45 Trần Hưng Đạo', '88 Nguyễn Trãi', '7 Hai Bà Trưng', '210 Cách Mạng Tháng 8', '19 Lý Thường Kiệt', '5A Phan Đình Phùng', '33 Võ Văn Tần'];
const GOOD = [
  'Sản phẩm rất tốt, đóng gói cẩn thận, giao hàng nhanh!',
  'Dùng được 2 tuần thấy ổn định, đáng tiền.',
  'Chất lượng vượt mong đợi so với giá. Sẽ ủng hộ shop tiếp.',
  'Shop tư vấn nhiệt tình, hàng chính hãng.',
  'Thiết kế đẹp, cầm chắc tay, pin dùng cả ngày.',
  'Giao hàng trong 1 ngày, nhân viên thân thiện. 10 điểm!',
];
const OK = ['Tạm ổn, đúng mô tả nhưng hộp hơi móp.', 'Dùng ổn, giá hơi cao so với mặt bằng.', 'Giao hơi chậm nhưng hàng tốt.'];
const BAD = ['Pin không được như quảng cáo.', 'Hàng bị trầy nhẹ, shop đã hỗ trợ đổi.'];

/** Product art: a soft gradient tile with the product emoji. Admins can replace with real photos. */
function productSvg(emoji, color, variant, brand) {
  const angles = [135, 45, 200];
  const a = angles[variant % 3];
  const light = variant === 1 ? '#ffffff' : '#f8fafc';
  const size = [360, 300, 250][variant % 3];
  const y = [455, 440, 430][variant % 3];
  const deco =
    variant === 0
      ? `<circle cx="640" cy="170" r="120" fill="${color}" opacity=".14"/><circle cx="150" cy="660" r="90" fill="${color}" opacity=".10"/>`
      : variant === 1
        ? `<rect x="90" y="90" width="620" height="620" rx="60" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="6" stroke-dasharray="18 18"/>`
        : `<path d="M0 620 Q 400 520 800 640 L800 800 L0 800Z" fill="${color}" opacity=".16"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs><linearGradient id="g" gradientTransform="rotate(${a} .5 .5)"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${color}" stop-opacity=".28"/></linearGradient>
<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="${color}" flood-opacity=".35"/></filter></defs>
<rect width="800" height="800" fill="url(#g)"/>${deco}
<text x="400" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" filter="url(#s)" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
<text x="400" y="735" font-size="34" text-anchor="middle" fill="${color}" font-family="Segoe UI, Arial, sans-serif" font-weight="700" letter-spacing="8" opacity=".75">${brand.toUpperCase()}</text>
</svg>`;
}

function bannerSvg(emojis, from, to) {
  const items = emojis
    .map((e, i) => `<text x="${880 + (i % 2) * 220}" y="${190 + i * 120}" font-size="${150 - i * 20}" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji">${e}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="1200" height="500">
<defs><linearGradient id="b" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="1200" height="500" fill="url(#b)"/><circle cx="980" cy="250" r="230" fill="#fff" opacity=".12"/><circle cx="1120" cy="60" r="90" fill="#fff" opacity=".1"/>${items}</svg>`;
}

// Real product photos live in server/seed-images (free Unsplash photos, see credits-*.json there).
const PHOTO_DIR = path.join(__dirname, '..', 'seed-images');

/** Copies <name>-1.jpg, <name>-2.jpg... into uploads/seed and returns their public URLs. */
function copyPhotos(name, seedDir) {
  const urls = [];
  for (let n = 1; n <= 4; n++) {
    const file = `${name}-${n}.jpg`;
    if (!fs.existsSync(path.join(PHOTO_DIR, file))) continue;
    fs.copyFileSync(path.join(PHOTO_DIR, file), path.join(seedDir, file));
    urls.push(`/uploads/seed/${file}`);
  }
  return urls;
}

function iso(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function seed() {
  const seedDir = path.join(__dirname, '..', 'uploads', 'seed');
  fs.mkdirSync(seedDir, { recursive: true });

  const wipe = db.transaction(() => {
    for (const t of ['order_history', 'order_items', 'orders', 'reviews', 'wishlist', 'addresses', 'products', 'categories', 'coupons', 'banners', 'settings', 'users']) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
    db.prepare("DELETE FROM sqlite_sequence").run();
  });
  wipe();

  const run = db.transaction(() => {
    /* Users */
    const insUser = db.prepare('INSERT INTO users (name, email, phone, password_hash, role, status, created_at) VALUES (?,?,?,?,?,?,?)');
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('123456', 10);
    insUser.run('Quản trị viên', 'admin@lumi.vn', '0901234567', adminHash, 'admin', 'active', iso(new Date(Date.now() - 120 * 864e5)));
    insUser.run('Nguyễn Minh Anh', 'khach@lumi.vn', '0912345678', userHash, 'customer', 'active', iso(new Date(Date.now() - 100 * 864e5)));
    const customerIds = [2];
    for (let i = 0; i < 34; i++) {
      const name = `${pick(LAST)} ${pick(MIDDLE)} ${pick(FIRST)}`;
      const email = `${slugify(name).replace(/-/g, '.')}${i}@gmail.com`;
      const phone = `09${String(int(10000000, 99999999))}`;
      const created = new Date(Date.now() - int(0, 95) * 864e5 - int(0, 86400) * 1000);
      const info = insUser.run(name, email, phone, userHash, 'customer', i === 7 ? 'locked' : 'active', iso(created));
      customerIds.push(info.lastInsertRowid);
    }
    db.prepare('INSERT INTO addresses (user_id, full_name, phone, province, ward, street, is_default) VALUES (?,?,?,?,?,?,?)').run(
      2,
      'Nguyễn Minh Anh',
      '0912345678',
      'Thành phố Hồ Chí Minh',
      'Phường Bến Thành',
      '12 Lê Lợi',
      1
    );

    /* Categories */
    const insCat = db.prepare('INSERT INTO categories (name, slug, icon, color, description, sort_order) VALUES (?,?,?,?,?,?)');
    const catIds = CATEGORIES.map((c, i) => insCat.run(c.name, slugify(c.name), c.icon, c.color, c.description, i).lastInsertRowid);

    /* Products */
    const insProd = db.prepare(`INSERT INTO products (category_id, name, slug, sku, brand, short_desc, description, price, sale_price, stock,
      images, specs, tags, search_text, is_featured, is_flash_sale, created_at, updated_at) VALUES
      (@category_id, @name, @slug, @sku, @brand, @short_desc, @description, @price, @sale_price, @stock, @images, @specs, @tags, @search_text, @is_featured, @is_flash_sale, @created_at, @created_at)`);
    const products = [];
    PRODUCTS.forEach(([ci, name, brand, emoji, price, sale, stock, specs, tags, featured, flash], idx) => {
      const cat = CATEGORIES[ci];
      const slug = slugify(name);
      let images = copyPhotos(slug, seedDir);
      if (!images.length) {
        // No photo available: fall back to a generated illustration.
        images = [0, 1, 2].map((v) => {
          const file = `${slug}-${v + 1}.svg`;
          fs.writeFileSync(path.join(seedDir, file), productSvg(emoji, cat.color, v, brand));
          return `/uploads/seed/${file}`;
        });
      }
      const specList = Object.entries(specs).map(([label, value]) => ({ label, value }));
      const highlights = specList.slice(0, 4).map((s) => `• ${s.label}: ${s.value}`).join('\n');
      const description = `${name} là lựa chọn nổi bật trong dòng ${cat.name.toLowerCase()} của ${brand}, mang đến trải nghiệm mượt mà và bền bỉ cho nhu cầu hằng ngày.\n\nĐiểm nổi bật:\n${highlights}\n\nBộ sản phẩm gồm: Máy/Thiết bị, cáp sạc, sách hướng dẫn và phiếu bảo hành điện tử 12 tháng.\n\nLumi Store cam kết hàng chính hãng 100%, đổi trả miễn phí trong 30 ngày nếu có lỗi từ nhà sản xuất.`;
      const created = iso(new Date(Date.now() - (PRODUCTS.length - idx) * 2.2 * 864e5));
      const info = insProd.run({
        category_id: catIds[ci],
        name,
        slug,
        sku: `LM-${String(ci + 1).padStart(2, '0')}${String(idx + 1).padStart(3, '0')}`,
        brand,
        short_desc: specList.slice(0, 3).map((s) => s.value).join(' · '),
        description,
        price,
        sale_price: sale,
        stock,
        images: JSON.stringify(images),
        specs: JSON.stringify(specList),
        tags,
        search_text: normalizeText([name, brand, tags, cat.name].join(' ')),
        is_featured: featured,
        is_flash_sale: flash,
        created_at: created,
      });
      products.push({ id: info.lastInsertRowid, name, price: sale ?? price, image: images[0] });
    });

    /* Orders spread over the last 90 days */
    const insOrder = db.prepare(`INSERT INTO orders (code, user_id, customer_name, phone, email, province, ward, street, payment_method, payment_status,
      status, subtotal, discount, shipping_fee, total, coupon_code, cancel_reason, created_at, updated_at)
      VALUES (@code,@user_id,@customer_name,@phone,@email,@province,@ward,@street,@payment_method,@payment_status,@status,@subtotal,@discount,@shipping_fee,@total,@coupon_code,@cancel_reason,@created_at,@created_at)`);
    const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, image, price, quantity) VALUES (?,?,?,?,?,?)');
    const insHist = db.prepare('INSERT INTO order_history (order_id, status, note, actor, created_at) VALUES (?,?,?,?,?)');
    const addSold = db.prepare('UPDATE products SET sold = sold + ? WHERE id = ?');
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?');
    const insReview = db.prepare('INSERT OR IGNORE INTO reviews (product_id, user_id, rating, comment, created_at) VALUES (?,?,?,?,?)');
    const popular = products.slice().sort(() => rand() - 0.5);
    const usedCodes = new Set();

    const steps = ['pending', 'confirmed', 'shipping', 'delivered'];
    const notes = {
      pending: 'Đơn hàng đã được tạo',
      confirmed: 'Cửa hàng đã xác nhận đơn và đang chuẩn bị hàng',
      shipping: 'Đơn hàng đã được giao cho đơn vị vận chuyển',
      delivered: 'Giao hàng thành công',
    };

    for (let n = 0; n < 230; n++) {
      // skew toward recent days so charts show growth
      const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 90);
      const created = new Date(Date.now() - daysAgo * 864e5 - int(0, 12 * 3600) * 1000);
      const uid = rand() < 0.85 ? pick(customerIds) : null;
      const u = uid ? userRow.get(uid) : null;
      const itemsCount = rand() < 0.6 ? 1 : rand() < 0.8 ? 2 : 3;
      const lines = [];
      for (let k = 0; k < itemsCount; k++) {
        const p = rand() < 0.6 ? popular[int(0, 11)] : pick(products);
        if (lines.find((l) => l.id === p.id)) continue;
        lines.push({ ...p, qty: p.price < 1000000 ? int(1, 3) : 1 });
      }
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const shipping = subtotal >= 500000 ? 0 : 30000;
      const useCoupon = rand() < 0.18 && subtotal >= 1000000;
      const discount = useCoupon ? Math.min(Math.floor(subtotal * 0.1), 200000) : 0;

      let status;
      if (daysAgo > 6) status = rand() < 0.88 ? 'delivered' : 'cancelled';
      else if (daysAgo > 2) status = pick(['delivered', 'delivered', 'shipping', 'confirmed', 'cancelled']);
      else status = pick(['pending', 'pending', 'confirmed', 'shipping']);
      const pm = pick(['cod', 'cod', 'cod', 'bank', 'ewallet']);
      const paid = status === 'delivered' || (pm !== 'cod' && status !== 'pending' && status !== 'cancelled');

      let code;
      do {
        const d = created;
        code = `LM${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${Math.floor(rand() * 36 ** 5).toString(36).toUpperCase().padStart(5, '0')}`;
      } while (usedCodes.has(code));
      usedCodes.add(code);

      const info = insOrder.run({
        code,
        user_id: uid,
        customer_name: u ? u.name : `${pick(LAST)} ${pick(MIDDLE)} ${pick(FIRST)}`,
        phone: u?.phone || `09${int(10000000, 99999999)}`,
        email: u?.email || null,
        province: rand() < 0.45 ? 'Thành phố Hồ Chí Minh' : rand() < 0.5 ? 'Thành phố Hà Nội' : pick(PROVINCES),
        ward: pick(WARDS),
        street: pick(STREETS),
        payment_method: pm,
        payment_status: status === 'cancelled' ? 'unpaid' : paid ? 'paid' : 'unpaid',
        status,
        subtotal,
        discount,
        shipping_fee: shipping,
        total: subtotal - discount + shipping,
        coupon_code: useCoupon ? 'LUMI10' : null,
        cancel_reason: status === 'cancelled' ? pick(['Khách đổi ý', 'Không liên lạc được khách', 'Khách đặt nhầm sản phẩm']) : null,
        created_at: iso(created),
      });
      const oid = info.lastInsertRowid;
      for (const l of lines) {
        insItem.run(oid, l.id, l.name, l.image, l.price, l.qty);
        if (status !== 'cancelled') addSold.run(l.qty, l.id);
      }
      const reached = status === 'cancelled' ? int(0, 1) : steps.indexOf(status);
      for (let s = 0; s <= reached; s++) {
        insHist.run(oid, steps[s], notes[steps[s]], s === 0 ? (u ? u.name : 'Khách') : 'Quản trị viên', iso(new Date(created.getTime() + s * 20 * 3600e3)));
      }
      if (status === 'cancelled') {
        insHist.run(oid, 'cancelled', 'Đơn hàng đã bị huỷ', 'Quản trị viên', iso(new Date(created.getTime() + 3 * 3600e3)));
      }

      if (status === 'delivered' && uid && rand() < 0.65) {
        for (const l of lines) {
          const r = rand();
          const rating = r < 0.6 ? 5 : r < 0.85 ? 4 : r < 0.95 ? 3 : 2;
          const comment = rating >= 4 ? pick(GOOD) : rating === 3 ? pick(OK) : pick(BAD);
          insReview.run(l.id, uid, rating, comment, iso(new Date(created.getTime() + 4 * 864e5)));
        }
      }
    }
    // the demo customer has one delivered order so the "write a review" flow can be tried
    for (const p of products) recalcProductRating(p.id);

    /* Coupons */
    const insCoupon = db.prepare('INSERT INTO coupons (code, description, type, value, max_discount, min_order, usage_limit, used_count, starts_at, expires_at, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const in60 = iso(new Date(Date.now() + 60 * 864e5));
    insCoupon.run('LUMI10', 'Giảm 10% tối đa 200K cho đơn từ 1 triệu', 'percent', 10, 200000, 1000000, 500, 41, null, in60, 1);
    insCoupon.run('CHAOBAN50K', 'Giảm 50K cho đơn từ 300K – chào bạn mới', 'fixed', 50000, null, 300000, 1000, 120, null, in60, 1);
    insCoupon.run('FREESHIP', 'Miễn phí vận chuyển mọi đơn hàng', 'freeship', 0, null, 0, null, 87, null, in60, 1);
    insCoupon.run('SIEUSALE', 'Giảm 15% tối đa 1 triệu cho đơn từ 5 triệu', 'percent', 15, 1000000, 5000000, 100, 12, null, in60, 1);
    insCoupon.run('TET2026', 'Mã Tết đã hết hạn', 'percent', 20, 500000, 0, 200, 200, '2026-01-20 00:00:00', '2026-02-20 23:59:59', 0);

    /* Banners */
    const insBanner = db.prepare('INSERT INTO banners (title, subtitle, image, link, button_text, color, sort_order) VALUES (?,?,?,?,?,?,?)');
    const banners = [
      ['Siêu sale công nghệ', 'Giảm đến 40% cho tai nghe, đồng hồ và phụ kiện. Freeship đơn từ 500K.', ['🎧', '⌚', '🔋'], '#4f46e5', '#7c3aed', '/products?onSale=1', 'Săn deal ngay'],
      ['Laptop cho mùa tựu trường', 'Tặng balo chống nước khi mua laptop bất kỳ. Trả góp 0%.', ['💻', '🎒', '🖱️'], '#0284c7', '#0d9488', '/products?category=laptop', 'Khám phá'],
      ['Nhà thông minh – sống tiện nghi', 'Điều khiển đèn, camera, robot hút bụi chỉ bằng giọng nói.', ['💡', '🤖', '📹'], '#ea580c', '#db2777', '/products?category=nha-thong-minh', 'Xem bộ sưu tập'],
    ];
    banners.forEach(([title, subtitle, emojis, from, to, link, btn], i) => {
      let image = `/uploads/seed/banner-${i + 1}.jpg`;
      if (fs.existsSync(path.join(PHOTO_DIR, `banner-${i + 1}.jpg`))) {
        fs.copyFileSync(path.join(PHOTO_DIR, `banner-${i + 1}.jpg`), path.join(seedDir, `banner-${i + 1}.jpg`));
      } else {
        image = `/uploads/seed/banner-${i + 1}.svg`;
        fs.writeFileSync(path.join(seedDir, `banner-${i + 1}.svg`), bannerSvg(emojis, from, to));
      }
      insBanner.run(title, subtitle, image, link, btn, `linear-gradient(120deg, ${from}, ${to})`, i);
    });
  });
  run();

  // Make sure the demo customer has a delivered order containing a product they have not reviewed yet
  const demoProduct = db.prepare("SELECT * FROM products WHERE slug = 'lumi-sac-nhanh-gan-65w'").get();
  db.prepare('DELETE FROM reviews WHERE user_id = 2 AND product_id = ?').run(demoProduct.id);
  const o = db
    .prepare(`INSERT INTO orders (code, user_id, customer_name, phone, email, province, ward, street, payment_method, payment_status, status, subtotal, discount, shipping_fee, total, created_at, updated_at)
      VALUES ('LM2610DEMO1', 2, 'Nguyễn Minh Anh', '0912345678', 'khach@lumi.vn', 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '12 Lê Lợi', 'cod', 'paid', 'delivered', ?, 0, 30000, ?, datetime('now','-5 days'), datetime('now','-3 days'))`)
    .run(demoProduct.sale_price, demoProduct.sale_price + 30000);
  db.prepare('INSERT INTO order_items (order_id, product_id, name, image, price, quantity) VALUES (?,?,?,?,?,1)').run(
    o.lastInsertRowid,
    demoProduct.id,
    demoProduct.name,
    JSON.parse(demoProduct.images)[0],
    demoProduct.sale_price
  );
  const h = db.prepare("INSERT INTO order_history (order_id, status, note, actor, created_at) VALUES (?,?,?,?,datetime('now', ?))");
  h.run(o.lastInsertRowid, 'pending', 'Đơn hàng đã được tạo', 'Nguyễn Minh Anh', '-5 days');
  h.run(o.lastInsertRowid, 'confirmed', 'Cửa hàng đã xác nhận đơn và đang chuẩn bị hàng', 'Quản trị viên', '-5 days');
  h.run(o.lastInsertRowid, 'shipping', 'Đơn hàng đã được giao cho đơn vị vận chuyển', 'Quản trị viên', '-4 days');
  h.run(o.lastInsertRowid, 'delivered', 'Giao hàng thành công', 'Quản trị viên', '-3 days');
  recalcProductRating(demoProduct.id);

  const counts = ['users', 'products', 'orders', 'reviews'].map((t) => `${t}: ${db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n}`);
  console.log('Đã tạo dữ liệu mẫu →', counts.join(', '));
}

module.exports = { seed };

if (require.main === module) seed();
