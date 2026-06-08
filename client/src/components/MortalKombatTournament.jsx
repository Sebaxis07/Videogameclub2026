/**
 * MortalKombatTournament.jsx
 * Torneo Mortal Kombat XL "Desafío a los Jefes"
 *   Bloque A  (Novatos/Bronce)    → 1 ganador asciende
 *   Bloque B  (Intermedios + A)   → 2 Aspirantes
 *   Boss Fight (Aspirante vs Jefe, jefe nerfeado)
 *   Gran Final (modo según resultado del Boss Fight)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getSocket } from '../api/socket';
import useStore from '../store/useStore';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const MK_CRIMSON = '#c0101e';
const MK_DARK    = '#7f0a15';

const RANGO_CFG = {
  Oro:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.45)',  emoji: '🥇', label: 'Experto' },
  Plata:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.40)', emoji: '🥈', label: 'Intermedio' },
  Bronce: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.40)',  emoji: '🎮', label: 'Novato' },
};

const FASES = [
  { id: 'sin_iniciar', icon: '⚙️', short: 'Inicio' },
  { id: 'bloque_a',    icon: '🎮', short: 'Bloque A' },
  { id: 'bloque_b',    icon: '🥈', short: 'Bloque B' },
  { id: 'boss_fight',  icon: '👹', short: 'Boss Fight' },
  { id: 'final',       icon: '🏆', short: 'Gran Final' },
  { id: 'finalizado',  icon: '👑', short: 'Campeón' },
];

const FASE_IDX = Object.fromEntries(FASES.map((f, i) => [f.id, i]));

// ── PhaseStepper ──────────────────────────────────────────────────────────────
function PhaseStepper({ estado }) {
  const cur = FASE_IDX[estado] ?? 0;
  return (
    <div className="flex items-center w-full">
      {FASES.map((fase, idx) => {
        const done   = idx < cur;
        const active = idx === cur;
        return (
          <React.Fragment key={fase.id}>
            <div className={`flex flex-col items-center gap-1.5 transition-opacity ${!done && !active ? 'opacity-20' : ''}`}>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all ${
                  done   ? 'border-green-500/60 bg-green-500/15 text-green-400 font-bold' :
                  active ? 'text-white' :
                           'border-gray-700/70 text-gray-600'
                }`}
                style={active ? {
                  borderColor: MK_CRIMSON,
                  background: `${MK_CRIMSON}22`,
                  boxShadow: `0 0 18px ${MK_CRIMSON}55`,
                } : {}}
              >
                {done ? '✓' : fase.icon}
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap hidden md:block ${
                active ? 'text-red-400' : done ? 'text-green-500/60' : 'text-gray-700'
              }`}>
                {fase.short}
              </span>
            </div>
            {idx < FASES.length - 1 && (
              <div className={`flex-1 h-px mx-1.5 mb-5 rounded-full transition-all ${
                idx < cur ? 'bg-green-500/40' : 'bg-gray-800'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── PlayerChip ────────────────────────────────────────────────────────────────
function PlayerChip({ jugador, dim, big }) {
  if (!jugador) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-700/50 text-gray-600 italic ${
        big ? 'px-3 py-2 text-sm' : 'px-2.5 py-1 text-xs'
      }`}>
        BYE
      </span>
    );
  }
  const cfg = RANGO_CFG[jugador.rango] || RANGO_CFG.Bronce;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-all ${
        big ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs'
      } ${dim ? 'opacity-35' : ''}`}
      style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
    >
      <span>{cfg.emoji}</span>
      <span className="truncate max-w-[160px]">{jugador.nombre}</span>
      <span className="opacity-45 text-[10px] font-normal">{jugador.score}/12</span>
    </span>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────
function MatchCard({ match, fase, onSetWinner, onToggleProject, locked, isAdmin }) {
  const j1      = match.jugador1;
  const j2      = match.jugador2;
  const done    = match.estado === 'completado' || match.estado === 'wo';
  const w       = match.ganador;
  const canPick = !locked && !done && j1 && j2;

  function Row({ jugador }) {
    const rut = jugador?.rut;
    const isW = w === rut;
    const isL = done && w && w !== rut;
    return (
      <button
        type="button"
        onClick={() => canPick && onSetWinner(fase, match.id, rut)}
        disabled={!canPick}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all group text-left ${
          isW     ? 'bg-green-500/15 border-green-400/50' :
          isL     ? 'opacity-30 border-transparent cursor-default' :
          canPick ? 'border-white/7 hover:border-red-500/40 hover:bg-red-500/6 cursor-pointer' :
                    'border-white/6 cursor-default'
        }`}
      >
        <PlayerChip jugador={jugador} dim={isL} />
        {isW
          ? <span className="text-green-400 font-black text-sm shrink-0">✓</span>
          : canPick
            ? <span className="text-gray-700 group-hover:text-red-400/60 text-[10px] shrink-0 transition-colors">↩ elegir</span>
            : null}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl p-3 flex flex-col gap-2 border transition-all ${
      done
        ? 'border-green-500/15 bg-green-500/4'
        : match.nerfRandom
          ? 'border-red-900/30 bg-red-950/15'
          : 'border-white/5 bg-white/2'
    }`}>
      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-medium">
        <span className="text-gray-600">Ronda {match.ronda}</span>
        <span className={`px-1.5 py-0.5 rounded font-bold ${
          match.estado === 'completado' ? 'text-green-400 bg-green-500/10' :
          match.estado === 'wo'         ? 'text-orange-400 bg-orange-500/10' :
                                         'text-yellow-500/60 bg-yellow-500/7'
        }`}>
          {match.estado === 'pendiente' ? 'por jugar' : match.estado}
        </span>
      </div>

      <Row jugador={j1} />
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-gray-800/80" />
        <span className="text-[10px] font-black text-gray-700 tracking-widest">VS</span>
        <div className="flex-1 border-t border-gray-800/80" />
      </div>
      <Row jugador={j2} />

      {match.nerfRandom && (
        <div className="flex items-center gap-1.5 bg-amber-500/8 border border-amber-500/20 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-400 font-semibold">
          <span>⚠️</span>
          <span>Jefe: personaje ALEATORIO · solo 1 vida</span>
        </div>
      )}

      {isAdmin && !done && j1 && j2 && (
        <button
          type="button"
          onClick={() => onToggleProject(fase, match.id, !match.projected)}
          className={`w-full py-1.5 text-[10px] rounded-xl border font-bold transition-all ${
            match.projected
              ? 'bg-red-500/20 border-red-500/45 text-red-400 font-black'
              : 'bg-transparent border-white/8 text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          {match.projected ? '📺 Proyectado' : '📺 Proyectar'}
        </button>
      )}
    </div>
  );
}

// ── PhaseConnector ────────────────────────────────────────────────────────────
function PhaseConnector({ label, active }) {
  const color = active ? MK_CRIMSON : '#374151';
  return (
    <div className={`flex flex-col items-center gap-1 py-1 transition-opacity ${active ? 'opacity-80' : 'opacity-20'}`}>
      <div className="w-px h-5 rounded-full" style={{ background: color }} />
      <div style={{
        width: 0,
        height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: `9px solid ${color}`,
      }} />
      {label && (
        <span className="text-[9px] uppercase tracking-wider font-bold mt-1"
          style={{ color: active ? '#ef4444' : '#4b5563' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── PhaseSection ──────────────────────────────────────────────────────────────
function PhaseSection({ matches, fase, title, subtitle, icon, accentColor, accentBg, onSetWinner, onToggleProject, locked, emptyMsg, active, footer, isAdmin }) {
  const porRonda    = matches.reduce((acc, m) => { (acc[m.ronda] = acc[m.ronda] || []).push(m); return acc; }, {});
  const rondas      = Object.keys(porRonda).map(Number).sort((a, b) => a - b);
  const completados = matches.filter(m => m.estado === 'completado' || m.estado === 'wo').length;
  const allDone     = matches.length > 0 && completados === matches.length;

  return (
    <div
      className={`rounded-2xl border flex flex-col overflow-hidden transition-all ${active ? '' : 'opacity-50'}`}
      style={{ borderColor: active ? `${accentColor}45` : 'rgba(255,255,255,0.05)' }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 border-b"
        style={{ background: accentBg, borderColor: active ? `${accentColor}25` : 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {matches.length > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` }}
            >
              {completados}/{matches.length}
            </span>
          )}
          {allDone && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/12 text-green-400 border border-green-500/25">
              ✓ Completo
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {matches.length === 0 ? (
          <p className="text-sm text-gray-600 italic text-center py-5">{emptyMsg}</p>
        ) : (
          rondas.map(r => (
            <div key={r}>
              {rondas.length > 1 && (
                <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold mb-2">Ronda {r}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {porRonda[r].map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    fase={fase}
                    onSetWinner={onSetWinner}
                    onToggleProject={onToggleProject}
                    locked={locked}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        {footer}
      </div>
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
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold uppercase tracking-wider">
            Leer antes de jugar
          </span>
        </div>
        <span className={`text-gray-500 text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-gray-800/60 p-5 flex flex-col gap-5">

          {/* Rangos + Estructura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card: Rangos */}
            <div className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <span>📊</span> Sistema de Rangos
              </h4>
              <p className="text-[10px] text-gray-500">
                Los rangos se asignan en el Escrutinio MK (evaluación previa al torneo), sobre 12 puntos totales.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { emoji: '🥇', rango: 'Experto  (Oro)',       pts: '10–12 pts', desc: 'Son los "Jefes". Esperan directamente al Boss Fight.', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
                  { emoji: '🥈', rango: 'Intermedio  (Plata)',  pts: '5–9 pts',   desc: 'Entran directo al Bloque B.',                          color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.3)' },
                  { emoji: '🎮', rango: 'Novato  (Bronce)',     pts: '0–4 pts',   desc: 'Deben ganarse el derecho en el Bloque A.',             color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.3)' },
                ].map(r => (
                  <div key={r.rango} className="flex items-start gap-3 rounded-xl p-3 border" style={{ background: r.bg, borderColor: r.border }}>
                    <span className="text-xl mt-0.5 shrink-0">{r.emoji}</span>
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: r.color }}>{r.rango}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{r.pts}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: Estructura */}
            <div className="rounded-xl border border-gray-700/40 bg-gray-900/40 p-4 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <span>🗺️</span> Estructura del Torneo
              </h4>
              <div className="flex flex-col gap-0.5">
                {[
                  { icon: '🎮', fase: 'Bloque A', color: '#fb923c', desc: 'Solo Novatos (Bronce).', result: '→ 1 ganador asciende al Bloque B' },
                  { icon: '🥈', fase: 'Bloque B', color: '#94a3b8', desc: 'Intermedios + Ganador A.', result: '→ Los 2 finalistas son los Aspirantes' },
                  { icon: '👹', fase: 'Boss Fight', color: MK_CRIMSON, desc: '2 Aspirantes retan a 2 Expertos (nerfeados).', result: '→ 2 ganadores pasan a la Gran Final' },
                  { icon: '🏆', fase: 'Gran Final', color: '#fbbf24', desc: 'Modo según los resultados del Boss Fight.', result: '→ 1 Campeón' },
                ].map((f, i) => (
                  <div key={f.fase} className="flex gap-3">
                    <div className="flex flex-col items-center gap-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border shrink-0"
                        style={{ background: `${f.color}15`, borderColor: `${f.color}35` }}
                      >
                        {f.icon}
                      </div>
                      {i < 3 && <div className="w-px bg-gray-800" style={{ height: 20 }} />}
                    </div>
                    <div className="pb-1 pt-1 min-w-0">
                      <span className="text-xs font-bold text-white">{f.fase}</span>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{f.desc}</p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: f.color }}>{f.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Boss Fight Hándicap */}
          <div className="rounded-xl border border-red-900/35 bg-red-950/15 p-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-2 mb-3">
              <span>👹</span> Boss Fight — Reglas del Hándicap
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-3.5">
                <p className="text-xs font-bold text-emerald-400 mb-2">✅ Aspirante (Challenger)</p>
                <ul className="text-[11px] text-gray-300 space-y-1.5 leading-relaxed">
                  <li>• Puede elegir su personaje libremente</li>
                  <li>• Tiene <strong className="text-white">2 vidas</strong> por ronda</li>
                  <li>• Formato: Bo3 (mejor de 3 rondas)</li>
                </ul>
              </div>
              <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-3.5">
                <p className="text-xs font-bold text-red-400 mb-2">⚠️ Experto (Jefe) — Nerfeado</p>
                <ul className="text-[11px] text-gray-300 space-y-1.5 leading-relaxed">
                  <li>• Personaje <strong className="text-white">ALEATORIO</strong> (sin elección)</li>
                  <li>• Solo tiene <strong className="text-white">1 vida</strong> por ronda</li>
                  <li>• Mismo formato Bo3</li>
                </ul>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
              El hándicap existe para equilibrar la diferencia de nivel entre un jugador experimentado y uno más nuevo.
              Si el Aspirante vence al Jefe, demuestra que puede competir a ese nivel.
            </p>
          </div>

          {/* Modos Gran Final */}
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/4 p-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 flex items-center gap-2 mb-3">
              <span>🏆</span> Modos de la Gran Final
            </h4>
            <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
              El modo de la Gran Final se determina automáticamente según quién gane el Boss Fight.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: '⚔️', name: 'Duelo de Titanes',
                  cond: 'Los 2 Expertos ganan',
                  desc: 'Los dos Jefes se enfrentan sin restricciones. Pueden elegir su mejor personaje y juegan con todas sus vidas.',
                  color: '#fbbf24',
                },
                {
                  icon: '🎭', name: 'La Gran Sorpresa',
                  cond: 'Los 2 Aspirantes ganan',
                  desc: 'Los desafiadores derrotaron a los Jefes. Final libre entre ellos — sin nerf adicional.',
                  color: '#a78bfa',
                },
                {
                  icon: '🪨', name: 'David vs Goliat',
                  cond: '1 Experto + 1 Aspirante',
                  desc: 'El Experto mantiene el hándicap del Boss Fight: personaje aleatorio y 1 sola vida. El Aspirante juega libre.',
                  color: '#fb923c',
                },
              ].map(m => (
                <div key={m.name} className="rounded-xl border border-gray-700/40 bg-gray-900/50 p-3">
                  <p className="text-2xl mb-2">{m.icon}</p>
                  <p className="text-xs font-bold text-white mb-0.5">{m.name}</p>
                  <p className="text-[10px] font-semibold mb-1.5" style={{ color: m.color }}>Si: {m.cond}</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Normas generales */}
          <div className="rounded-xl border border-gray-700/30 bg-gray-900/30 px-4 py-3">
            <p className="text-[11px] font-bold text-gray-300 mb-1.5">⚡ Normas de Agilidad</p>
            <ul className="text-[11px] text-gray-400 space-y-1 leading-relaxed">
              <li>• <strong className="text-white">Sin Fatalities ni cinemáticas largas</strong> hasta la Gran Final. En la final se permite todo.</li>
              <li>• <strong className="text-white">W.O.:</strong> si un jugador no se presenta en 2 minutos tras ser llamado, pierde el match automáticamente.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── InitModal ─────────────────────────────────────────────────────────────────
function InitModal({ isOpen, onClose, onConfirm }) {
  const [tipo, setTipo] = useState('real');
  const [jugadores, setJugadores] = useState([]);
  const [selectedRuts, setSelectedRuts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiFetch('/mk-eval').then(data => {
        setJugadores(data);
        if (tipo === 'real') {
          setSelectedRuts(data.map(j => j.jugador.rut));
        } else {
          setSelectedRuts([]);
        }
      }).catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [isOpen]); // only fetch on modal open, handleTipoChange handles tab switches in memory

  const handleTipoChange = (newTipo) => {
    setTipo(newTipo);
    if (newTipo === 'real') {
      setSelectedRuts(jugadores.map(j => j.jugador.rut));
    } else {
      setSelectedRuts([]);
    }
  };

  const togglePlayer = (rut) => {
    if (selectedRuts.includes(rut)) {
      setSelectedRuts(selectedRuts.filter(r => r !== rut));
    } else {
      setSelectedRuts([...selectedRuts, rut]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        <div className="p-5 border-b border-gray-800" style={{ background: `linear-gradient(135deg, ${MK_DARK}40 0%, transparent 100%)` }}>
          <h2 className="text-xl font-black text-white">Iniciar Torneo MK</h2>
          <p className="text-sm text-gray-400 mt-1">Selecciona el modo y confirma los asistentes</p>
        </div>
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => handleTipoChange('real')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${tipo === 'real' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}
            >
              🏆 Torneo Real
            </button>
            <button
              onClick={() => handleTipoChange('practica')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${tipo === 'practica' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}
            >
              🎮 Práctica
            </button>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Jugadores a incluir ({selectedRuts.length})</span>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-6">Cargando jugadores...</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {jugadores.length === 0 && <p className="text-xs text-gray-500 italic py-2">No hay jugadores evaluados.</p>}
                {jugadores.map(ev => {
                  const rut = ev.jugador.rut;
                  const selected = selectedRuts.includes(rut);
                  return (
                    <div 
                      key={rut} 
                      onClick={() => togglePlayer(rut)}
                      role="button"
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${selected ? 'bg-red-500/10 border border-red-500/20' : 'bg-transparent border border-transparent hover:bg-white/5'}`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${selected ? 'bg-red-500 border-red-400' : 'bg-black/50 border-gray-600'}`}>
                        {selected && <span className="text-white text-xs font-black">✓</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-400'}`}>{ev.jugador.nombre}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">{ev.rango} ({ev.score} pts)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button 
            onClick={() => onConfirm(selectedRuts)}
            disabled={selectedRuts.length < 2 || loading}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all"
          >
            Sembrar Torneo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MortalKombatTournament() {
  const { user } = useStore();
  const isAdmin  = user?.role === 'admin';

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [spectatorOpen, setSpectatorOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [settings, setSettings]       = useState(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetch('/mk-tournament');
      setTournament(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch('/settings');
      setSettings(data);
    } catch (e) {
      console.error("Error cargando configuración:", e);
    }
  }, []);

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await apiFetch('/settings/update', {
        method: 'POST',
        body: JSON.stringify(newSettings),
      });
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (e) {
      console.error("Error al guardar configuración:", e);
    }
  };

  const handleToggleProject = async (fase, matchId, projected) => {
    try {
      const data = await apiFetch('/mk-tournament/project', {
        method: 'POST',
        body: JSON.stringify({ fase, matchId, projected }),
      });
      if (data.success) {
        setTournament(data.tournament);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Escuchar actualizaciones en tiempo real del torneo mediante sockets
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on("mk_tournament_updated", load);
      return () => {
        socket.off("mk_tournament_updated", load);
      };
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSeed = async (selectedRuts) => {
    setInitModalOpen(false);
    if (!window.confirm('Esto reiniciará el torneo y lo sembrará con los jugadores seleccionados. ¿Continuar?')) return;
    setLoading(true);
    try {
      const { tournament } = await apiFetch('/mk-tournament/seed', { 
        method: 'POST',
        body: JSON.stringify({ ruts: selectedRuts })
      });
      setTournament(tournament);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Resetear el torneo? Se borrarán todos los enfrentamientos.')) return;
    setLoading(true);
    try {
      const { tournament } = await apiFetch('/mk-tournament/reset', { method: 'POST' });
      setTournament(tournament);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleSetWinner = async (fase, matchId, ganadorRut) => {
    setLoading(true);
    try {
      const { tournament } = await apiFetch('/mk-tournament/match', {
        method: 'POST',
        body: JSON.stringify({ fase, matchId, ganadorRut }),
      });
      setTournament(tournament);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <span className="text-4xl animate-pulse">🐉</span>
      </div>
    );
  }

  const faseIdx    = FASE_IDX[tournament.estado] ?? 0;
  const curFase    = FASES[faseIdx];
  const locked     = !isAdmin || loading;
  const phaseAt    = (id) => (FASE_IDX[id] ?? 0) <= faseIdx;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${MK_DARK} 0%, #1c0609 55%, #0d0d0f 100%)`,
          borderColor: `${MK_CRIMSON}50`,
          boxShadow: `0 8px 32px ${MK_CRIMSON}20`,
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-end pr-4 select-none pointer-events-none text-[160px] leading-none"
          style={{ opacity: 0.06 }}
        >
          🐉
        </div>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black" style={{ color: MK_CRIMSON }}>
              Torneo Oficial · Club Video Juegos
            </p>
            <h2 className="text-3xl font-black text-white mt-1 leading-tight">Mortal Kombat XL</h2>
            <p className="text-base text-gray-400 italic mt-0.5">"Desafío a los Jefes"</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{ background: `${MK_CRIMSON}18`, borderColor: `${MK_CRIMSON}40`, color: '#fca5a5' }}
              >
                {curFase.icon} {curFase.short}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/30 border border-white/8 text-[11px] text-gray-400">
                🥇 {tournament.expertos?.length || 0} ·
                🥈 {tournament.intermedios?.length || 0} ·
                🎮 {tournament.novatos?.length || 0} participantes
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:self-end">
            <button
              type="button"
              onClick={() => setSpectatorOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-red-400 border border-red-500/25 bg-red-500/8 hover:bg-red-500/15 hover:border-red-500/40 transition-all flex items-center gap-1.5"
            >
              📺 Pantalla Grande
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-green-400 border border-green-500/25 bg-green-500/8 hover:bg-green-500/15 hover:border-green-500/40 transition-all flex items-center gap-1.5"
                >
                  📱 Configurar QR
                </button>
                <button
                  onClick={() => setInitModalOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${MK_CRIMSON}, ${MK_DARK})` }}
                >
                  {tournament.estado === 'sin_iniciar' ? '⚔️ Sembrar Torneo' : '🔄 Re-Sembrar'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-surface border border-surface-border text-gray-400 hover:text-white hover:bg-surface-hover disabled:opacity-40 transition-all"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Phase Stepper ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-800/60 bg-surface-card px-5 py-4">
        <PhaseStepper estado={tournament.estado} />
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/35 bg-red-500/8 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Campeón ───────────────────────────────────────────────────────── */}
      {tournament.estado === 'finalizado' && tournament.campeon && (
        <div
          className="rounded-2xl border-2 p-6 flex items-center gap-5"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(192,16,30,0.08) 100%)',
            borderColor: '#fbbf24',
            boxShadow: '0 0 40px rgba(251,191,36,0.15)',
          }}
        >
          <span className="text-5xl">👑</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-black">
              Campeón · Mortal Kombat XL
            </p>
            <p className="text-3xl font-black text-white mt-0.5">{tournament.campeon.nombre}</p>
            <p className="text-sm text-gray-400 mt-1">
              {RANGO_CFG[tournament.campeon.rango]?.emoji} {RANGO_CFG[tournament.campeon.rango]?.label} &nbsp;·&nbsp; {tournament.campeon.score}/12 pts en escrutinio
            </p>
          </div>
        </div>
      )}

      {/* ── Reglas ────────────────────────────────────────────────────────── */}
      <RulesPanel />

      {/* ── Flujo del Torneo ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">

        {/* Bloque A */}
        <PhaseSection
          matches={tournament.bloqueA || []}
          fase="bloque_a"
          title="Bloque A — Novatos"
          subtitle="Eliminatoria entre jugadores Bronce (0–4 pts en escrutinio)"
          icon="🎮"
          accentColor="#fb923c"
          accentBg="linear-gradient(135deg, rgba(251,146,60,0.07) 0%, transparent 100%)"
          onSetWinner={handleSetWinner}
          onToggleProject={handleToggleProject}
          locked={locked}
          isAdmin={isAdmin}
          active={phaseAt('bloque_a')}
          emptyMsg="Siembra el torneo para generar los matches del Bloque A."
          footer={tournament.ganadorA && (
            <div className="flex items-center gap-2.5 bg-orange-500/8 border border-orange-500/20 rounded-xl px-3 py-2.5 mt-1">
              <span className="text-orange-400 font-black text-base">→</span>
              <span className="text-[11px] text-orange-300 font-semibold shrink-0">Sube al Bloque B:</span>
              <PlayerChip jugador={tournament.ganadorA} />
            </div>
          )}
        />

        <PhaseConnector label="ganador asciende al Bloque B" active={phaseAt('bloque_b')} />

        {/* Bloque B */}
        <PhaseSection
          matches={tournament.bloqueB || []}
          fase="bloque_b"
          title="Bloque B — Intermedios + Ganador A"
          subtitle="Los 2 mejores pasan al Boss Fight como Aspirantes"
          icon="🥈"
          accentColor="#94a3b8"
          accentBg="linear-gradient(135deg, rgba(148,163,184,0.07) 0%, transparent 100%)"
          onSetWinner={handleSetWinner}
          onToggleProject={handleToggleProject}
          locked={locked}
          isAdmin={isAdmin}
          active={phaseAt('bloque_b')}
          emptyMsg={
            tournament.aspirantes?.length === 2 && (!tournament.bloqueB || tournament.bloqueB.length === 0)
              ? "Bloque B omitido: Solo 2 jugadores en el pool. Ambos avanzan automáticamente como Aspirantes."
              : "El Bloque B se activa al terminar el Bloque A."
          }
          footer={tournament.aspirantes?.length === 2 && (
            <div className="flex flex-wrap items-center gap-2.5 bg-slate-500/8 border border-slate-500/20 rounded-xl px-3 py-2.5 mt-1">
              <span className="text-slate-300 font-black text-base">→</span>
              <span className="text-[11px] text-slate-300 font-semibold shrink-0">Aspirantes al Boss Fight:</span>
              {tournament.aspirantes.map(a => <PlayerChip key={a.rut} jugador={a} />)}
            </div>
          )}
        />

        <PhaseConnector label="top 2 → Aspirantes al Boss Fight" active={phaseAt('boss_fight')} />

        {/* Boss Fight */}
        <PhaseSection
          matches={tournament.bossFight || []}
          fase="boss_fight"
          title="Boss Fight — Desafío a los Jefes"
          subtitle="Cada Aspirante reta a un Experto nerfeado · Formato Bo3"
          icon="👹"
          accentColor={MK_CRIMSON}
          accentBg={`linear-gradient(135deg, ${MK_CRIMSON}10 0%, transparent 100%)`}
          onSetWinner={handleSetWinner}
          onToggleProject={handleToggleProject}
          locked={locked}
          isAdmin={isAdmin}
          active={phaseAt('boss_fight')}
          emptyMsg="El Boss Fight se activa al terminar el Bloque B."
        />

        {tournament.bossFight?.length > 0 && (
          <PhaseConnector label="ganadores pasan a la Gran Final" active={phaseAt('final')} />
        )}

        {/* Gran Final */}
        {tournament.finalMatch?.modo && (
          <div
            className={`rounded-2xl border-2 overflow-hidden transition-all ${phaseAt('final') ? '' : 'opacity-50'}`}
            style={{
              borderColor: '#fbbf2490',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(192,16,30,0.05) 100%)',
            }}
          >
            {/* Final header */}
            <div
              className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap"
              style={{ borderColor: 'rgba(251,191,36,0.15)' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-yellow-400">Gran Final</p>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {tournament.finalMatch.modo === 'titanes'      && '⚔️ Duelo de Titanes'}
                  {tournament.finalMatch.modo === 'sorpresa'     && '🎭 La Gran Sorpresa'}
                  {tournament.finalMatch.modo === 'david_goliat' && '🪨 David vs Goliat'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tournament.finalMatch.modo === 'titanes'      && 'Ambos Expertos sin restricciones — eligen su mejor personaje.'}
                  {tournament.finalMatch.modo === 'sorpresa'     && 'Los 2 Aspirantes vencieron a los Jefes — final entre ellos.'}
                  {tournament.finalMatch.modo === 'david_goliat' && 'El Experto mantiene el nerf: personaje aleatorio + 1 vida solamente.'}
                </p>
              </div>
              {tournament.finalMatch.nerfRandom && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  ⚠️ Nerf Activo
                </span>
              )}
            </div>

            {/* Final match */}
            <div className="p-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                {[tournament.finalMatch.jugador1, tournament.finalMatch.jugador2].map((jugador, idx) => {
                  const rut    = jugador?.rut;
                  const isDone = tournament.finalMatch.estado === 'completado';
                  const isW    = tournament.finalMatch.ganador === rut;
                  const isL    = isDone && tournament.finalMatch.ganador && !isW;
                  const canPick = !locked && !isDone && jugador;
                  return (
                    <React.Fragment key={idx}>
                      <button
                        type="button"
                        disabled={!canPick}
                        onClick={() => canPick && handleSetWinner('final', 'final', rut)}
                        className={`flex-1 flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-all group ${
                          isW     ? 'bg-green-500/15 border-green-400/60' :
                          isL     ? 'opacity-30 border-transparent cursor-default' :
                          canPick ? 'border-yellow-500/25 hover:border-yellow-400/50 hover:bg-yellow-500/7 cursor-pointer' :
                                    'border-yellow-500/15 cursor-default'
                        }`}
                      >
                        <PlayerChip jugador={jugador} big dim={isL} />
                        {isW
                          ? <span className="text-green-400 font-black text-2xl shrink-0">✓</span>
                          : canPick
                            ? <span className="text-gray-700 group-hover:text-yellow-400/70 text-sm transition-colors shrink-0">↩</span>
                            : null}
                      </button>
                      {idx === 0 && (
                        <div className="flex items-center justify-center shrink-0">
                          <span
                            className="text-2xl font-black px-1"
                            style={{ color: MK_CRIMSON, textShadow: `0 0 20px ${MK_CRIMSON}` }}
                          >
                            VS
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {isAdmin && tournament.finalMatch.estado !== 'completado' && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleProject('final', 'final', !tournament.finalMatch.projected)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      tournament.finalMatch.projected
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 font-black'
                        : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tournament.finalMatch.projected ? '📺 Proyectado' : '📺 Proyectar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Rosters ───────────────────────────────────────────────────────── */}
      {(tournament.expertos?.length > 0 || tournament.intermedios?.length > 0 || tournament.novatos?.length > 0) && (
        <details className="rounded-2xl border border-gray-800/50 bg-surface-card overflow-hidden">
          <summary className="cursor-pointer flex items-center gap-2.5 px-5 py-4 text-sm font-bold text-white hover:bg-white/2 transition-colors select-none">
            <span>👥</span>
            <span>Participantes clasificados</span>
            <span className="ml-auto text-gray-600">▾</span>
          </summary>
          <div className="border-t border-gray-800/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: '🥇 Expertos',    subtitle: 'Los 2 con mayor score son los Jefes', list: tournament.expertos,    bg: 'rgba(251,191,36,0.05)',  border: 'rgba(251,191,36,0.2)' },
              { title: '🥈 Intermedios', subtitle: 'Entran directo al Bloque B',          list: tournament.intermedios, bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.2)' },
              { title: '🎮 Novatos',     subtitle: 'Empiezan en el Bloque A',             list: tournament.novatos,     bg: 'rgba(251,146,60,0.05)',  border: 'rgba(251,146,60,0.2)' },
            ].map(g => (
              <div key={g.title} className="rounded-xl border p-4" style={{ background: g.bg, borderColor: g.border }}>
                <h4 className="text-xs font-bold text-white">{g.title}</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 mt-0.5">{g.subtitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(g.list || []).length === 0
                    ? <span className="text-xs text-gray-600 italic">Sin jugadores</span>
                    : g.list.map(p => <PlayerChip key={p.rut} jugador={p} />)}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <InitModal 
        isOpen={initModalOpen} 
        onClose={() => setInitModalOpen(false)} 
        onConfirm={handleSeed} 
      />

      {qrModalOpen && (
        <MortalKombatRegistrationModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
        />
      )}

      {spectatorOpen && createPortal(
        <MKSpectatorView
          tournament={tournament}
          onSetWinner={handleSetWinner}
          onClose={() => setSpectatorOpen(false)}
          settings={settings}
          isAdmin={isAdmin}
        />,
        document.body
      )}
    </div>
  );
}

// ── CSS Animations for Confetti ────────────────────────────────────────────────
const confettiStyles = `
  @keyframes fall {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(105vh) rotate(360deg); opacity: 0.3; }
  }
  .confetti-piece {
    position: absolute;
    top: -20px;
    width: 8px;
    height: 14px;
    animation: fall linear infinite;
  }
`;

// ── MortalKombatRegistrationModal ──────────────────────────────────────────────
function MortalKombatRegistrationModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [formUrl, setFormUrl] = useState(settings?.mortalKombatFormUrl || '');
  const [excelUrl, setExcelUrl] = useState(settings?.mortalKombatExcelUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormUrl(settings.mortalKombatFormUrl || '');
      setExcelUrl(settings.mortalKombatExcelUrl || '');
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        mortalKombatFormUrl: formUrl,
        mortalKombatExcelUrl: excelUrl,
      });
      onClose();
    } catch (err) {
      alert("Error al guardar configuración: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-white mb-2">Configuración de Inscripción MK</h3>
        <p className="text-xs text-gray-400 mb-6">
          Define las URLs del formulario de inscripción y la hoja de datos para el Torneo de Mortal Kombat XL.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
              Formulario de Inscripción (Link o QR)
            </label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
              placeholder="https://forms.office.com/r/..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
              URL de Google Sheet / Excel
            </label>
            <input
              type="url"
              value={excelUrl}
              onChange={(e) => setExcelUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PlayerAvatar helper for Spectator View ──────────────────────────────────────
function PlayerAvatar({ name, range, winner, isL }) {
  const cfg = RANGO_CFG[range] || RANGO_CFG.Bronce;
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
  return (
    <div
      className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-4xl font-black transition-all relative ${
        winner ? 'scale-110 shadow-[0_0_35px_rgba(34,197,94,0.4)]' : ''
      } ${isL ? 'opacity-30' : ''}`}
      style={{
        background: `radial-gradient(circle, ${cfg.color}15 0%, #171717 100%)`,
        borderColor: winner ? '#22c55e' : cfg.color,
        color: cfg.color,
        boxShadow: winner ? 'none' : `0 0 25px ${cfg.color}25`,
      }}
    >
      {initials}
      {winner && (
        <span className="absolute -top-2 -right-2 bg-green-500 border-2 border-neutral-900 rounded-full w-9 h-9 flex items-center justify-center text-xl shadow-lg">
          ✓
        </span>
      )}
    </div>
  );
}

// ── MKSpectatorView ────────────────────────────────────────────────────────────
function MKSpectatorView({ tournament, onSetWinner, onClose, settings, isAdmin }) {
  const [timer, setTimer] = useState(99);
  const [isRunning, setIsRunning] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleSync = (state) => {
      if (state.running) {
        const elapsed = Math.floor((Date.now() - state.lastUpdate) / 1000);
        setTimer(Math.max(0, state.seconds - elapsed));
      } else {
        setTimer(state.seconds);
      }
      setIsRunning(state.running);
    };

    const handleControl = (data) => {
      if (data.action === 'start') {
        setIsRunning(true);
        setTimer(data.seconds);
      } else if (data.action === 'pause') {
        setIsRunning(false);
        setTimer(data.seconds);
      } else if (data.action === 'reset') {
        setIsRunning(false);
        setTimer(data.seconds || 99);
      }
    };

    socket.on('mk_timer:sync', handleSync);
    socket.on('mk_timer:control', handleControl);
    socket.emit('mk_timer:request_sync');

    return () => {
      socket.off('mk_timer:sync', handleSync);
      socket.off('mk_timer:control', handleControl);
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const startTimer = (secs) => {
    const socket = getSocket();
    if (socket) socket.emit('mk_timer:control', { action: 'start', seconds: secs });
  };
  const pauseTimer = (secs) => {
    const socket = getSocket();
    if (socket) socket.emit('mk_timer:control', { action: 'pause', seconds: secs });
  };
  const resetTimer = (secs = 99) => {
    const socket = getSocket();
    if (socket) socket.emit('mk_timer:control', { action: 'reset', seconds: secs });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Buscar duelo proyectado
  let match = null;
  let matchFase = '';
  
  if (tournament.bloqueA) {
    const found = tournament.bloqueA.find(m => m.projected);
    if (found) { match = found; matchFase = 'bloque_a'; }
  }
  if (!match && tournament.bloqueB) {
    const found = tournament.bloqueB.find(m => m.projected);
    if (found) { match = found; matchFase = 'bloque_b'; }
  }
  if (!match && tournament.bossFight) {
    const found = tournament.bossFight.find(m => m.projected);
    if (found) { match = found; matchFase = 'boss_fight'; }
  }
  if (!match && tournament.finalMatch?.projected) {
    match = tournament.finalMatch;
    matchFase = 'final';
  }

  // Fallback a primer pendiente si no hay ninguno marcado como proyectado
  if (!match) {
    if (tournament.estado === 'bloque_a' && tournament.bloqueA) {
      match = tournament.bloqueA.find(m => m.estado === 'pendiente' && m.jugador1 && m.jugador2);
      matchFase = 'bloque_a';
    } else if (tournament.estado === 'bloque_b' && tournament.bloqueB) {
      match = tournament.bloqueB.find(m => m.estado === 'pendiente' && m.jugador1 && m.jugador2);
      matchFase = 'bloque_b';
    } else if (tournament.estado === 'boss_fight' && tournament.bossFight) {
      match = tournament.bossFight.find(m => m.estado === 'pendiente' && m.jugador1 && m.jugador2);
      matchFase = 'boss_fight';
    } else if (tournament.estado === 'final') {
      match = tournament.finalMatch;
      matchFase = 'final';
    }
  }

  // Listar próximos duelos de la fase activa
  let upcoming = [];
  if (tournament.estado === 'bloque_a' && tournament.bloqueA) {
    upcoming = tournament.bloqueA.filter(m => m.estado === 'pendiente' && m.id !== match?.id && m.jugador1 && m.jugador2);
  } else if (tournament.estado === 'bloque_b' && tournament.bloqueB) {
    upcoming = tournament.bloqueB.filter(m => m.estado === 'pendiente' && m.id !== match?.id && m.jugador1 && m.jugador2);
  } else if (tournament.estado === 'boss_fight' && tournament.bossFight) {
    upcoming = tournament.bossFight.filter(m => m.estado === 'pendiente' && m.id !== match?.id && m.jugador1 && m.jugador2);
  }

  const handleWinnerClick = (player) => {
    if (!isAdmin) return;
    if (!match || match.estado === 'completado') return;
    if (window.confirm(`¿Confirmar a ${player.nombre} como ganador del combate?`)) {
      onSetWinner(matchFase, match.id, player.rut);
    }
  };

  const localRegisterUrl = `${window.location.origin}/?register=mortalkombat`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(localRegisterUrl)}`;

  const activePhaseInfo = FASES.find(f => f.id === tournament.estado) || FASES[0];

  const getHandicapDetails = () => {
    if (!match) return null;
    
    if (matchFase === 'boss_fight') {
      const isJ1Boss = match.jugador1?.rango === 'Oro';
      const boss = isJ1Boss ? match.jugador1 : match.jugador2;
      const challenger = isJ1Boss ? match.jugador2 : match.jugador1;
      
      return (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="text-[10px] uppercase tracking-widest font-black text-red-500/70">Restricciones (Boss Fight)</div>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl justify-center">
            <div className="flex-1 bg-red-950/25 border border-red-500/30 rounded-xl p-4 flex flex-col items-center gap-1">
              <span className="text-sm font-bold text-red-400">👹 Jefe: {boss?.nombre}</span>
              <span className="text-xs text-red-300/80 text-center">Personaje ALEATORIO · Solo 1 Vida</span>
            </div>
            <div className="flex-1 bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center gap-1">
              <span className="text-sm font-bold text-emerald-400">⚔️ Aspirante: {challenger?.nombre}</span>
              <span className="text-xs text-emerald-300/80 text-center">Personaje LIBRE · 2 Vidas</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (matchFase === 'final') {
      if (match.modo === 'david_goliat') {
        const isJ1Boss = match.jugador1?.rango === 'Oro';
        const boss = isJ1Boss ? match.jugador1 : match.jugador2;
        const challenger = isJ1Boss ? match.jugador2 : match.jugador1;
        
        return (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="text-[10px] uppercase tracking-widest font-black text-yellow-500/70">Gran Final: David vs Goliat</div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl justify-center">
              <div className="flex-1 bg-red-950/25 border border-red-500/30 rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-sm font-bold text-red-400">👹 Experto (Nerf): {boss?.nombre}</span>
                <span className="text-xs text-red-300/80 text-center">Personaje ALEATORIO · Solo 1 Vida</span>
              </div>
              <div className="flex-1 bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-sm font-bold text-emerald-400">⚔️ Aspirante (Libre): {challenger?.nombre}</span>
                <span className="text-xs text-emerald-300/80 text-center">Personaje LIBRE · 2 Vidas</span>
              </div>
            </div>
          </div>
        );
      } else if (match.modo === 'titanes') {
        return (
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="text-[10px] uppercase tracking-widest font-black text-yellow-500/70">Gran Final: Duelo de Titanes</div>
            <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-6 py-3 text-center">
              <span className="text-sm font-bold text-yellow-400 block">🏆 Ambos Expertos sin restricciones</span>
              <span className="text-xs text-yellow-100/70 mt-0.5 block">Personaje Libre · 2 Vidas</span>
            </div>
          </div>
        );
      } else if (match.modo === 'sorpresa') {
        return (
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="text-[10px] uppercase tracking-widest font-black text-purple-500/70">Gran Final: La Gran Sorpresa</div>
            <div className="bg-purple-500/10 border border-purple-500/25 rounded-xl px-6 py-3 text-center">
              <span className="text-sm font-bold text-purple-400 block">🎭 Combate de Aspirantes</span>
              <span className="text-xs text-purple-100/70 mt-0.5 block">Personaje Libre · 2 Vidas</span>
            </div>
          </div>
        );
      }
    }
    
    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="text-[10px] uppercase tracking-widest font-black text-neutral-600">Reglas de Combate</div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 text-center text-xs text-gray-400">
          Combate Regular: Personaje Libre · 2 Vidas · Sin Restricciones
        </div>
      </div>
    );
  };

  const Confetti = () => {
    const pieces = Array.from({ length: 85 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 6;
      const duration = 3 + Math.random() * 4;
      const colors = ['#c0101e', '#eab308', '#22c55e', '#3b82f6', '#ec4899', '#a855f7'];
      const bg = colors[Math.floor(Math.random() * colors.length)];
      return (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            background: bg,
          }}
        />
      );
    });
    return <div className="absolute inset-0 overflow-hidden pointer-events-none">{pieces}</div>;
  };

  return (
    <div className="fixed inset-0 bg-[#0c0001] bg-gradient-to-br from-[#0c0001] via-[#120406] to-[#050001] z-50 overflow-y-auto font-sans text-white flex flex-col justify-between p-6 select-none animate-fade-in">
      <style dangerouslySetInnerHTML={{ __html: confettiStyles }} />

      {tournament.estado === 'finalizado' && tournament.campeon && <Confetti />}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl filter drop-shadow-[0_0_8px_#c0101e]">🐉</span>
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase text-white">Mortal Kombat XL</h1>
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span>{activePhaseInfo.icon}</span>
              <span>{activePhaseInfo.short}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && !showQr && tournament.estado !== 'finalizado' && (
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => isRunning ? pauseTimer(timer) : startTimer(timer)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isRunning ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {isRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                type="button"
                onClick={() => resetTimer(99)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all"
              >
                99s
              </button>
              <button
                type="button"
                onClick={() => resetTimer(60)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all"
              >
                60s
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-red-500 transition-all font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Center area */}
      <div className="flex-1 flex flex-col justify-center my-6">
        {tournament.estado === 'finalizado' && tournament.campeon ? (
          <div className="text-center flex flex-col items-center justify-center gap-4 animate-scale-up py-10">
            <span className="text-8xl animate-bounce filter drop-shadow-[0_0_20px_#eab308]">👑</span>
            <div className="mt-2">
              <p className="text-[12px] uppercase tracking-widest text-yellow-500 font-black">Campeón del Torneo</p>
              <h2 className="text-5xl md:text-6xl font-black text-white mt-1 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                {tournament.campeon.nombre}
              </h2>
              <p className="text-sm text-gray-400 mt-2">
                Rango: {RANGO_CFG[tournament.campeon.rango]?.emoji} {RANGO_CFG[tournament.campeon.rango]?.label} &nbsp;·&nbsp; {tournament.campeon.score}/12 pts
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-lg hover:shadow-red-600/35"
            >
              Cerrar Espectador
            </button>
          </div>
        ) : !match ? (
          <div className="text-center py-20 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl animate-pulse">🐉</span>
            <p className="text-lg text-gray-400 font-semibold italic">Esperando al siguiente combate...</p>
            <p className="text-xs text-gray-600 uppercase tracking-widest">Organizando llaves y proyectando partidas</p>
          </div>
        ) : (
          <div className="w-full max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6">
              {/* Player 1 Card */}
              <div className="md:col-span-2 flex flex-col items-center">
                <div
                  onClick={() => handleWinnerClick(match.jugador1)}
                  className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all w-full ${
                    isAdmin && match.estado !== 'completado' ? 'cursor-pointer hover:border-green-500/40 hover:bg-green-500/5 group' : ''
                  } ${
                    match.ganador === match.jugador1?.rut ? 'bg-green-500/10 border-green-500/50' :
                    match.ganador && match.ganador !== match.jugador1?.rut ? 'opacity-30 border-transparent' :
                    'bg-neutral-900/40 border-white/5'
                  }`}
                >
                  <PlayerAvatar
                    name={match.jugador1?.nombre}
                    range={match.jugador1?.rango}
                    winner={match.ganador === match.jugador1?.rut}
                    isL={match.ganador && match.ganador !== match.jugador1?.rut}
                  />
                  <h3 className="text-2xl md:text-3xl font-black text-white text-center mt-4 truncate w-full">
                    {match.jugador1?.nombre}
                  </h3>
                  <span
                    className="text-[10px] uppercase tracking-wider font-bold mt-1.5 px-2.5 py-0.5 rounded-full"
                    style={{
                      background: (RANGO_CFG[match.jugador1?.rango] || RANGO_CFG.Bronce).bg,
                      color: (RANGO_CFG[match.jugador1?.rango] || RANGO_CFG.Bronce).color,
                    }}
                  >
                    {match.jugador1?.rango === 'Oro' ? 'Experto / Jefe' :
                     match.jugador1?.rango === 'Plata' ? 'Peleador Intermedio' : 'Novato Casual'}
                  </span>
                  {isAdmin && match.estado !== 'completado' && (
                    <span className="text-[10px] text-green-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                      ✓ Declarar Ganador
                    </span>
                  )}
                </div>
              </div>

              {/* VS & Timer */}
              <div className="md:col-span-1 flex flex-col items-center justify-center py-4 md:py-0">
                <span className="text-4xl md:text-5xl font-black italic tracking-tighter text-red-600 filter drop-shadow-[0_0_15px_#c0101e]">
                  VS
                </span>

                <div className="mt-4 flex flex-col items-center">
                  <div
                    className={`w-28 h-28 rounded-full border-4 flex items-center justify-center text-4xl font-black transition-all ${
                      isRunning ? 'border-amber-500 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]' : 'border-neutral-800 text-neutral-500'
                    }`}
                    style={isRunning ? { textShadow: '0 0 10px rgba(245,158,11,0.5)' } : {}}
                  >
                    {timer}
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold mt-2">Segundos</span>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className="md:col-span-2 flex flex-col items-center">
                <div
                  onClick={() => handleWinnerClick(match.jugador2)}
                  className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all w-full ${
                    isAdmin && match.estado !== 'completado' ? 'cursor-pointer hover:border-green-500/40 hover:bg-green-500/5 group' : ''
                  } ${
                    match.ganador === match.jugador2?.rut ? 'bg-green-500/10 border-green-500/50' :
                    match.ganador && match.ganador !== match.jugador2?.rut ? 'opacity-30 border-transparent' :
                    'bg-neutral-900/40 border-white/5'
                  }`}
                >
                  <PlayerAvatar
                    name={match.jugador2?.nombre}
                    range={match.jugador2?.rango}
                    winner={match.ganador === match.jugador2?.rut}
                    isL={match.ganador && match.ganador !== match.jugador2?.rut}
                  />
                  <h3 className="text-2xl md:text-3xl font-black text-white text-center mt-4 truncate w-full">
                    {match.jugador2?.nombre}
                  </h3>
                  <span
                    className="text-[10px] uppercase tracking-wider font-bold mt-1.5 px-2.5 py-0.5 rounded-full"
                    style={{
                      background: (RANGO_CFG[match.jugador2?.rango] || RANGO_CFG.Bronce).bg,
                      color: (RANGO_CFG[match.jugador2?.rango] || RANGO_CFG.Bronce).color,
                    }}
                  >
                    {match.jugador2?.rango === 'Oro' ? 'Experto / Jefe' :
                     match.jugador2?.rango === 'Plata' ? 'Peleador Intermedio' : 'Novato Casual'}
                  </span>
                  {isAdmin && match.estado !== 'completado' && (
                    <span className="text-[10px] text-green-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                      ✓ Declarar Ganador
                    </span>
                  )}
                </div>
              </div>
            </div>

            {getHandicapDetails()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col items-center md:items-start w-full">
          {upcoming.length > 0 && (
            <>
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1.5">Siguientes Combates</span>
              <div className="flex flex-wrap gap-2 w-full justify-center md:justify-start">
                {upcoming.slice(0, 3).map((m, idx) => (
                  <div key={m.id || idx} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 max-w-[240px]">
                    <span className="text-neutral-500 font-bold">#{idx+1}</span>
                    <span className="truncate max-w-[80px] font-semibold">{m.jugador1?.nombre}</span>
                    <span className="text-red-500 font-black text-[9px]">VS</span>
                    <span className="truncate max-w-[80px] font-semibold">{m.jugador2?.nombre}</span>
                  </div>
                ))}
                {upcoming.length > 3 && (
                  <span className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-500 font-bold">
                    +{upcoming.length - 3} más
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {qrCodeUrl && (
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 self-center shrink-0"
          >
            📱 Código QR Inscripción
          </button>
        )}
      </div>

      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 text-center relative shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-black text-white mb-1 uppercase tracking-wide">¡Inscríbete en el Torneo!</h3>
            <p className="text-xs text-gray-400 mb-5">Escanea este código QR con tu celular para registrarte.</p>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto mb-4 border border-gray-200">
              <img src={qrCodeUrl} alt="Form QR Code" className="w-[220px] h-[220px]" />
            </div>
            <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">{localRegisterUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}

