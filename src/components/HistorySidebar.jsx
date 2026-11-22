import React, { useState } from 'react';
import { Check, Pencil, Star, Trash2, X } from 'lucide-react';
import { formatCompactARS, formatRelativeDate } from '../utils/formatters.js';

export default function HistorySidebar({
  leftOpen,
  mobilePanel,
  historyList,
  activeStudyId,
  sourceFilter,
  onSourceFilterChange,
  sources,
  onSelectStudy,
  onToggleFavorite,
  onSaveNotes,
  onDeleteStudy,
  onOpenClearModal
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');

  if (!leftOpen && mobilePanel !== 'history') return null;

  const startEditing = (study, e) => {
    e.stopPropagation();
    setEditingId(study.id);
    setDraftNotes(study.notes || '');
  };

  const commitEdit = async (studyId, e) => {
    e.stopPropagation();
    await onSaveNotes(studyId, draftNotes);
    setEditingId(null);
  };

  return (
    <aside
      className={`${
        mobilePanel === 'history' ? 'fixed inset-y-14 left-0 z-40 w-[85vw] max-w-xs flex' : 'hidden'
      } ${leftOpen ? 'lg:static lg:flex lg:w-64 xl:w-72' : 'lg:hidden'} shrink-0 border-r border-[#E5E3DC] bg-white flex-col`}
    >
      <div className="px-4 py-3 border-b border-[#E5E3DC] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#666560]">
            Mis búsquedas ({historyList.length})
          </span>
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value)}
          aria-label="Filtrar historial por supermercado"
          className="w-full px-2 py-1 text-xs rounded border border-[#E5E3DC] bg-[#F6F5F1]"
        >
          <option value="">Todos los supermercados</option>
          {sources.filter((s) => s.active).map((src) => (
            <option key={src.key} value={src.key}>
              {src.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {historyList.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#666560] border border-dashed border-[#E5E3DC] rounded-md">
            Todavía no hiciste búsquedas. Escribí un producto o una lista arriba para empezar.
          </div>
        ) : (
          historyList.map((study) => (
            <div
              key={study.id}
              onClick={() => onSelectStudy(study.id)}
              className="p-3 rounded-md border cursor-pointer transition-colors"
              style={{
                backgroundColor: study.id === activeStudyId ? '#F6F5F1' : '#FFFFFF',
                borderColor: study.id === activeStudyId ? '#121212' : '#E5E3DC'
              }}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[13px] font-semibold line-clamp-2">{study.term}</span>
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    title={study.isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    onClick={(e) => onToggleFavorite(study, e)}
                    className="p-1 text-[#666560] hover:text-[#EAB308]"
                  >
                    <Star
                      className="w-3.5 h-3.5"
                      fill={study.isFavorite ? '#EAB308' : 'none'}
                      stroke={study.isFavorite ? '#EAB308' : 'currentColor'}
                    />
                  </button>
                  <button
                    type="button"
                    title="Agregar nota"
                    onClick={(e) => startEditing(study, e)}
                    className="p-1 text-[#666560] hover:text-[#121212]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar búsqueda"
                    onClick={(e) => onDeleteStudy(study.id, e)}
                    className="p-1 text-[#666560] hover:text-[#E11D48]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingId === study.id ? (
                <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    maxLength={200}
                    placeholder="Agregar nota..."
                    className="flex-1 px-2 py-1 text-[11px] rounded border border-[#121212] bg-white"
                  />
                  <button
                    type="button"
                    onClick={(e) => commitEdit(study.id, e)}
                    className="p-1 rounded bg-[#121212] text-white"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                    className="p-1 rounded border border-[#E5E3DC] bg-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : study.notes ? (
                <p className="mt-1 text-[11px] text-[#666560] italic line-clamp-2">{study.notes}</p>
              ) : null}

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-[#666560]">{formatRelativeDate(study.createdAt)}</span>
                <span className="font-mono-num font-semibold px-1.5 py-0.5 rounded border border-[#E5E3DC] bg-white">
                  ~{formatCompactARS(study.medianPrice)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-[#666560]">
                {study.totalProducts} productos
              </div>
            </div>
          ))
        )}
      </div>

      {historyList.length > 0 && (
        <div className="p-3 border-t border-[#E5E3DC] bg-[#FAF9F6]">
          <button
            type="button"
            onClick={onOpenClearModal}
            className="w-full py-1.5 px-2.5 rounded border border-[#FECDD3] bg-white text-xs text-[#E11D48] font-semibold flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpiar historial
          </button>
        </div>
      )}
    </aside>
  );
}
