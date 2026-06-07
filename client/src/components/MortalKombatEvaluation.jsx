import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { fetchPlayers } from '../api/api';
import { getSocket } from '../api/socket';

const OPTIONS = ["Sí", "Más o menos", "No"];

const EVAL_FIELDS = [
  {
    key: 'movilidad',
    label: 'Movilidad',
    tooltip: '¿Usa el botón de correr y saltos calculados para acercarse, o camina lento?',
    icon: '🏃',
  },
  {
    key: 'peligrosidad',
    label: 'Peligrosidad',
    tooltip: '¿Sabe hacer secuencias largas que dejan al rival en el aire (juggles)? ¿Quita mucha vida de un turno?',
    icon: '⚔️',
  },
  {
    key: 'energia',
    label: 'Barra de Energía',
    tooltip: '¿Gasta toda la barra en el X-Ray o la usa para potenciar golpes normales (brillan)?',
    icon: '⚡',
  },
  {
    key: 'defensa',
    label: 'Defensa',
    tooltip: '¿Se bloquea cuando el rival lo ataca, o recibe todos los golpes de frente?',
    icon: '🛡️',
  },
];

const BLANK_EVAL = {
  movilidad:    'Más o menos',
  peligrosidad: 'Más o menos',
  energia:      'Más o menos',
  defensa:      'Más o menos',
};

// ─── Scoring helper ──────────────────────────────────────────────────────────
const POINTS_MAP = { "Sí": 3, "Más o menos": 1, "No": 0 };

function calcScore(ev) {
  return (
    (POINTS_MAP[ev.movilidad]    || 0) +
    (POINTS_MAP[ev.peligrosidad] || 0) +
    (POINTS_MAP[ev.energia]      || 0) +
    (POINTS_MAP[ev.defensa]      || 0)
  );
}

function getClasificacion(score) {
  if (score >= 10) return { label: 'Experto', rango: 'Oro',    color: 'text-yellow-300', bg: 'bg-yellow-400/15 border-yellow-400/40', dot: 'bg-yellow-400', emoji: '🥇' };
  if (score >= 5)  return { label: 'Peleador', rango: 'Plata', color: 'text-slate-200',  bg: 'bg-slate-400/15 border-slate-400/40',   dot: 'bg-slate-300',  emoji: '🥈' };
  return               { label: 'Casual',    rango: 'Bronce', color: 'text-orange-300', bg: 'bg-orange-700/15 border-orange-600/40',  dot: 'bg-orange-400', emoji: '🎮' };
}

// ─── MK color palette (crimson / dark) ────────────────────────────────────────
const MK_RED    = '#c0101e';
const MK_BORDER = 'border-red-900/60';

export default function MortalKombatEvaluation() {
  const { players, user, setPlayers } = useStore();
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading]     = useState(false);

  // ── Own slot
  const [player1, setPlayer1Raw] = useState('');
  const [eval1, setEval1]         = useState({ ...BLANK_EVAL });

  // ── Partner slot (WebSocket-synced)
  const [player2, setPlayer2]         = useState('');
  const [eval2,   setEval2]           = useState({ ...BLANK_EVAL });
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLabel,  setPartnerLabel]  = useState('');
  const [partnerScores, setPartnerScores] = useState({});

  const socketRef  = useRef(null);
  const isAdmin     = user?.role === 'admin';
  const isAssistant = user?.role === 'asistente';
  const isAdminOrAssistant = isAdmin || isAssistant;

  const myLabel     = isAdmin ? 'Admin' : 'Asistente';
  const partnerRole = isAdmin ? 'asistente' : 'admin';

  // ─── WebSocket ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdminOrAssistant) return;

    const socket = getSocket(user.role);
    socketRef.current = socket;

    socket.on('mk_eval:fullState', (state) => {
      const partnerData = state[partnerRole];
      if (partnerData?.rut) {
        setPlayer2(partnerData.rut);
        setPartnerScores(partnerData.scores || {});
        setPartnerOnline(true);
        setPartnerLabel(partnerRole === 'admin' ? 'Admin' : 'Asistente');
      }
    });

    socket.on('mk_eval:partnerUpdate', ({ role, rut, scores }) => {
      if (role === partnerRole) {
        setPlayer2(rut || '');
        setPartnerScores(scores || {});
        setPartnerOnline(!!rut);
        setPartnerLabel(role === 'admin' ? 'Admin' : 'Asistente');
      }
    });

    return () => {
      socket.off('mk_eval:fullState');
      socket.off('mk_eval:partnerUpdate');
    };
  }, [isAdminOrAssistant, partnerRole, user?.role]);

  const emitMyState = (rut, nombre, scores) => {
    socketRef.current?.emit('mk_eval:update', {
      role: user.role,
      rut: rut || null,
      nombre: nombre || null,
      scores,
    });
  };

  const setPlayer1 = (rut) => {
    setPlayer1Raw(rut);
    const p = players.find(pl => pl.rut === rut);
    
    let newEval = { ...BLANK_EVAL };
    if (rut) {
      const existingEval = evaluations.find(ev => ev.jugador?.rut === rut);
      if (existingEval) {
        newEval = {
          movilidad: existingEval.movilidad || 'Más o menos',
          peligrosidad: existingEval.peligrosidad || 'Más o menos',
          energia: existingEval.energia || 'Más o menos',
          defensa: existingEval.defensa || 'Más o menos',
        };
      }
    }
    
    setEval1(newEval);
    emitMyState(rut, p?.nombre, newEval);
  };

  const handleEval1Change = (key, value) => {
    const next = { ...eval1, [key]: value };
    setEval1(next);
    const p = players.find(pl => pl.rut === player1);
    emitMyState(player1, p?.nombre, next);
  };

  // ─── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAdminOrAssistant) fetchEvaluations();
    if (players.length === 0) loadPlayers();
  }, [isAdminOrAssistant, players?.length]);

  const loadPlayers = async () => {
    try {
      const res = await fetchPlayers();
      if (res?.players) setPlayers(res.players);
    } catch (e) { console.error("Error fetching players", e); }
  };

  const fetchEvaluations = async () => {
    try {
      const res = await fetch('/api/mk-eval');
      if (res.ok) setEvaluations(await res.json());
    } catch (e) { console.error("Error fetching MK evaluations", e); }
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsLoading(true);
    const toSave = [];

    if (player1) {
      const p1Obj = players.find(p => p.rut === player1);
      toSave.push({ jugador: { rut: p1Obj.rut, nombre: p1Obj.nombre }, ...eval1 });
    }
    if (player2 && isAdmin) {
      const p2Obj = players.find(p => p.rut === player2);
      if (p2Obj) toSave.push({ jugador: { rut: p2Obj.rut, nombre: p2Obj.nombre }, ...partnerScores });
    }

    if (toSave.length === 0) {
      alert("Selecciona al menos un jugador para evaluar.");
      setIsLoading(false);
      return;
    }
    if (player1 && player2 && player1 === player2) {
      alert("No puedes evaluar al mismo jugador en ambas columnas.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/mk-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations: toSave })
      });
      if (res.ok) {
        setPlayer1('');
        fetchEvaluations();
      } else {
        alert("Hubo un error al guardar las evaluaciones.");
      }
    } catch (e) {
      console.error("Save error", e);
      alert("Error de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta calificación?")) return;
    try {
      const res = await fetch(`/api/mk-eval/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvaluations();
      else alert("Error al eliminar la calificación");
    } catch (e) { console.error(e); alert("Error de red"); }
  };

  if (!isAdminOrAssistant) return null;

  const partnerPlayerObj = players.find(p => p.rut === player2);
  const partnerName      = partnerPlayerObj?.nombre || '';

  const myScore  = calcScore(eval1);
  const myClasif = getClasificacion(myScore);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Panel principal ──────────────────────────────────────────────────── */}
      <div className="bg-surface-card border border-red-900/40 p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-red-900/10">
        {/* Accent bar — MK Crimson */}
        <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl" style={{ background: 'linear-gradient(to bottom, #c0101e, #7f0a15)' }} />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {/* Dragon icon */}
            <span className="text-2xl leading-none select-none">🐉</span>
            Evaluación Mortal Kombat XL
          </h2>

          {/* Sync indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            partnerOnline
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-surface border-surface-border text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            {partnerOnline
              ? `🔗 Sync con ${partnerLabel}: evaluando "${partnerName}"`
              : `⬜ Esperando a ${partnerRole === 'admin' ? 'Admin' : 'Asistente'}...`}
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-6 max-w-2xl">
          <strong className="text-red-400">{myLabel}</strong>: selecciona al jugador en&nbsp;
          <em>Escrutinio A</em>. El <em>Escrutinio B</em> se sincroniza con tu compañero.
        </p>

        {/* ── Grids de evaluación ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Escrutinio A — Mi jugador (editable) ── */}
          <div className="bg-surface border border-red-900/40 p-5 rounded-xl flex flex-col gap-4">
            <h3 className="text-sm font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: MK_RED }}>
              Escrutinio A
              <span className="text-[10px] px-2 py-0.5 rounded-full border normal-case" style={{ background: 'rgba(192,16,30,0.12)', borderColor: 'rgba(192,16,30,0.4)', color: '#f87171' }}>
                {myLabel} (Tú)
              </span>
            </h3>

            <select
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
            >
              <option value="">Seleccionar Jugador 1...</option>
              {players.map(p => {
                const isEval = evaluations.some(ev => ev.jugador?.rut === p.rut);
                return (
                  <option key={p.rut} value={p.rut}>
                    {p.nombre}{isEval ? ' ✔️ -EVALUADO-' : ''}
                  </option>
                );
              })}
            </select>

            <div className="flex flex-col gap-4">
              {EVAL_FIELDS.map((field) => (
                <div key={`p1-${field.key}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base leading-none">{field.icon}</span>
                    <label className="text-sm text-gray-300 font-medium">{field.label}</label>
                    <span className="ml-auto text-[10px] text-gray-600 italic max-w-[160px] text-right leading-tight hidden md:block">{field.tooltip}</span>
                  </div>
                  <div className="flex bg-surface-card rounded-lg border border-surface-border overflow-hidden">
                    {OPTIONS.map(opt => {
                      const isSelected = eval1[field.key] === opt;
                      let selStyle = 'bg-red-800/30 text-red-300';
                      if (isSelected && opt === 'Sí')          selStyle = 'bg-green-500/20 text-green-400';
                      if (isSelected && opt === 'No')           selStyle = 'bg-red-600/25 text-red-400';
                      if (isSelected && opt === 'Más o menos') selStyle = 'bg-yellow-500/20 text-yellow-400';
                      return (
                        <label key={opt} className={`flex-1 text-center py-2 text-xs font-semibold cursor-pointer transition-colors border-r last:border-0 border-surface-border ${isSelected ? selStyle : 'text-gray-500 hover:bg-surface-hover hover:text-gray-300'}`}>
                          <input
                            type="radio"
                            name={`p1-${field.key}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => handleEval1Change(field.key, opt)}
                            className="hidden"
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Clasificación en tiempo real */}
            {player1 && (
              <div className={`mt-2 rounded-xl border px-4 py-3 flex items-center gap-3 ${myClasif.bg}`}>
                <span className="text-2xl">{myClasif.emoji}</span>
                <div>
                  <p className={`text-sm font-bold ${myClasif.color}`}>{myClasif.label}</p>
                  <p className="text-xs text-gray-500">Puntuación: {myScore} / 12 · Rango: {myClasif.rango}</p>
                </div>
                <span className={`ml-auto w-2.5 h-2.5 rounded-full ${myClasif.dot}`} />
              </div>
            )}
          </div>

          {/* ── Escrutinio B — Jugador del compañero (solo lectura WS) ── */}
          <div className={`border p-5 rounded-xl flex flex-col gap-4 transition-all ${
            partnerOnline ? 'bg-surface border-yellow-500/30' : 'bg-surface/50 border-surface-border opacity-50'
          }`}>
            <h3 className="text-sm font-semibold text-yellow-500 tracking-widest uppercase flex items-center gap-2">
              Escrutinio B
              <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30 normal-case">
                {partnerLabel || (partnerRole === 'admin' ? 'Admin' : 'Asistente')} (Compañero)
              </span>
              {partnerOnline && (
                <span className="ml-auto text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  En Vivo
                </span>
              )}
            </h3>

            {/* Nombre del jugador del compañero */}
            <div className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              partnerOnline && partnerName
                ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-200'
                : 'bg-surface-card border-surface-border text-gray-600 italic'
            }`}>
              {partnerOnline && partnerName ? `👤 ${partnerName}` : 'Sin selección del compañero aún...'}
            </div>

            {/* Calificaciones en vivo del compañero */}
            {partnerOnline && (
              <div className="flex flex-col gap-3">
                {EVAL_FIELDS.map((field) => {
                  const val = partnerScores[field.key];
                  return (
                    <div key={`partner-${field.key}`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-base leading-none">{field.icon}</span>
                        <label className="text-xs text-gray-500 font-medium">{field.label}</label>
                      </div>
                      <div className="flex bg-surface-card rounded-lg border border-surface-border overflow-hidden opacity-80">
                        {OPTIONS.map(opt => {
                          const isSelected = val === opt;
                          let activeStyle = 'bg-yellow-500/20 text-yellow-400';
                          if (isSelected && opt === 'Sí')          activeStyle = 'bg-green-500/20 text-green-400';
                          if (isSelected && opt === 'No')           activeStyle = 'bg-red-500/20 text-red-400';
                          if (isSelected && opt === 'Más o menos')  activeStyle = 'bg-yellow-500/20 text-yellow-400';
                          return (
                            <div
                              key={opt}
                              className={`flex-1 text-center py-2 text-xs font-semibold border-r last:border-0 border-surface-border select-none ${
                                isSelected ? activeStyle : 'text-gray-600'
                              }`}
                            >
                              {isSelected && <span className="mr-0.5">●</span>}{opt}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Clasificación del compañero en vivo */}
                {player2 && (() => {
                  const pScore  = calcScore(partnerScores);
                  const pClasif = getClasificacion(pScore);
                  return (
                    <div className={`mt-1 rounded-xl border px-4 py-3 flex items-center gap-3 ${pClasif.bg}`}>
                      <span className="text-2xl">{pClasif.emoji}</span>
                      <div>
                        <p className={`text-sm font-bold ${pClasif.color}`}>{pClasif.label}</p>
                        <p className="text-xs text-gray-500">Puntuación: {pScore} / 12 · Rango: {pClasif.rango}</p>
                      </div>
                      <span className={`ml-auto w-2.5 h-2.5 rounded-full ${pClasif.dot}`} />
                    </div>
                  );
                })()}
              </div>
            )}

            {!partnerOnline && (
              <p className="text-xs text-gray-600 italic mt-auto">
                Se rellenará automáticamente cuando el {partnerRole === 'admin' ? 'Admin' : 'Asistente'} seleccione un jugador.
              </p>
            )}
          </div>
        </div>

        {/* ── Clasificación Reference Card ──────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { emoji: '🎮', label: 'Casual',   rango: 'Bronce', desc: 'Solo aprieta botones y espera usar el X-Ray.',                           pts: '0–4 pts',  bg: 'bg-orange-700/10 border-orange-600/30 text-orange-300' },
            { emoji: '🥈', label: 'Peleador', rango: 'Plata',  desc: 'Sabe defenderse un poco y conoce los poderes de su personaje.',           pts: '5–9 pts',  bg: 'bg-slate-400/10  border-slate-400/30  text-slate-200' },
            { emoji: '🥇', label: 'Experto',  rango: 'Oro',    desc: 'Muy rápido, usa el correr y no te deja caer al suelo con sus combos.',    pts: '10–12 pts', bg: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300' },
          ].map(tier => (
            <div key={tier.label} className={`rounded-xl border p-4 ${tier.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{tier.emoji}</span>
                <span className="font-bold text-sm">{tier.label}</span>
                <span className="ml-auto text-[10px] uppercase opacity-60 tracking-wider">{tier.pts}</span>
              </div>
              <p className="text-[11px] leading-snug opacity-75">{tier.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading || !player1}
            className="text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #c0101e, #7f0a15)', boxShadow: '0 4px 14px rgba(192,16,30,0.35)' }}
          >
            {isLoading ? 'Guardando...' : (isAdmin ? 'Guardar Ambos Registros' : 'Guardar Mi Evaluación')}
          </button>
        </div>
      </div>

      {/* ── Tabla de Registros ───────────────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-surface-border bg-surface flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🐉</span> Calificaciones Mortal Kombat
          </h3>
          <span className="text-xs text-gray-500">Visible sólo por Admin y Asistente</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead style={{ background: '#7f0a15', color: 'white' }}>
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-red-900">Estudiante</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-red-900">🏃 Movilidad</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-red-900">⚔️ Peligrosidad</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-red-900">⚡ Energía</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-red-900">🛡️ Defensa</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-red-900">Clasificación</th>
                {isAdmin && <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface text-sm">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                    Aún no se ha evaluado a ningún estudiante en Mortal Kombat.
                  </td>
                </tr>
              ) : evaluations.map((ev) => {
                const score  = ev.score ?? calcScore(ev);
                const clasif = getClasificacion(score);
                return (
                  <tr key={ev._id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-red-300 whitespace-nowrap">
                      {ev.jugador ? ev.jugador.nombre : 'Estudiante Eliminado'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.movilidad} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.peligrosidad} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.energia} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.defensa} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${clasif.bg} ${clasif.color}`}>
                        {clasif.emoji} {clasif.label}
                        <span className="opacity-50 text-[10px]">({score}/12)</span>
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(ev._id)}
                          className="text-red-400 hover:text-red-300 transition-colors text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  let bg = "bg-gray-500/20 text-gray-400";
  if (status === "Sí")           bg = "bg-green-500/20 text-green-400 border border-green-500/30";
  if (status === "Más o menos")  bg = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  if (status === "No")           bg = "bg-red-500/20 text-red-400 border border-red-500/30";
  return <span className={`px-2 py-1 rounded inline-flex text-xs font-semibold ${bg}`}>{status}</span>;
}
