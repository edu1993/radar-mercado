export function formatARS(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `$ ${Math.round(value).toLocaleString('es-AR')}`;
}

export function formatCompactARS(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2).replace('.', ',')}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

export function formatPct(decimal, signed = true) {
  if (!Number.isFinite(decimal)) return '—';
  const pct = Math.round(decimal * 100);
  if (signed && pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

export function formatRelativeDate(isoString) {
  if (!isoString) return 'Reciente';
  const diffMin = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (Number.isNaN(diffMin)) return isoString;
  if (diffMin < 1) return 'Recién';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHs = Math.floor(diffMin / 60);
  if (diffHs < 24) return `Hace ${diffHs} hs`;
  return `Hace ${Math.floor(diffHs / 24)} d`;
}

export function buildProductsCsv(products = []) {
  const headers = ['ID', 'Titulo', 'Precio', 'Moneda', 'DesvioVsMedianaPct', 'EnvioGratis', 'Rating', 'Resenas', 'URL'];
  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = products.map((item) => [
    item.id,
    item.title,
    Math.round(item.price),
    item.currency || 'ARS',
    Math.round((item.deltaPct || 0) * 100),
    item.freeShipping ? 'Si' : 'No',
    item.rating ?? '',
    item.reviews ?? 0,
    item.url || ''
  ].map(escapeCell).join(','));

  return [headers.join(','), ...rows].join('\n');
}
