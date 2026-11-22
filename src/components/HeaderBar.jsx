import React from 'react';
import {
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Sparkles,
  User
} from 'lucide-react';

export default function HeaderBar({
  leftOpen,
  onToggleLeft,
  onToggleRight,
  hasActiveStudy,
  onGoHome,
  currentUser,
  historyCount,
  onLogout
}) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur px-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleLeft}
          aria-label="Alternar panel de historial"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onGoHome}
          title="Ir a la pantalla principal"
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-bold tracking-[-0.02em] text-slate-900 flex items-center gap-2">
            <span>Radar Mercado</span>
            <span className="hidden sm:inline text-xs font-normal text-slate-500">
              · Supermercados Trenque Lauquen
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {hasActiveStudy && (
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 text-teal-800 hover:bg-teal-600 hover:text-white text-xs font-semibold transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inicio</span>
          </button>
        )}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-600">
          <User className="w-3.5 h-3.5 text-emerald-700" />
          <span className="font-semibold text-slate-900">{currentUser}</span>
          <span>·</span>
          <span>{historyCount === 1 ? '1 búsqueda' : `${historyCount} búsquedas`}</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleRight}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Asistente IA</span>
        </button>
      </div>
    </header>
  );
}
