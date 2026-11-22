const { createHash } = require('node:crypto');

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function hashIp(ip) {
  const salt = process.env.IP_HASH_SALT || 'radar-mercado-salt-v1';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

function ensureSecurityTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ip_events_lookup
      ON ip_events(ip_hash, event_type, created_at DESC);
  `);
}

function guardAccountCreationByIp(db, { maxAccountsPerDay = 2 } = {}) {
  ensureSecurityTables(db);
  return (req, res, next) => {
    if (req.body?.website_url && String(req.body.website_url).trim() !== '') {
      return res.status(400).json({ error: 'Solicitud inválida.' });
    }

    const ipHash = hashIp(getClientIp(req));
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    db.prepare('DELETE FROM ip_events WHERE created_at < ?').run(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const row = db.prepare(`
      SELECT COUNT(*) AS total
      FROM ip_events
      WHERE ip_hash = ? AND event_type = 'register' AND created_at >= ?
    `).get(ipHash, cutoff);

    if ((row?.total || 0) >= maxAccountsPerDay) {
      return res.status(429).json({
        error: `Límite de seguridad: máximo ${maxAccountsPerDay} cuentas cada 24 horas desde la misma conexión.`
      });
    }

    req.clientIpHash = ipHash;
    next();
  };
}

function recordIpEvent(db, ipHash, eventType) {
  if (!ipHash) return;
  db.prepare('INSERT INTO ip_events (ip_hash, event_type, created_at) VALUES (?, ?, ?)')
    .run(ipHash, eventType, Date.now());
}

/**
 * Valida límites de chat sin descontar cupo anticipadamente.
 * El uso se registra recién tras una respuesta exitosa del asistente mediante req.recordChatUsage().
 */
function guardChatAntiSpam(db, {
  cooldownMs = 4000,
  windowMs = 5 * 60 * 1000,
  maxMessagesPerWindow = 8,
  maxChars = 240
} = {}) {
  ensureSecurityTables(db);
  return (req, res, next) => {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensaje vacío.' });
    }

    const lastMsg = String(messages[messages.length - 1]?.text || '').trim();
    if (lastMsg.length === 0 || lastMsg.length > maxChars) {
      return res.status(400).json({
        error: `Cada mensaje debe tener entre 1 y ${maxChars} caracteres.`
      });
    }

    const ipHash = hashIp(getClientIp(req));
    const actorKey = req.user?.id ? `user:${req.user.id}` : `ip:${ipHash}`;
    const now = Date.now();

    const lastEvent = db.prepare(`
      SELECT created_at FROM ip_events
      WHERE ip_hash = ? AND event_type = 'chat'
      ORDER BY created_at DESC LIMIT 1
    `).get(actorKey);

    if (lastEvent && now - lastEvent.created_at < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - (now - lastEvent.created_at)) / 1000);
      return res.status(429).json({
        error: `Esperá ${waitSec}s antes de enviar otra consulta al Co-piloto.`
      });
    }

    const recentCount = db.prepare(`
      SELECT COUNT(*) AS total FROM ip_events
      WHERE ip_hash = ? AND event_type = 'chat' AND created_at >= ?
    `).get(actorKey, now - windowMs);

    if ((recentCount?.total || 0) >= maxMessagesPerWindow) {
      return res.status(429).json({
        error: `Alcanzaste el tope de ${maxMessagesPerWindow} consultas cada 5 minutos. Esperá unos minutos.`
      });
    }

    req.recordChatUsage = () => recordIpEvent(db, actorKey, 'chat');
    next();
  };
}

module.exports = {
  getClientIp,
  hashIp,
  ensureSecurityTables,
  guardAccountCreationByIp,
  recordIpEvent,
  guardChatAntiSpam
};
