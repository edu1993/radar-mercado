const express = require('express');
const { randomBytes, randomUUID } = require('node:crypto');
const { SESSION_TTL_MS, hashToken, hashPassword, verifyPassword } = require('../auth');
const { getClientIp, hashIp, guardAccountCreationByIp, recordIpEvent } = require('../security');

function createAuthRouter(db, authGuard, { maxAccountsPerDay = 2 } = {}) {
  const router = express.Router();
  const antiSpamRegister = guardAccountCreationByIp(db, { maxAccountsPerDay });

  router.post('/register', antiSpamRegister, (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    const password = String(req.body?.password || '');

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ error: 'El usuario debe tener entre 3 y 32 caracteres (letras, números, . _ -).' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    }
    if (password.length < 8 || password.length > 200) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const existsUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existsUser) {
      return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
    }

    if (email) {
      const existsEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existsEmail) {
        return res.status(409).json({ error: 'Ese correo electrónico ya está registrado.' });
      }
    }

    const id = randomUUID();
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO users (id, username, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, username, email, salt, hash, now);

    recordIpEvent(db, req.clientIpHash, 'register');

    const token = randomBytes(32).toString('hex');
    db.prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(hashToken(token), id, Date.now() + SESSION_TTL_MS, now);

    return res.status(201).json({ token, username });
  });

  router.post('/login', (req, res) => {
    const ipHash = hashIp(getClientIp(req));
    const cutoff = Date.now() - 15 * 60 * 1000;
    const failed = db.prepare(`
      SELECT COUNT(*) AS total FROM ip_events
      WHERE ip_hash = ? AND event_type = 'login_fail' AND created_at >= ?
    `).get(ipHash, cutoff);

    if ((failed?.total || 0) >= 5) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Esperá 15 minutos.' });
    }

    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      recordIpEvent(db, ipHash, 'login_fail');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(hashToken(token), user.id, Date.now() + SESSION_TTL_MS, now);

    return res.json({ token, username: user.username });
  });

  router.get('/me', authGuard, (req, res) => {
    res.json({ username: req.user.username });
  });

  router.post('/logout', authGuard, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
    res.json({ loggedOut: true });
  });

  return router;
}

module.exports = { createAuthRouter };
