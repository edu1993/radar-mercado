const express = require('express');
const { getSources } = require('../config/sources');

function createSystemRouter(db) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: 'sqlite',
      security: 'enabled',
      timestamp: new Date().toISOString()
    });
  });

  router.get('/info', (_req, res) => {
    const studiesCount = db.prepare('SELECT COUNT(*) AS total FROM studies').get()?.total || 0;
    const usersCount = db.prepare('SELECT COUNT(*) AS total FROM users').get()?.total || 0;
    const sources = getSources();
    const activeSources = sources.filter((s) => s.active).map((s) => s.name);

    res.json({
      service: 'Radar Mercado API',
      studiesCount,
      usersCount,
      activeSourcesCount: activeSources.length,
      totalCatalogSources: sources.length,
      activeSources,
      serverTime: new Date().toISOString()
    });
  });

  router.get('/sources', (req, res) => {
    const activeOnly = String(req.query.active || '').toLowerCase() === 'true';
    res.json(getSources({ activeOnly }));
  });

  return router;
}

module.exports = { createSystemRouter };
