const express = require('express');

function createStudiesRouter(db, authGuard) {
  const router = express.Router();

  router.get('/', authGuard, (req, res) => {
    const clauses = ['s.user_id = ?'];
    const params = [req.user.id];

    const source = String(req.query.source || '').trim();
    if (source) {
      clauses.push('s.source_key = ?');
      params.push(source);
    }

    const queryText = String(req.query.q || '').trim().toLowerCase();
    if (queryText) {
      clauses.push('(s.term_normalized LIKE ? OR LOWER(s.notes) LIKE ?)');
      params.push(`%${queryText}%`, `%${queryText}%`);
    }

    if (String(req.query.favorite || '').toLowerCase() === 'true') {
      clauses.push('s.is_favorite = 1');
    }

    const rows = db.prepare(`
      SELECT s.id,
             s.source_key AS sourceKey,
             COALESCE(src.name, s.source_name) AS source,
             s.term,
             s.currency,
             s.total_products AS totalProducts,
             s.pages_read AS pagesRead,
             s.median_price AS medianPrice,
             s.notes,
             s.is_favorite AS isFavorite,
             s.category_tag AS categoryTag,
             s.created_at AS createdAt
      FROM studies s
      LEFT JOIN sources src ON src.key = s.source_key
      WHERE ${clauses.join(' AND ')}
      ORDER BY s.is_favorite DESC, s.created_at DESC
    `).all(...params);

    res.json(rows.map((r) => ({ ...r, isFavorite: Boolean(r.isFavorite) })));
  });

  router.get('/resumen', authGuard, (req, res) => {
    const stats = db.prepare(`
      SELECT COUNT(*) AS totalStudies,
             COALESCE(SUM(total_products), 0) AS totalProductsAnalyzed,
             AVG(median_price) AS averageMedianPrice,
             SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) AS favoritesCount
      FROM studies
      WHERE user_id = ?
    `).get(req.user.id);

    const highest = db.prepare(`
      SELECT id, term, source_name AS source, median_price AS medianPrice, created_at AS createdAt
      FROM studies
      WHERE user_id = ? AND median_price IS NOT NULL
      ORDER BY median_price DESC
      LIMIT 1
    `).get(req.user.id) || null;

    const lowest = db.prepare(`
      SELECT id, term, source_name AS source, median_price AS medianPrice, created_at AS createdAt
      FROM studies
      WHERE user_id = ? AND median_price IS NOT NULL
      ORDER BY median_price ASC
      LIMIT 1
    `).get(req.user.id) || null;

    const bySource = db.prepare(`
      SELECT source_key AS sourceKey, source_name AS source, COUNT(*) AS count
      FROM studies
      WHERE user_id = ?
      GROUP BY source_key, source_name
      ORDER BY count DESC
    `).all(req.user.id);

    res.json({
      totalStudies: stats?.totalStudies || 0,
      totalProductsAnalyzed: stats?.totalProductsAnalyzed || 0,
      averageMedianPrice: stats?.averageMedianPrice ? Math.round(stats.averageMedianPrice) : null,
      favoritesCount: stats?.favoritesCount || 0,
      highestMedianStudy: highest,
      lowestMedianStudy: lowest,
      bySource
    });
  });

  router.get('/:id', authGuard, (req, res) => {
    const row = db.prepare(`
      SELECT payload_json, term, notes, is_favorite, category_tag
      FROM studies
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!row) return res.status(404).json({ error: 'Estudio no encontrado.' });

    const payload = JSON.parse(row.payload_json);
    res.json({
      ...payload,
      term: row.term,
      notes: row.notes || '',
      isFavorite: Boolean(row.is_favorite),
      categoryTag: row.category_tag || 'general'
    });
  });

  router.put('/:id', authGuard, (req, res) => {
    const existing = db.prepare(`
      SELECT id, term, notes, is_favorite, category_tag, payload_json
      FROM studies
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Estudio no encontrado en tu cuenta.' });
    }

    const nextTerm = req.body?.term !== undefined
      ? String(req.body.term).trim()
      : existing.term;
    const nextNotes = req.body?.notes !== undefined
      ? String(req.body.notes).trim()
      : (existing.notes || '');
    const nextCategory = req.body?.categoryTag !== undefined
      ? String(req.body.categoryTag).trim().slice(0, 40) || 'general'
      : (existing.category_tag || 'general');
    const nextFavorite = req.body?.isFavorite !== undefined
      ? (req.body.isFavorite ? 1 : 0)
      : existing.is_favorite;

    if (nextTerm.length < 2 || nextTerm.length > 120) {
      return res.status(400).json({ error: 'El nombre del estudio debe tener entre 2 y 120 caracteres.' });
    }
    if (nextNotes.length > 500) {
      return res.status(400).json({ error: 'Las notas no pueden superar los 500 caracteres.' });
    }

    const updatedPayload = {
      ...JSON.parse(existing.payload_json),
      term: nextTerm,
      notes: nextNotes,
      isFavorite: Boolean(nextFavorite),
      categoryTag: nextCategory
    };

    db.prepare(`
      UPDATE studies
      SET term = ?, term_normalized = ?, notes = ?, is_favorite = ?, category_tag = ?, payload_json = ?
      WHERE id = ? AND user_id = ?
    `).run(
      nextTerm,
      nextTerm.toLowerCase(),
      nextNotes,
      nextFavorite,
      nextCategory,
      JSON.stringify(updatedPayload),
      req.params.id,
      req.user.id
    );

    res.json({
      id: req.params.id,
      term: nextTerm,
      notes: nextNotes,
      isFavorite: Boolean(nextFavorite),
      categoryTag: nextCategory
    });
  });

  router.delete('/:id', authGuard, (req, res) => {
    const info = db.prepare('DELETE FROM studies WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Estudio no encontrado en tu cuenta.' });
    res.json({ deleted: true, id: req.params.id });
  });

  router.delete('/', authGuard, (req, res) => {
    const info = db.prepare('DELETE FROM studies WHERE user_id = ?').run(req.user.id);
    res.json({ deletedCount: info.changes });
  });

  return router;
}

module.exports = { createStudiesRouter };
