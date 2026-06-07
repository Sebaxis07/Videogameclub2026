/**
 * MinecraftTournament.jsx — Rediseño v2
 * Liga Suiza (3 rondas) + Playoffs Doble Eliminación + Hándicap Calibrado
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getSocket } from '../api/socket';
import useStore from '../store/useStore';

const BASE = import.meta.env.VITE_API_URL || '/api';
async function api(path, opts = {}) {
  const res  = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const TIERS = {
  A: { label: 'Experto',      icon: '🔥', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  pts: '≥ 10 pts' },
  B: { label: 'Intermedio',   icon: '⚡', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', pts: '4–9 pts' },
  C: { label: 'Principiante', icon: '🌱', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  pts: '0–3 pts' },
};

const TABS = [
  { id: 'liga',      label: 'Liga Abierta', icon: '⚔️' },
  { id: 'tier',      label: 'Por Tier',     icon: '🏷️' },
  { id: 'playoffs',  label: 'Playoffs',     icon: '🏆' },
  { id: 'historial', label: 'Historial',    icon: '📜' },
  { id: 'admin',     label: 'Admin',        icon: '⚙️' },
];

const MAX_RONDAS    = 3;
const MATCH_SECONDS = 90;
const initials = n => (n || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

// ── TierBadge ─────────────────────────────────────────────────────────────────
function TierBadge({ tier, sm }) {
  const cfg = TIERS[tier] || TIERS.C;
  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded-lg shrink-0 ${sm ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'}`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {tier}
    </span>
  );
}

// ── PlayerAvatar ──────────────────────────────────────────────────────────────
function PlayerAvatar({ name, tier, xs }) {
  const cfg = TIERS[tier] || TIERS.C;
  return (
    <div
      className={`rounded-full flex items-center justify-center font-black shrink-0 border-2 ${xs ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[11px]'}`}
      style={{ background: `radial-gradient(circle, ${cfg.color}22, ${cfg.bg})`, borderColor: `${cfg.color}50`, color: cfg.color }}
    >
      {initials(name)}
    </div>
  );
}

// ── MatchTimer ────────────────────────────────────────────────────────────────
function MatchTimer() {
  const [seconds, setSeconds] = useState(MATCH_SECONDS);
  const [active, setActive]   = useState(false);
  useEffect(() => {
    if (!active || seconds <= 0) return;
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [active, seconds]);
  const low  = seconds <= 15;
  const done = seconds === 0;
  const mm   = Math.floor(seconds / 60);
  const ss   = seconds % 60;
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-black border ${
      done ? 'border-red-500/40 bg-red-500/10 text-red-400' :
      low  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' :
             'border-white/10 bg-black/30 text-white'
    }`}>
      <span>{mm}:{ss.toString().padStart(2, '0')}</span>
      <button type="button" className="text-[10px] hover:opacity-70" onClick={() => setActive(a => !a)}>
        {active ? '⏸' : '▶'}
      </button>
      <button type="button" className="text-[10px] hover:opacity-70" onClick={() => { setSeconds(MATCH_SECONDS); setActive(false); }}>↺</button>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm text-white shadow-2xl ${
      type === 'ok' ? 'bg-emerald-800' : type === 'err' ? 'bg-red-900' : 'bg-blue-900'
    }`}>
      <span>{type === 'ok' ? '✅' : type === 'err' ? '❌' : 'ℹ️'}</span>
      {msg}
    </div>
  );
}

// ── RulesPanel ────────────────────────────────────────────────────────────────
function RulesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-gray-800/60 bg-surface-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/2 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📜</span>
          <span className="text-sm font-bold text-white">Reglas del torneo</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 font-bold uppercase tracking-wider">
            Leer antes de jugar
          </span>
        </div>
        <span className={`text-gray-500 text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-gray-800/60 p-5 flex flex-col gap-5">

          {/* Tiers + Liga */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Tiers */}
            <div className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <span>🏷️</span> Sistema de Tiers
              </h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Los tiers se asignan según el puntaje del Escrutinio MC (evaluación previa, máx. 12 pts).
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { t: 'A', desc: 'Jugadores de alto nivel PvP. Reciben hándicap contra tiers inferiores.' },
                  { t: 'B', desc: 'Nivel intermedio. Hándicap leve frente al Tier A.' },
                  { t: 'C', desc: 'Recién iniciados. Sin restricciones adicionales.' },
                ].map(({ t, desc }) => {
                  const cfg = TIERS[t];
                  return (
                    <div key={t} className="flex items-start gap-3 rounded-xl p-3 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0" style={{ background: `${cfg.color}25`, color: cfg.color }}>{t}</div>
                      <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{cfg.pts}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Liga Suiza */}
            <div className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <span>⚔️</span> Liga Suiza — 3 Rondas
              </h4>
              <div className="flex flex-col gap-2.5">
                {[
                  { icon: '🎯', t: 'Puntos',           d: '3 pts por victoria · 1 pt por derrota' },
                  { icon: '🔥', t: 'Bonus por Upset',  d: '+2 pts si Tier C vence a A · +1 si C vence a B o B vence a A' },
                  { icon: '🎲', t: 'BYE automático',   d: 'Si los jugadores son impares, el de menor puntaje recibe +3 pts sin jugar' },
                  { icon: '⏱️', t: 'Duración',         d: '1 minuto y 30 segundos por partida' },
                  { icon: '🎒', t: 'Kit de ronda',     d: 'Todos los jugadores usan el mismo kit temático en cada ronda' },
                  { icon: '🚪', t: 'Joiners tardíos',  d: 'Pueden entrar hasta antes de la Ronda 4 con puntos de mediana de su tier' },
                ].map(r => (
                  <div key={r.t} className="flex gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-white">{r.t}: </span>
                      <span className="text-[11px] text-gray-400 leading-relaxed">{r.d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Playoffs + Hándicap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Playoffs DE */}
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                <span>🏆</span> Playoffs — Doble Eliminación (8 jugadores)
              </h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Clasifican los <strong className="text-white">Top 2 de cada tier</strong> (6 garantizados) + <strong className="text-white">2 wildcards</strong> con mayor puntaje. Seeds 1–8 por puntos de liga.
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  { key: 'UB', color: '#22c55e', title: 'Upper Bracket — Camino directo',   desc: 'Si ganas, avanzas. Si pierdes una vez, bajas al Lower Bracket.' },
                  { key: 'LB', color: '#ef4444', title: 'Lower Bracket — Segunda oportunidad', desc: 'Una derrota más en este bracket y quedas eliminado.' },
                  { key: 'GF', color: '#fbbf24', title: 'Gran Final',                       desc: 'Ganador del Upper vs Ganador del Lower. Sin rematch especial.' },
                ].map(b => (
                  <div key={b.key} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border" style={{ background: `${b.color}08`, borderColor: `${b.color}25` }}>
                    <span className="text-[9px] font-black mt-0.5 shrink-0" style={{ color: b.color }}>{b.key}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: b.color }}>{b.title}</p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hándicap */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <span>⚖️</span> Hándicap Calibrado (diferencia de tier)
              </h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Cuando hay diferencia de tier, el jugador superior recibe restricciones para equilibrar el combate.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { gap: 'Gap 0', eg: 'A vs A, B vs B, C vs C', color: '#9ca3af', desc: 'Sin restricciones — juego libre para ambos.' },
                  { gap: 'Gap 1', eg: 'A vs B  ·  B vs C',      color: '#60a5fa', desc: 'El jugador superior elige 1 debuff leve (3 opciones posibles).' },
                  { gap: 'Gap 2', eg: 'A vs C',                  color: '#f87171', desc: '1 debuff fuerte OBLIGATORIO + 1 debuff leve a elegir (3 opciones).' },
                ].map(h => (
                  <div key={h.gap} className="rounded-xl border border-gray-700/40 bg-gray-900/50 p-3">
                    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-black" style={{ color: h.color }}>{h.gap}</span>
                      <span className="text-[9px] text-gray-600 font-mono">{h.eg}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{h.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Normas */}
          <div className="rounded-xl border border-gray-700/30 bg-gray-900/30 px-4 py-3">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <span className="text-gray-300 font-semibold">⚡ Normas generales — </span>
              El kit de cada ronda aplica para TODOS los jugadores de esa ronda.
              &nbsp;·&nbsp;
              Los playoffs se inician automáticamente al completar la tercera ronda.
              &nbsp;·&nbsp;
              Empates en puntos se desempatan por upset bonus, luego por partidas jugadas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DueloCard ─────────────────────────────────────────────────────────────────
function DueloCard({ duelo: d, onResolve, resolving, onAfter, setToast }) {
  const [choosing, setChoosing] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const { user } = useStore();
  const isAdminOrAssistant = user?.role === 'admin' || user?.role === 'asistente';
  const j1 = d.jugador1_id;
  const j2 = d.jugador2_id;

  if (!j1 || !j2) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-gray-600 text-xs italic">
        Esperando jugadores…
      </div>
    );
  }

  const toggleProject = async () => {
    setProjecting(true);
    try {
      await api(`/mctournament/duelo/${d._id}/project`, {
        method: 'POST',
        body: JSON.stringify({ projected: !d.projected }),
      });
      await onAfter();
    } catch (e) {
      setToast({ type: 'err', msg: e.message });
    } finally {
      setProjecting(false);
    }
  };

  if (d.is_bye) {
    return (
      <div className="rounded-2xl border border-purple-500/25 bg-purple-500/8 p-4">
        <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2">BYE automático</p>
        <div className="flex items-center gap-2.5">
          <PlayerAvatar name={j1.nombre} tier={j1.grupo} />
          <TierBadge tier={j1.grupo} />
          <span className="text-sm font-bold text-white flex-1">{j1.nombre}</span>
          <span className="text-[10px] font-black text-purple-400 bg-purple-500/12 px-2 py-0.5 rounded-lg border border-purple-500/20">+3 pts</span>
        </div>
      </div>
    );
  }

  const isDone  = d.estado === 'completado';
  const winId   = d.ganador_id?._id || d.ganador_id;
  const hc      = d.handicap || {};
  const hasHc   = hc.tier_gap > 0;
  const targetId = hc.target?.toString?.() || hc.target;
  const targetName = targetId === j1._id?.toString() ? j1.nombre
    : targetId === j2._id?.toString() ? j2.nombre : null;

  const elegirDebuff = async (id) => {
    setChoosing(true);
    try {
      await api(`/mctournament/duelo/${d._id}/handicap`, { method: 'POST', body: JSON.stringify({ debuff_id: id }) });
      await onAfter();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
    finally { setChoosing(false); }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col ${isDone ? 'border-green-500/15' : 'border-green-500/20'}`}>
      <div className="px-3 py-1.5 bg-black/20 border-b border-white/5 flex items-center justify-between">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Combate</span>
        {isAdminOrAssistant && (
          <button
            type="button"
            onClick={toggleProject}
            disabled={projecting}
            className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              d.projected
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            {d.projected ? '📺 Proyectado' : '📺 Proyectar'}
          </button>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        {[j1, j2].map((j) => {
          const isW = isDone && winId === (j._id?.toString() || j._id);
          const isL = isDone && !isW;
          return (
            <button
              key={j._id}
              type="button"
              onClick={() => !isDone && !resolving && onResolve(d._id, j._id)}
              disabled={isDone || resolving}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all group ${
                isW     ? 'bg-green-500/15 border-green-400/50' :
                isL     ? 'opacity-30 border-transparent cursor-default' :
                !isDone ? 'border-white/7 hover:border-green-500/40 hover:bg-green-500/7 cursor-pointer' :
                          'border-white/6 cursor-default'
              }`}
            >
              <PlayerAvatar name={j.nombre} tier={j.grupo} />
              <TierBadge tier={j.grupo} />
              <span className={`text-sm flex-1 truncate ${isW ? 'font-black text-white' : 'font-bold text-gray-200'}`}>{j.nombre}</span>
              <div className="w-16 shrink-0 flex items-center justify-end font-mono">
                {isW ? (
                  <span className="text-green-400 font-black text-base">✓</span>
                ) : !isDone ? (
                  <span className="text-gray-700 group-hover:text-green-400/60 text-[10px] transition-colors">↩ elegir</span>
                ) : null}
              </div>
            </button>
          );
        })}

        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-gray-800/80" />
          {isDone
            ? <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">✓ Finalizado</span>
            : <><span className="text-[10px] font-black text-gray-700 tracking-widest">VS</span><MatchTimer /></>
          }
          <div className="flex-1 border-t border-gray-800/80" />
        </div>
      </div>

      {hasHc && !isDone && (
        <div className="border-t border-amber-500/15 bg-amber-500/5 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">⚖️ Hándicap · Gap {hc.tier_gap}</span>
            <span className="ml-auto text-[10px] text-gray-400">
              Castigado: <strong className="text-amber-300">{targetName || 'jugador superior'}</strong>
            </span>
          </div>
          {hc.heavy?.id && (
            <div className="rounded-xl bg-red-500/8 border border-red-500/20 px-3 py-2">
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-0.5">Obligatorio · Fuerte</p>
              <p className="text-xs font-bold text-white">{hc.heavy.nombre}</p>
              <p className="text-[10px] text-gray-400">{hc.heavy.descripcion}</p>
            </div>
          )}
          {!hc.light_chosen?.id ? (
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5">El castigado elige 1 leve:</p>
              <div className="flex flex-col gap-1.5">
                {(hc.light_options || []).map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => elegirDebuff(o.id)}
                    disabled={choosing}
                    className="text-left px-3 py-2 rounded-xl bg-blue-500/8 border border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-400/40 transition-all disabled:opacity-50"
                  >
                    <p className="text-xs font-bold text-white">{o.nombre}</p>
                    <p className="text-[10px] text-gray-400">{o.descripcion}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-blue-500/8 border border-blue-500/20 px-3 py-2">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Elegido · Leve</p>
              <p className="text-xs font-bold text-white">{hc.light_chosen.nombre}</p>
              <p className="text-[10px] text-gray-400">{hc.light_chosen.descripcion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LeagueTab ─────────────────────────────────────────────────────────────────
function LeagueTab({ snapshot, torneoId, onAfter, setToast, onJumpToPlayoffs }) {
  const [busy, setBusy]               = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const liga          = snapshot?.liga || { rondas: [] };
  const tabla         = snapshot?.tabla || [];
  const rondas        = liga.rondas || [];
  const rondaActual   = rondas[rondas.length - 1] || null;
  const rondaN        = rondaActual?.ronda || 0;
  const pendientes    = rondaActual ? rondaActual.duelos.filter(d => d.estado === 'pendiente' && !d.is_bye) : [];
  const done          = rondaActual ? rondaActual.duelos.filter(d => d.estado === 'completado' || d.is_bye).length : 0;
  const total         = rondaActual ? rondaActual.duelos.length : 0;
  const ligaCerrada   = rondaN >= MAX_RONDAS && pendientes.length === 0;
  const playoffsOn    = snapshot?.playoffs?.activo;

  const generarRonda = async () => {
    setBusy(true);
    try {
      const r = await api('/mctournament/liga/ronda', { method: 'POST', body: JSON.stringify({ torneo_id: torneoId }) });
      setToast({ type: 'ok', msg: `Ronda ${r.ronda} generada · Kit: ${r.kit?.nombre || '—'}` });
      await onAfter();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
    finally { setBusy(false); }
  };

  const resolverDuelo = async (id, winnerId) => {
    setResolvingId(id);
    try {
      const r = await api(`/mctournament/duelo/${id}/resolver`, { method: 'POST', body: JSON.stringify({ ganador_id: winnerId }) });
      if (r.upsetBonus > 0) setToast({ type: 'ok', msg: `¡UPSET! +${r.upsetBonus} pts bonus al ganador.` });
      await onAfter();
      if (r.playoffsIniciados && !r.playoffsIniciados.error) {
        setTimeout(() => {
          setToast({ type: 'ok', msg: '¡Liga completada! Playoffs iniciados automáticamente 🏆' });
          onJumpToPlayoffs?.();
        }, 800);
      }
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
    finally { setResolvingId(null); }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Round control */}
      <div className="rounded-2xl border border-green-500/25 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center gap-4 border-b border-green-500/15" style={{ background: 'rgba(34,197,94,0.04)' }}>
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ronda actual</p>
            <p className="text-2xl font-black text-white mt-0.5">
              {rondaActual ? `Ronda ${rondaN}` : 'Sin rondas aún'}
              {liga.rondasRecomendadas > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">/ {liga.rondasRecomendadas} recomendadas</span>
              )}
            </p>
            {rondaActual?.kit && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-base">{rondaActual.kit.icon}</span>
                <span className="text-xs font-bold text-white">{rondaActual.kit.nombre}</span>
                <span className="text-[10px] text-gray-500">· {rondaActual.kit.descripcion}</span>
              </div>
            )}
          </div>

          {/* Round dots */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                rondaN >= n ? 'border-green-500/70 bg-green-500/20 text-green-400' : 'border-gray-700 text-gray-600'
              }`}>
                {rondaN >= n ? '✓' : n}
              </div>
            ))}
            <span className="text-[10px] text-gray-600 ml-1 font-semibold">/ 3 rondas</span>
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-[10px] text-gray-500">{done}/{total} duelos</span>
              <div className="w-28 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all" style={{ width: `${(done / total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Action */}
          {ligaCerrada || playoffsOn ? (
            <span className="px-3 py-2 rounded-xl bg-purple-500/12 border border-purple-500/30 text-xs font-black text-purple-400">
              🏆 Liga cerrada — Playoffs en curso
            </span>
          ) : (
            <button
              type="button"
              onClick={generarRonda}
              disabled={busy || pendientes.length > 0 || rondaN >= MAX_RONDAS}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {busy ? '…' : rondaActual ? '⚔️ Nueva ronda' : '⚔️ Iniciar primera ronda'}
            </button>
          )}
        </div>
        {pendientes.length > 0 && (
          <div className="px-5 py-2 text-[11px] text-yellow-400">
            ⚠️ Termina los {pendientes.length} duelos pendientes antes de generar la siguiente ronda.
          </div>
        )}
      </div>

      {/* Current round matches */}
      {rondaActual && rondaActual.duelos.length > 0 && (
        <div className="rounded-2xl border border-blue-500/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-500/15" style={{ background: 'rgba(59,130,246,0.04)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Duelos — Ronda {rondaN}</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {rondaActual.duelos.map(d => (
              <DueloCard key={d._id} duelo={d} onResolve={resolverDuelo} resolving={resolvingId === d._id} onAfter={onAfter} setToast={setToast} />
            ))}
          </div>
        </div>
      )}

      {/* Standings */}
      <div className="rounded-2xl border border-purple-500/20 bg-surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-purple-500/15">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Tabla de posiciones</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/4">
                {['#', 'Jugador', 'Tier', 'Pts', 'V', 'D', 'Upset', 'Racha', 'Rival. (BH)', 'PJ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-600 font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.map((j, i) => (
                <tr key={j._id} className="border-b border-white/3 hover:bg-white/1 transition-colors">
                  <td className="px-4 py-3 text-sm font-black" style={{ color: i < 3 ? '#fbbf24' : '#4b5563' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={j.nombre} tier={j.grupo} />
                      <span className="text-sm font-bold text-gray-100">{j.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={j.grupo} /></td>
                  <td className="px-4 py-3 text-sm font-black text-white">{Number(j.puntos_liga || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td className="px-4 py-3 text-xs font-black text-green-400">{j.wins_liga || 0}</td>
                  <td className="px-4 py-3 text-xs font-black text-red-400">{j.losses_liga || 0}</td>
                  <td className="px-4 py-3 text-xs font-black text-amber-400">{j.upset_bonus ? `+${j.upset_bonus}` : '—'}</td>
                  <td className="px-4 py-3 text-xs font-black text-orange-400">{j.racha_liga ? `🔥 ${j.racha_liga}` : '—'}</td>
                  <td className="px-4 py-3 text-xs font-black text-purple-400 font-mono">{Number(j.buchholz_score || 0).toFixed(2).replace(/\.00$/, '')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{j.partidas_liga || 0}</td>
                </tr>
              ))}
              {tabla.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-600 italic">No hay jugadores. Agrega desde el tab Admin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── TierTab ───────────────────────────────────────────────────────────────────
function TierTab({ snapshot }) {
  const porTier = snapshot?.porTier || { A: [], B: [], C: [] };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {['A', 'B', 'C'].map(t => {
        const cfg  = TIERS[t];
        const list = porTier[t] || [];
        return (
          <div key={t} className="rounded-2xl border overflow-hidden" style={{ borderColor: `${cfg.color}35` }}>
            <div className="px-4 py-3 flex items-center gap-2.5 border-b" style={{ background: cfg.bg, borderColor: `${cfg.color}25` }}>
              <span className="text-xl">{cfg.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-black" style={{ color: cfg.color }}>Tier {t} — {cfg.label}</p>
                <p className="text-[10px] text-gray-500">{cfg.pts} en escrutinio</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                {list.length}
              </span>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
              {list.map((j, i) => {
                const top = i < 2;
                return (
                  <div key={j._id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${!top ? 'opacity-55' : ''}`}
                    style={{ background: top ? `${cfg.color}10` : 'rgba(255,255,255,0.02)', borderColor: top ? `${cfg.color}30` : 'rgba(255,255,255,0.04)' }}>
                    <span className="text-sm font-black w-5 text-center shrink-0" style={{ color: top ? cfg.color : '#4b5563' }}>{i + 1}</span>
                    <PlayerAvatar name={j.nombre} tier={t} />
                    <span className="text-xs font-bold text-white flex-1">{j.nombre}</span>
                    <span className="text-xs font-black text-white">{Number(j.puntos_liga || 0).toFixed(2).replace(/\.00$/, '')} pts</span>
                    {top && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider" style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                        playoffs
                      </span>
                    )}
                  </div>
                );
              })}
              {list.length === 0 && <p className="text-xs text-gray-600 italic text-center py-4">Sin jugadores</p>}
            </div>
            <div className="px-4 py-2 text-center text-[10px] text-gray-600 border-t" style={{ borderColor: `${cfg.color}15` }}>
              Top 2 → clasifican a playoffs garantizados
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── BracketDuelo ──────────────────────────────────────────────────────────────
function BracketDuelo({ d, onResolve, resolving, label, onAfter, setToast }) {
  const [projecting, setProjecting] = useState(false);
  const { user } = useStore();
  const isAdminOrAssistant = user?.role === 'admin' || user?.role === 'asistente';
  const j1     = d.jugador1_id;
  const j2     = d.jugador2_id;
  const isDone = d.estado === 'completado';
  const winId  = d.ganador_id?._id || d.ganador_id;
  const canPlay = j1 && j2 && !isDone;

  const toggleProject = async () => {
    if (!onAfter) return;
    setProjecting(true);
    try {
      await api(`/mctournament/duelo/${d._id}/project`, {
        method: 'POST',
        body: JSON.stringify({ projected: !d.projected }),
      });
      await onAfter();
    } catch (e) {
      if (setToast) setToast({ type: 'err', msg: e.message });
    } finally {
      setProjecting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/7 bg-black/50 overflow-hidden min-w-[200px]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 bg-black/20">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          {isAdminOrAssistant && j1 && j2 && (
            <button
              type="button"
              onClick={toggleProject}
              disabled={projecting}
              className={`text-[10px] font-black uppercase tracking-wider flex items-center justify-center w-5 h-5 rounded transition-all ${
                d.projected
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                  : 'bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10'
              }`}
              title="Proyectar Duelo"
            >
              📺
            </button>
          )}
          {canPlay && <MatchTimer />}
        </div>
      </div>
      <div className="p-2 flex flex-col gap-1">
        {[j1, j2].map((j, idx) => {
          const win = j && (winId === j._id || winId === j._id?.toString());
          const isL = isDone && !win;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => j && j1 && j2 && !isDone && onResolve(d._id, j._id)}
              disabled={!j || !j1 || !j2 || isDone || resolving}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all group ${
                win     ? 'bg-green-500/15 border-green-400/50' :
                isL     ? 'opacity-30 border-transparent cursor-default' :
                canPlay ? 'border-white/7 hover:border-green-500/40 hover:bg-green-500/7 cursor-pointer' :
                          'border-white/5 cursor-default'
              }`}
            >
              {j ? (
                <>
                  <PlayerAvatar name={j.nombre} tier={j.grupo} xs />
                  <TierBadge tier={j.grupo} sm />
                  <span className={`text-xs flex-1 truncate ${win ? 'font-black text-white' : 'font-bold text-gray-300'}`}>{j.nombre}</span>
                  {j.bracket_seed && <span className="text-[9px] text-gray-600 mr-1">#{j.bracket_seed}</span>}
                  <div className="w-4 shrink-0 flex items-center justify-end">
                    {win && <span className="text-green-400 text-sm">✓</span>}
                  </div>
                </>
              ) : (
                <span className="text-xs italic text-gray-600">—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PlayoffsTab ───────────────────────────────────────────────────────────────
function PlayoffsTab({ snapshot, torneoId, onAfter, setToast }) {
  const [busy, setBusy]           = useState(false);
  const [resolving, setResolving] = useState(null);
  const po = snapshot?.playoffs || { bracket: { UB: [], LB: [], GF: [] }, activo: false };

  const iniciarPlayoffs = async () => {
    if (!window.confirm('¿Cerrar liga y generar bracket? Los jugadores no podrán unirse más.')) return;
    setBusy(true);
    try {
      const r = await api('/mctournament/playoffs/iniciar', { method: 'POST', body: JSON.stringify({ torneo_id: torneoId }) });
      setToast({ type: 'ok', msg: `Playoffs iniciados con ${r.clasificados.length} jugadores` });
      await onAfter();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
    finally { setBusy(false); }
  };

  const resolverDuelo = async (id, winnerId) => {
    setResolving(id);
    try {
      await api(`/mctournament/duelo/${id}/resolver`, { method: 'POST', body: JSON.stringify({ ganador_id: winnerId }) });
      await onAfter();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
    finally { setResolving(null); }
  };

  if (!po.activo) {
    return (
      <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-10 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h3 className="text-xl font-black text-white mb-2">Playoffs aún no iniciados</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
          Al terminar las rondas de Liga, cierra la fase para clasificar a
          <strong className="text-white"> Top 2 por tier + 2 wildcards</strong> (8 jugadores)
          y generar el bracket de doble eliminación.
        </p>
        <button
          type="button"
          onClick={iniciarPlayoffs}
          disabled={busy}
          className="px-6 py-3 rounded-xl font-black text-white text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-all"
        >
          {busy ? '…' : '🏆 Cerrar Liga e iniciar Playoffs'}
        </button>
      </div>
    );
  }

  const UB = po.bracket?.UB || [];
  const LB = po.bracket?.LB || [];
  const GF = po.bracket?.GF || [];
  const ubByRound = UB.reduce((a, d) => { (a[d.bracket_round] ||= []).push(d); return a; }, {});
  const lbByRound = LB.reduce((a, d) => { (a[d.bracket_round] ||= []).push(d); return a; }, {});

  const BracketPanel = ({ title, subtitle, accentColor, byRound, prefix, empty }) => (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${accentColor}35` }}>
      <div className="px-5 py-4 border-b" style={{ background: `${accentColor}06`, borderColor: `${accentColor}20` }}>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>{title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-4 flex gap-4 overflow-x-auto">
        {Object.keys(byRound).sort().map(r => (
          <div key={r} className="flex flex-col gap-2 shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 px-0.5">{prefix} Ronda {r}</p>
            {byRound[r].map(d => (
              <BracketDuelo key={d._id} d={d} onResolve={resolverDuelo} resolving={resolving === d._id} label={`Match #${d.bracket_slot}`} onAfter={onAfter} setToast={setToast} />
            ))}
          </div>
        ))}
        {Object.keys(byRound).length === 0 && <p className="text-sm text-gray-600 italic py-4">{empty}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <BracketPanel
        title="UB · Upper Bracket"
        subtitle="Pierdes una vez → bajas al Lower. Ganas todo → vas directo a la Gran Final."
        accentColor="#22c55e"
        byRound={ubByRound}
        prefix="UB"
        empty="Sin matches en el Upper Bracket."
      />
      <BracketPanel
        title="LB · Lower Bracket"
        subtitle="Segunda oportunidad. Una derrota más en este bracket y quedas eliminado."
        accentColor="#ef4444"
        byRound={lbByRound}
        prefix="LB"
        empty="Sin matches en el Lower Bracket."
      />
      {GF.length > 0 && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#fbbf2490', background: 'rgba(251,191,36,0.04)' }}>
          <div className="px-5 py-4 border-b border-yellow-500/15">
            <p className="text-xs font-black uppercase tracking-widest text-yellow-400">👑 Gran Final</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Ganador del Upper Bracket vs Ganador del Lower Bracket.</p>
          </div>
          <div className="p-6 flex justify-center">
            {GF.map(d => (
              <BracketDuelo key={d._id} d={d} onResolve={resolverDuelo} resolving={resolving === d._id} label="Gran Final" onAfter={onAfter} setToast={setToast} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HistorialTab ──────────────────────────────────────────────────────────────
function HistorialTab({ snapshot }) {
  const rondas = snapshot?.liga?.rondas || [];
  if (rondas.length === 0) {
    return <div className="text-center text-gray-600 italic py-12">Aún no hay rondas registradas.</div>;
  }
  return (
    <div className="flex flex-col gap-3">
      {[...rondas].reverse().map(r => (
        <div key={r.ronda} className="rounded-2xl border border-blue-500/20 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-blue-500/15" style={{ background: 'rgba(59,130,246,0.04)' }}>
            <span className="text-2xl">{r.kit?.icon || '⚔️'}</span>
            <div className="flex-1">
              <p className="text-sm font-black text-white">Ronda {r.ronda} · {r.kit?.nombre || 'Sin kit'}</p>
              <p className="text-[10px] text-gray-500">{r.kit?.descripcion}</p>
            </div>
            <span className="text-[10px] text-gray-500">{r.duelos.length} duelos</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {r.duelos.map(d => {
              const j1 = d.jugador1_id, j2 = d.jugador2_id;
              const winId = d.ganador_id?._id || d.ganador_id;
              if (!j1 || !j2) return null;
              if (d.is_bye) {
                return (
                  <div key={d._id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/8 border border-purple-500/20">
                    <span className="text-[9px] font-black text-purple-400 uppercase shrink-0">BYE</span>
                    <span className="text-xs font-bold text-white flex-1">{j1.nombre}</span>
                    <span className="text-[9px] text-purple-400">+3 pts</span>
                  </div>
                );
              }
              const w1 = winId === (j1._id?.toString() || j1._id);
              const w2 = winId === (j2._id?.toString() || j2._id);
              return (
                <div key={d._id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/2 border border-white/5">
                  <span className={`text-xs font-bold flex-1 ${w1 ? 'text-green-400' : 'text-gray-500'}`}>{j1.nombre}</span>
                  <span className="text-[9px] text-gray-700 font-black">vs</span>
                  <span className={`text-xs font-bold flex-1 text-right ${w2 ? 'text-green-400' : 'text-gray-500'}`}>{j2.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MCInitModal ───────────────────────────────────────────────────────────────
function MCInitModal({ isOpen, onClose, onConfirm }) {
  const [tipo, setTipo] = useState('real');
  const [jugadores, setJugadores] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api('/minecraft-eval').then(data => {
        setJugadores(data);
        // Torneo real: todos marcados por defecto
        setSelectedIds(data.map(j => j._id));
        setTipo('real');
      }).catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleTipoChange = (newTipo) => {
    setTipo(newTipo);
    if (newTipo === 'real') {
      setSelectedIds(jugadores.map(j => j._id));
    } else {
      setSelectedIds([]);
    }
  };

  const togglePlayer = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(r => r !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const tierLabel = { A: '🔥 Experto', B: '⚡ Intermedio', C: '🌱 Principiante' };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-gray-800" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, transparent 100%)' }}>
          <h2 className="text-xl font-black text-white">Iniciar Torneo Minecraft</h2>
          <p className="text-sm text-gray-400 mt-1">Selecciona el modo y confirma los asistentes</p>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Tipo selector */}
          <div className="flex gap-2">
            <button
              onClick={() => handleTipoChange('real')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                tipo === 'real'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'
              }`}
            >
              🏆 Torneo Real
            </button>
            <button
              onClick={() => handleTipoChange('practica')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                tipo === 'practica'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'
              }`}
            >
              🎮 Práctica
            </button>
          </div>

          {/* Descripción del modo */}
          <p className="text-[11px] rounded-xl px-3 py-2 border text-center leading-relaxed" style={{
            background: tipo === 'real' ? 'rgba(34,197,94,0.05)' : 'rgba(59,130,246,0.05)',
            borderColor: tipo === 'real' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
            color: tipo === 'real' ? '#86efac' : '#93c5fd',
          }}>
            {tipo === 'real'
              ? '✅ Torneo oficial — todos los jugadores están marcados. Desmarca a los que no vinieron.'
              : '🎮 Práctica — nadie marcado. Selecciona solo a los que están presentes.'}
          </p>

          {/* Lista de jugadores */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Jugadores a incluir ({selectedIds.length} / {jugadores.length})
              </span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(jugadores.map(j => j._id))} className="text-[10px] text-green-400 hover:text-green-300 font-bold transition-colors">Todos</button>
                <span className="text-gray-700">·</span>
                <button onClick={() => setSelectedIds([])} className="text-[10px] text-gray-500 hover:text-gray-300 font-bold transition-colors">Ninguno</button>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-6">Cargando jugadores...</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {jugadores.length === 0 && <p className="text-xs text-gray-500 italic py-4 text-center">No hay jugadores evaluados en el sistema.</p>}
                {jugadores.map(ev => {
                  const selected = selectedIds.includes(ev._id);
                  const tierCfg = TIERS[ev.grupo] || TIERS.C;
                  return (
                    <label
                      key={ev._id}
                      onClick={() => togglePlayer(ev._id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        selected
                          ? 'border'
                          : 'bg-transparent border border-transparent hover:bg-white/5'
                      }`}
                      style={selected ? { background: `${tierCfg.color}10`, borderColor: `${tierCfg.color}35` } : {}}
                    >
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all"
                        style={selected ? { background: tierCfg.color, borderColor: tierCfg.color } : { background: 'rgba(0,0,0,0.5)', borderColor: '#4b5563' }}
                      >
                        {selected && <span className="text-black text-xs font-black">✓</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TierBadge tier={ev.grupo} />
                        <span className={`text-sm font-bold truncate ${selected ? 'text-white' : 'text-gray-400'}`}>
                          {ev.jugador?.nombre || ev.nombre || 'Sin nombre'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold shrink-0" style={{ color: tierCfg.color }}>
                        {tierLabel[ev.grupo] || ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-between items-center gap-3">
          <span className="text-xs text-gray-500">
            {selectedIds.length < 2 && '⚠️ Mínimo 2 jugadores para iniciar'}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(jugadores.filter(j => selectedIds.includes(j._id)))}
              disabled={selectedIds.length < 2 || loading}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all"
            >
              Iniciar con {selectedIds.length} jugador{selectedIds.length !== 1 ? 'es' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AdminTab ──────────────────────────────────────────────────────────────────
function AdminTab({ snapshot, torneoId, onAfter, setToast, onOpenInitModal }) {
  const [form, setForm]     = useState({ nombre: '', grupo: 'C' });
  const [adding, setAdding] = useState(false);
  const jugadores = snapshot?.jugadores || [];

  const addPlayer = async () => {
    if (!form.nombre.trim()) return;
    setAdding(true);
    try {
      const r = await api('/mctournament/add-player', { method: 'POST', body: JSON.stringify({ torneo_id: torneoId, ...form }) });
      setToast({ type: 'ok', msg: `${form.nombre} añadido con ${r.puntosIniciales} pts` });
      setForm({ nombre: '', grupo: 'C' });
      await onAfter();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
    finally { setAdding(false); }
  };

  const removePlayer = async (id) => {
    if (!window.confirm('¿Eliminar jugador del torneo?')) return;
    try {
      await api(`/mctournament/player/${id}`, { method: 'DELETE' });
      await onAfter();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Import */}
        <div className="rounded-2xl border border-blue-500/25 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-blue-500/15" style={{ background: 'rgba(59,130,246,0.05)' }}>
            <p className="text-sm font-black text-white">📥 Importar desde Escrutinio MC</p>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Importa los jugadores del Escrutinio MC. Podrás elegir si es torneo real o práctica y seleccionar quién está presente.
            </p>
            <button
              type="button"
              onClick={onOpenInitModal}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all w-fit"
            >
              📥 Iniciar Torneo
            </button>
          </div>
        </div>

        {/* Add player */}
        <div className="rounded-2xl border border-green-500/25 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-green-500/15" style={{ background: 'rgba(34,197,94,0.05)' }}>
            <p className="text-sm font-black text-white">➕ Añadir jugador manualmente</p>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <input
              placeholder="Nombre del jugador…"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              className="w-full bg-black/50 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500/50 transition-colors"
            />
            <div className="grid grid-cols-3 gap-2">
              {['A', 'B', 'C'].map(t => {
                const sel = form.grupo === t;
                const cfg = TIERS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, grupo: t }))}
                    className="py-2 rounded-xl border text-xs font-black transition-all"
                    style={{ background: sel ? cfg.bg : 'transparent', borderColor: sel ? cfg.border : '#333', color: sel ? cfg.color : '#555' }}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addPlayer}
              disabled={adding || !form.nombre.trim()}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 transition-all"
            >
              {adding ? '…' : '+ Añadir jugador'}
            </button>
            <p className="text-[10px] text-gray-600">Joiners entran con la mediana de puntos de su tier. Bloqueado tras la ronda 4.</p>
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="rounded-2xl border border-gray-700/40 overflow-hidden bg-surface-card">
        <div className="px-5 py-3.5 border-b border-gray-700/40">
          <p className="text-sm font-black text-white">Lista de jugadores ({jugadores.length})</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {jugadores.map(j => (
            <div key={j._id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/2 border border-white/5">
              <PlayerAvatar name={j.nombre} tier={j.grupo} />
              <TierBadge tier={j.grupo} />
              <span className="text-sm font-bold text-white flex-1 truncate">{j.nombre}</span>
              <button
                type="button"
                onClick={() => removePlayer(j._id)}
                className="text-red-400 hover:text-red-300 transition-colors text-sm shrink-0"
                title="Eliminar"
              >✕</button>
            </div>
          ))}
          {jugadores.length === 0 && (
            <p className="text-sm text-gray-600 italic py-4 col-span-full text-center">No hay jugadores. Importa evaluaciones o agrega manual.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SpectatorView (Modo Espectador a Pantalla Completa) ────────────────────────
function SpectatorView({ snapshot, onAfter, onClose, settings }) {
  const [seconds, setSeconds] = useState(90);
  const [active, setActive] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [flawlessActive, setFlawlessActive] = useState(false);
  const [showSpectatorQr, setShowSpectatorQr] = useState(false);
  const { user } = useStore();
  const isAdminOrAssistant = user?.role === 'admin' || user?.role === 'asistente';

  // Obtener duelos proyectados de Liga y de Playoffs
  const ligaRondas = snapshot?.liga?.rondas || [];
  const playoffBracket = snapshot?.playoffs?.bracket || { UB: [], LB: [], GF: [] };
  
  const allDuelos = [];
  ligaRondas.forEach(r => allDuelos.push(...(r.duelos || [])));
  allDuelos.push(...(playoffBracket.UB || []));
  allDuelos.push(...(playoffBracket.LB || []));
  allDuelos.push(...(playoffBracket.GF || []));

  const projectedDuelos = allDuelos.filter(d => d.projected === true && d.estado !== 'bye');
  const upcomingDuelos = allDuelos.filter(d => d.estado === 'pendiente' && d.projected !== true && d.jugador1_id && d.jugador2_id && d.estado !== 'bye');

  const [transitionSeconds, setTransitionSeconds] = useState(0);
  const [showPlayoffIntro, setShowPlayoffIntro] = useState(false);
  const [playoffIntroStep, setPlayoffIntroStep] = useState('title'); // 'title' | 'showcase' | 'grid' | 'bracket'
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcaseAutoPlay, setShowcaseAutoPlay] = useState(true);
  const [selectedDetailPlayer, setSelectedDetailPlayer] = useState(null);
  const [acknowledgedLB, setAcknowledgedLB] = useState(false);
  const [acknowledgedGF, setAcknowledgedGF] = useState(false);
  const [dismissedChampion, setDismissedChampion] = useState(false);

  // Historial de combates de un jugador
  const getPlayerHistory = (player) => {
    if (!player) return [];
    const history = [];
    
    // Obtener todos los duelos completados de liga
    const ligaDuelos = [];
    (snapshot?.liga?.rondas || []).forEach(r => {
      (r.duelos || []).forEach(d => {
        if (d.estado === 'completado') {
          ligaDuelos.push(d);
        }
      });
    });

    ligaDuelos.forEach(d => {
      const isJ1 = d.jugador1_id?._id?.toString() === player._id?.toString() || d.jugador1_id === player._id;
      const isJ2 = d.jugador2_id?._id?.toString() === player._id?.toString() || d.jugador2_id === player._id;
      if (isJ1 || isJ2) {
        const opponent = isJ1 ? d.jugador2_id : d.jugador1_id;
        const won = d.ganador_id?._id?.toString() === player._id?.toString() || d.ganador_id === player._id;
        history.push({
          ronda: d.ronda_liga,
          opponent: opponent?.nombre || 'Bye',
          opponentTier: opponent?.grupo || '-',
          won,
          kit: d.kit?.nombre || 'Desconocido',
          icon: d.kit?.icon || '⚔️'
        });
      }
    });

    return history.sort((a, b) => a.ronda - b.ronda);
  };

  // Determinar si la ronda de liga actual ha terminado
  const currentRound = snapshot?.liga?.rondas?.[snapshot?.liga?.rondas?.length - 1] || null;
  const currentRoundNum = currentRound?.ronda || 0;
  const roundDuelos = currentRound?.duelos || [];
  const allCompletedInRound = roundDuelos.length > 0 && roundDuelos.every(d => d.estado === 'completado' || d.is_bye);
  const showNextRoundButton = allCompletedInRound && !snapshot?.playoffs?.activo;

  const projectedDuelosKey = projectedDuelos.map(d => `${d._id}-${d.estado}`).join(',');

  // Detectar cuando todos los duelos proyectados están completados para activar la transición
  useEffect(() => {
    if (showNextRoundButton) {
      setTransitionSeconds(0);
      return;
    }
    const allDone = projectedDuelos.length > 0 && projectedDuelos.every(d => d.estado === 'completado');
    if (allDone) {
      setTransitionSeconds(15);
    } else {
      setTransitionSeconds(0);
    }
  }, [projectedDuelosKey, showNextRoundButton]);

  // Restar el segundero de transición
  useEffect(() => {
    if (transitionSeconds <= 0) return;
    const intervalId = setInterval(() => {
      setTransitionSeconds(s => s - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [transitionSeconds]);

  // Inyectar estilos CSS para animaciones de la presentación de playoffs y confeti
  useEffect(() => {
    const styleId = "mc-playoffs-reveal-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes mcFadeScale {
        0% { opacity: 0; transform: scale(0.85) translateY(10px); filter: brightness(2); }
        50% { filter: brightness(1.3); }
        100% { opacity: 1; transform: scale(1) translateY(0); filter: brightness(1); }
      }
      .animate-reveal-card {
        animation: mcFadeScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes fall {
        0% { transform: translateY(-20px) rotate(0deg); }
        100% { transform: translateY(105vh) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Resetear estados dismiss cuando cambia el estado del torneo
  useEffect(() => {
    if (!snapshot?.campeon) {
      setDismissedChampion(false);
    }
  }, [snapshot?.campeon]);

  // Si no hay duelos proyectados de LB o GF, restablecer sus avisos
  useEffect(() => {
    const hasLB = projectedDuelos.some(d => d.bracket_side === 'LB');
    if (!hasLB) setAcknowledgedLB(false);
    
    const hasGF = projectedDuelos.some(d => d.bracket_side === 'GF' && d.estado !== 'completado');
    if (!hasGF) setAcknowledgedGF(false);
  }, [projectedDuelosKey]);

  // Activar intro de playoffs automáticamente al iniciar playoffs
  const playoffsActivo = snapshot?.playoffs?.activo;
  useEffect(() => {
    if (playoffsActivo) {
      const UB = snapshot?.playoffs?.bracket?.UB || [];
      const LB = snapshot?.playoffs?.bracket?.LB || [];
      const GF = snapshot?.playoffs?.bracket?.GF || [];
      const anyPlayed = [...UB, ...LB, ...GF].some(d => d.estado === 'completado');
      if (!anyPlayed && !showPlayoffIntro) {
        setShowPlayoffIntro(true);
        setPlayoffIntroStep('title');
        setShowcaseIndex(0);
      }
    }
  }, [playoffsActivo]); // Only watch playoffsActivo changing, preventing snapshot polling loops from forcing 'title'

  // Lista de finalistas (si no han empezado playoffs, autogenera los 8 mejores de liga para la presentación)
  let finalistas = (snapshot?.tabla || [])
    .filter(j => j.bracket_seed > 0)
    .sort((a, b) => a.bracket_seed - b.bracket_seed);

  if (finalistas.length === 0 && (snapshot?.tabla || []).length > 0) {
    finalistas = (snapshot?.tabla || [])
      .slice(0, 8)
      .map((j, idx) => ({
        ...j,
        bracket_seed: idx + 1,
        clasificacion_tipo: idx < 6 ? 'tier_top2' : 'wildcard'
      }));
  }

  // Lista invertida para presentar del seed 8 al seed 1 (espectáculo in crescendo)
  const showcaseFinalists = [...finalistas].reverse();

  // Temporizador de auto-revelación del showcase (6s por jugador)
  useEffect(() => {
    if (!showPlayoffIntro || playoffIntroStep !== 'showcase' || !showcaseAutoPlay) return;
    if (showcaseIndex >= showcaseFinalists.length) {
      setPlayoffIntroStep('grid');
      return;
    }
    const timer = setTimeout(() => {
      if (showcaseIndex < showcaseFinalists.length - 1) {
        setShowcaseIndex(prev => prev + 1);
      } else {
        setPlayoffIntroStep('grid');
      }
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [showPlayoffIntro, playoffIntroStep, showcaseIndex, showcaseAutoPlay, showcaseFinalists.length]);

  // Omitir tiempo de transición (admin/asistente)
  const skipTransition = async () => {
    setTransitionSeconds(0);
    try {
      await api('/mctournament/project/skip-transition', {
        method: 'POST',
        body: JSON.stringify({ torneo_id: snapshot.torneo_id })
      });
      if (onAfter) await onAfter();
    } catch (e) {
      console.error("Error skipping transition:", e);
    }
  };

  // Iniciar siguiente ronda
  const iniciarSiguienteRonda = async () => {
    try {
      if (currentRoundNum < 3) {
        await api('/mctournament/liga/ronda', {
          method: 'POST',
          body: JSON.stringify({ torneo_id: snapshot.torneo_id })
        });
      } else {
        await api('/mctournament/playoffs/iniciar', {
          method: 'POST',
          body: JSON.stringify({ torneo_id: snapshot.torneo_id })
        });
      }
      if (onAfter) await onAfter();
    } catch (e) {
      console.error("Error iniciando siguiente fase:", e);
    }
  };

  // Sincronización mediante WebSockets
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleSync = (state) => {
      if (state.running) {
        const elapsed = Math.floor((Date.now() - state.lastUpdate) / 1000);
        setSeconds(Math.max(0, state.seconds - elapsed));
        setActive(true);
      } else {
        setSeconds(state.seconds);
        setActive(false);
      }
    };

    const handleControl = (data) => {
      if (data.action === 'start') {
        setSeconds(data.seconds);
        setActive(true);
      } else if (data.action === 'pause') {
        setSeconds(data.seconds);
        setActive(false);
      } else if (data.action === 'reset') {
        setSeconds(data.seconds || 90);
        setActive(false);
      }
    };

    socket.on('mc_timer:sync', handleSync);
    socket.on('mc_timer:control', handleControl);
    socket.emit('mc_timer:request_sync');

    return () => {
      socket.off('mc_timer:sync', handleSync);
      socket.off('mc_timer:control', handleControl);
    };
  }, []);

  // Temporizador local
  useEffect(() => {
    if (!active || seconds <= 0) return;
    const intervalId = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setActive(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [active, seconds]);

  // Enviar control de timer
  const sendTimerControl = (action, secs) => {
    const socket = getSocket();
    if (socket && isAdminOrAssistant) {
      socket.emit('mc_timer:control', { action, seconds: secs });
    }
    if (action === 'start') {
      setActive(true);
    } else if (action === 'pause') {
      setActive(false);
    } else if (action === 'reset') {
      setSeconds(secs);
      setActive(false);
    }
  };

  // Salir con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Resolver Duelo
  const resolverDuelo = async (id, winnerId) => {
    if (!isAdminOrAssistant || resolvingId) return;
    setResolvingId(id);
    try {
      await api(`/mctournament/duelo/${id}/resolver`, {
        method: 'POST',
        body: JSON.stringify({
          ganador_id: winnerId,
          remaining_seconds: seconds,
          flawless: flawlessActive
        })
      });
      setFlawlessActive(false);
      if (onAfter) await onAfter();
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingId(null);
    }
  };

  // Elegir Debuff Leve
  const elegirDebuff = async (dueloId, debuffId) => {
    if (!isAdminOrAssistant) return;
    try {
      await api(`/mctournament/duelo/${dueloId}/handicap`, {
        method: 'POST',
        body: JSON.stringify({ debuff_id: debuffId })
      });
      if (onAfter) await onAfter();
    } catch (e) {
      console.error(e);
    }
  };

  const done = seconds === 0;
  const low = seconds <= 15;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

  const renderBigAvatar = (name, tier) => {
    const cfg = TIERS[tier] || TIERS.C;
    const initialsStr = initials(name);
    return (
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center font-black text-xl shrink-0 border-4 shadow-lg transition-transform duration-300 group-hover:scale-110 select-none"
        style={{
          background: `radial-gradient(circle, ${cfg.color}33, ${cfg.bg})`,
          borderColor: cfg.color,
          color: cfg.color,
          boxShadow: `0 0 25px ${cfg.color}33`
        }}
      >
        {initialsStr}
      </div>
    );
  };

  const renderDuelDetail = (d) => {
    if (!d) return null;
    const j1 = d.jugador1_id;
    const j2 = d.jugador2_id;
    const isDone = d.estado === 'completado';
    const winId = d.ganador_id?._id || d.ganador_id;
    const hc = d.handicap || {};
    const hasHc = hc.tier_gap > 0;
    const targetId = hc.target?.toString?.() || hc.target;
    const targetName = targetId === j1?._id?.toString() ? j1.nombre
      : targetId === j2?._id?.toString() ? j2.nombre : null;

    const j1Won = isDone && winId === (j1?._id?.toString() || j1?._id);
    const j2Won = isDone && winId === (j2?._id?.toString() || j2?._id);

    return (
      <div className="w-full max-w-lg bg-black/65 rounded-[32px] border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col p-6 sm:p-8 mx-auto">
        {/* Glow de fondo dinámico según el estado del duelo */}
        <div className={`absolute -inset-20 bg-gradient-to-br from-green-500/10 to-transparent blur-[120px] pointer-events-none transition-opacity duration-1000 ${
          isDone ? 'from-green-500/20' : 'from-emerald-500/5'
        }`} />

        {/* Header del combate */}
        <div className="flex justify-between items-center mb-6 z-10 shrink-0">
          <span className="text-[11px] font-black tracking-[0.2em] text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/35 uppercase font-mono">
            {d.bracket_side ? `${d.bracket_side} · Match #${d.bracket_slot}` : `Liga Suiza · Ronda ${d.ronda_liga}`}
          </span>
          {d.kit?.nombre && (
            <span className="text-[11px] font-bold text-gray-300 bg-white/5 px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10 shadow-sm font-mono select-none">
              <span className="text-base">{d.kit.icon}</span>
              <span>Kit: {d.kit.nombre}</span>
            </span>
          )}
        </div>

        {/* Flawless Victory Toggle for Admin/Assistant */}
        {!isDone && isAdminOrAssistant && (
          <div className="mb-5 z-10 flex justify-center shrink-0">
            <button
              onClick={() => setFlawlessActive(prev => !prev)}
              className={`w-full py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 select-none shadow-[0_0_20px_rgba(245,158,11,0.05)] ${
                flawlessActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              ⚡ {flawlessActive ? 'IMPECABLE ACTIVADO (+0.30 pts)' : 'MARCAR COMO VICTORIA IMPECABLE (OPCIONAL)'}
            </button>
          </div>
        )}

        {/* Jugadores */}
        <div className="flex flex-col justify-center gap-5 z-10 my-auto min-h-0">
          {/* Jugador 1 */}
          <div
            onClick={() => !isDone && isAdminOrAssistant && resolverDuelo(d._id, j1._id)}
            className={`flex items-center gap-5 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
              isDone 
                ? j1Won 
                  ? 'bg-green-500/10 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]' 
                  : 'opacity-25 border-transparent'
                : isAdminOrAssistant
                  ? 'border-white/5 bg-white/5 hover:border-green-500/50 hover:bg-green-500/10 cursor-pointer shadow-md'
                  : 'border-white/5 bg-white/5'
            }`}
          >
            {/* Hover overlay para admin */}
            {!isDone && isAdminOrAssistant && (
              <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-20">
                <span className="px-4 py-2 bg-green-600/90 text-white font-black text-xs rounded-xl border border-green-400 shadow-xl tracking-wider animate-pulse uppercase">
                  🏆 Declarar Ganador
                </span>
              </div>
            )}

            {/* Avatar Grande */}
            {renderBigAvatar(j1.nombre, j1.grupo)}

            {/* Nombre e info (pr-16 reserves space for absolute crown) */}
            <div className="flex-1 min-w-0 pr-16">
              <div className="flex items-center gap-2 flex-wrap">
                <TierBadge tier={j1.grupo} sm />
                <span className="text-[10px] text-gray-500 font-mono">Seed #{j1.bracket_seed || 'Liga'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black mt-1 leading-none tracking-wide text-white truncate">{j1.nombre}</h3>
            </div>
            
            {/* Corona / Medalla de Ganador (absolute to avoid flex-item shifts) */}
            {j1Won && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end gap-0.5 select-none z-10 animate-reveal-card">
                <span className="text-3xl animate-bounce">👑</span>
                <span className="text-[9px] font-black text-green-400 tracking-wider uppercase bg-green-500/20 px-1.5 py-0.5 rounded border border-green-500/30">Victoria</span>
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center gap-4 py-0.5 shrink-0 select-none">
            <div className="flex-1 border-t border-dashed border-white/10" />
            <span className="text-[10px] font-black text-gray-600 tracking-[0.3em] font-mono">V E R S U S</span>
            <div className="flex-1 border-t border-dashed border-white/10" />
          </div>

          {/* Jugador 2 */}
          <div
            onClick={() => !isDone && isAdminOrAssistant && resolverDuelo(d._id, j2._id)}
            className={`flex items-center gap-5 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
              isDone 
                ? j2Won 
                  ? 'bg-green-500/10 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]' 
                  : 'opacity-25 border-transparent'
                : isAdminOrAssistant
                  ? 'border-white/5 bg-white/5 hover:border-green-500/50 hover:bg-green-500/10 cursor-pointer shadow-md'
                  : 'border-white/5 bg-white/5'
            }`}
          >
            {/* Hover overlay para admin */}
            {!isDone && isAdminOrAssistant && (
              <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-20">
                <span className="px-4 py-2 bg-green-600/90 text-white font-black text-xs rounded-xl border border-green-400 shadow-xl tracking-wider animate-pulse uppercase">
                  🏆 Declarar Ganador
                </span>
              </div>
            )}

            {/* Avatar Grande */}
            {renderBigAvatar(j2.nombre, j2.grupo)}

            {/* Nombre e info (pr-16 reserves space for absolute crown) */}
            <div className="flex-1 min-w-0 pr-16">
              <div className="flex items-center gap-2 flex-wrap">
                <TierBadge tier={j2.grupo} sm />
                <span className="text-[10px] text-gray-500 font-mono">Seed #{j2.bracket_seed || 'Liga'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black mt-1 leading-none tracking-wide text-white truncate">{j2.nombre}</h3>
            </div>
            
            {/* Corona / Medalla de Ganador (absolute to avoid flex-item shifts) */}
            {j2Won && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end gap-0.5 select-none z-10 animate-reveal-card">
                <span className="text-3xl animate-bounce">👑</span>
                <span className="text-[9px] font-black text-green-400 tracking-wider uppercase bg-green-500/20 px-1.5 py-0.5 rounded border border-green-500/30">Victoria</span>
              </div>
            )}
          </div>
        </div>

        {/* Hándicap / Nerf Panel */}
        <div className="mt-5 shrink-0 z-10">
          {hasHc && !isDone ? (
            <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 shadow-[0_8px_30px_rgb(245,158,11,0.03)] flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-amber-500/10 pb-2 flex-wrap gap-2">
                <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1 font-mono">
                  <span>⚖️</span> Hándicap · Gap {hc.tier_gap}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                  Penalizado: <strong className="text-amber-300 font-black">{targetName}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Heavy Debuff (Obligatorio) */}
                {hc.heavy?.id && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-1 text-lg opacity-20 select-none">💀</div>
                    <div>
                      <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1 font-mono">Obligatorio (Fuerte)</p>
                      <p className="text-xs font-black text-white">{hc.heavy.nombre}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{hc.heavy.descripcion}</p>
                    </div>
                  </div>
                )}
                {/* Light Debuff (Elegido o por elegir) */}
                {hc.light_chosen?.id ? (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-1 text-lg opacity-20 select-none">🧪</div>
                    <div>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 font-mono">Elegido (Leve)</p>
                      <p className="text-xs font-black text-white">{hc.light_chosen.nombre}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{hc.light_chosen.descripcion}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-900/80 border border-amber-500/20 flex flex-col gap-2 justify-center">
                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest font-mono">Seleccionar Debuff Leve</p>
                    {isAdminOrAssistant ? (
                      <div className="flex flex-col gap-1.5">
                        {(hc.light_options || []).map(o => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => elegirDebuff(d._id, o.id)}
                            className="w-full text-left px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/25 hover:border-amber-400 transition-all flex flex-col"
                          >
                            <span className="text-[11px] font-black text-white">{o.nombre}</span>
                            <span className="text-[9px] text-gray-400 leading-none">{o.descripcion}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-400/80 italic py-1 animate-pulse text-center font-bold">
                        Esperando elección de debuff…
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : isDone ? (
            <div className="py-2 px-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center justify-center gap-2 select-none">
              <span className="text-green-500 text-xs">✓</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Combate Resuelto</span>
            </div>
          ) : (
            <div className="py-2 px-4 rounded-xl bg-white/2 border border-white/5 flex items-center justify-center gap-2 select-none">
              <span className="text-gray-500 text-xs">⚖️</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Sin Hándicap</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeKit = snapshot?.liga?.rondas?.[snapshot?.liga?.rondas?.length - 1]?.kit;

  // 1. Mostrar pantalla de Campeón si existe y no se ha descartado
  const showChampionCelebration = snapshot?.campeon && !dismissedChampion;
  if (showChampionCelebration) {
    const champ = snapshot.campeon;
    return (
      <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#1c1404] via-[#0d0901] to-black flex flex-col justify-between items-center p-6 md:p-12 text-center animate-reveal-card overflow-hidden">
        {/* Floating background particles */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0%,transparent_60%)] pointer-events-none" />
        
        {/* CSS Confetti Animation Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          {[...Array(24)].map((_, i) => {
            const delay = (i * 0.2).toFixed(1);
            const left = (i * 4.2).toFixed(1);
            const size = (8 + Math.random() * 8).toFixed(1);
            const duration = (3 + Math.random() * 3).toFixed(1);
            const color = i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#eab308' : '#fbbf24';
            return (
              <div
                key={i}
                className="absolute top-[-20px] rounded-full animate-[fall_infinite_linear]"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: color,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                  opacity: 0.7,
                }}
              />
            );
          })}
        </div>

        <div className="w-full flex justify-between items-center border-b border-amber-500/20 pb-4 max-w-6xl shrink-0 z-10">
          <span className="text-3xl animate-bounce">🏆</span>
          <h1 className="text-2xl font-black text-amber-400 uppercase tracking-widest font-mono">¡TORNEO FINALIZADO!</h1>
          <button
            onClick={() => setDismissedChampion(true)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-bold"
          >
            ✕ Cerrar Celebración
          </button>
        </div>

        {/* Crown and Trophy spotlight */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 max-w-2xl my-6">
          <div className="relative mb-6 select-none">
            <span className="text-8xl md:text-9xl filter drop-shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-bounce inline-block">
              👑
            </span>
            <span className="absolute bottom-[-15px] right-[-15px] text-5xl md:text-6xl filter drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse">
              🏆
            </span>
          </div>

          <p className="text-xs font-black text-amber-500 tracking-[0.4em] uppercase font-mono animate-pulse mb-3">PRESENTAMOS AL CAMPEÓN</p>
          
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 uppercase tracking-wider drop-shadow-[0_0_45px_rgba(251,191,36,0.5)] leading-tight mb-6 font-mono font-extrabold animate-[pulse_2s_infinite]">
            {champ.nombre}
          </h2>

          <div className="flex items-center gap-4 flex-wrap justify-center mb-10">
            <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-black text-amber-300 uppercase tracking-widest font-mono">
              Tier {champ.grupo}
            </span>
            <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-black text-amber-300 uppercase tracking-widest font-mono">
              {champ.wins_liga + (champ.wins_bracket || 0)} Victorias Totales
            </span>
          </div>

          <div className="bg-black/60 border border-amber-500/20 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.04)_0%,transparent_70%)] pointer-events-none" />
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest font-mono mb-4">Estadísticas Finales</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/2 border border-white/5 rounded-xl p-3">
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Puntos en Liga</p>
                <p className="text-xl font-black text-white font-mono mt-1">{Number(champ.puntos_liga || 0).toFixed(2).replace(/\.00$/, '')}</p>
              </div>
              <div className="bg-white/2 border border-white/5 rounded-xl p-3">
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono">Fase Eliminatoria</p>
                <p className="text-xl font-black text-green-400 font-mono mt-1">INVICTO</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="w-full shrink-0 z-10 flex flex-col items-center">
          <p className="text-[10px] text-amber-600 font-mono font-bold tracking-widest uppercase mb-4">Video Games Club © 2026 — All Rights Reserved</p>
        </div>
      </div>
    );
  }

  // 2. Mostrar aviso de inicio de Lower Bracket (Segunda Oportunidad)
  const hasLBProjected = projectedDuelos.some(d => d.bracket_side === 'LB');
  const showLBIntro = hasLBProjected && !acknowledgedLB && !showPlayoffIntro && !snapshot?.campeon;
  if (showLBIntro) {
    return (
      <div className="fixed inset-0 z-[9998] bg-gradient-to-b from-[#160303] via-[#0b0101] to-black flex flex-col justify-center items-center p-6 md:p-12 text-center animate-reveal-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-650 to-amber-900 flex items-center justify-center text-white text-5xl shadow-[0_0_50px_rgba(239,68,68,0.4)] mb-8 select-none animate-pulse">
          ⚡
        </div>
        
        <p className="text-xs font-black text-red-400 tracking-[0.3em] uppercase font-mono animate-pulse mb-3">La tensión aumenta</p>
        <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_35px_rgba(239,68,68,0.4)] leading-tight mb-4 font-mono">
          SEGUNDA OPORTUNIDAD
        </h2>
        <p className="text-lg text-red-500 font-black uppercase tracking-widest font-mono mb-6">
          INICIA EL LOWER BRACKET
        </p>
        
        <p className="text-sm text-gray-400 max-w-lg leading-relaxed mb-10">
          Los combatientes que cayeron de la llave superior se enfrentan por la supervivencia. En esta fase, **una derrota significa la eliminación definitiva del torneo**. Solo el ganador continúa su camino hacia la Gran Final.
        </p>

        <button
          onClick={() => setAcknowledgedLB(true)}
          className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-red-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95 font-bold"
        >
          ⚔️ Ir a la Batalla
        </button>
      </div>
    );
  }

  // 3. Mostrar presentación majestuosa de la Gran Final
  const hasGFProjected = projectedDuelos.some(d => d.bracket_side === 'GF' && d.estado !== 'completado');
  const showGFIntro = hasGFProjected && !acknowledgedGF && !showPlayoffIntro && !snapshot?.campeon;
  if (showGFIntro) {
    const gfDuelo = projectedDuelos.find(d => d.bracket_side === 'GF' && d.estado !== 'completado');
    const j1 = gfDuelo?.jugador1_id;
    const j2 = gfDuelo?.jugador2_id;
    
    return (
      <div className="fixed inset-0 z-[9998] bg-gradient-to-b from-[#181105] via-[#090602] to-black flex flex-col justify-between items-center p-6 md:p-12 text-center animate-reveal-card">
        {/* Header */}
        <div className="w-full flex justify-center items-center border-b border-amber-500/20 pb-4 max-w-6xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">👑</span>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider font-mono">LA GRAN FINAL</h1>
              <p className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase">Video Games Club Champion Spotlight</p>
            </div>
          </div>
        </div>

        {/* Players Comparison */}
        <div className="flex-1 w-full max-w-5xl flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 my-8">
          {/* Jugador 1 - Upper Bracket */}
          {j1 && (
            <div className="flex-1 w-full max-w-xs flex flex-col items-center bg-gradient-to-b from-amber-500/10 to-black/60 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <span className="absolute top-2 left-3 text-[9px] font-black text-amber-500 uppercase font-mono tracking-widest">Campeón UB</span>
              <div className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-4 text-amber-300">
                {j1.nombre.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-2xl font-black text-white tracking-wide">{j1.nombre}</h3>
              <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase font-bold">Seed #{j1.bracket_seed || '1'}</p>
              <div className="mt-4 pt-3 border-t border-white/5 w-full text-center">
                <span className="text-[10px] font-bold text-gray-400">Record: </span>
                <span className="text-xs font-black text-white font-mono">{j1.wins_liga || 0}V - {j1.losses_liga || 0}D</span>
              </div>
            </div>
          )}

          {/* VS Center Banner */}
          <div className="shrink-0 flex flex-col items-center select-none py-4 md:py-0">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center font-black text-lg text-amber-400 font-mono shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse">
              VS
            </div>
            <span className="text-[8px] font-black text-amber-500 tracking-[0.3em] font-mono mt-3">COMBATE DE HONOR</span>
          </div>

          {/* Jugador 2 - Lower Bracket */}
          {j2 && (
            <div className="flex-1 w-full max-w-xs flex flex-col items-center bg-gradient-to-b from-amber-500/10 to-black/60 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <span className="absolute top-2 left-3 text-[9px] font-black text-amber-500 uppercase font-mono tracking-widest">Sobreviviente LB</span>
              <div className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] mb-4 text-amber-300">
                {j2.nombre.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-2xl font-black text-white tracking-wide">{j2.nombre}</h3>
              <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase font-bold">Seed #{j2.bracket_seed || '2'}</p>
              <div className="mt-4 pt-3 border-t border-white/5 w-full text-center">
                <span className="text-[10px] font-bold text-gray-400">Record: </span>
                <span className="text-xs font-black text-white font-mono">{j2.wins_liga || 0}V - {j2.losses_liga || 0}D</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="w-full shrink-0 flex flex-col items-center gap-3">
          <button
            onClick={() => setAcknowledgedGF(true)}
            className="px-12 py-4 bg-amber-500 hover:bg-amber-450 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.4)] border border-amber-400/50 transition-all cursor-pointer hover:scale-105 active:scale-95 font-bold"
            style={{ backgroundColor: '#f59e0b', color: '#000' }}
          >
            ⚔️ Iniciar Combate
          </button>
        </div>
      </div>
    );
  }

  // 4. Mostrar presentación de Clasificados a Playoffs (showPlayoffIntro)
  if (showPlayoffIntro) {
    // Definimos el finalista activo si estamos en showcase
    const activePlayer = showcaseFinalists[showcaseIndex];
    const activeHistory = activePlayer ? getPlayerHistory(activePlayer) : [];

    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#0a0316] via-[#05010b] to-black flex flex-col justify-between items-center p-6 md:p-12 overflow-y-auto select-none">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center border-b border-purple-500/20 pb-4 max-w-6xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🏆</span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider font-mono">Fase de Playoffs</h1>
              <p className="text-[10px] md:text-xs text-purple-400 font-mono font-bold tracking-widest uppercase">Gran Final de Doble Eliminación</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowPlayoffIntro(false)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            ✕ Cerrar Presentación
          </button>
        </div>

        {/* ── Paso 1: Portada/Title ────────────────────────────────────────── */}
        {playoffIntroStep === 'title' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl my-8 animate-reveal-card">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-850 flex items-center justify-center text-white text-5xl shadow-[0_0_50px_rgba(147,51,234,0.4)] mb-8 select-none">
              👑
            </div>
            <p className="text-xs font-black text-purple-400 tracking-[0.3em] uppercase font-mono animate-pulse mb-3">Video Games Club presenta</p>
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_35px_rgba(168,85,247,0.4)] leading-tight mb-4 font-mono">
              LOS CLASIFICADOS
            </h2>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-10">
              Conoce a los 8 mejores combatientes que superaron las rondas suizas y avanzan a la llave final de eliminación doble.
            </p>

            <button
              onClick={() => {
                setShowcaseIndex(0);
                setPlayoffIntroStep('showcase');
              }}
              className="px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-purple-500/40 transition-all cursor-pointer animate-[bounce_2s_infinite]"
            >
              ▶️ Iniciar Presentación
            </button>
          </div>
        )}

        {/* ── Paso 2: Showcase Individual ─────────────────────────────────── */}
        {playoffIntroStep === 'showcase' && activePlayer && (
          <div className="flex-1 w-full max-w-5xl flex flex-col justify-center my-6 min-h-0">
            {/* Barra de progreso de segmentos */}
            <div className="grid grid-cols-8 gap-2.5 w-full mb-8 shrink-0">
              {showcaseFinalists.map((f, idx) => (
                <div key={f._id} className="flex flex-col gap-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === showcaseIndex
                      ? 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                      : idx < showcaseIndex
                        ? 'bg-purple-900/50'
                        : 'bg-white/5'
                  }`} />
                  <span className={`text-[8px] font-black text-center font-mono ${
                    idx === showcaseIndex ? 'text-purple-400' : 'text-gray-600'
                  }`}>
                    Seed #{f.bracket_seed}
                  </span>
                </div>
              ))}
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch min-h-0 overflow-y-auto">
              
              {/* Tarjeta de Perfil a la Izquierda */}
              <div className="md:col-span-5 flex flex-col items-center text-center bg-gradient-to-b from-purple-950/40 to-black/80 border border-purple-500/40 rounded-[32px] p-8 shadow-[0_0_40px_rgba(147,51,234,0.25)] relative overflow-hidden animate-reveal-card justify-between min-h-[350px]">
                <div className="absolute top-0 right-0 p-6 text-9xl font-black text-purple-500/5 select-none font-mono">
                  #{activePlayer.bracket_seed}
                </div>

                <div className="flex flex-col items-center z-10 w-full">
                  {/* Avatar gigante con iniciales */}
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center font-black text-3xl border-4 shadow-xl select-none mb-4"
                    style={{
                      background: `radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(0, 0, 0, 0.8) 100%)`,
                      borderColor: '#a855f7',
                      color: '#d8b4fe',
                      boxShadow: '0 0 35px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    {activePlayer.nombre.substring(0, 2).toUpperCase()}
                  </div>

                  <span className="text-[10px] font-black font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                    Seed #{activePlayer.bracket_seed}
                  </span>

                  <h3 className="text-3xl font-black text-white leading-none tracking-wide drop-shadow mb-2 truncate max-w-full">
                    {activePlayer.nombre}
                  </h3>

                  <p className="text-[10px] text-purple-300 font-bold font-mono uppercase tracking-wider mb-6">
                    {activePlayer.clasificacion_tipo === 'tier_top2' ? 'Top 2 de su Tier' : 'Wildcard Clasificado'}
                  </p>
                </div>

                {/* Resumen numérico */}
                <div className="grid grid-cols-3 gap-2 w-full z-10 pt-4 border-t border-purple-500/15">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Record</p>
                    <p className="text-sm font-black text-white mt-0.5 font-mono">
                      {activePlayer.wins_liga || 0}V - {activePlayer.losses_liga || 0}D
                    </p>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Puntos</p>
                    <p className="text-sm font-black text-purple-400 mt-0.5 font-mono">
                      {Number(activePlayer.puntos_liga || 0).toFixed(2).replace(/\.00$/, '')}
                    </p>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Tier</p>
                    <p className={`text-sm font-black mt-0.5 font-mono ${
                      activePlayer.grupo === 'A' ? 'text-red-400' :
                      activePlayer.grupo === 'B' ? 'text-yellow-400' :
                                                   'text-green-400'
                    }`}>
                      {activePlayer.grupo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historial Detallado a la Derecha */}
              <div className="md:col-span-7 flex flex-col justify-between bg-black/60 border border-white/5 rounded-[32px] p-8 animate-reveal-card min-h-[350px]">
                <div>
                  <h4 className="text-sm font-black text-purple-400 uppercase tracking-wider font-mono mb-5 flex items-center gap-2">
                    <span>⚔️</span> CAMINO EN FASE SUIZA
                  </h4>
                  
                  <div className="flex flex-col gap-3">
                    {activeHistory.map(h => (
                      <div key={h.ronda} className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl hover:border-purple-500/20 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-xs text-purple-400 font-mono">
                            R{h.ronda}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{h.opponent}</span>
                              <span className="text-[9px] text-gray-500 font-bold">Tier {h.opponentTier}</span>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-0.5 font-mono flex items-center gap-1">
                              <span>{h.icon}</span> {h.kit}
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase font-mono tracking-wider border ${
                          h.won
                            ? 'bg-green-500/10 border-green-500/25 text-green-400'
                            : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}>
                          {h.won ? '🏆 Victoria' : '❌ Derrota'}
                        </span>
                      </div>
                    ))}

                    {activeHistory.length === 0 && (
                      <p className="text-xs text-gray-500 italic py-8 text-center">No hay combates suizos registrados para este jugador.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                  <span>BONUS POR UPSET:</span>
                  <span className="font-bold text-amber-400 font-mono">+{activePlayer.upset_bonus || 0} Puntos Extra</span>
                </div>
              </div>

            </div>

            {/* Showcase Navigation Controls */}
            <div className="flex flex-wrap items-center justify-between mt-8 pt-4 border-t border-purple-500/10 shrink-0 gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowcaseIndex(prev => Math.max(0, prev - 1))}
                  disabled={showcaseIndex === 0}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  ⬅️ Anterior
                </button>
                
                <button
                  onClick={() => setShowcaseAutoPlay(prev => !prev)}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                    showcaseAutoPlay 
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/35' 
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {showcaseAutoPlay ? '⏸️ Pausar' : '▶️ Auto-reproducir'}
                </button>

                <button
                  onClick={() => {
                    if (showcaseIndex < showcaseFinalists.length - 1) {
                      setShowcaseIndex(prev => prev + 1);
                    } else {
                      setPlayoffIntroStep('grid');
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg border border-purple-500/20 transition-all cursor-pointer"
                >
                  {showcaseIndex === showcaseFinalists.length - 1 ? 'Ver Resumen 📊' : 'Siguiente ➡️'}
                </button>
              </div>

              <button
                onClick={() => setPlayoffIntroStep('grid')}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Saltar Presentación ⏭️
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Resumen / Grid Completo ──────────────────────────────── */}
        {playoffIntroStep === 'grid' && (
          <div className="flex-1 w-full max-w-6xl flex flex-col justify-center my-6 min-h-0">
            <div className="text-center mb-8 shrink-0">
              <p className="text-xs font-black text-purple-400 tracking-[0.3em] uppercase font-mono animate-pulse">Resumen de Clasificados</p>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_20px_rgba(168,85,247,0.3)] font-mono">
                LLAVE DE PLAYOFFS DEFINIDA
              </h2>
              <p className="text-xs text-gray-400 mt-2 font-medium">Selecciona un clasificado para volver a examinar su historial.</p>
            </div>

            {/* Grid de 8 Clasificados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full overflow-y-auto pr-1">
              {finalistas.map((j) => {
                const seed = j.bracket_seed;
                return (
                  <div
                    key={j._id}
                    onClick={() => setSelectedDetailPlayer(j)}
                    className="bg-gradient-to-b from-purple-950/30 to-black border border-purple-500/40 rounded-2xl flex flex-col justify-between p-5 h-48 shadow-[0_0_30px_rgba(147,51,234,0.15)] relative overflow-hidden transition-all duration-500 transform scale-100 animate-reveal-card hover:border-purple-400/80 hover:shadow-[0_0_45px_rgba(147,51,234,0.35)] cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 p-4 text-7xl font-black text-purple-500/5 select-none font-mono">
                      #{seed}
                    </div>
                    
                    <div className="flex justify-between items-start z-10">
                      <span className="text-[10px] font-black font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        Seed #{seed}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        j.grupo === 'A' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        j.grupo === 'B' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                          'bg-green-500/10 border-green-500/20 text-green-400'
                      }`}>
                        Tier {j.grupo}
                      </span>
                    </div>

                    <div className="my-2 z-10">
                      <p className="text-lg md:text-xl font-black text-white truncate drop-shadow">{j.nombre}</p>
                      <p className="text-[9px] text-purple-300/80 font-mono mt-0.5 font-bold uppercase tracking-wider">
                        {j.clasificacion_tipo === 'tier_top2' ? 'Top 2 de Tier' : 'Wildcard Clasificado'}
                      </p>
                    </div>

                    <div className="flex flex-col z-10 border-t border-white/5 pt-2 mt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[9px] font-mono text-gray-500 uppercase font-black">Liga Suiza</span>
                        <span className="font-black text-purple-400 font-mono">{Number(j.puntos_liga || 0).toFixed(2).replace(/\.00$/, '')} pts</span>
                      </div>
                      <div className="text-center text-[8px] font-black text-purple-400 uppercase tracking-widest mt-1.5 animate-pulse">
                        🔍 Ver Historial
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Controls */}
            <div className="w-full flex flex-col items-center gap-3 border-t border-purple-500/15 pt-6 mt-6 shrink-0">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setPlayoffIntroStep('title');
                    setShowcaseIndex(0);
                  }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-black text-sm uppercase tracking-wider rounded-2xl border border-white/10 transition-all cursor-pointer"
                >
                  🔁 Reiniciar Presentación
                </button>
                <button
                  onClick={() => setPlayoffIntroStep('bracket')}
                  className="px-8 py-3 bg-purple-650 hover:bg-purple-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/30 transition-all cursor-pointer font-bold"
                >
                  ⚔️ Ver Llave de Playoffs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Presentación de Brackets y Explicación ────────────────── */}
        {playoffIntroStep === 'bracket' && (
          <div className="flex-1 w-full max-w-5xl flex flex-col justify-center my-6 min-h-0 animate-reveal-card">
            <div className="text-center mb-6 shrink-0">
              <p className="text-xs font-black text-purple-400 tracking-[0.3em] uppercase font-mono animate-pulse">Estructura del Torneo</p>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_20px_rgba(168,85,247,0.3)] font-mono">
                DOBLE ELIMINACIÓN
              </h2>
              <p className="text-xs text-gray-400 mt-2 font-medium">¿Cómo funciona la llave final por el campeonato?</p>
            </div>

            {/* Explicación de las llaves */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full max-w-4xl mx-auto">
              {/* Upper Bracket Card */}
              <div className="bg-gradient-to-b from-blue-950/20 to-black/80 border border-blue-500/30 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg">
                <span className="text-4xl mb-3">🛡️</span>
                <h3 className="text-lg font-black text-blue-400 uppercase tracking-wider font-mono">Upper Bracket</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 mb-3">Llave Superior</p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Los 8 clasificados inician aquí. Cada victoria te mantiene en la llave principal. Si pierdes una batalla, **no estás eliminado**, sino que caes a la Lower Bracket.
                </p>
              </div>

              {/* Lower Bracket Card */}
              <div className="bg-gradient-to-b from-red-950/20 to-black/80 border border-red-500/30 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg">
                <span className="text-4xl mb-3">⚡</span>
                <h3 className="text-lg font-black text-red-400 uppercase tracking-wider font-mono">Lower Bracket</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 mb-3">Segunda Oportunidad</p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Aquí caen los derrotados de la Upper Bracket. En esta llave, **un error significa la eliminación definitiva**. Solo el superviviente definitivo llegará a la Gran Final.
                </p>
              </div>

              {/* Grand Final Card */}
              <div className="bg-gradient-to-b from-amber-950/20 to-black/80 border border-amber-500/30 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg">
                <span className="text-4xl mb-3">👑</span>
                <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider font-mono">Gran Final</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 mb-3">Por el Campeonato</p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  El campeón invicto de la Upper Bracket se enfrenta al superviviente de la Lower Bracket. El ganador de este duelo definitivo se consagrará Campeón.
                </p>
              </div>
            </div>

            {/* Botón de cierre en el bracket */}
            <div className="flex flex-col items-center gap-3 mt-4 shrink-0">
              <button
                onClick={() => setShowPlayoffIntro(false)}
                className="px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-500 hover:to-indigo-550 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.4)] border border-purple-500/30 transition-all cursor-pointer animate-[bounce_2s_infinite] font-bold"
              >
                ⚔️ Iniciar Playoffs
              </button>
              <button
                onClick={() => setPlayoffIntroStep('grid')}
                className="text-xs text-gray-500 hover:text-gray-400 font-bold underline font-mono cursor-pointer"
              >
                ← Volver al resumen
              </button>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="w-full text-center shrink-0 pt-2 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
          Video Games Club - Minecraft Arena
        </div>

        {/* Modal de Historial de Jugador */}
        {selectedDetailPlayer && (() => {
          const history = getPlayerHistory(selectedDetailPlayer);
          return (
            <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-gradient-to-b from-[#110722] to-black border border-purple-500/50 rounded-[32px] p-6 shadow-[0_0_50px_rgba(147,51,234,0.3)] relative overflow-hidden text-left animate-reveal-card">
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedDetailPlayer(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
                >
                  ✕
                </button>

                {/* Profile Header */}
                <div className="flex items-center gap-4 border-b border-purple-500/10 pb-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center font-black text-xl text-purple-300 select-none">
                    #{selectedDetailPlayer.bracket_seed}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        selectedDetailPlayer.grupo === 'A' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        selectedDetailPlayer.grupo === 'B' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                                              'bg-green-500/10 border-green-500/20 text-green-400'
                      }`}>
                        Tier {selectedDetailPlayer.grupo}
                      </span>
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold uppercase">
                        {selectedDetailPlayer.clasificacion_tipo === 'tier_top2' ? 'Top 2 Tier' : 'Wildcard'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mt-1 leading-none truncate">{selectedDetailPlayer.nombre}</h3>
                  </div>
                </div>

                {/* Resumen de Stats */}
                <div className="grid grid-cols-2 gap-2 text-center mb-6">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Record</p>
                    <p className="text-sm font-black text-white mt-0.5 font-mono">
                      {selectedDetailPlayer.wins_liga || 0}W - {selectedDetailPlayer.losses_liga || 0}L
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Puntos</p>
                    <p className="text-sm font-black text-purple-400 mt-0.5 font-mono">
                      {Number(selectedDetailPlayer.puntos_liga || 0).toFixed(2).replace(/\.00$/, '')} pts
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Upset Bonus</p>
                    <p className="text-sm font-black text-amber-400 mt-0.5 font-mono">
                      +{selectedDetailPlayer.upset_bonus || 0} pts
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Racha Liga</p>
                    <p className="text-sm font-black text-orange-400 mt-0.5 font-mono">
                      🔥 {selectedDetailPlayer.racha_liga || 0} wins
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 col-span-2">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">Fuerza Rival (Buchholz)</p>
                    <p className="text-sm font-black text-purple-300 mt-0.5 font-mono">
                      {Number(selectedDetailPlayer.buchholz_score || 0).toFixed(2).replace(/\.00$/, '')} pts
                    </p>
                  </div>
                </div>

                {/* Camino a Playoffs */}
                <div className="mb-4">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 font-mono">
                    Camino a Playoffs (Suiza)
                  </p>
                  
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {history.map(h => (
                      <div key={h.ronda} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold text-purple-400 font-mono">R{h.ronda}</span>
                          <span className="text-white font-bold">{h.opponent}</span>
                          <span className="text-[9px] text-gray-500 font-mono">({h.opponentTier})</span>
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase font-mono ${
                            h.won ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                          }`}>
                            {h.won ? 'Win' : 'Loss'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <p className="text-xs text-gray-500 italic py-2 text-center">No hay partidas registradas en el historial.</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetailPlayer(null)}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer mt-4"
                >
                  Volver
                </button>

              </div>
            </div>
          );
        })()}

      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex flex-col pb-8 lg:pb-0" style={{ background: 'radial-gradient(circle at center, #071c0b 0%, #020703 100%)' }}>
      {/* Barra de cabecera */}
      <header className="px-8 py-4 border-b border-white/5 bg-black/30 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-800 flex items-center justify-center text-white text-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] select-none">⚔️</div>
          <div>
            <h1 className="text-lg font-black text-white leading-none">TORNEO MINECRAFT PvP</h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-semibold">Pantalla Grande · Modo Espectador</p>
          </div>
        </div>

        {activeKit && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-2xl select-none">
            <span className="text-2xl">{activeKit.icon}</span>
            <div className="text-left">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest leading-none">Kit de la Ronda</p>
              <p className="text-xs font-black text-white mt-0.5 leading-none">{activeKit.nombre}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {settings?.minecraftFormUrl && (
            <button
              onClick={() => setShowSpectatorQr(true)}
              className="px-3.5 py-1.5 bg-green-600/20 border border-green-500/30 rounded-xl text-[10px] font-black text-green-300 uppercase tracking-widest hover:bg-green-600/35 transition-colors cursor-pointer mr-1"
            >
              📱 Inscribirse
            </button>
          )}
          {snapshot?.tabla && snapshot.tabla.length > 0 && (
            <button
              onClick={() => {
                setPlayoffIntroStep('title');
                setShowcaseIndex(0);
                setShowPlayoffIntro(true);
              }}
              className="px-3.5 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-[10px] font-black text-purple-300 uppercase tracking-widest hover:bg-purple-600/35 transition-colors cursor-pointer mr-1"
            >
              🎬 Clasificados
            </button>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all font-bold text-sm"
            title="Cerrar (Esc)"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Grid central */}
      <main className="flex-1 p-6 lg:p-8 flex items-center justify-center relative overflow-y-auto lg:overflow-hidden min-h-0">
        {showNextRoundButton ? (
          <div className="text-center z-10 max-w-2xl px-6 py-12 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-md mx-auto shadow-2xl flex flex-col items-center select-none">
            <div className="text-7xl mb-6 select-none animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-white mb-2">Ronda {currentRoundNum} Finalizada</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md">
              Todos los combates de esta ronda han concluido. Prepara a los jugadores para la siguiente fase.
            </p>
            
            {isAdminOrAssistant ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-xs mb-8">
                <button
                  onClick={iniciarSiguienteRonda}
                  className="w-full py-3.5 px-6 rounded-2xl font-black text-white text-sm bg-green-600 hover:bg-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all uppercase tracking-wider border border-green-500/30 cursor-pointer animate-pulse"
                >
                  {currentRoundNum < 3 ? `⚔️ Iniciar Ronda ${currentRoundNum + 1}` : '🏆 Iniciar Playoffs'}
                </button>
                <p className="text-[10px] text-gray-500 font-mono">Panel de Control de Administrador</p>
              </div>
            ) : (
              <div className="py-3 px-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs font-black uppercase tracking-wider animate-pulse mb-8">
                ⏳ Esperando que el Administrador inicie la Ronda {currentRoundNum < 3 ? currentRoundNum + 1 : 'de Playoffs'}…
              </div>
            )}

            {snapshot?.tabla && snapshot.tabla.length > 0 && (
              <div className="w-full max-w-md bg-black/20 border border-white/5 rounded-2xl p-5">
                <p className="text-xs font-black text-green-400 uppercase tracking-widest mb-3">Posiciones Actuales (Top 5)</p>
                <div className="flex flex-col gap-2">
                  {snapshot.tabla.slice(0, 5).map((j, idx) => (
                    <div key={j._id} className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-sm font-black text-yellow-500 w-6">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <PlayerAvatar name={j.nombre} tier={j.grupo} xs />
                      <span className="text-sm font-bold text-white flex-1 text-left">{j.nombre}</span>
                      <span className="text-xs font-black text-gray-400">{j.puntos_liga || 0} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : projectedDuelos.length === 0 ? (
          <div className="text-center z-10 max-w-2xl px-6 py-12">
            <div className="text-7xl mb-6 select-none animate-bounce">📺</div>
            <h2 className="text-3xl font-black text-white mb-3">Esperando combates para proyectar</h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Los administradores pueden marcar duelos con el ícono <strong className="text-white">📺 Proyectar</strong> desde el panel de control para mostrarlos aquí en tiempo real.
            </p>
            
            {snapshot?.tabla && snapshot.tabla.length > 0 && (
              <div className="bg-black/30 border border-white/5 rounded-2xl p-5 backdrop-blur-md max-w-md mx-auto">
                <p className="text-xs font-black text-green-400 uppercase tracking-widest mb-3">Top 3 Posiciones</p>
                <div className="flex flex-col gap-2">
                  {snapshot.tabla.slice(0, 3).map((j, idx) => (
                    <div key={j._id} className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-sm font-black text-yellow-500">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      <PlayerAvatar name={j.nombre} tier={j.grupo} xs />
                      <span className="text-sm font-bold text-white flex-1 text-left">{j.nombre}</span>
                      <span className="text-xs font-black text-gray-400">{j.puntos_liga || 0} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 w-full max-w-7xl items-center justify-center min-h-0 mx-auto">
            {/* Lado izquierdo */}
            <div className="w-full min-w-0 order-2 lg:order-1">
              {renderDuelDetail(projectedDuelos[0])}
            </div>

            {/* Cronómetro en el centro */}
            <div className="flex flex-col justify-center items-center shrink-0 w-full lg:w-48 z-20 select-none relative order-1 lg:order-2 py-2 lg:py-0">
              <div className="absolute inset-0 bg-radial-gradient from-black/60 to-transparent blur-xl pointer-events-none" />
              {transitionSeconds > 0 ? (
                <div className="relative flex flex-col items-center justify-center p-5 bg-amber-950/45 border border-amber-500/45 rounded-3xl backdrop-blur-lg transition-all w-full shadow-[0_0_30px_rgba(245,158,11,0.2)] select-none">
                  <p className="text-[9px] font-black tracking-widest uppercase mb-1 text-amber-500 font-mono animate-pulse">Transición</p>
                  <div className="text-4xl lg:text-5xl font-mono font-black tracking-wider text-amber-400 animate-pulse leading-none">
                    {transitionSeconds}s
                  </div>
                  <p className="text-[8px] text-amber-500/70 mt-1.5 text-center uppercase font-black leading-none mb-3">Próximos Combates</p>
                  {isAdminOrAssistant && (
                    <button
                      onClick={skipTransition}
                      className="w-full py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 hover:border-amber-400 rounded-xl text-[9px] font-black text-amber-300 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      ⏭️ Omitir Tiempo
                    </button>
                  )}
                </div>
              ) : (
                <div className={`relative group/timer flex flex-col items-center justify-center p-6 bg-black/60 border rounded-3xl backdrop-blur-lg transition-all w-full ${
                  done ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]' :
                  low  ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]' :
                         'border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]'
                }`}>
                  <p className="text-[9px] font-black tracking-widest uppercase mb-1 text-gray-500 font-mono">Tiempo</p>
                  
                  <div className={`text-4xl lg:text-5xl font-mono font-black tracking-wider transition-all duration-300 ${
                    done ? 'text-red-500 animate-pulse' :
                    low  ? 'text-yellow-400 animate-pulse' :
                           'text-green-400'
                  }`}>
                    {timeStr}
                  </div>

                  {isAdminOrAssistant && (
                    <div className="flex flex-col items-center gap-2 mt-4 opacity-0 group-hover/timer:opacity-100 transition-opacity duration-200 w-full">
                      <button
                        onClick={() => sendTimerControl(active ? 'pause' : 'start', seconds)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[10px] font-black text-white transition-colors w-full"
                      >
                        {active ? '⏸ Pausa' : '▶ Iniciar'}
                      </button>
                      <button
                        onClick={() => sendTimerControl('reset', 90)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[10px] text-white transition-colors w-full"
                        title="Reiniciar a 90s"
                      >
                        ↺ Reiniciar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lado derecho */}
            <div className="w-full min-w-0 order-3">
              {projectedDuelos.length > 1 ? (
                renderDuelDetail(projectedDuelos[1])
              ) : (
                <div className="w-full bg-black/20 rounded-[32px] border border-white/10 border-dashed p-8 flex flex-col justify-center items-center min-h-[300px] max-w-lg mx-auto">
                  <div className="text-4xl mb-4 select-none animate-pulse">⚔️</div>
                  <h3 className="text-lg font-bold text-gray-400">Segundo combate libre</h3>
                  <p className="text-xs text-gray-600 mt-2 text-center max-w-xs">
                    Marca otro duelo como proyectado desde el panel de control para verlo en esta sección.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Banner de Próximos Combates (Prepararse) */}
      {upcomingDuelos.length > 0 && (
        <div className="w-full bg-amber-500/10 border-t border-amber-500/25 py-3 px-8 backdrop-blur-md flex items-center justify-between gap-4 z-10 shrink-0 shadow-[0_-10px_30px_rgba(245,158,11,0.05)] select-none">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xl animate-pulse">⚡</span>
            <span className="text-[10px] sm:text-xs font-black text-amber-400 tracking-[0.2em] uppercase font-mono">
              En Preparación (Que se preparen)
            </span>
          </div>
          
          <div className="flex-1 flex justify-center items-center gap-8 overflow-hidden">
            {upcomingDuelos.slice(0, 2).map((ud, idx) => {
              const u1 = ud.jugador1_id?.nombre || 'Bye';
              const u2 = ud.jugador2_id?.nombre || 'Bye';
              return (
                <div key={ud._id} className="flex items-center gap-3 text-xs sm:text-sm font-bold text-gray-200">
                  <span className="text-amber-500/50 font-mono">#{idx + 1}</span>
                  <span className="text-white">{u1}</span>
                  <span className="text-amber-400 font-mono text-xs px-1.5 bg-amber-500/10 border border-amber-500/20 rounded">VS</span>
                  <span className="text-white">{u2}</span>
                </div>
              );
            })}
          </div>
          
          <div className="text-[10px] font-mono text-gray-500 uppercase hidden md:block">
            Espera tu Turno
          </div>
        </div>
      )}

      {showSpectatorQr && settings?.minecraftFormUrl && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div
            className="w-full max-w-sm rounded-3xl border-2 p-6 flex flex-col items-center text-center shadow-2xl relative"
            style={{
              background: 'linear-gradient(135deg, #0e1e12 0%, #030804 100%)',
              borderColor: 'rgba(74, 222, 128, 0.4)',
            }}
          >
            <button
              onClick={() => setShowSpectatorQr(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center hover:bg-red-500/25 transition-all text-xs"
            >
              ✕
            </button>
            <div className="p-4 bg-white rounded-3xl shadow-2xl mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(settings.minecraftFormUrl)}`}
                alt="Form QR Code"
                className="w-[200px] h-[200px]"
              />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">¡Inscríbete al Torneo!</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Escanea este código QR con tu celular para registrarte. Ingresarás automáticamente al <span className="text-amber-400 font-bold">Tier B (Intermedio)</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function MinecraftTournament() {
  const torneoId = `mctorneo-${new Date().toISOString().slice(0, 10)}`;
  const [tab, setTab]             = useState('liga');
  const [snapshot, setSnapshot]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [spectatorOpen, setSpectatorOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [settings, setSettings]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/mctournament/snapshot?torneo_id=${encodeURIComponent(torneoId)}`);
      setSnapshot(data);
    } catch { setSnapshot(null); }
    finally { setLoading(false); }
  }, [torneoId]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api('/settings');
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await api('/settings/update', {
        method: 'POST',
        body: JSON.stringify(newSettings),
      });
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (e) {
      throw new Error(e.message);
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('mc_tournament_updated', load);
      return () => socket.off('mc_tournament_updated', load);
    }
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleSettingsUpdate = (data) => setSettings(data);
      socket.on('settings:updated', handleSettingsUpdate);
      return () => socket.off('settings:updated', handleSettingsUpdate);
    }
  }, []);

  const reset = async () => {
    if (!window.confirm('¿Reiniciar todo el torneo? Esto borra jugadores, duelos y bracket.')) return;
    try {
      await api('/mctournament/reset', { method: 'DELETE', body: JSON.stringify({ torneo_id: torneoId }) });
      setToast({ type: 'ok', msg: 'Torneo reiniciado' });
      await load();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
  };

  const handleInitConfirm = async (selectedEvals) => {
    setInitModalOpen(false);
    if (!window.confirm(`¿Iniciar torneo con ${selectedEvals.length} jugadores? Se borrará el estado actual.`)) return;
    try {
      const evaluaciones = selectedEvals.map(ev => ({
        nombre: ev.jugador?.nombre || ev.nombre,
        rut:    ev.jugador?.rut    || ev.rut || null,
        grupo:  ev.grupo,
      }));
      const r = await api('/mctournament/init-manual', {
        method: 'POST',
        body: JSON.stringify({ torneo_id: torneoId, evaluaciones }),
      });
      setToast({ type: 'ok', msg: `Torneo iniciado con ${r.total} jugadores` });
      await load();
    } catch (e) { setToast({ type: 'err', msg: e.message }); }
  };

  const campeon    = snapshot?.campeon;
  const playoffsOn = snapshot?.playoffs?.activo;
  const jugadores  = snapshot?.jugadores?.length || 0;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border-2 p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a2e05 0%, #052e16 40%, #030a06 80%, #0a0a14 100%)',
          borderColor: 'rgba(74,222,128,0.3)',
          boxShadow: '0 0 40px rgba(34,197,94,0.08)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-end pr-6 select-none pointer-events-none text-[140px] leading-none" style={{ opacity: 0.06 }}>⚔️</div>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-green-400">Torneo Minecraft PvP · Club Video Juegos</p>
            <h2 className="text-3xl font-black text-white mt-1 leading-tight">Liga Suiza + Playoffs</h2>
            <p className="text-base text-gray-400 italic mt-0.5">Doble Eliminación · Hándicap Calibrado por Tier</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold border border-green-500/35 bg-green-500/15 text-green-300">
                {playoffsOn ? '🏆 Playoffs activos' : '⚔️ Liga abierta'}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/30 border border-white/8 text-[11px] text-gray-400">👥 {jugadores} jugadores</span>
              {['A', 'B', 'C'].map(t => {
                const n = snapshot?.porTier?.[t]?.length || 0;
                return n > 0 ? (
                  <span key={t} className="px-3 py-1 rounded-full bg-black/30 border border-white/8 text-[11px] text-gray-400">
                    {TIERS[t].icon} {n} Tier {t}
                  </span>
                ) : null;
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-green-400 border border-green-500/25 bg-green-500/8 hover:bg-green-500/15 hover:border-green-500/40 transition-all flex items-center gap-1.5"
            >
              📱 QR / Inscripción
            </button>
            <button
              type="button"
              onClick={() => setSpectatorOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-blue-400 border border-blue-500/25 bg-blue-500/8 hover:bg-blue-500/15 hover:border-blue-500/40 transition-all"
            >
              📺 Pantalla Grande
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-xl text-xs font-black text-red-400 border border-red-500/25 bg-red-500/8 hover:bg-red-500/15 hover:border-red-500/40 transition-all"
            >
              ↺ Reiniciar torneo
            </button>
          </div>
        </div>
      </div>

      {/* ── Champion ─────────────────────────────────────────────────────── */}
      {campeon && (
        <div
          className="rounded-2xl border-2 p-6 flex items-center gap-5"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(34,197,94,0.08))',
            borderColor: '#fbbf24',
            boxShadow: '0 0 40px rgba(251,191,36,0.15)',
          }}
        >
          <span className="text-5xl">👑</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-black">Campeón · Torneo Minecraft PvP</p>
            <p className="text-3xl font-black text-white mt-0.5">{campeon.nombre}</p>
            <p className="text-sm text-gray-400 mt-1">{TIERS[campeon.grupo]?.icon} Tier {campeon.grupo} · {campeon.puntos_liga || 0} pts en liga</p>
          </div>
        </div>
      )}

      {/* ── Rules ────────────────────────────────────────────────────────── */}
      <RulesPanel />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1.5 bg-black/40 rounded-2xl overflow-x-auto border border-white/5">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[90px] flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all ${
              tab === t.id
                ? 'border-green-500/50 bg-green-500/15 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/3'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-wide">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      {loading && !snapshot ? (
        <div className="text-center py-12 text-gray-500"><span className="text-4xl animate-pulse">⚔️</span></div>
      ) : snapshot ? (
        <>
          {tab === 'liga'      && <LeagueTab   snapshot={snapshot} torneoId={torneoId} onAfter={load} setToast={setToast} onJumpToPlayoffs={() => setTab('playoffs')} />}
          {tab === 'tier'      && <TierTab     snapshot={snapshot} />}
          {tab === 'playoffs'  && <PlayoffsTab snapshot={snapshot} torneoId={torneoId} onAfter={load} setToast={setToast} />}
          {tab === 'historial' && <HistorialTab snapshot={snapshot} />}
          {tab === 'admin'     && <AdminTab    snapshot={snapshot} torneoId={torneoId} onAfter={load} setToast={setToast} onOpenInitModal={() => setInitModalOpen(true)} />}
        </>
      ) : (
        <div className="text-center py-12 text-gray-600 italic">No se pudo cargar el torneo.</div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <MCInitModal
        isOpen={initModalOpen}
        onClose={() => setInitModalOpen(false)}
        onConfirm={handleInitConfirm}
      />

      <MinecraftRegistrationModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        torneoId={torneoId}
        onSyncSuccess={load}
        setToast={setToast}
      />

      {spectatorOpen && createPortal(
        <SpectatorView snapshot={snapshot} onAfter={load} onClose={() => setSpectatorOpen(false)} settings={settings} />,
        document.body
      )}
    </div>
  );
}

// ── MinecraftRegistrationModal ──────────────────────────────────────────────
function MinecraftRegistrationModal({ isOpen, onClose, settings, onSaveSettings, torneoId, onSyncSuccess, setToast }) {
  const [formUrl, setFormUrl] = useState(settings?.minecraftFormUrl || '');
  const [excelUrl, setExcelUrl] = useState(settings?.minecraftExcelUrl || '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormUrl(settings.minecraftFormUrl || '');
      setExcelUrl(settings.minecraftExcelUrl || '');
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings({ minecraftFormUrl: formUrl, minecraftExcelUrl: excelUrl });
      setToast({ type: 'ok', msg: 'Configuración guardada' });
    } catch (e) {
      setToast({ type: 'err', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncFromUrl = async () => {
    if (!excelUrl) {
      setToast({ type: 'err', msg: 'Configura la URL de Excel antes de sincronizar.' });
      return;
    }
    setSyncing(true);
    try {
      // Primero guardamos para asegurar que sincroniza la URL ingresada
      await onSaveSettings({ minecraftFormUrl: formUrl, minecraftExcelUrl: excelUrl });
      const res = await api('/mctournament/sync-excel', {
        method: 'POST',
        body: JSON.stringify({ torneo_id: torneoId }),
      });
      setToast({ type: 'ok', msg: `Sincronizados ${res.count} nuevos jugadores en Tier B` });
      if (onSyncSuccess) onSyncSuccess();
      onClose();
    } catch (e) {
      setToast({ type: 'err', msg: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target.result.split(',')[1];
      setSyncing(true);
      try {
        const res = await api('/mctournament/sync-excel', {
          method: 'POST',
          body: JSON.stringify({ torneo_id: torneoId, fileBase64: base64 }),
        });
        setToast({ type: 'ok', msg: `Sincronizados ${res.count} nuevos jugadores en Tier B` });
        if (onSyncSuccess) onSyncSuccess();
        onClose();
      } catch (err) {
        setToast({ type: 'err', msg: err.message });
      } finally {
        setSyncing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const qrCodeUrl = formUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formUrl)}`
    : null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-3xl border-2 p-6 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #0e1e12 0%, #030804 100%)',
          borderColor: 'rgba(74, 222, 128, 0.3)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center hover:bg-red-500/25 transition-all text-xs"
        >
          ✕
        </button>

        <div>
          <h3 className="text-xl font-black text-white">📱 Registro de Jugadores (QR / Excel)</h3>
          <p className="text-xs text-gray-400 mt-1">
            Los jugadores inscritos mediante este sistema serán agregados automáticamente en el <strong className="text-amber-400">Tier B (Intermedio)</strong> con la mediana de puntos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lado QR */}
          <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-green-500/10 rounded-2xl text-center">
            {qrCodeUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-lg mb-3">
                <img src={qrCodeUrl} alt="Form QR Code" className="w-[180px] h-[180px]" />
              </div>
            ) : (
              <div className="w-[180px] h-[180px] rounded-2xl border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 italic mb-3">
                Configura la URL para generar el QR
              </div>
            )}
            <p className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Código QR para Inscripción</p>
            <p className="text-[10px] text-gray-500 mt-1 font-sans">Los alumnos pueden escanearlo para abrir el formulario e inscribirse.</p>
          </div>

          {/* Lado Configuraciones */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">URL del Formulario (QR)</label>
              <input
                type="text"
                placeholder="https://forms.office.com/r/..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 focus:border-green-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">URL del Excel de Respuestas</label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={excelUrl}
                onChange={(e) => setExcelUrl(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 focus:border-green-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
              />
              <p className="text-[9px] text-gray-600 leading-normal">
                Soporta enlaces de Google Sheets públicos. Para enlaces institucionales con restricciones de acceso (como Inacap SharePoint), usa la subida local.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-white transition-all uppercase tracking-widest cursor-pointer"
            >
              {saving ? 'Guardando...' : '💾 Guardar URLs'}
            </button>
          </div>
        </div>

        {/* Sección de Sincronización */}
        <div className="border-t border-white/10 pt-5 flex flex-col gap-4">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">🔄 Sincronizar Nuevos Registros</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sync desde URL */}
            <button
              onClick={handleSyncFromUrl}
              disabled={syncing}
              className="py-3 px-4 bg-green-950/40 hover:bg-green-950/65 border border-green-500/30 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🌐</span>
              <span className="text-xs font-black text-white">Sincronizar desde URL</span>
              <span className="text-[9px] text-gray-500">Consulta el archivo remoto configurado</span>
            </button>

            {/* Subida local */}
            <label className="py-3 px-4 bg-white/2 hover:bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={syncing}
                className="hidden"
              />
              <span className="text-xl group-hover:scale-110 transition-transform">📁</span>
              <span className="text-xs font-black text-white">Subir Archivo Excel</span>
              <span className="text-[9px] text-gray-500">Arrastra o haz clic para subir .xlsx</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
