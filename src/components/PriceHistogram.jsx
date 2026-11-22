import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

function HistogramTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const bin = payload[0].payload;
  const zoneMeta =
    bin.zone === 'smart'
      ? { text: 'Buen precio', color: '#059669' }
      : bin.zone === 'outlier'
        ? { text: 'Precio fuera de lo habitual', color: '#E11D48' }
        : { text: 'Precio habitual', color: '#666560' };

  return (
    <div
      className="rounded-md border px-3 py-2.5 text-xs bg-white border-[#E5E3DC]"
      style={{ boxShadow: '0 2px 8px rgba(18,18,18,0.06)' }}
    >
      <div className="font-mono-num font-semibold text-[#121212]">{bin.rangeLabel}</div>
      <div className="mt-1 flex items-center justify-between gap-4 text-[#666560]">
        <span>Productos</span>
        <span className="font-mono-num font-semibold text-[#121212]">{bin.count}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 font-medium" style={{ color: zoneMeta.color }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zoneMeta.color }} />
        {zoneMeta.text}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-[#E5E3DC] text-[11px] text-[#666560]">
        Clic en la barra para filtrar la lista
      </div>
    </div>
  );
}

export default function PriceHistogram({ stats, selectedBin, selectedBinId, onSelectBin }) {
  if (stats.pricedCount < 4 || stats.min === stats.max) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm animate-fade-up">
      <div className="mb-3">
        <h2 className="text-sm font-bold">Cómo se reparten los precios</h2>
        <p className="text-xs text-[#666560]">Hacé clic en una barra para ver solo los productos de ese rango.</p>
      </div>
      {selectedBin && (
        <div className="mb-3 px-3 py-2 rounded-md border border-[#121212] bg-[#F6F5F1] flex items-center justify-between text-xs">
          <span>
            Filtrando: <strong className="font-mono-num">{selectedBin.rangeLabel}</strong>
          </span>
          <button type="button" onClick={() => onSelectBin(null)} className="font-semibold underline">
            Ver todos
          </button>
        </div>
      )}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.bins} margin={{ top: 16, right: 12, left: -18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E3DC" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666560' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#666560' }} />
            <Tooltip content={<HistogramTooltip />} />
            {stats.medianBinLabel && (
              <ReferenceLine x={stats.medianBinLabel} stroke="#EAB308" strokeWidth={2} strokeDasharray="4 4" />
            )}
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              onClick={(d) => d?.id && onSelectBin((prev) => (prev === d.id ? null : d.id))}
              className="cursor-pointer"
            >
              {stats.bins.map((bin) => (
                <Cell
                  key={bin.id}
                  fill={bin.zone === 'smart' ? '#0D9488' : bin.zone === 'outlier' ? '#F43F5E' : '#334155'}
                  fillOpacity={selectedBinId && selectedBinId !== bin.id ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
