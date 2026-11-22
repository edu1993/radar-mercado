import React from 'react';
import { ArrowRight, Flame, Sparkles, UtensilsCrossed } from 'lucide-react';

const ARGENTINE_COMBOS = [
  {
    id: 'chocotorta',
    badge: 'Postre clásico',
    title: 'Receta de la Chocotorta',
    subtitle: 'El postre argentino infaltable: compará los 3 ingredientes clave en vivo.',
    query: 'chocolinas, queso crema, dulce de leche',
    ingredients: ['Chocolinas', 'Queso crema', 'Dulce de leche'],
    tip: 'Tip: chequeá el precio por kilo de queso crema y dulce de leche antes de elegir pote.',
    image: '/images/combos/chocotorta.jpg'
  },
  {
    id: 'asado',
    badge: 'Juntada',
    title: 'Asado del Domingo',
    subtitle: 'Parrilla completa con fernet y coca buscando el mejor total de changuito.',
    query: 'asado, chorizo, fernet, coca cola',
    ingredients: ['Asado', 'Chorizo', 'Fernet', 'Coca Cola'],
    tip: 'Tip: dividí bebidas y carne si un súper tiene promo bancaria o descuento fuerte.',
    image: '/images/combos/asado.jpg'
  },
  {
    id: 'mateada',
    badge: 'Todos los días',
    title: 'Mateada y Merienda',
    subtitle: 'Yerba, azúcar, leche y galletitas para estirar el presupuesto semanal.',
    query: 'yerba mate, azucar, galletitas, leche',
    ingredients: ['Yerba mate', 'Azúcar', 'Galletitas', 'Leche'],
    tip: 'Tip: compará yerba de 500 g vs. 1 kg mirando el precio real por kilo.',
    image: '/images/combos/mateada.jpg'
  },
  {
    id: 'tallarines',
    badge: 'Almuerzo familiar',
    title: 'Tallarines con Tuco',
    subtitle: 'El clásico del domingo comparando primeras marcas contra marcas propias.',
    query: 'fideos, pure de tomate, queso rallado, aceite',
    ingredients: ['Fideos', 'Puré de tomate', 'Queso rallado', 'Aceite'],
    tip: 'Tip: las marcas propias de los súper suelen ahorrar más del 25% en pastas y tomate.',
    image: '/images/combos/tallarines.jpg'
  },
  {
    id: 'milanesas',
    badge: 'Infaltable',
    title: 'Milanesas con Puré',
    subtitle: 'Rebozador, huevos, papa y aceite al menor precio real en góndola.',
    query: 'pan rallado, huevos, papa, aceite',
    ingredients: ['Pan rallado', 'Huevos', 'Papa', 'Aceite'],
    tip: 'Tip: usá el botón "Mejor precio /kg o L" de la IA para elegir el aceite que más rinde.',
    image: '/images/combos/milanesas.jpg'
  },
  {
    id: 'despensa',
    badge: 'Ahorro mensual',
    title: 'Despensa Básica del Mes',
    subtitle: 'Los 5 básicos que más pesan en el ticket para saber dónde llenar el chango.',
    query: 'arroz, aceite, leche, fideos, yerba mate',
    ingredients: ['Arroz', 'Aceite', 'Leche', 'Fideos', 'Yerba mate'],
    tip: 'Tip: activá el simulador de 20% Cuenta DNI / MODO en la tabla del Changuito.',
    image: '/images/combos/despensa.jpg'
  }
];

export default function HomeShowcase({ onSelectCombo, isScanning }) {
  return (
    <section className="space-y-4 animate-fade-up">
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              CHANGUITOS BIEN ARGENTINOS · PRECIOS EN VIVO
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              ¿Qué cocinamos o compramos hoy?
            </h1>
            <p className="text-xs sm:text-sm text-teal-50/95 leading-relaxed">
              Elegí una receta o combo clásico y Radar Mercado busca los precios reales del día en supermercados de Trenque Lauquen y cadenas nacionales para que la IA te diga dónde ahorrás más.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 backdrop-blur border border-white/20 shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-amber-200" />
            <div className="text-xs">
              <div className="font-bold">6 combos listos</div>
              <div className="text-[11px] text-teal-100">1 clic = changuito armado</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ARGENTINE_COMBOS.map((combo) => (
          <article
            key={combo.id}
            className="group rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-teal-300 hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="relative aspect-video overflow-hidden bg-slate-100">
              <img
                src={combo.image}
                alt={combo.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[10px] font-bold uppercase tracking-wide text-teal-800 shadow-sm">
                <Flame className="w-3 h-3 text-amber-500" />
                {combo.badge}
              </span>
              <h2 className="absolute bottom-2.5 left-3 right-3 text-base font-extrabold text-white drop-shadow-sm leading-tight">
                {combo.title}
              </h2>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 leading-relaxed">{combo.subtitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {combo.ingredients.map((ing) => (
                    <span
                      key={ing}
                      className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200/70 text-[11px] font-semibold text-teal-800"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  {combo.tip}
                </p>
              </div>

              <button
                type="button"
                disabled={isScanning}
                onClick={() => onSelectCombo(combo.query)}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all"
              >
                <span>Buscar mejores precios</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
