import React from 'react';
import { X } from 'lucide-react';
import { formatARS, formatPct } from '../utils/formatters.js';

export default function CompareModal({ open, products, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-lg border border-[#E5E3DC] bg-white flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E3DC] flex justify-between items-center">
          <h3 className="text-sm font-bold">Comparación lado a lado ({products.length})</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded border border-[#E5E3DC]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((item) => (
            <div key={item.id} className="rounded-md border border-[#E5E3DC] bg-[#FAF9F6] p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold">{item.title}</h4>
                <div className="mt-2 font-mono-num text-xl font-bold">{formatARS(item.price)}</div>
                <div className="text-xs text-[#059669]">{formatPct(item.deltaPct)} vs mediana</div>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 py-2 rounded-md text-xs font-semibold text-center bg-[#121212] text-white"
              >
                Abrir publicación
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
