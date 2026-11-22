const express = require('express');
const { randomBytes, randomUUID } = require('node:crypto');
const { SESSION_TTL_MS, hashToken, hashPassword, verifyPassword } = require('../auth');
const { getClientIp, hashIp, guardAccountCreationByIp, recordIpEvent } = require('../security');

function getConfiguredGoogleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

function buildUniqueUsernameFromEmail(db, email) {
  const baseRaw = String(email || 'usuario')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
  const base = baseRaw.length >= 3 ? baseRaw : `user_${baseRaw || 'google'}`;

  let candidate = base;
  let suffix = 2;
  while (db.prepare('SELECT id FROM users WHERE username = ?').get(candidate)) {
    candidate = `${base.slice(0, 26)}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function verifyGoogleIdToken(credential, expectedClientId) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  if (!res.ok) {
    throw new Error('No pudimos verificar tu cuenta de Google. Intentá nuevamente.');
  }
  const payload = await res.json();
  if (!payload || payload.aud !== expectedClientId) {
    throw new Error('El token de Google no corresponde a esta aplicación.');
  }
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!emailVerified || !payload.email || !payload.sub) {
    throw new Error('Tu cuenta de Google debe tener un correo verificado.');
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    displayName: String(payload.name || payload.given_name || '').trim() || null,
    avatarUrl: String(payload.picture || '').trim() || null
  };
}

function createAuthRouter(db, authGuard, { maxAccountsPerDay = 2, googleVerifier = verifyGoogleIdToken } = {}) {
  const router = express.Router();
  const antiSpamRegister = guardAccountCreationByIp(db, { maxAccountsPerDay });

  router.get('/config', (_req, res) => {
    const googleClientId = getConfiguredGoogleClientId();
    res.json({
      googleEnabled: Boolean(googleClientId),
      googleClientId
    });
  });

  router.post('/google', async (req, res) => {
    const clientId = getConfiguredGoogleClientId();
    if (!clientId) {
      return res.status(503).json({
        error: 'El inicio de sesión con Google todavía no está configurado en el servidor (falta GOOGLE_CLIENT_ID).'
      });
    }

    const credential = String(req.body?.credential || '').trim();
    if (!credential || credential.length < 40) {
      return res.status(400).json({ error: 'Falta la credencial válida de Google.' });
    }

    try {
      const profile = await googleVerifier(credential, clientId);
      let user =
        db.prepare('SELECT * FROM users WHERE google_sub = ?').get(profile.sub) ||
        db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email);

      const now = new Date().toISOString();
      if (user) {
        db.prepare(
          'UPDATE users SET google_sub = ?, display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?'
        ).run(profile.sub, profile.displayName, profile.avatarUrl, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      } else {
        const id = randomUUID();
        const username = buildUniqueUsernameFromEmail(db, profile.email);
        const { salt, hash } = hashPassword(randomBytes(32).toString('hex'));
        db.prepare(`
          INSERT INTO users (id, username, email, password_salt, password_hash, google_sub, display_name, avatar_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, username, profile.email, salt, hash, profile.sub, profile.displayName, profile.avatarUrl, now);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      }

      const token = randomBytes(32).toString('hex');
      db.prepare(
        'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).run(hashToken(token), user.id, Date.now() + SESSION_TTL_MS, now);

      return res.json({
        token,
        username: user.username,
        displayName: user.display_name || user.username,
        avatarUrl: user.avatar_url || ''
      });
    } catch (error) {
      return res.status(401).json({ error: error.message || 'No se pudo iniciar sesión con Google.' });
    }
  });

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

    return res.status(201).json({ token, username, displayName: username, avatarUrl: '' });
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

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      recordIpEvent(db, ipHash, 'login_fail');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(hashToken(token), user.id, Date.now() + SESSION_TTL_MS, now);

    return res.json({
      token,
      username: user.username,
      displayName: user.display_name || user.username,
      avatarUrl: user.avatar_url || ''
    });
  });

  router.get('/me', authGuard, (req, res) => {
    res.json({
      username: req.user.username,
      displayName: req.user.displayName || req.user.username,
      avatarUrl: req.user.avatarUrl || ''
    });
  });

  router.post('/logout', authGuard, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
    res.json({ loggedOut: true });
  });

  return router;
}

module.exports = { createAuthRouter, verifyGoogleIdToken };
