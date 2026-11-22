const express = require('express');
const { randomUUID } = require('node:crypto');

const MAX_QUERIES_PER_PRODUCT = 15;

function getStudyQuota(db, studyId, userId, studyPayload) {
  const itemCount =
    Array.isArray(studyPayload?.searchItems) && studyPayload.searchItems.length > 0
      ? studyPayload.searchItems.length
      : 1;
  const maxQueries = MAX_QUERIES_PER_PRODUCT * itemCount;
  const countRow = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM assistant_messages
    WHERE study_id = ? AND user_id = ? AND role = 'user'
  `).get(studyId, userId);
  const usedQueries = Number(countRow?.cnt || 0);
  const remainingQueries = Math.max(0, maxQueries - usedQueries);
  return {
    usedQueries,
    maxQueries,
    remainingQueries,
    perProductLimit: MAX_QUERIES_PER_PRODUCT,
    itemCount
  };
}

function createAssistantRouter(db, authGuard, { chatLimiter, chatAntiSpam, askCopilot }) {
  const router = express.Router();

  router.get('/chat/:studyId', authGuard, (req, res) => {
    const studyRow = db.prepare('SELECT id, payload_json FROM studies WHERE id = ? AND user_id = ?')
      .get(req.params.studyId, req.user.id);
    if (!studyRow) {
      return res.status(404).json({ error: 'Estudio no encontrado en tu cuenta.' });
    }

    const studyPayload = JSON.parse(studyRow.payload_json);
    const usage = getStudyQuota(db, req.params.studyId, req.user.id, studyPayload);

    const rows = db.prepare(`
      SELECT id, role, content_json AS contentJson, created_at AS createdAt
      FROM assistant_messages
      WHERE study_id = ? AND user_id = ?
      ORDER BY created_at ASC, rowid ASC
    `).all(req.params.studyId, req.user.id);

    const messages = rows.map((row) => {
      const parsed = JSON.parse(row.contentJson);
      if (row.role === 'user') {
        return {
          id: row.id,
          role: 'user',
          text: parsed.text || '',
          createdAt: row.createdAt
        };
      }
      return {
        id: row.id,
        role: 'assistant',
        badge: parsed.badge || 'Gemini AI',
        text: parsed.reply || parsed.text || '',
        verdict: parsed.verdict || null,
        quickReplies: parsed.quickReplies || [],
        recommendations: parsed.recommendations || [],
        createdAt: row.createdAt
      };
    });

    res.json({ studyId: req.params.studyId, messages, usage });
  });

  router.post('/chat', authGuard, chatLimiter, chatAntiSpam, async (req, res) => {
    const { studyId, messages, filteredProductIds } = req.body || {};
    if (!studyId || !Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return res.status(400).json({ error: 'Enviá studyId y entre 1 y 20 mensajes válidos.' });
    }

    const row = db.prepare('SELECT payload_json FROM studies WHERE id = ? AND user_id = ?')
      .get(studyId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Estudio no encontrado en tu cuenta.' });

    try {
      const study = JSON.parse(row.payload_json);
      const currentUsage = getStudyQuota(db, studyId, req.user.id, study);
      if (currentUsage.usedQueries >= currentUsage.maxQueries) {
        return res.status(429).json({
          error: `Alcanzaste el límite de ${currentUsage.maxQueries} consultas a la IA para esta búsqueda (${MAX_QUERIES_PER_PRODUCT} por producto).`,
          usage: currentUsage
        });
      }

      let scopedStudy = study;
      if (Array.isArray(filteredProductIds) && filteredProductIds.length > 0 && Array.isArray(study.products)) {
        const idSet = new Set(filteredProductIds.map(String));
        const filtered = study.products.filter((p) => idSet.has(String(p.id)));
        if (filtered.length > 0) {
          scopedStudy = { ...study, products: filtered };
        }
      }
      const result = await askCopilot({ study: scopedStudy, messages });

      if (typeof req.recordChatUsage === 'function') {
        req.recordChatUsage();
      }

      const now = new Date().toISOString();
      const lastUser = messages[messages.length - 1];
      db.prepare('INSERT INTO assistant_messages (id, study_id, user_id, role, content_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), studyId, req.user.id, 'user', JSON.stringify(lastUser), now);
      db.prepare('INSERT INTO assistant_messages (id, study_id, user_id, role, content_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), studyId, req.user.id, 'assistant', JSON.stringify(result), now);

      const nextUsed = currentUsage.usedQueries + 1;
      const usage = {
        ...currentUsage,
        usedQueries: nextUsed,
        remainingQueries: Math.max(0, currentUsage.maxQueries - nextUsed)
      };

      res.json({ ...result, usage });
    } catch (error) {
      res.status(error.status || 502).json({ error: error.message || 'Gemini no pudo responder.' });
    }
  });

  return router;
}

module.exports = { createAssistantRouter, MAX_QUERIES_PER_PRODUCT };
