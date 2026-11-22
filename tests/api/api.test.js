process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { initDatabase } = require('../../server/db');
const { createApp } = require('../../server/app');

function makeRequest(baseUrl, method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      `${baseUrl}${path}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch { json = null; }
          resolve({ status: res.statusCode, body: json, raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test.describe('API REST Radar Mercado — Supermercados (SQLite :memory:)', () => {
  let db;
  let server;
  let baseUrl;
  let tokenUserA;
  let tokenUserB;
  let createdStudyId;

  test.before(async () => {
    db = initDatabase(':memory:');

    const mockScraper = async ({ source, term }) => ({
      term,
      source: source === 'carrefour_ar' ? 'Carrefour AR' : 'Supermercados DIA%',
      sourceKey: source,
      currency: 'ARS',
      capturedAt: new Date().toISOString(),
      pagesRead: 1,
      totalProducts: 3,
      products: [
        { id: 'DIA_AR-101', title: `${term} 500g Marca A`, brand: 'Marca A', price: 2400, listPrice: 3000, discountPct: 20, currency: 'ARS', source: 'Supermercados DIA%', url: 'https://diaonline.supermercadosdia.com.ar/p/101' },
        { id: 'DIA_AR-102', title: `${term} 500g Marca B`, brand: 'Marca B', price: 3000, listPrice: null, discountPct: 0, currency: 'ARS', source: 'Supermercados DIA%', url: 'https://diaonline.supermercadosdia.com.ar/p/102' },
        { id: 'DIA_AR-103', title: `${term} 1kg Marca C`, brand: 'Marca C', price: 4800, listPrice: null, discountPct: 0, currency: 'ARS', source: 'Supermercados DIA%', url: 'https://diaonline.supermercadosdia.com.ar/p/103' }
      ]
    });

    const mockCopilot = async ({ study }) => ({
      badge: 'Mejor precio por kg',
      reply: `El rango justo para ${study.term} se ubica en torno a $3.000.`,
      verdict: { fairRange: '$2.400 – $3.000', avoidAbove: '$4.500' },
      quickReplies: ['Menor precio seguro'],
      recommendations: []
    });

    const app = createApp({
      db,
      scraperRunner: mockScraper,
      askCopilot: mockCopilot,
      enableStatic: false,
      disableRateLimit: true,
      maxAccountsPerDay: 10
    });

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  test.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) db.close();
  });

  test('GET /api/health, /api/info y /api/sources devuelven los supermercados configurados', async () => {
    const health = await makeRequest(baseUrl, 'GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const info = await makeRequest(baseUrl, 'GET', '/api/info');
    assert.equal(info.status, 200);
    assert.equal(info.body.studiesCount, 0);
    assert.ok(info.body.activeSourcesCount >= 4);

    const sources = await makeRequest(baseUrl, 'GET', '/api/sources');
    assert.equal(sources.status, 200);
    assert.ok(sources.body.some((s) => s.key === 'dia_ar' && s.active));
    assert.ok(sources.body.some((s) => s.key === 'cooperativa_obrera' && !s.active));
  });

  test('Auth: registro, rechazo de duplicados (usuario y email) y /me', async () => {
    const regA = await makeRequest(baseUrl, 'POST', '/api/auth/register', {
      body: { username: 'ana.utn', email: 'ana@example.com', password: 'Password123' }
    });
    assert.equal(regA.status, 201);
    tokenUserA = regA.body.token;

    const dupUser = await makeRequest(baseUrl, 'POST', '/api/auth/register', {
      body: { username: 'ana.utn', password: 'Password123' }
    });
    assert.equal(dupUser.status, 409);

    const dupEmail = await makeRequest(baseUrl, 'POST', '/api/auth/register', {
      body: { username: 'otra.persona', email: 'ana@example.com', password: 'Password123' }
    });
    assert.equal(dupEmail.status, 409);

    const regB = await makeRequest(baseUrl, 'POST', '/api/auth/register', {
      body: { username: 'juan.utn', password: 'Password123' }
    });
    assert.equal(regB.status, 201);
    tokenUserB = regB.body.token;

    const me = await makeRequest(baseUrl, 'GET', '/api/auth/me', { token: tokenUserA });
    assert.equal(me.status, 200);
    assert.equal(me.body.username, 'ana.utn');
  });

  test('CRUD de estudios de supermercado: POST, GET filtros, PUT notas/favorito, GET /resumen y aislamiento', async () => {
    const unauth = await makeRequest(baseUrl, 'GET', '/api/search-history');
    assert.equal(unauth.status, 401);

    const created = await makeRequest(baseUrl, 'POST', '/api/search', {
      token: tokenUserA,
      body: { term: 'yerba mate', source: 'dia_ar', limit: 50 }
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.products.length, 3);
    createdStudyId = created.body.id;

    const updated = await makeRequest(baseUrl, 'PUT', `/api/search-history/${createdStudyId}`, {
      token: tokenUserA,
      body: { notes: 'Conviene pasar por DIA de Simini', isFavorite: true }
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.isFavorite, true);

    const filtered = await makeRequest(baseUrl, 'GET', '/api/search-history?source=dia_ar&favorite=true', {
      token: tokenUserA
    });
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.length, 1);

    const summary = await makeRequest(baseUrl, 'GET', '/api/search-history/resumen', { token: tokenUserA });
    assert.equal(summary.status, 200);
    assert.equal(summary.body.totalStudies, 1);
    assert.equal(summary.body.favoritesCount, 1);
    assert.equal(summary.body.highestMedianStudy.medianPrice, 3000);

    const foreignDelete = await makeRequest(baseUrl, 'DELETE', `/api/search-history/${createdStudyId}`, {
      token: tokenUserB
    });
    assert.equal(foreignDelete.status, 404);
  });

  test('Asistente IA: guarda y recupera historial con GET /api/assistant/chat/:studyId', async () => {
    const chatRes = await makeRequest(baseUrl, 'POST', '/api/assistant/chat', {
      token: tokenUserA,
      body: {
        studyId: createdStudyId,
        messages: [{ role: 'user', text: '¿Qué paquete conviene por kilo?' }]
      }
    });
    assert.equal(chatRes.status, 200);
    assert.equal(chatRes.body.badge, 'Mejor precio por kg');

    const historyRes = await makeRequest(baseUrl, 'GET', `/api/assistant/chat/${createdStudyId}`, {
      token: tokenUserA
    });
    assert.equal(historyRes.status, 200);
    assert.equal(historyRes.body.messages.length, 2);
  });

  test('Rutas inexistentes bajo /api responden 404 en JSON', async () => {
    const res = await makeRequest(baseUrl, 'GET', '/api/ruta-inexistente');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
