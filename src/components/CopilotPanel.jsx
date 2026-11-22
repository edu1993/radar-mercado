import React from 'react';
import {
  BadgePercent,
  CreditCard,
  ExternalLink,
  Package,
  RotateCcw,
  Scale,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Wallet
} from 'lucide-react';
import { formatARS } from '../utils/formatters.js';

const PRESETS = [
  {
    id: 'donde',
    label: '¿Dónde conviene?',
    prompt: '¿En qué supermercado me conviene comprar hoy y por qué?',
    icon: Store
  },
  {
    id: 'unidad',
    label: 'Mejor precio /kg o L',
    prompt: '¿Cuál rinde más en relación precio por kilo o litro real? Mostrame el precio por unidad.',
    icon: Scale
  },
  {
    id: 'marcas',
    label: '2da marca vs. líder',
    prompt: 'Compará las primeras marcas contra marcas propias o segundas marcas: ¿cuánto ahorro si cambio de marca?',
    icon: Tag
  },
  {
    id: 'ofertas',
    label: 'Ofertas sin trampa',
    prompt: '¿Qué productos están realmente baratos por debajo del precio típico y cuáles tienen un descuento inflado?',
    icon: BadgePercent
  },
  {
    id: 'fin_de_mes',
    label: 'Modo fin de mes',
    prompt: 'Quiero gastar la menor plata posible hoy: ¿cuál es la opción más económica y razonable para zafar sin pagar de más?',
    icon: Wallet
  },
  {
    id: 'envase',
    label: '¿Chico o grande?',
    prompt: '¿Conviene llevar envase grande para stockearme o uno más chico? Compará precio total y precio por kg/litro.',
    icon: Package
  },
  {
    id: 'dividir',
    label: '¿1 súper o dividir?',
    prompt: '¿Me conviene comprar todo en un solo supermercado o dividir entre dos cadenas? Decime cuánto ahorro en pesos.',
    icon: ShoppingCart
  },
  {
    id: 'billeteras',
    label: 'Con 20% DNI/MODO',
    prompt: 'Si aplico un 20% de descuento con billetera virtual o banco (ej. Cuenta DNI o MODO), ¿cuánto me quedarían las mejores opciones?',
    icon: CreditCard
  }
];

export default function CopilotPanel({
  rightOpen,
  mobilePanel,
  activeStudy,
  messages,
  chatThinking,
  chatUsage,
  chatEndRef,
  onSendChat,
  onResetChat
}) {
  if (!rightOpen && mobilePanel !== 'copilot') return null;

  const used = chatUsage?.usedQueries ?? 0;
  const max = chatUsage?.maxQueries ?? 15;
  const remaining = chatUsage?.remainingQueries ?? Math.max(0, max - used);
  const limitReached = Boolean(activeStudy) && remaining <= 0;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  return (
    <aside
      className={`${
        mobilePanel === 'copilot' ? 'fixed inset-y-14 right-0 z-40 w-[92vw] max-w-md flex' : 'hidden'
      } ${rightOpen ? 'lg:static lg:flex lg:w-80 xl:w-96' : 'lg:hidden'} shrink-0 border-l border-slate-200/80 bg-white/95 backdrop-blur-md flex-col`}
    >
      <div className="px-3.5 py-3 border-b border-slate-200/80 bg-gradient-to-r from-teal-50/80 to-cyan-50/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight">Asistente de Compras</div>
              <div className="text-[10px] font-medium text-teal-700">Tocá un atajo para analizar esta búsqueda</div>
            </div>
          </div>
          {activeStudy && (
            <button
              type="button"
              onClick={onResetChat}
              title="Limpiar vista del chat"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-teal-700 hover:border-teal-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={chatThinking || !activeStudy || limitReached}
                onClick={() => onSendChat(preset.prompt)}
                title={preset.prompt}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-teal-200/80 bg-white hover:bg-teal-600 hover:text-white hover:border-teal-600 text-[11px] font-semibold text-teal-900 text-left leading-tight disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-teal-900 transition-all group"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-teal-600 group-hover:text-amber-200 transition-colors" />
                <span className="leading-snug">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`${msg.role === 'user' ? 'flex justify-end' : 'space-y-2'} animate-fade-up`}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs font-medium bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm">
                {msg.text}
              </div>
            ) : (
              <>
                <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 bg-slate-50/90 p-3.5 text-xs leading-relaxed text-slate-800">
                  {msg.badge && (
                    <div className="mb-1 text-[10px] font-mono-num font-bold uppercase tracking-wide text-teal-700">
                      {msg.badge}
                    </div>
                  )}
                  <p>{msg.text}</p>
                  {msg.quickReplies?.length > 0 && !limitReached && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.quickReplies.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          disabled={chatThinking || limitReached}
                          onClick={() => onSendChat(chip)}
                          className="px-2.5 py-1 rounded-full border border-teal-200 bg-white text-[11px] font-medium text-teal-800 hover:bg-teal-600 hover:text-white disabled:opacity-40 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {msg.recommendations?.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-teal-200 bg-white p-3 text-xs space-y-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="font-semibold text-slate-900 line-clamp-2">{rec.title}</div>
                    <div className="text-[11px] text-teal-700">{rec.reason}</div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono-num font-bold text-slate-900">{formatARS(rec.price)}</span>
                        {rec.unitPrice && rec.unitBase && (
                          <span className="font-mono-num text-[11px] font-semibold text-emerald-700">
                            ({formatARS(rec.unitPrice)}/{rec.unitBase})
                          </span>
                        )}
                        {rec.brand && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                            {rec.brand}
                          </span>
                        )}
                      </div>
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-600 hover:text-white text-[11px] font-semibold transition-colors shrink-0"
                      >
                        Abrir <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
        {chatThinking && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50/70 px-3.5 py-2.5 text-xs text-teal-800 font-medium">
            <span>Analizando precios</span>
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 typing-dot" />
            </span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="px-3.5 py-2.5 border-t border-slate-200/80 bg-slate-50/90 space-y-1.5">
        {limitReached ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
            Alcanzaste el límite de {max} consultas para esta búsqueda. Hacé una nueva búsqueda para seguir consultando.
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-medium">Consultas IA en esta búsqueda</span>
            <span className="font-mono-num font-bold text-teal-800">
              {used}/{max}
            </span>
          </div>
        )}
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              limitReached ? 'bg-amber-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
