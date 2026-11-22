import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Radar,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  User
} from 'lucide-react';

export default function AuthScreen({
  authMode,
  setAuthMode,
  authUsername,
  setAuthUsername,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  honeypot,
  setHoneypot,
  authLoading,
  authError,
  setAuthError,
  googleClientId,
  onGoogleCredential,
  onSubmit
}) {
  const [showPassword, setShowPassword] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;
    let cancelled = false;
    let attempts = 0;

    const renderGoogleButton = () => {
      if (cancelled || !googleBtnRef.current) return;
      const gsi = window.google?.accounts?.id;
      if (!gsi) {
        if (attempts < 25) {
          attempts += 1;
          setTimeout(renderGoogleButton, 200);
        }
        return;
      }
      gsi.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response?.credential) {
            onGoogleCredential(response.credential);
          }
        }
      });
      googleBtnRef.current.innerHTML = '';
      gsi.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        locale: 'es-419',
        width: 340
      });
    };

    renderGoogleButton();
    return () => {
      cancelled = true;
    };
  }, [googleClientId, onGoogleCredential]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-teal-50 via-slate-50 to-sky-100 text-slate-900">
      <div className="w-full max-w-4xl rounded-3xl border border-teal-200/70 bg-white/95 backdrop-blur-md shadow-2xl shadow-teal-900/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-fade-up">
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-700 p-7 sm:p-8 text-white flex flex-col justify-between gap-6 relative overflow-hidden">
          <div className="space-y-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center shadow-lg">
                <Radar className="w-5 h-5 text-amber-200" strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight">Radar Mercado</h1>
                <p className="text-[11px] text-teal-100 font-medium">Trenque Lauquen · Supermercados AR</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight">
                Ahorrá en el súper sin dar vueltas
              </h2>
              <p className="text-xs text-teal-50/90 leading-relaxed">
                Compará precios reales del día entre supermercados, armá tu changuito y dejá que la IA te muestre dónde conviene comprar.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2.5">
                <Store className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
                <span>Precios Claros SEPA, DIA%, Carrefour y Más Online en un solo lugar.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShoppingCart className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
                <span>Changuito multi-producto con cálculo de Cuenta DNI y MODO.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
                <span>Recetas argentinas listas (Chocotorta, Asado, Tallarines) en 1 clic.</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2.5 relative z-10">
            <div className="rounded-xl overflow-hidden border border-white/20 shadow-md aspect-video relative">
              <img src="/images/combos/chocotorta.jpg" alt="Receta Chocotorta" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white drop-shadow">Chocotorta</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/20 shadow-md aspect-video relative">
              <img src="/images/combos/asado.jpg" alt="Asado del Domingo" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white drop-shadow">Asado</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-center space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {authMode === 'register' ? 'Creá tu cuenta gratis' : '¡Bienvenido de nuevo!'}
            </h2>
            <p className="text-xs text-slate-500">
              {authMode === 'register'
                ? 'Guardá tus búsquedas, favoritos y comparativas de changuito.'
                : 'Ingresá con Google o con tu usuario para ver tus búsquedas.'}
            </p>
          </div>

          {googleClientId ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center" />
              </div>
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="mx-3 text-[11px] font-medium text-slate-400">o ingresá con tu usuario</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-600 shadow-sm">
                  G
                </span>
                <div className="text-[11px] text-slate-500 leading-snug">
                  <div className="font-semibold text-slate-700">Acceso con Google listo para activar</div>
                  <div>Agregá <code className="text-teal-700 font-semibold">GOOGLE_CLIENT_ID</code> en el servidor.</div>
                </div>
              </div>
            </div>
          )}

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
                {authMode === 'login' ? 'Usuario o correo' : 'Usuario'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-username"
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="ej: juan.perez"
                  required
                  minLength={3}
                  maxLength={64}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo electrónico <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="ej: juan@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña (mín. 8 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Tus búsquedas y changuitos son privados en tu cuenta.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
