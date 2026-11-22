import { formatARS, formatCompactARS } from './formatters.js';

const SIZE_REGEX = /(?<!\d)(\d+(?:[.,]\d+)?)\s*(litros?|lts?|l|ml|cc|cm3|kgm?|kgs?|kilos?|grs?|grm?|g)\b/i;

const BRAND_ALIASES = {
  'coke/cocacola': 'Coca-Cola',
  'coca cola': 'Coca-Cola',
  'coca-cola': 'Coca-Cola',
  cocacola: 'Coca-Cola',
  'buhero': 'Buhero Negro',
  'búhero': 'Buhero Negro',
  'buhero negro': 'Buhero Negro',
  'búhero negro': 'Buhero Negro',
  'fernet branca': 'Branca',
  branca: 'Branca',
  'dia%': 'DIA',
  dia: 'DIA'
};

const IGNORED_BRANDS = new Set(['generico', 'genérico', 'sin marca', 'varios', 's/m', 'n/a', 'none']);

export function normalizeBrandLabel(brand) {
  if (!brand) return '';
  const clean = String(brand).trim().replace(/\s+/g, ' ');
  const low = clean.toLowerCase();
  if (!clean || IGNORED_BRANDS.has(low)) return '';
  if (BRAND_ALIASES[low]) return BRAND_ALIASES[low];
  const upper = clean.toUpperCase();
  if (['DIA', 'CBSE', 'CBSÉ', '1882'].includes(upper)) return upper;
  return low
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function packSizeSortWeight(sizeLabel = '') {
  const m = String(sizeLabel).match(SIZE_REGEX);
  if (!m) return 0;
  const val = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  if (!Number.isFinite(val)) return 0;
  if (['l', 'lt', 'lts', 'litro', 'litros', 'kg', 'kgs', 'kgm', 'kilo', 'kilos'].includes(unit)) {
    return val * 1000;
  }
  return val;
}

export function inferUnitPrice(price, text) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || !text) {
    return { unitPrice: null, unitBase: null };
  }
  const m = String(text).match(SIZE_REGEX);
  if (!m) return { unitPrice: null, unitBase: null };
  const val = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  if (!Number.isFinite(val) || val <= 0) return { unitPrice: null, unitBase: null };

  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(unit)) {
    return { unitPrice: Math.round(price / val), unitBase: 'L' };
  }
  if (['ml', 'cc', 'cm3'].includes(unit)) {
    return { unitPrice: Math.round(price / (val / 1000)), unitBase: 'L' };
  }
  if (['kg', 'kgs', 'kgm', 'kilo', 'kilos'].includes(unit)) {
    return { unitPrice: Math.round(price / val), unitBase: 'kg' };
  }
  if (['g', 'gr', 'grs', 'grm'].includes(unit)) {
    return { unitPrice: Math.round(price / (val / 1000)), unitBase: 'kg' };
  }
  return { unitPrice: null, unitBase: null };
}

export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function analyzeMarket(items = []) {
  const priced = items.filter(
    (item) => typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0
  );
  const prices = priced.map((item) => item.price).sort((a, b) => a - b);

  if (!prices.length) {
    return {
      count: items.length,
      pricedCount: 0,
      median: 0,
      mean: 0,
      min: 0,
      max: 0,
      p10: 0,
      q1: 0,
      q3: 0,
      p90: 0,
      iqr: 0,
      lowerFence: 0,
      upperFence: 0,
      stdDev: 0,
      cv: 0,
      dispersionLabel: 'Sin datos',
      dispersionTone: 'neutral',
      outlierCount: 0,
      lowOutlierCount: 0,
      highOutlierCount: 0,
      belowMedianCount: 0,
      freeShippingRate: 0,
      medianBinLabel: '',
      enrichedItems: [],
      bins: []
    };
  }

  const median = quantile(prices, 0.5);
  const p10 = quantile(prices, 0.1);
  const q1 = quantile(prices, 0.25);
  const q3 = quantile(prices, 0.75);
  const p90 = quantile(prices, 0.9);
  const iqr = q3 - q1;
  const lowerFence = Math.max(0, q1 - 1.5 * iqr);
  const upperFence = q3 + 1.5 * iqr;
  const mean = prices.reduce((acc, p) => acc + p, 0) / prices.length;
  const variance = prices.reduce((acc, p) => acc + (p - mean) ** 2, 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  let dispersionLabel = 'Precios estables';
  let dispersionTone = 'emerald';
  if (cv >= 0.22) {
    dispersionLabel = 'Mercado muy volátil';
    dispersionTone = 'coral';
  } else if (cv >= 0.12) {
    dispersionLabel = 'Dispersión moderada';
    dispersionTone = 'amber';
  }

  const pricesBySearchItem = new Map();
  for (const item of priced) {
    if (!item.searchItem) continue;
    if (!pricesBySearchItem.has(item.searchItem)) pricesBySearchItem.set(item.searchItem, []);
    pricesBySearchItem.get(item.searchItem).push(item.price);
  }
  const medianBySearchItem = new Map();
  if (pricesBySearchItem.size > 1) {
    for (const [k, arr] of pricesBySearchItem.entries()) {
      arr.sort((a, b) => a - b);
      medianBySearchItem.set(k, quantile(arr, 0.5));
    }
  }

  const enrichedItems = priced.map((item) => {
    const refMedian =
      (item.searchItem && medianBySearchItem.get(item.searchItem)) || median;
    const deltaPct = refMedian > 0 ? (item.price - refMedian) / refMedian : 0;
    const isLowOutlier = item.price < lowerFence;
    const isHighOutlier = item.price > upperFence;
    const isOutlier = isLowOutlier || isHighOutlier;
    const isSmartZone = !isLowOutlier && item.price <= median * 0.94;
    const inferred =
      typeof item.unitPrice === 'number' && item.unitBase
        ? { unitPrice: Math.round(item.unitPrice), unitBase: item.unitBase }
        : inferUnitPrice(item.price, item.packSize || item.title);

    return {
      ...item,
      brand: normalizeBrandLabel(item.brand),
      unitPrice: inferred.unitPrice,
      unitBase: inferred.unitBase,
      rating: typeof item.rating === 'number' ? item.rating : null,
      reviews: typeof item.reviews === 'number' ? item.reviews : 0,
      seller: item.seller || item.source || 'Vendedor',
      sellerBadge: item.sellerBadge || 'Vendedor',
      installments: item.installments || 'Ver condiciones en tienda',
      specs: item.specs || { fuente: item.source || 'Supermercados DIA%', moneda: item.currency || 'ARS' },
      categoryTag: item.categoryTag || item.source || 'General',
      deltaPct,
      isLowOutlier,
      isHighOutlier,
      isOutlier,
      isSmartZone
    };
  });

  const min = prices[0];
  const max = prices[prices.length - 1];
  const binCount = 10;
  const span = Math.max(1, max - min);
  const step = span / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = Math.round(min + step * index);
    const end = index === binCount - 1 ? Math.round(max) : Math.round(min + step * (index + 1));
    const members = enrichedItems.filter((item) =>
      index === binCount - 1
        ? item.price >= start && item.price <= end
        : item.price >= start && item.price < end
    );
    const outlierMembers = members.filter((m) => m.isOutlier).length;
    const hasOutliers = members.length > 0 && outlierMembers / members.length >= 0.5;
    const isSmartBin = !hasOutliers && end <= median;
    let zone = 'normal';
    if (hasOutliers) zone = 'outlier';
    else if (isSmartBin) zone = 'smart';

    return {
      id: `bin-${index}`,
      index,
      start,
      end,
      label: formatCompactARS(start),
      rangeLabel: `${formatARS(start)} – ${formatARS(end)}`,
      count: members.length,
      outlierCount: outlierMembers,
      zone
    };
  });

  const medianBinIndex = Math.max(
    0,
    Math.min(
      binCount - 1,
      bins.findIndex((b, idx) =>
        idx === binCount - 1 ? median >= b.start && median <= b.end : median >= b.start && median < b.end
      )
    )
  );

  const freeShippingCount = enrichedItems.filter((item) => item.freeShipping).length;

  return {
    count: items.length,
    pricedCount: priced.length,
    median,
    mean,
    min,
    max,
    p10,
    q1,
    q3,
    p90,
    iqr,
    lowerFence,
    upperFence,
    stdDev,
    cv,
    dispersionLabel,
    dispersionTone,
    outlierCount: enrichedItems.filter((i) => i.isOutlier).length,
    lowOutlierCount: enrichedItems.filter((i) => i.isLowOutlier).length,
    highOutlierCount: enrichedItems.filter((i) => i.isHighOutlier).length,
    belowMedianCount: enrichedItems.filter((i) => !i.isLowOutlier && i.price < median).length,
    freeShippingRate: enrichedItems.length ? freeShippingCount / enrichedItems.length : 0,
    medianBinLabel: bins[medianBinIndex]?.label ?? '',
    enrichedItems,
    bins
  };
}
