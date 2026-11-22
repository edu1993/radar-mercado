import React from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { buildProductsCsv, formatARS, formatPct } from '../utils/formatters.js';

function getStoreBadgeClass(source = '') {
  const s = source.toLowerCase();
  if (s.includes('dia')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s.includes('carrefour')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (s.includes('chango') || s.includes('más online') || s.includes('mas online')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  if (s.includes('sepa')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function ProductTable({
  studyTerm,
  filteredProducts,
  paginatedProducts,
  totalPriced,
  outlierCount,
  compareIds,
  onToggleCompare,
  onOpenCompare,
  sortBy,
  onSortByChange,
  tableQuery,
  onTableQueryChange,
  hideOutliers,
  onToggleHideOutliers,
  onlySmartZone,
  onToggleOnlySmartZone,
  onlyDiscounted,
  onToggleOnlyDiscounted,
  safePage,
  totalPages,
  onPageChange
}) {
  const handleExportCsv = () => {
    const csv = buildProductsCsv(filteredProducts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `radar-${(studyTerm || 'compra').replace(/\s+/g, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Productos encontrados ({filteredProducts.length}/{totalPriced})
          </h2>
          <div className="flex items-center gap-2">
            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={onOpenCompare}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Comparar ({compareIds.length}/3)
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!filteredProducts.length}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              aria-label="Ordenar productos"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="price_asc">Más barato primero</option>
              <option value="unit_price_asc">Mejor precio por kg/litro</option>
              <option value="delta_asc">Mayor ahorro</option>
              <option value="price_desc">Más caro primero</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={tableQuery}
            onChange={(e) => onTableQueryChange(e.target.value)}
            placeholder="Filtrar por marca, producto o supermercado..."
            className="flex-1 min-w-[180px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
          {outlierCount > 0 && (
            <button
              type="button"
              onClick={onToggleHideOutliers}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                hideOutliers
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              Sin precios extremos ({outlierCount})
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOnlySmartZone}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              onlySmartZone
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Buenos precios
          </button>
          <button
            type="button"
            onClick={onToggleOnlyDiscounted}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              onlyDiscounted
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            Solo en oferta
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="py-2.5 pl-4 pr-2 w-10">Comp.</th>
              <th className="py-2.5 px-3">Producto</th>
              <th className="py-2.5 px-3 text-right">Precio</th>
              <th className="py-2.5 px-3">Vs. típico</th>
              <th className="py-2.5 px-3 hidden sm:table-cell">Supermercado</th>
              <th className="py-2.5 pl-2 pr-4 text-right">Tienda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {paginatedProducts.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 pl-4 pr-2">
                  <input
                    type="checkbox"
                    aria-label={`Comparar ${item.title}`}
                    checked={compareIds.includes(item.id)}
                    onChange={() => onToggleCompare(item.id)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                </td>
                <td className="py-3 px-3">
                  <div className="text-[13px] font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {item.packSize && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {item.packSize}
                      </span>
                    )}
                    {item.brand && <span className="text-slate-500">{item.brand}</span>}
                  </div>
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  <div className="font-mono-num font-bold text-slate-900">{formatARS(item.price)}</div>
                  {item.unitPrice && item.unitBase && (
                    <div className="font-mono-num text-[11px] font-semibold text-emerald-700">
                      {formatARS(item.unitPrice)} / {item.unitBase}
                    </div>
                  )}
                  {item.listPrice && item.listPrice > item.price && (
                    <div className="font-mono-num text-[11px] text-slate-400 line-through">
                      {formatARS(item.listPrice)}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded-full border text-xs font-mono-num font-semibold ${
                      item.isOutlier
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : item.deltaPct <= -0.05
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-slate-600 bg-slate-50 border-slate-200'
                    }`}
                  >
                    {formatPct(item.deltaPct)}
                  </span>
                </td>
                <td className="py-3 px-3 hidden sm:table-cell text-xs">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getStoreBadgeClass(
                      item.source || item.seller
                    )}`}
                  >
                    {item.source || item.seller}
                  </span>
                  {item.discountPct > 0 && (
                    <div className="mt-1 font-mono-num text-emerald-700 font-semibold">-{item.discountPct}% OFF</div>
                  )}
                </td>
                <td className="py-3 pl-2 pr-4 text-right">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                  >
                    Ver <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-mono-num text-slate-500">
            Página {safePage} de {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-medium disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-medium disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
