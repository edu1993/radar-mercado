import React from 'react';
import { Radar } from 'lucide-react';

export default function AuthScreen({
  authMode,
  setAuthMode,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  honeypot,
  setHoneypot,
  authLoading,
  authError,
  setAuthError,
  onSubmit
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-slate-50 to-sky-100 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-teal-200/70 bg-white/95 backdrop-blur-md p-7 shadow-xl shadow-teal-900/10 space-y-5 animate-fade-up">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 flex items-center justify-center shrink-0 shadow-md shadow-teal-600/25 animate-float-slow">
            <Radar className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">Radar Mercado</h1>
            <p className="text-xs text-teal-700 font-medium">Comparador de supermercados · Trenque Lauquen</p>
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setAuthError(''); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setAuthError(''); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <input
            type="text"
            name="website_url"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
          <div>
            <label htmlFor="auth-username" className="block text-xs font-semibold text-slate-700 mb-1">
              Usuario
            </label>
            <input
              id="auth-username"
              type="text"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              placeholder="ej: juan.perez"
              required
              minLength={3}
              maxLength={32}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña (mín. 8 caracteres)
            </label>
            <input
              id="auth-password"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
            />
          </div>

          {authError && (
            <div role="alert" className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700 font-medium">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-700 hover:via-emerald-700 hover:to-cyan-700 text-white shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all"
          >
            {authLoading ? 'Conectando...' : authMode === 'register' ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
