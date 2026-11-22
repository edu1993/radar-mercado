import React from 'react';
import { ArrowUpRight, BadgePercent, Sparkles, Store, TrendingDown } from 'lucide-react';
import { formatARS, formatCompactARS } from '../utils/formatters.js';

export default function MarketSummary({ stats }) {
  const cheapest = stats.enrichedItems.length
    ? stats.enrichedItems.reduce((min, item) => (item.price < min.price ? item : min), stats.enrichedItems[0])
    : null;
  const discountedCount = stats.enrichedItems.filter((item) => (item.discountPct || 0) > 0).length;
  const maxDiscount = stats.enrichedItems.reduce((max, item) => Math.max(max, item.discountPct || 0), 0);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 animate-fade-up-delay">
      <article className="lg:col-span-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-800 text-white p-5 shadow-lg shadow-teal-900/15 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-100">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Mejor opción hoy
          </span>
          {cheapest?.discountPct > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono-num font-bold bg-amber-400 text-slate-950 shadow-sm">
              -{cheapest.discountPct}% OFF
            </span>
          )}
        </div>

        <div className="relative mt-3">
          <div className="font-mono-num text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {formatARS(stats.min)}
          </div>
          {cheapest && (
            <div className="mt-2 space-y-1.5">
              <div className="text-xs font-semibold text-white/95 line-clamp-2">{cheapest.title}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-teal-100 font-medium">
                <span className="inline-flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-amber-300" />
                  {cheapest.source || cheapest.seller}
                </span>
                {cheapest.packSize && (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-semibold">
                    {cheapest.packSize}
                  </span>
                )}
                {cheapest.unitPrice && cheapest.unitBase && (
                  <span className="font-mono-num text-[11px] font-semibold text-amber-200">
                    ({formatARS(cheapest.unitPrice)}/{cheapest.unitBase})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-2 text-xs">
          <span className="text-teal-100">
            Precio típico: <strong className="font-mono-num text-white">{formatARS(stats.median)}</strong>
          </span>
          {cheapest?.url && (
            <a
              href={cheapest.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-teal-900 font-bold hover:bg-amber-300 transition-colors shadow-sm"
            >
              Ver oferta <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </article>

      <div className="lg:col-span-7 grid grid-cols-2 gap-3.5">
        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Precio típico</span>
            <TrendingDown className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">{formatARS(stats.median)}</div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Habitual: <strong className="font-mono-num text-slate-700">{formatCompactARS(stats.q1)} – {formatCompactARS(stats.q3)}</strong>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs font-semibold text-slate-500">Precio promedio</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">{formatARS(stats.mean)}</div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Sobre {stats.pricedCount} {stats.pricedCount === 1 ? 'producto' : 'productos'}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs font-semibold text-slate-500">Opción más cara</div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">{formatARS(stats.max)}</div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Diferencia: <span className="font-mono-num font-semibold text-rose-600">{formatARS(Math.max(0, stats.max - stats.min))}</span>
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Con descuento</span>
            <BadgePercent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-amber-700">{discountedCount}</div>
          <div className="mt-1.5 text-[11px] text-amber-900/75 font-medium">
            {maxDiscount > 0 ? `Hasta -${maxDiscount}% OFF` : 'Sin ofertas activas'}
          </div>
        </article>
      </div>
    </section>
  );
}
