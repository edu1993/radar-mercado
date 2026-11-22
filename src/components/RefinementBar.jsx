import React from 'react';
import { Package, Tag } from 'lucide-react';

export default function RefinementBar({
  itemGroups,
  filtersByItem,
  onToggleSize,
  onClearSizes,
  onToggleBrand,
  onClearBrands,
  onClearAll,
  requestedSize
}) {
  const validGroups = (itemGroups || []).filter(
    (g) => g.availableSizes.length > 0 || g.availableBrands.length > 0
  );
  if (!validGroups.length) return null;

  const totalActiveFilters = Object.values(filtersByItem || {}).reduce(
    (acc, f) => acc + (f?.sizes?.length || 0) + (f?.brands?.length || 0),
    0
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm space-y-3.5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {validGroups.length > 1
              ? 'Elegí envases y marcas por cada producto'
              : 'Elegí envases y marcas (podés elegir varios)'}
          </h2>
          <p className="text-xs text-slate-500">
            Personalizá cada producto por separado: el Changuito y los totales se recalculan al instante.
          </p>
        </div>
        {totalActiveFilters > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            Limpiar filtros ({totalActiveFilters})
          </button>
        )}
      </div>

      <div className={`grid gap-3 ${validGroups.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {validGroups.map((group) => {
          const itemFilter = filtersByItem?.[group.itemKey] || { sizes: [], brands: [] };
          const selectedSizes = itemFilter.sizes || [];
          const selectedBrands = itemFilter.brands || [];

          return (
            <div
              key={group.itemKey}
              className={`rounded-xl border p-3.5 space-y-2.5 ${
                validGroups.length > 1
                  ? 'border-teal-100 bg-gradient-to-br from-teal-50/35 to-white'
                  : 'border-slate-100 bg-slate-50/40'
              }`}
            >
              {validGroups.length > 1 && (
                <div className="flex items-center justify-between pb-1.5 border-b border-teal-100/80">
                  <span className="text-xs font-bold uppercase tracking-wide text-teal-900">
                    {group.label}
                  </span>
                  <span className={`text-[11px] font-mono-num font-semibold ${group.matchedCount === 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {group.matchedCount}/{group.totalCount} opciones
                  </span>
                </div>
              )}

              {group.availableSizes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-0.5">
                    <Package className="w-3.5 h-3.5 text-teal-600" /> Envase:
                  </span>
                  <button
                    type="button"
                    onClick={() => onClearSizes(group.itemKey)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      selectedSizes.length === 0
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    Todos
                  </button>
                  {group.availableSizes.map(({ size, count }) => {
                    const active = selectedSizes.includes(size);
                    const disabled = !active && count === 0;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleSize(group.itemKey, size)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : disabled
                              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                              : requestedSize === size && validGroups.length === 1
                                ? 'bg-teal-50 text-teal-800 border-teal-300 hover:border-teal-500'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                        }`}
                      >
                        {active ? '✓ ' : ''}
                        {size} <span className="opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {group.availableBrands.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-0.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-600" /> Marca:
                  </span>
                  <button
                    type="button"
                    onClick={() => onClearBrands(group.itemKey)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      selectedBrands.length === 0
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    Todas
                  </button>
                  {group.availableBrands.map(({ brand, count }) => {
                    const active = selectedBrands.includes(brand);
                    const disabled = !active && count === 0;
                    return (
                      <button
                        key={brand}
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleBrand(group.itemKey, brand)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-cyan-700 text-white border-cyan-700 shadow-sm'
                            : disabled
                              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400'
                        }`}
                      >
                        {active ? '✓ ' : ''}
                        {brand} <span className="opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {group.matchedCount === 0 && (selectedSizes.length > 0 || selectedBrands.length > 0) && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-900">
                  <span>Esa combinación de envase y marca no tiene stock.</span>
                  <button
                    type="button"
                    onClick={() => { onClearSizes(group.itemKey); onClearBrands(group.itemKey); }}
                    className="font-bold text-amber-800 underline shrink-0"
                  >
                    Restablecer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
