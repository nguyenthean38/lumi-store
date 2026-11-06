const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { HttpError } = require('./utils');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // SPA + external QR image; keep simple for the demo
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use('/api', require('./routes/catalog'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/me', require('./routes/me'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api', require('./routes/orders'));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API không tồn tại')));

  // Serve the built client (npm run build in /client) as a single-page app.
  const dist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh quá lớn (tối đa 3MB)' : 'Tải ảnh lên thất bại';
      return res.status(400).json({ error: msg });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ' });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: status >= 500 ? 'Đã có lỗi xảy ra, vui lòng thử lại sau' : err.message,
      fields: err.details && !Array.isArray(err.details) && !err.details.warnings ? err.details : undefined,
      warnings: err.details?.warnings,
    });
  });

  return app;
}

module.exports = createApp;
