/**
 * Cálculos estadísticos compartidos en el backend para evitar duplicación
 * entre las rutas de búsqueda y el contexto del asistente IA.
 */
function computePriceSummary(products = []) {
  const prices = products
    .map((p) => p?.price)
    .filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (!prices.length) {
    return {
      count: 0,
      median: null,
      mean: null,
      min: null,
      max: null
    };
  }

  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2
    ? prices[mid]
    : (prices[mid - 1] + prices[mid]) / 2;
  const mean = prices.reduce((acc, value) => acc + value, 0) / prices.length;

  return {
    count: prices.length,
    median,
    mean,
    min: prices[0],
    max: prices[prices.length - 1]
  };
}

module.exports = { computePriceSummary };
