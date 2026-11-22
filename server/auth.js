const { createHash, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHex) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function requireAuth(db) {
  return (req, res, next) => {
    const match = req.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/i);
    if (!match) return res.status(401).json({ error: 'Iniciá sesión para continuar.' });

    const tokenHash = hashToken(match[1]);
    const row = db.prepare(`
      SELECT s.token_hash, s.expires_at, u.id AS user_id, u.username, u.display_name, u.avatar_url
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `).get(tokenHash);

    if (!row || row.expires_at <= Date.now()) {
      if (row) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      return res.status(401).json({ error: 'Tu sesión venció. Volvé a iniciar sesión.' });
    }

    req.user = {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatarUrl: row.avatar_url || ''
    };
    req.tokenHash = tokenHash;
    next();
  };
}

module.exports = {
  SESSION_TTL_MS,
  hashToken,
  hashPassword,
  verifyPassword,
  requireAuth
};
