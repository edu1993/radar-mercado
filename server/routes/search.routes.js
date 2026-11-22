const express = require('express');
const { randomUUID } = require('node:crypto');
const { getSourceByKey } = require('../config/sources');
const { computePriceSummary } = require('../utils/stats');

function createSearchRouter(db, authGuard, { searchLimiter, chatLimiter, scraperRunner, generateVariations, productFilter }) {
  const router = express.Router();

  router.post('/', authGuard, searchLimiter, async (req, res) => {
    const term = String(req.body?.term || '').trim();
    const sourceKey = String(req.body?.source || 'todos_supermercados').trim();
    const sourceCfg = getSourceByKey(sourceKey);

    if (term.length < 2 || term.length > 120) {
      return res.status(400).json({ error: 'El término debe tener entre 2 y 120 caracteres.' });
    }
    if (!sourceCfg || !sourceCfg.active) {
      return res.status(400).json({ error: `La fuente "${sourceKey}" aún no está activa.` });
    }

    const limit = Math.max(50, Math.min(Number(req.body?.limit) || 150, sourceCfg.maxLimit));
    const normalized = term.toLowerCase();
    const cacheMinutes = Number(process.env.SEARCH_CACHE_MINUTES || 30);
    const cutoffIso = new Date(Date.now() - cacheMinutes * 60 * 1000).toISOString();

    const cached = db.prepare(`
      SELECT payload_json FROM studies
      WHERE source_key = ? AND term_normalized = ? AND total_products >= ? AND created_at >= ?
      ORDER BY created_at DESC LIMIT 1
    `).get(sourceKey, normalized, Math.floor(limit * 0.7), cutoffIso);

    try {
      const rawStudy = cached
        ? JSON.parse(cached.payload_json)
        : await scraperRunner({ source: sourceKey, term, limit });

      if (!rawStudy?.products?.length) {
        return res.status(404).json({ error: 'No se encontraron productos para ese término.' });
      }

      let study = rawStudy;
      if (!cached && typeof productFilter === 'function') {
        const searchItems = Array.isArray(rawStudy.searchItems) && rawStudy.searchItems.length
          ? rawStudy.searchItems
          : [term];
        const filtered = await productFilter({ products: rawStudy.products, searchItems });
        study = {
          ...rawStudy,
          products: filtered.products,
          totalProducts: filtered.products.length,
          aiFiltered: filtered.aiFiltered,
          aiRemovedCount: filtered.removedCount
        };
      }

      const summary = computePriceSummary(study.products);
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const enrichedStudy = {
        ...study,
        id,
        createdAt,
        fromCache: Boolean(cached),
        notes: '',
        isFavorite: false,
        categoryTag: 'general'
      };

      db.prepare(`
        INSERT INTO studies (
          id, user_id, source_key, source_name, term, term_normalized, currency,
          total_products, pages_read, median_price, mean_price, min_price, max_price,
          notes, is_favorite, category_tag, payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        req.user.id,
        sourceKey,
        sourceCfg.name,
        term,
        normalized,
        study.currency || sourceCfg.currency || 'ARS',
        study.products.length,
        study.pagesRead || 1,
        summary.median,
        summary.mean,
        summary.min,
        summary.max,
        '',
        0,
        'general',
        JSON.stringify(enrichedStudy),
        createdAt
      );

      res.status(201).json(enrichedStudy);
    } catch (error) {
      res.status(error.status || 502).json({ error: `No se pudo completar la búsqueda: ${error.message}` });
    }
  });

  router.post('/variations', authGuard, chatLimiter, async (req, res) => {
    const term = String(req.body?.term || '').trim();
    const medianPrice = Number(req.body?.medianPrice) || null;
    if (term.length < 2 || term.length > 120) {
      return res.status(400).json({ error: 'Indicá un término válido.' });
    }
    try {
      const variations = await generateVariations({ term, medianPrice });
      res.json({ variations });
    } catch (error) {
      res.status(error.status || 502).json({ error: error.message || 'No se pudieron generar variaciones.' });
    }
  });

  return router;
}

module.exports = { createSearchRouter };
