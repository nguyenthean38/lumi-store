const createApp = require('./app');
const db = require('./db');

// First run: fill the database with demo data.
const hasData = db.prepare('SELECT COUNT(*) n FROM users').get().n > 0;
if (!hasData) {
  console.log('Database trống – đang tạo dữ liệu mẫu...');
  require('./seed').seed();
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Thiếu biến môi trường JWT_SECRET khi chạy production.');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 4000;
createApp().listen(PORT, () => {
  console.log(`Lumi Store API đang chạy tại http://localhost:${PORT}`);
});
