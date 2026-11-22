const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('node:fs');
const path = require('node:path');

const { requireAuth } = require('./auth');
const { guardChatAntiSpam, ensureSecurityTables } = require('./security');
const { runMarketplaceScraper } = require('./scraperRunner');
const { askGeminiCopilot, generateSearchVariations, filterRelevantProductsWithAI } = require('./gemini');
const { createRequestLogger } = require('./middlewares/requestLogger');
const { unknownEndpoint } = require('./middlewares/unknownEndpoint');
const { errorHandler } = require('./middlewares/errorHandler');

const { createSystemRouter } = require('./routes/system.routes');
const { createAuthRouter } = require('./routes/auth.routes');
const { createStudiesRouter } = require('./routes/studies.routes');
const { createSearchRouter } = require('./routes/search.routes');
const { createAssistantRouter } = require('./routes/assistant.routes');

function createApp({
  db,
  scraperRunner = runMarketplaceScraper,
  askCopilot = askGeminiCopilot,
  generateVariations = generateSearchVariations,
  productFilter = filterRelevantProductsWithAI,
  enableStatic = true,
  disableRateLimit = false,
  maxAccountsPerDay = 2
}) {
  const app = express();
  app.set('trust proxy', 1);

  ensureSecurityTables(db);
  const authGuard = requireAuth(db);
  const chatAntiSpam = guardChatAntiSpam(db, {
    cooldownMs: disableRateLimit ? 0 : 4000,
    windowMs: 5 * 60 * 1000,
    maxMessagesPerWindow: disableRateLimit ? 100 : 8,
    maxChars: 240
  });

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map((s) => s.trim()) } : undefined));
  app.use(express.json({ limit: '2mb' }));
  app.use(createRequestLogger());

  const noopLimiter = (_req, _res, next) => next();
  const authLimiter = disableRateLimit
    ? noopLimiter
    : rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
  const searchLimiter = disableRateLimit
    ? noopLimiter
    : rateLimit({ windowMs: 10 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });
  const chatLimiter = disableRateLimit
    ? noopLimiter
    : rateLimit({ windowMs: 5 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false });

  app.use('/api', createSystemRouter(db));
  app.use('/api/auth', authLimiter, createAuthRouter(db, authGuard, { maxAccountsPerDay }));
  app.use('/api/search-history', createStudiesRouter(db, authGuard));
  app.use('/api/search', createSearchRouter(db, authGuard, {
    searchLimiter,
    chatLimiter,
    scraperRunner,
    generateVariations,
    productFilter
  }));
  app.use('/api/assistant', createAssistantRouter(db, authGuard, {
    chatLimiter,
    chatAntiSpam,
    askCopilot
  }));

  app.use('/api', unknownEndpoint);

  const distDir = path.join(__dirname, '..', 'dist');
  if (enableStatic && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
