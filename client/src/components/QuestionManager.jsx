import React, { useState, useEffect, useCallback } from 'react';

// ─── Tipos de pregunta disponibles ──────────────────────────────────────────
const TIPOS_PREGUNTA = {
  alternativas: {
    label: 'Alternativas',
    icon: '⊙',
    color: 'text-violet-400',
    bg: 'bg-violet-500/15 border-violet-500/30',
    desc: 'Varias opciones, una correcta',
  },
  verdadero_falso: {
    label: 'Verdadero / Falso',
    icon: '⊘',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    desc: 'Sólo dos opciones',
  },
  texto_libre: {
    label: 'Texto Libre',
    icon: '✎',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15 border-sky-500/30',
    desc: 'El jugador escribe la respuesta',
  },
  ordenamiento: {
    label: 'Ordenamiento',
    icon: '⇅',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/30',
    desc: 'Ordena los elementos correctamente',
  },
  rango_numerico: {
    label: 'Rango Numérico',
    icon: '◈',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border-rose-500/30',
    desc: 'Respuesta dentro de un rango numérico',
  },
};

const DIFICULTADES = [
  { value: 'Casual', label: 'Casual', mult: '×1.0', color: 'text-gray-400' },
  { value: 'Competitiva', label: 'Competitiva', mult: '×1.5', color: 'text-amber-400' },
];

const EMPTY_QUESTION = (tipo = 'alternativas') => {
  const base = {
    pregunta: '',
    categoria: 'Videojuegos',
    tipo_dificultad: 'Casual',
    tipo_pregunta: tipo,
  };
  if (tipo === 'alternativas') return { ...base, opciones: ['', '', '', ''], respuesta_correcta: 0 };
  if (tipo === 'verdadero_falso') return { ...base, opciones: ['Verdadero', 'Falso'], respuesta_correcta: 0 };
  if (tipo === 'texto_libre') return { ...base, respuesta_texto: '', pistas: '' };
  if (tipo === 'ordenamiento') return { ...base, opciones: ['', '', '', ''], orden_correcto: [0, 1, 2, 3] };
  if (tipo === 'rango_numerico') return { ...base, rango_min: 0, rango_max: 100, respuesta_numero: 50 };
  return base;
};

// ─── Sub-formularios por tipo ─────────────────────────────────────────────────

function AlternativasForm({ q, setQ }) {
  const addOpcion = () => {
    if (q.opciones.length >= 6) return;
    setQ({ ...q, opciones: [...q.opciones, ''] });
  };
  const removeOpcion = (i) => {
    if (q.opciones.length <= 2) return;
    const opciones = q.opciones.filter((_, idx) => idx !== i);
    setQ({ ...q, opciones, respuesta_correcta: Math.min(q.respuesta_correcta, opciones.length - 1) });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Opciones</label>
        {q.opciones.length < 6 && (
          <button type="button" onClick={addOpcion}
            className="text-[11px] px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors">
            + Agregar opción
          </button>
        )}
      </div>
      {q.opciones.map((op, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <button type="button" title="Marcar como correcta"
            onClick={() => setQ({ ...q, respuesta_correcta: i })}
            className={`w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
              ${q.respuesta_correcta === i
                ? 'border-emerald-500 bg-emerald-500/25 text-emerald-300'
                : 'border-surface-border text-gray-600 hover:border-emerald-500/50'}`}>
            {['A','B','C','D','E','F'][i]}
          </button>
          <input type="text" required placeholder={`Opción ${['A','B','C','D','E','F'][i]}`}
            className={`flex-1 bg-surface-card border ${q.respuesta_correcta === i ? 'border-emerald-500/60' : 'border-surface-border'} 
              focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 focus:outline-none p-2 rounded-lg text-white text-sm transition-all`}
            value={op}
            onChange={(e) => {
              const opciones = [...q.opciones];
              opciones[i] = e.target.value;
              setQ({ ...q, opciones });
            }} />
          {q.opciones.length > 2 && (
            <button type="button" onClick={() => removeOpcion(i)}
              className="w-6 h-6 flex-shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
              ✕
            </button>
          )}
        </div>
      ))}
      <p className="text-[11px] text-gray-500 mt-1">Haz clic en la letra para marcar la respuesta correcta.</p>
    </div>
  );
}

function VerdaderoFalsoForm({ q, setQ }) {
  return (
    <div className="flex gap-3">
      {['Verdadero', 'Falso'].map((op, i) => (
        <button key={i} type="button"
          onClick={() => setQ({ ...q, respuesta_correcta: i })}
          className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all
            ${q.respuesta_correcta === i
              ? i === 0 ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-red-500 bg-red-500/20 text-red-300'
              : 'border-surface-border text-gray-500 hover:border-gray-500'}`}>
          {i === 0 ? '✓ Verdadero' : '✗ Falso'}
        </button>
      ))}
    </div>
  );
}

function TextoLibreForm({ q, setQ }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Respuesta Correcta</label>
        <input required type="text" placeholder="Ej: Half-Life 2"
          className="w-full bg-surface-card border border-surface-border focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-none p-2 rounded-lg text-white text-sm"
          value={q.respuesta_texto || ''}
          onChange={(e) => setQ({ ...q, respuesta_texto: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Pistas (opcional, separadas por coma)</label>
        <input type="text" placeholder="Ej: Es un FPS, Protagonista: Gordon Freeman"
          className="w-full bg-surface-card border border-surface-border focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:outline-none p-2 rounded-lg text-white text-sm"
          value={q.pistas || ''}
          onChange={(e) => setQ({ ...q, pistas: e.target.value })} />
      </div>
      <p className="text-[11px] text-gray-500">La comparación es insensible a mayúsculas/minúsculas.</p>
    </div>
  );
}

function OrdenamientoForm({ q, setQ }) {
  const move = (from, to) => {
    const opciones = [...q.opciones];
    const orden = [...q.orden_correcto];
    const item = opciones.splice(from, 1)[0];
    opciones.splice(to, 0, item);
    const ordItem = orden.splice(from, 1)[0];
    orden.splice(to, 0, ordItem);
    setQ({ ...q, opciones, orden_correcto: orden });
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
        Elementos en Orden Correcto (de arriba a abajo)
      </label>
      {q.opciones.map((op, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 h-6 flex-shrink-0 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
          <input type="text" required placeholder={`Elemento ${i + 1}`}
            className="flex-1 bg-surface-card border border-surface-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 focus:outline-none p-2 rounded-lg text-white text-sm"
            value={op}
            onChange={(e) => {
              const opciones = [...q.opciones];
              opciones[i] = e.target.value;
              setQ({ ...q, opciones });
            }} />
          <div className="flex flex-col gap-0.5">
            <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)}
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-amber-300 disabled:opacity-20 text-xs">▲</button>
            <button type="button" disabled={i === q.opciones.length - 1} onClick={() => move(i, i + 1)}
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-amber-300 disabled:opacity-20 text-xs">▼</button>
          </div>
        </div>
      ))}
      <p className="text-[11px] text-gray-500">Ingresa los elementos en el orden que el jugador debe encontrar.</p>
    </div>
  );
}

function RangoNumericoForm({ q, setQ }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Mínimo</label>
        <input type="number" required
          className="w-full bg-surface-card border border-surface-border focus:border-rose-500 focus:outline-none p-2 rounded-lg text-white text-sm"
          value={q.rango_min ?? 0}
          onChange={(e) => setQ({ ...q, rango_min: Number(e.target.value) })} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Respuesta</label>
        <input type="number" required
          className="w-full bg-surface-card border border-rose-500/60 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/20 focus:outline-none p-2 rounded-lg text-rose-300 text-sm font-bold"
          value={q.respuesta_numero ?? 50}
          onChange={(e) => setQ({ ...q, respuesta_numero: Number(e.target.value) })} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Máximo</label>
        <input type="number" required
          className="w-full bg-surface-card border border-surface-border focus:border-rose-500 focus:outline-none p-2 rounded-lg text-white text-sm"
          value={q.rango_max ?? 100}
          onChange={(e) => setQ({ ...q, rango_max: Number(e.target.value) })} />
      </div>
      <p className="col-span-3 text-[11px] text-gray-500">El jugador ingresa un número; se acepta si cae dentro del rango permitido alrededor de la respuesta correcta.</p>
    </div>
  );
}

// ─── Badge helpers ───────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const t = TIPOS_PREGUNTA[tipo] || TIPOS_PREGUNTA.alternativas;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${t.bg} ${t.color}`}>
      <span>{t.icon}</span> {t.label}
    </span>
  );
}

function DifBadge({ dif }) {
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${dif === 'Competitiva' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-surface-border text-gray-400 border border-surface-border'}`}>
      {dif === 'Competitiva' ? '⚡ Competitiva' : '☽ Casual'}
    </span>
  );
}

// ─── Formulario dinámico ─────────────────────────────────────────────────────
function QuestionForm({ initial, onSave, onCancel }) {
  const [q, setQ] = useState(initial);
  const isNew = !q.id;

  const handleTipoChange = (tipo) => {
    setQ(EMPTY_QUESTION(tipo));
  };

  const renderTypeForm = () => {
    switch (q.tipo_pregunta) {
      case 'alternativas':    return <AlternativasForm q={q} setQ={setQ} />;
      case 'verdadero_falso': return <VerdaderoFalsoForm q={q} setQ={setQ} />;
      case 'texto_libre':     return <TextoLibreForm q={q} setQ={setQ} />;
      case 'ordenamiento':    return <OrdenamientoForm q={q} setQ={setQ} />;
      case 'rango_numerico':  return <RangoNumericoForm q={q} setQ={setQ} />;
      default: return null;
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(q); }}
      className="bg-[#0f1117] border border-surface-border/60 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border/40 bg-surface-card">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <span className="text-brand-light">◈</span>
          {isNew ? 'Nueva Pregunta' : `Editando Pregunta #${q.id}`}
        </h4>
        <button type="button" onClick={onCancel} className="text-gray-500 hover:text-white text-lg leading-none transition-colors">✕</button>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Selector de tipo */}
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Tipo de Pregunta</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(TIPOS_PREGUNTA).map(([key, t]) => (
              <button key={key} type="button" onClick={() => handleTipoChange(key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all
                  ${q.tipo_pregunta === key
                    ? `${t.bg} ${t.color} scale-[1.03] shadow-lg`
                    : 'border-surface-border/50 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}>
                <span className="text-xl">{t.icon}</span>
                <span className="text-[10px] font-bold leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pregunta */}
        <div>
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Enunciado de la Pregunta</label>
          <textarea required rows={2} placeholder="Escribe tu pregunta aquí..."
            className="w-full bg-surface-card border border-surface-border focus:border-brand focus:ring-1 focus:ring-brand/20 focus:outline-none p-3 rounded-xl text-white text-sm resize-none transition-all"
            value={q.pregunta}
            onChange={(e) => setQ({ ...q, pregunta: e.target.value })} />
        </div>

        {/* Formulario específico del tipo */}
        <div className={`p-4 rounded-xl border ${TIPOS_PREGUNTA[q.tipo_pregunta]?.bg || 'border-surface-border'}`}>
          {renderTypeForm()}
        </div>

        {/* Categoría y Dificultad */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Categoría</label>
            <input type="text" required placeholder="Ej: Videojuegos, Historia..."
              className="w-full bg-surface-card border border-surface-border focus:border-brand focus:ring-1 focus:ring-brand/20 focus:outline-none p-2 rounded-lg text-white text-sm"
              value={q.categoria}
              onChange={(e) => setQ({ ...q, categoria: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Dificultad</label>
            <div className="flex gap-2">
              {DIFICULTADES.map(d => (
                <button key={d.value} type="button"
                  onClick={() => setQ({ ...q, tipo_dificultad: d.value })}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all
                    ${q.tipo_dificultad === d.value
                      ? d.value === 'Competitiva' ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-gray-500 bg-gray-700 text-white'
                      : 'border-surface-border text-gray-500 hover:border-gray-500'}`}>
                  {d.label}<br/>
                  <span className="text-[10px] font-normal opacity-70">{d.mult} pts</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 justify-end px-5 py-4 border-t border-surface-border/40 bg-surface-card">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-surface-border/20">
          Cancelar
        </button>
        <button type="submit"
          className="px-5 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand/80 font-bold transition-all shadow-lg hover:shadow-brand/25 flex items-center gap-2">
          <span>✓</span> {isNew ? 'Crear Pregunta' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function QuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filter, setFilter] = useState({ tipo: 'all', dif: 'all', search: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trivia/questions');
      if (res.ok) setQuestions(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSave = async (q) => {
    setSaving(true);
    const isNew = !q.id;
    const url = isNew ? '/api/trivia/questions' : `/api/trivia/questions/${q.id}`;
    const method = isNew ? 'POST' : 'PUT';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q),
      });
      if (res.ok) {
        setEditingQuestion(null);
        fetchQuestions();
        showToast(isNew ? '¡Pregunta creada!' : '¡Cambios guardados!');
      } else {
        showToast('Error al guardar.', 'error');
      }
    } catch {
      showToast('Error de conexión.', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta pregunta? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/trivia/questions/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchQuestions(); showToast('Pregunta eliminada.'); }
    } catch { showToast('Error al eliminar.', 'error'); }
  };

  const handleDuplicate = async (q) => {
    const { id, ...rest } = q;
    const res = await fetch('/api/trivia/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
    if (res.ok) { fetchQuestions(); showToast('Pregunta duplicada.'); }
  };

  const handleShuffle = async () => {
    if (!window.confirm('¿Mezclar aleatoriamente el banco de preguntas?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/trivia/questions/shuffle', { method: 'POST' });
      if (res.ok) { fetchQuestions(); showToast('Preguntas barajadas.'); }
      else showToast('Error al barajar.', 'error');
    } catch { showToast('Error de conexión.', 'error'); }
    setSaving(false);
  };

  // Filtrado
  const filtered = questions.filter(q => {
    const tp = q.tipo_pregunta || 'alternativas';
    const matchTipo = filter.tipo === 'all' || tp === filter.tipo;
    const matchDif  = filter.dif  === 'all' || q.tipo_dificultad === filter.dif;
    const matchSearch = !filter.search || q.pregunta.toLowerCase().includes(filter.search.toLowerCase()) || (q.categoria || '').toLowerCase().includes(filter.search.toLowerCase());
    return matchTipo && matchDif && matchSearch;
  });

  // Stats
  const stats = Object.fromEntries(Object.keys(TIPOS_PREGUNTA).map(t => [t, questions.filter(q => (q.tipo_pregunta || 'alternativas') === t).length]));

  return (
    <div className="flex flex-col gap-4 mt-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl font-bold text-sm shadow-2xl border transition-all
          ${toast.type === 'error'
            ? 'bg-red-900/90 border-red-500/40 text-red-200'
            : 'bg-emerald-900/90 border-emerald-500/40 text-emerald-200'}`}>
          {toast.type === 'error' ? '✕ ' : '✓ '}{toast.msg}
        </div>
      )}

      {/* Header + Stats */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-light flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              Banco de Preguntas
            </h3>
            <p className="text-gray-500 text-xs mt-0.5">{questions.length} preguntas en total</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={handleShuffle} disabled={questions.length < 2 || saving}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-surface-border text-gray-300 text-xs font-bold rounded-xl hover:bg-surface-border/40 transition-all focus:outline-none">
              🔀 Mezclar
            </button>
            <button onClick={() => setEditingQuestion(EMPTY_QUESTION('alternativas'))}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand/80 transition-all shadow-lg hover:shadow-brand/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva Pregunta
            </button>
          </div>
        </div>

        {/* Stats por tipo */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {Object.entries(TIPOS_PREGUNTA).map(([key, t]) => (
            <button key={key} type="button"
              onClick={() => setFilter(f => ({ ...f, tipo: f.tipo === key ? 'all' : key }))}
              className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left
                ${filter.tipo === key ? `${t.bg} scale-[1.02]` : 'border-surface-border/40 hover:border-gray-600'}`}>
              <span className={`text-base mb-1 ${filter.tipo === key ? t.color : 'text-gray-500'}`}>{t.icon}</span>
              <span className={`text-lg font-black leading-none ${filter.tipo === key ? t.color : 'text-white'}`}>{stats[key] || 0}</span>
              <span className="text-[10px] text-gray-500 leading-tight mt-0.5">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Formulario de edición */}
      {editingQuestion && (
        <QuestionForm
          initial={editingQuestion}
          onSave={handleSave}
          onCancel={() => setEditingQuestion(null)}
        />
      )}

      {/* Tabla con filtros */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        {/* Barra de filtros */}
        <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-surface-border/40 bg-[#0a0d12]">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <input type="text" placeholder="Buscar por pregunta o categoría..."
              className="w-full bg-surface pl-9 pr-3 py-2 rounded-lg border border-surface-border focus:border-brand focus:outline-none text-white text-xs"
              value={filter.search}
              onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))} />
          </div>
          <select value={filter.tipo} onChange={(e) => setFilter(f => ({ ...f, tipo: e.target.value }))}
            className="bg-surface border border-surface-border text-white text-xs rounded-lg px-3 py-2 focus:border-brand focus:outline-none">
            <option value="all">Todos los tipos</option>
            {Object.entries(TIPOS_PREGUNTA).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
          <select value={filter.dif} onChange={(e) => setFilter(f => ({ ...f, dif: e.target.value }))}
            className="bg-surface border border-surface-border text-white text-xs rounded-lg px-3 py-2 focus:border-brand focus:outline-none">
            <option value="all">Todas las dificultades</option>
            <option value="Casual">Casual</option>
            <option value="Competitiva">Competitiva</option>
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Cargando preguntas...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p className="text-2xl mb-2">◈</p>
            <p className="text-sm">No se encontraron preguntas.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/30">
            {filtered.map(q => (
              <div key={q.id}
                className="flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-surface-border/10 transition-colors group">
                {/* ID */}
                <span className="text-[10px] text-gray-600 font-mono w-6 flex-shrink-0 mt-0.5">#{q.id}</span>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-snug truncate" title={q.pregunta}>{q.pregunta}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <TipoBadge tipo={q.tipo_pregunta || 'alternativas'} />
                    <DifBadge dif={q.tipo_dificultad} />
                    <span className="text-[10px] text-gray-600 bg-surface border border-surface-border px-2 py-0.5 rounded-md">{q.categoria}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleDuplicate(q)} title="Duplicar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-border text-gray-400 hover:text-white transition-all text-xs">
                    ⧉
                  </button>
                  <button onClick={() => setEditingQuestion(JSON.parse(JSON.stringify(q)))} title="Editar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand/20 text-gray-400 hover:text-brand-light transition-all text-xs">
                    ✎
                  </button>
                  <button onClick={() => handleDelete(q.id)} title="Eliminar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all text-xs">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div className="px-4 py-2.5 border-t border-surface-border/30 bg-[#0a0d12]">
            <p className="text-[11px] text-gray-600">Mostrando {filtered.length} de {questions.length} preguntas</p>
          </div>
        )}
      </div>
    </div>
  );
}
