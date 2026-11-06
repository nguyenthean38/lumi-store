const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { HttpError, validate, publicUser } = require('../utils');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.' },
});

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const emailField = z.string({ error: 'Vui lòng nhập email' }).trim().toLowerCase().email('Email không hợp lệ');
const passwordField = z
  .string({ error: 'Vui lòng nhập mật khẩu' })
  .min(6, 'Mật khẩu cần ít nhất 6 ký tự')
  .max(100, 'Mật khẩu quá dài');

const registerSchema = z.object({
  name: z.string({ error: 'Vui lòng nhập họ tên' }).trim().min(2, 'Họ tên cần ít nhất 2 ký tự').max(80),
  email: emailField,
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, 'Số điện thoại không hợp lệ (VD: 0912345678)')
    .optional()
    .or(z.literal('')),
  password: passwordField,
});

router.post('/register', authLimiter, (req, res) => {
  const data = validate(registerSchema, req.body);
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (exists) throw new HttpError(409, 'Email này đã được đăng ký', { email: 'Email này đã được đăng ký' });
  const hash = bcrypt.hashSync(data.password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email, data.phone || null, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

const loginSchema = z.object({ email: emailField, password: z.string().min(1, 'Vui lòng nhập mật khẩu') });

router.post('/login', authLimiter, (req, res) => {
  const data = validate(loginSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
    throw new HttpError(401, 'Email hoặc mật khẩu không đúng');
  }
  if (user.status === 'locked') throw new HttpError(403, 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ hỗ trợ.');
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự').max(80),
  phone: z.string().trim().regex(PHONE_RE, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
});

router.put('/me', requireAuth, (req, res) => {
  const data = validate(profileSchema, req.body);
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(data.name, data.phone || null, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: passwordField,
});

router.put('/me/password', requireAuth, (req, res) => {
  const data = validate(passwordSchema, req.body);
  if (!bcrypt.compareSync(data.currentPassword, req.user.password_hash)) {
    throw new HttpError(400, 'Mật khẩu hiện tại không đúng', { currentPassword: 'Mật khẩu hiện tại không đúng' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(data.newPassword, 10), req.user.id);
  res.json({ ok: true });
});

router.post('/forgot-password', authLimiter, (req, res) => {
  const { email } = validate(z.object({ email: emailField }), req.body);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const response = { ok: true, message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.' };
  if (user) {
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expires, user.id);
    // No mail server in this demo: log the link and (outside production) return it so the flow can be tested.
    console.log(`[reset-password] ${email}: /reset-password?token=${token}`);
    if (process.env.NODE_ENV !== 'production') response.devResetToken = token;
  }
  res.json(response);
});

router.post('/reset-password', authLimiter, (req, res) => {
  const data = validate(z.object({ token: z.string().min(10, 'Liên kết không hợp lệ'), password: passwordField }), req.body);
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(data.token);
  if (!user || !user.reset_expires || user.reset_expires < new Date().toISOString()) {
    throw new HttpError(400, 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  }
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(
    bcrypt.hashSync(data.password, 10),
    user.id
  );
  res.json({ ok: true });
});

module.exports = router;
module.exports.PHONE_RE = PHONE_RE;
