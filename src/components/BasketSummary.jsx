import React, { useMemo, useState } from 'react';
import { CreditCard, ShoppingCart } from 'lucide-react';
import { formatARS } from '../utils/formatters.js';
import { inferUnitPrice, normalizeBrandLabel } from '../utils/marketStats.js';

const BANK_DISCOUNTS = [
  { pct: 0, label: 'Lista' },
  { pct: 10, label: '10%' },
  { pct: 15, label: '15% Súper' },
  { pct: 20, label: '20% Cuenta DNI / MODO' },
  { pct: 30, label: '30% Promo' }
];

export default function BasketSummary({ study, products, activeItemFilter, onSelectItemFilter }) {
  const [bankDiscountPct, setBankDiscountPct] = useState(0);
  const searchItems = study?.searchItems || [];
  const isBasket = Boolean(study?.isBasket) || searchItems.length > 1;

  const basketAnalysis = useMemo(() => {
    const sourceList = Array.isArray(products) ? products : (study?.products || []);
    if (!isBasket || !sourceList.length) return null;

    const byStore = new Map();
    const globalBest = new Map();

    for (const prod of sourceList) {
      if (typeof prod.price !== 'number' || prod.price <= 0 || !prod.searchItem) continue;
      const store = prod.source || prod.seller || 'Supermercado';
      if (!byStore.has(store)) byStore.set(store, new Map());
      const storeMap = byStore.get(store);
      const prev = storeMap.get(prod.searchItem);
      if (!prev || prod.price < prev.price) storeMap.set(prod.searchItem, prod);

      const prevGlobal = globalBest.get(prod.searchItem);
      if (!prevGlobal || prod.price < prevGlobal.price) globalBest.set(prod.searchItem, prod);
    }

    const ranking = Array.from(byStore.entries())
      .map(([store, map]) => {
        const itemsDetail = searchItems.map((it) => {
          const match = map.get(it);
          if (!match) return { item: it, match: null };
          const unit =
            typeof match.unitPrice === 'number' && match.unitBase
              ? { unitPrice: Math.round(match.unitPrice), unitBase: match.unitBase }
              : inferUnitPrice(match.price, match.packSize || match.title);
          return {
            item: it,
            match: {
              ...match,
              brand: normalizeBrandLabel(match.brand),
              unitPrice: unit.unitPrice,
              unitBase: unit.unitBase
            }
          };
        });
        const found = itemsDetail.filter((d) => d.match).length;
        const total = itemsDetail.reduce((acc, d) => acc + (d.match?.price || 0), 0);
        return {
          store,
          found,
          totalItems: searchItems.length,
          complete: found === searchItems.length,
          total,
          itemsDetail
        };
      })
      .sort((a, b) => (a.complete !== b.complete ? (a.complete ? -1 : 1) : a.total - b.total));

    const combinedTotal = searchItems.reduce((acc, it) => acc + (globalBest.get(it)?.price || 0), 0);
    const bestComplete = ranking.find((r) => r.complete) || null;
    const savings = bestComplete ? Math.max(0, bestComplete.total - combinedTotal) : 0;

    return { ranking, combinedTotal, bestComplete, savings };
  }, [isBasket, study, products, searchItems]);

  if (!basketAnalysis) return null;

  const applyDiscount = (amount) => Math.round(amount * (1 - bankDiscountPct / 100));

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm space-y-3.5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-bold text-slate-900">Comparativa de Changuito por Supermercado</h2>
        </div>
        <span className="text-xs font-mono-num text-emerald-700 font-semibold">
          Combinado óptimo: {formatARS(applyDiscount(basketAnalysis.combinedTotal))}
          {basketAnalysis.savings > 0 ? ` (ahorrás ${formatARS(applyDiscount(basketAnalysis.savings))})` : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onSelectItemFilter('')}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${
              !activeItemFilter
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            Todos ({searchItems.length} ítems)
          </button>
          {searchItems.map((it) => (
            <button
              key={it}
              type="button"
              onClick={() => onSelectItemFilter(activeItemFilter === it ? '' : it)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${
                activeItemFilter === it
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400'
              }`}
            >
              {activeItemFilter === it ? '✓ ' : ''}
              {it}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
            <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Reintegro:
          </span>
          {BANK_DISCOUNTS.map((d) => (
            <button
              key={d.pct}
              type="button"
              onClick={() => setBankDiscountPct(d.pct)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                bankDiscountPct === d.pct
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-amber-50/50 text-amber-900 border-amber-200 hover:border-amber-400'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
              <th className="py-2 pr-3">Supermercado</th>
              <th className="py-2 px-3">Productos y marcas incluidos</th>
              <th className="py-2 px-3">Cobertura</th>
              <th className="py-2 pl-3 text-right">
                {bankDiscountPct > 0 ? `Total (-${bankDiscountPct}%)` : 'Total estimado'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {basketAnalysis.ranking.map((row, idx) => (
              <tr key={row.store} className="align-top">
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                  {idx === 0 && row.complete ? '★ ' : ''}
                  {row.store}
                </td>
                <td className="py-2.5 px-3 space-y-1">
                  {row.itemsDetail.map(({ item, match }) => (
                    <div key={item} className="text-[11px] leading-snug">
                      <span className="font-semibold text-slate-700 capitalize">{item}:</span>{' '}
                      {match ? (
                        <>
                          <span className="text-slate-800">{match.title}</span>
                          {match.brand && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {match.brand}
                            </span>
                          )}
                          <span className="ml-1 font-mono-num font-semibold text-emerald-700">
                            {formatARS(match.price)}
                          </span>
                          {match.unitPrice && match.unitBase && (
                            <span className="ml-1 font-mono-num text-slate-500">
                              ({formatARS(match.unitPrice)}/{match.unitBase})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-amber-700">Sin stock encontrado</span>
                      )}
                    </div>
                  ))}
                </td>
                <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                  <span className={row.complete ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                    {row.found}/{row.totalItems}
                  </span>
                </td>
                <td className="py-2.5 pl-3 text-right font-mono-num whitespace-nowrap">
                  <div className="font-bold text-slate-900">{formatARS(applyDiscount(row.total))}</div>
                  {bankDiscountPct > 0 && (
                    <div className="text-[10px] text-slate-400 line-through">{formatARS(row.total)}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
