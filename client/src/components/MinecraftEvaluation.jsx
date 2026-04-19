import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { fetchPlayers } from '../api/api';
import { getSocket } from '../api/socket';

const OPTIONS = ["Sí", "Más o menos", "No"];

const EVAL_FIELDS = [
  { key: 'controlHotbar', label: 'Control Hotbar' },
  { key: 'controlCriticos', label: 'Control Criticos' },
  { key: 'dominioPvP', label: 'Dominio en PvP' },
  { key: 'dominioClicks', label: 'Dominio Clicks (Butterfly/Drag)' },
];

const BLANK_EVAL = { controlHotbar: 'Más o menos', controlCriticos: 'Más o menos', dominioPvP: 'Más o menos', dominioClicks: 'Más o menos' };

export default function MinecraftEvaluation() {
  const { players, user, setPlayers } = useStore();
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Own slot (whoever is logged in evaluates here)
  const [player1, setPlayer1Raw] = useState('');
  const [eval1, setEval1] = useState({ ...BLANK_EVAL });

  // ── Partner slot (auto-filled via WebSocket)
  const [player2, setPlayer2] = useState('');
  const [eval2, setEval2] = useState({ ...BLANK_EVAL });
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLabel, setPartnerLabel] = useState('');
  const [partnerScores, setPartnerScores] = useState({});  // live scores from WS

  const socketRef = useRef(null);
  const isAdmin     = user?.role === 'admin';
  const isAssistant = user?.role === 'asistente';
  const isAdminOrAssistant = isAdmin || isAssistant;

  // My role label for display
  const myLabel      = isAdmin ? 'Admin' : 'Asistente';
  const partnerRole  = isAdmin ? 'asistente' : 'admin';   // who the partner IS

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket setup
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdminOrAssistant) return;

    const socket = getSocket(user.role);
    socketRef.current = socket;

    // Receive initial full state
    socket.on('eval:fullState', (state) => {
      const partnerData = state[partnerRole];
      if (partnerData?.rut) {
        setPlayer2(partnerData.rut);
        setPartnerScores(partnerData.scores || {});
        setPartnerOnline(true);
        setPartnerLabel(partnerRole === 'admin' ? 'Admin' : 'Asistente');
      }
    });

    // Receive live updates when partner changes player OR ratings
    socket.on('eval:partnerUpdate', ({ role, rut, nombre, scores }) => {
      if (role === partnerRole) {
        setPlayer2(rut || '');
        setPartnerScores(scores || {});
        setPartnerOnline(!!rut);
        setPartnerLabel(role === 'admin' ? 'Admin' : 'Asistente');
      }
    });

    return () => {
      socket.off('eval:fullState');
      socket.off('eval:partnerUpdate');
    };
  }, [isAdminOrAssistant, partnerRole, user?.role]);

  // Helper: emit current own state (player + scores)
  const emitMyState = (rut, nombre, scores) => {
    socketRef.current?.emit('eval:update', {
      role: user.role,
      rut: rut || null,
      nombre: nombre || null,
      scores,
    });
  };

  // When I change my own player selection → emit
  const setPlayer1 = (rut) => {
    setPlayer1Raw(rut);
    const p = players.find(pl => pl.rut === rut);
    emitMyState(rut, p?.nombre, eval1);
  };

  // When I change any radio → update local state AND emit
  const handleEval1Change = (key, value) => {
    const next = { ...eval1, [key]: value };
    setEval1(next);
    const p = players.find(pl => pl.rut === player1);
    emitMyState(player1, p?.nombre, next);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Data loading
  // ───────────────────────────────────────────────────────────────────────────
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
      const res = await fetch('/api/minecraft-eval');
      if (res.ok) setEvaluations(await res.json());
    } catch (e) { console.error("Error fetching evaluations", e); }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Save
  // ───────────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsLoading(true);
    const toSave = [];
    if (player1) {
      const p1Obj = players.find(p => p.rut === player1);
      toSave.push({ jugador: { rut: p1Obj.rut, nombre: p1Obj.nombre }, ...eval1 });
    }
    if (player2 && isAdmin) {
      // Only Admin saves both; assistant only saves their own
      const p2Obj = players.find(p => p.rut === player2);
      if (p2Obj) toSave.push({ jugador: { rut: p2Obj.rut, nombre: p2Obj.nombre }, ...eval2 });
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
      const res = await fetch('/api/minecraft-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations: toSave })
      });
      if (res.ok) {
        setPlayer1(''); // also emits WS clear
        setEval1({ ...BLANK_EVAL });
        setEval2({ ...BLANK_EVAL });
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
      const res = await fetch(`/api/minecraft-eval/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvaluations();
      else alert("Error al eliminar la calificación");
    } catch (e) { console.error(e); alert("Error de red"); }
  };

  if (!isAdminOrAssistant) return null;

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  const partnerPlayerObj = players.find(p => p.rut === player2);
  const partnerName = partnerPlayerObj?.nombre || '';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="bg-surface-card border border-surface-border p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-brand" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-brand-light">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Evaluación Minecraft PvP Simultánea
          </h2>

          {/* Live sync indicator */}
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
          <strong className="text-brand-light">{myLabel}</strong>: selecciona tu jugador en <em>Escrutinio A</em>.
          El <em>Escrutinio B</em> se sincroniza automáticamente con lo que evalúa tu compañero.
        </p>

        {/* Evaluation grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Escrutinio A — My player (editable) ── */}
          <div className="bg-surface border border-surface-border p-5 rounded-xl flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-brand tracking-widest uppercase flex items-center gap-2">
              Escrutinio A
              <span className="text-[10px] bg-brand/15 text-brand-light px-2 py-0.5 rounded-full border border-brand/30 normal-case">
                {myLabel} (Tú)
              </span>
            </h3>

            <select
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
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
                  <label className="text-sm text-gray-300 font-medium mb-2 block">{field.label}</label>
                  <div className="flex bg-surface-card rounded-lg border border-surface-border overflow-hidden">
                    {OPTIONS.map(opt => {
                      const isSelected = eval1[field.key] === opt;
                      return (
                        <label key={opt} className={`flex-1 text-center py-2 text-xs font-semibold cursor-pointer transition-colors border-r last:border-0 border-surface-border ${isSelected ? 'bg-brand/20 text-brand-light' : 'text-gray-500 hover:bg-surface-hover hover:text-gray-300'}`}>
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
          </div>

          {/* ── Escrutinio B — Partner's player (WS-synced) ── */}
          <div className={`border p-5 rounded-xl flex flex-col gap-4 transition-all ${
            partnerOnline
              ? 'bg-surface border-yellow-500/30'
              : 'bg-surface/50 border-surface-border opacity-50'
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

            {/* Read-only display of partner's selected player */}
            <div className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              partnerOnline && partnerName
                ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-200'
                : 'bg-surface-card border-surface-border text-gray-600 italic'
            }`}>
              {partnerOnline && partnerName
                ? `👤 ${partnerName}`
                : 'Sin selección del compañero aún...'}
            </div>

            {/* Live partner ratings — always shown when partner online */}
            {partnerOnline && (
              <div className="flex flex-col gap-3">
                {EVAL_FIELDS.map((field) => {
                  const val = partnerScores[field.key];
                  return (
                    <div key={`partner-${field.key}`}>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">{field.label}</label>
                      <div className="flex bg-surface-card rounded-lg border border-surface-border overflow-hidden opacity-80">
                        {OPTIONS.map(opt => {
                          const isSelected = val === opt;
                          let activeStyle = 'bg-yellow-500/20 text-yellow-400';
                          if (isSelected && opt === 'Sí')           activeStyle = 'bg-green-500/20 text-green-400';
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
              </div>
            )}

            {!partnerOnline && (
              <p className="text-xs text-gray-600 italic mt-auto">
                Se rellenará automáticamente cuando el {partnerRole === 'admin' ? 'Admin' : 'Asistente'} seleccione un jugador.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading || !player1}
            className="bg-brand hover:brightness-110 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-brand/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? 'Guardando...' : (isAdmin ? 'Guardar Ambos Registros' : 'Guardar Mi Evaluación')}
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-surface-border bg-surface flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Tabla de Calificaciones Almacenadas</h3>
          <span className="text-xs text-gray-500">Visible sólo por Admin y Asistente</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="bg-[#0b64be] text-white">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-[#095199]">Estudiante</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-[#095199]">Control Hotbar</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-[#095199]">Control Críticos</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-[#095199]">Dominio PvP</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold border-r border-[#095199]">Dom. Clicks</th>
                {isAdmin && <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface text-sm">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-500">Aún no se ha evaluado a ningún estudiante.</td>
                </tr>
              ) : evaluations.map((ev) => (
                <tr key={ev._id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-light whitespace-nowrap">
                    {ev.jugador ? ev.jugador.nombre : 'Estudiante Eliminado'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.controlHotbar} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.controlCriticos} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.dominioPvP} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge status={ev.dominioClicks} /></td>
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
              ))}
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
