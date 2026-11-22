import React from 'react';
import { CheckCircle2, Compass, Search, ShoppingCart, Sparkles } from 'lucide-react';

const SCAN_STEPS = [
  { id: 0, label: 'Recorriendo góndolas...', detail: 'Precios Claros, DIA%, Carrefour y Más Online' },
  { id: 1, label: 'Comparando marcas y envases...', detail: 'Calculando $/kg y $/litro reales' },
  { id: 2, label: 'Armando el mejor changuito...', detail: 'Detectando ofertas y ahorros reales' }
];

const QUICK_SEARCHES = [
  'yerba mate',
  'aceite, arroz',
  'fernet de un litro',
  'leche entera, fideos',
  'coca cola'
];

function RollingCartAnimation() {
  return (
    <div className="relative h-14 w-full overflow-hidden rounded-xl bg-gradient-to-r from-teal-50 via-cyan-50/70 to-emerald-50 border border-teal-200/70 flex items-center">
      {/* Línea de pasillo del supermercado */}
      <div className="absolute bottom-2.5 inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-teal-300 to-transparent" />
      <div className="animate-cart-drive flex items-center gap-2">
        <div className="flex flex-col gap-1 opacity-70">
          <span className="block w-5 h-0.5 rounded bg-teal-400" />
          <span className="block w-3 h-0.5 rounded bg-cyan-400 ml-2" />
        </div>
        <svg viewBox="0 0 64 52" className="w-12 h-10 text-teal-700 drop-shadow-sm" fill="none">
          {/* Productos de colores dentro del chango */}
          <rect x="20" y="10" width="9" height="13" rx="2" fill="#F59E0B" />
          <rect x="31" y="7" width="8" height="16" rx="2" fill="#10B981" />
          <rect x="41" y="12" width="8" height="11" rx="2" fill="#0EA5E9" />
          {/* Estructura del changuito */}
          <path
            d="M4 8H12L17 34H50L56 16H15"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="19" y1="25" x2="52" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Rueditas girando */}
          <g className="animate-wheel-spin">
            <circle cx="22" cy="43" r="4.5" stroke="#0F172A" strokeWidth="2.8" fill="#FFFFFF" />
            <line x1="22" y1="39.5" x2="22" y2="46.5" stroke="#0F172A" strokeWidth="1.5" />
          </g>
          <g className="animate-wheel-spin">
            <circle cx="46" cy="43" r="4.5" stroke="#0F172A" strokeWidth="2.8" fill="#FFFFFF" />
            <line x1="46" y1="39.5" x2="46" y2="46.5" stroke="#0F172A" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function SearchPanel({
  searchInputRef,
  searchTerm,
  setSearchTerm,
  selectedMarketplace,
  setSelectedMarketplace,
  sources,
  includeVariations,
  setIncludeVariations,
  isScanning,
  scanStep,
  onSubmit
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-teal-200/70 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-md shadow-teal-900/5 space-y-3.5 animate-fade-up">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-teal-200/35 to-cyan-200/20 blur-2xl"
      />

      <form onSubmit={onSubmit} className="relative space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/80 focus-within:bg-white focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15 transition-all">
            <Search className="w-4 h-4 text-teal-600 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscá un producto o armá un changuito con comas (ej: yerba mate, coca cola)..."
              disabled={isScanning}
              className="w-full pl-10 pr-4 py-3 text-sm bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning || searchTerm.trim().length < 2}
            className="px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-700 hover:via-emerald-700 hover:to-cyan-700 text-white shadow-md shadow-teal-600/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-45 disabled:hover:translate-y-0 transition-all"
          >
            {isScanning ? (
              <ShoppingCart className="w-4 h-4 animate-bounce" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isScanning ? 'Llenando chango...' : 'Buscar precios'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="store-select" className="text-xs text-slate-500 font-semibold">
              Supermercado:
            </label>
            <select
              id="store-select"
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              disabled={isScanning}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500"
            >
              {sources.map((src) => (
                <option key={src.key} value={src.key} disabled={!src.active}>
                  {src.active ? src.name : `${src.name} (Próximamente)`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setIncludeVariations((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              includeVariations
                ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Sugerir alternativas</span>
          </button>
        </div>

        {!isScanning && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Probá rápido:</span>
            {QUICK_SEARCHES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSubmit(null, q)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal-50/70 text-teal-800 border border-teal-100 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </form>

      {isScanning && (
        <div className="pt-3 border-t border-teal-100 space-y-3 animate-fade-up">
          <RollingCartAnimation />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-900">
                {SCAN_STEPS[Math.min(scanStep, SCAN_STEPS.length - 1)]?.label}
              </span>
              <span className="font-mono-num text-[11px] text-teal-700 font-semibold">
                Comparando en vivo
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-teal-100 overflow-hidden">
              <div
                className="h-full rounded-full shimmer-bar transition-all duration-500"
                style={{ width: `${Math.min(95, (scanStep + 1) * 32)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SCAN_STEPS.map((step) => {
              const done = scanStep > step.id;
              const active = scanStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-xl border text-xs transition-all duration-300 ${
                    done
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                      : active
                        ? 'border-teal-400 bg-teal-50/70 text-slate-900 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60 text-slate-400'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    <span>{step.label}</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">{step.detail}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
