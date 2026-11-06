const jwt = require('jsonwebtoken');
const db = require('../db');
const { HttpError } = require('../utils');

const JWT_SECRET = process.env.JWT_SECRET || 'lumi-dev-secret-change-me';
const TOKEN_TTL = '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function readUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) return null;
    if (user.status === 'locked') throw new HttpError(403, 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ hỗ trợ.');
    return user;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    return null;
  }
}

/** Attach req.user if a valid token is present; never rejects. */
function optionalAuth(req, _res, next) {
  req.user = readUser(req);
  next();
}

function requireAuth(req, _res, next) {
  req.user = readUser(req);
  if (!req.user) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục');
  next();
}

function requireAdmin(req, _res, next) {
  req.user = readUser(req);
  if (!req.user) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục');
  if (req.user.role !== 'admin') throw new HttpError(403, 'Bạn không có quyền truy cập khu vực quản trị');
  next();
}

module.exports = { signToken, optionalAuth, requireAuth, requireAdmin };
