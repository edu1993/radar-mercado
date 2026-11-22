const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/**
 * Carga módulos ESM puros de src/utils/ sin depender de transpiladores externos,
 * permitiendo ejecutar los tests unitarios con `node --test` en Node 18/20/22.
 */
function loadFrontendUtils() {
  const formattersPath = path.join(__dirname, '../../src/utils/formatters.js');
  const statsPath = path.join(__dirname, '../../src/utils/marketStats.js');

  const formattersSrc = fs
    .readFileSync(formattersPath, 'utf8')
    .replace(/export function /g, 'function ');

  const statsSrc = fs
    .readFileSync(statsPath, 'utf8')
    .replace(/^import .*?;\s*/gm, '')
    .replace(/export function /g, 'function ');

  const sandbox = { Math, Number, String, Array, Date, Object };
  vm.createContext(sandbox);
  vm.runInContext(
    `${formattersSrc}\n${statsSrc}\nthis.__exports = { formatARS, formatCompactARS, formatPct, buildProductsCsv, quantile, analyzeMarket };`,
    sandbox
  );
  return sandbox.__exports;
}

const { formatARS, formatCompactARS, formatPct, buildProductsCsv, quantile, analyzeMarket } = loadFrontendUtils();

test('quantile interpola percentiles P25, P50 y P75 correctamente', () => {
  const sorted = [100, 200, 300, 400, 500];
  assert.equal(quantile(sorted, 0.25), 200);
  assert.equal(quantile(sorted, 0.5), 300);
  assert.equal(quantile(sorted, 0.75), 400);
  assert.equal(quantile([], 0.5), null);
});

test('analyzeMarket detecta outliers, zona inteligente y tasa de envío gratis', () => {
  const items = [
    { id: '1', title: 'Repuesto sospechoso', price: 1000, freeShipping: false },
    { id: '2', title: 'Producto A', price: 90000, freeShipping: true },
    { id: '3', title: 'Producto B', price: 95000, freeShipping: true },
    { id: '4', title: 'Producto C', price: 100000, freeShipping: false },
    { id: '5', title: 'Producto D', price: 105000, freeShipping: true },
    { id: '6', title: 'Producto E', price: 110000, freeShipping: false },
    { id: '7', title: 'Precio inflado', price: 350000, freeShipping: false }
  ];

  const stats = analyzeMarket(items);
  assert.equal(stats.pricedCount, 7);
  assert.equal(stats.median, 100000);
  assert.equal(stats.lowOutlierCount, 1);
  assert.equal(stats.highOutlierCount, 1);
  assert.equal(stats.outlierCount, 2);
  assert.equal(stats.bins.length, 10);
  assert.ok(stats.freeShippingRate > 0.4 && stats.freeShippingRate < 0.45);
});

test('analyzeMarket maneja listas vacías o sin precios sin fallar', () => {
  const empty = analyzeMarket([]);
  assert.equal(empty.pricedCount, 0);
  assert.equal(empty.dispersionLabel, 'Sin datos');
  assert.equal(empty.bins.length, 0);
});

test('formateadores y exportación CSV escapan comillas y generan encabezados válidos', () => {
  assert.equal(formatCompactARS(1500000), '$1,50M');
  assert.equal(formatCompactARS(45000), '$45k');
  assert.equal(formatPct(0.15), '+15%');
  assert.equal(formatPct(-0.12), '-12%');
  assert.equal(formatARS(null), '—');

  const csv = buildProductsCsv([
    { id: 'MLA1', title: 'Cafetera "Pro"', price: 120000, currency: 'ARS', deltaPct: -0.1, freeShipping: true, rating: 4.8, reviews: 50, url: 'https://example.com' }
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^ID,Titulo,Precio/);
  assert.match(lines[1], /"Cafetera ""Pro"""/);
});
