/**
 * AdminTrivia.jsx
 * =====================================
 * Panel de control del Admin para la Arena de Trivia.
 * Controla visibilidad, inicio de partida, avance de preguntas y reseteo.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../api/socket';
import useStore from '../store/useStore';
import QuestionManager from './QuestionManager';
import AdminLiveMonitor from './AdminLiveMonitor';

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
      <span className={`text-3xl font-black ${color}`}>{value}</span>
    </div>
  );
}

function FactionRow({ faction, rank }) {
  const medals = ['🥇', '🥈', '🥉'];
  const medal  = medals[rank] || `#${rank + 1}`;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      rank === 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-surface-border bg-surface'
    }`}>
      <span className="text-lg w-7 text-center">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">
          {faction.members[0]?.nombre || `Facción ${faction.factionId}`}
        </p>
      </div>
      <span className="font-black text-brand-light text-lg tabular-nums">
        {faction.factionScore.toLocaleString()}
      </span>
    </div>
  );
}

// ── Animated Podium ─────────────────────────────────────────────────────────
function PodiumCard({ faction, rank, delay }) {
  const podiumStyles = [
    { // 1st
      outerClass: 'order-2',
      barClass:   'h-36 bg-gradient-to-t from-amber-600 to-amber-400',
      medalBg:    'bg-amber-500 shadow-amber-500/50',
      nameBg:     'border-amber-500/40 bg-amber-500/10',
      nameColor:  'text-amber-200',
      scoreColor: 'text-white',
      trophy:     '🥇',
      label:      '1er Lugar',
    },
    { // 2nd
      outerClass: 'order-1',
      barClass:   'h-24 bg-gradient-to-t from-gray-600 to-gray-300',
      medalBg:    'bg-gray-300 shadow-gray-300/50',
      nameBg:     'border-gray-400/30 bg-gray-400/10',
      nameColor:  'text-gray-200',
      scoreColor: 'text-gray-300',
      trophy:     '🥈',
      label:      '2do Lugar',
    },
    { // 3rd
      outerClass: 'order-3',
      barClass:   'h-16 bg-gradient-to-t from-amber-800 to-amber-600',
      medalBg:    'bg-amber-700 shadow-amber-700/50',
      nameBg:     'border-amber-700/40 bg-amber-700/10',
      nameColor:  'text-amber-300',
      scoreColor: 'text-gray-300',
      trophy:     '🥉',
      label:      '3er Lugar',
    },
  ];

  const s = podiumStyles[rank];
  const name = faction.members.map(m => m.nombre).join(' & ');

  return (
    <div
      className={`flex flex-col items-center gap-2 ${s.outerClass} animate-fade-in`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${s.medalBg}`}>
        {s.trophy}
      </div>
      <div className={`px-4 py-2 rounded-xl border text-center max-w-[130px] ${s.nameBg}`}>
        <p className={`font-black text-sm leading-tight ${s.nameColor}`}>{name}</p>
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">{s.label}</p>
        <p className={`font-black text-xl tabular-nums mt-1 ${s.scoreColor}`}>
          {faction.factionScore.toLocaleString()}
          <span className="text-xs text-gray-500 font-bold ml-1">PTS</span>
        </p>
      </div>
      <div className={`w-20 rounded-t-lg ${s.barClass} shadow-lg`} />
    </div>
  );
}

// ── Full Player Table ─────────────────────────────────────────────────────────
function FullRankingTable({ ranking }) {
  // Flatten factions into individual players with their positions
  const players = ranking.flatMap((faction, fi) =>
    faction.members.map(m => ({
      nombre:  m.nombre,
      score:   m.score,
      faction: faction.factionId,
      rank:    fi + 1, // faction rank
    }))
  ).sort((a, b) => b.score - a.score);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xl font-black text-white">Tabla de Puntuaciones Individuales</h3>
        <span className="bg-brand/20 text-brand-light text-xs font-bold px-3 py-1 rounded-full border border-brand/30">
          {players.length} jugadores
        </span>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_auto] gap-4 px-5 py-3 bg-surface border-b border-surface-border">
          <span className="text-[10px] uppercase tracking-widest text-gray-500">#</span>
          <span className="text-[10px] uppercase tracking-widest text-gray-500">Jugador</span>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 text-right">Puntos</span>
        </div>
        {/* Rows */}
        <div className="divide-y divide-surface-border/50">
          {players.map((p, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const badge = medals[i] || null;
            return (
              <div
                key={`${p.faction}-${p.nombre}`}
                className={`grid grid-cols-[2rem_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors ${
                  i === 0 ? 'bg-amber-500/5' : 'hover:bg-surface/50'
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  {badge
                    ? <span className="text-xl">{badge}</span>
                    : <span className="text-sm font-bold text-gray-500 tabular-nums">#{i + 1}</span>
                  }
                </div>

                {/* Name */}
                <div>
                  <p className={`font-bold ${i === 0 ? 'text-amber-300' : 'text-gray-200'}`}>{p.nombre}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className={`font-black text-lg tabular-nums ${i === 0 ? 'text-amber-300' : 'text-gray-300'}`}>
                    {p.score.toLocaleString()}
                    <span className="text-gray-600 text-xs font-normal ml-1">pts</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────

export default function AdminTrivia() {
  const { user, triviaVisible, setTriviaVisible } = useStore();
  const isAdmin = user?.role === 'admin';

  const [snapshot, setSnapshot] = useState(null);
  const [ranking, setRanking]   = useState([]);
  const [answerUpdate, setAnswerUpdate] = useState({ answeredCount: 0, playerCount: 0 });
  const [socket, setSocket]             = useState(null);
  const [disqualifiedRuts, setDisqualifiedRuts] = useState([]);

  // ── Submodule Tabs ───────────────────────────────────────────────────────
  // 'control' | 'monitor' | 'ranking'
  const [activeTab, setActiveTab] = useState('control');

  // ── Anti-Cheat Monitoring ────────────────────────────────────────────────
  const [cheatAlert, setCheatAlert] = useState(null);

  useEffect(() => {
    const s = getSocket('admin');
    setSocket(s);

    s.emit('admin:trivia:getSnapshot');

    s.on('admin:trivia:snapshot', (data) => setSnapshot(data));
    s.on('trivia:ranking', (r) => setRanking(r));
    s.on('admin:trivia:answerUpdate', (u) => setAnswerUpdate(u));
    s.on('trivia:visibility', (visible) => setTriviaVisible(visible));


    s.on('admin:trivia:cheatAlert', (data) => {
      setCheatAlert(data);
    });

    s.on('admin:trivia:disqualifiedList', (list) => {
      setDisqualifiedRuts(list);
    });

    s.on('trivia:resumed', () => {
      setCheatAlert(null);
    });

    s.on('trivia:reset', () => {
      setRanking([]);
      setActiveTab('control');
    });

    s.on('trivia:prepared', (info) => {
      // Opcional: mostrar una notificación o forzar el tab de control
      console.log("Trivia preparada automáticamente:", info);
    });

    return () => {
      s.off('admin:trivia:snapshot');
      s.off('trivia:ranking');
      s.off('admin:trivia:answerUpdate');
      s.off('trivia:visibility');
      s.off('admin:trivia:cheatAlert');
      s.off('trivia:resumed');
      s.off('trivia:reset');
    };
  }, [setTriviaVisible]);

  const handleToggleVisibility = useCallback(() => {
    if (!socket) return;
    socket.emit('sidebar:toggleTrivia');
  }, [socket]);

  const handleStart = useCallback(() => {
    if (!socket) return;
    socket.emit('admin:trivia:start');
  }, [socket]);

  const handleNextQuestion = useCallback(() => {
    if (!socket) return;
    socket.emit('question:start');
  }, [socket]);

  const handleReset = useCallback(() => {
    if (!socket || !isAdmin) return;
    if (!window.confirm('¿Resetear la partida? Se perderán todos los puntajes.')) return;
    socket.emit('admin:trivia:reset');
    setRanking([]);
    setAnswerUpdate({ answeredCount: 0, playerCount: 0 });
    setCheatAlert(null);
    setActiveTab('control');
  }, [socket]);

  const handleResume = useCallback(() => {
    if (!socket) return;
    socket.emit('admin:trivia:resume');
  }, [socket]);

  const status = snapshot?.status || 'idle';
  const isFinished = status === 'finished';

  // ranking is kept live by trivia:ranking events from server
  const displayRanking = ranking;

  // Build individual player list from snapshot.players (server sends this in snapshot)
  const allPlayers = React.useMemo(() => {
    if (!snapshot?.players) return [];
    return Object.entries(snapshot.players)
      .map(([rut, p]) => ({ rut, nombre: p.nombre, score: p.score || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [snapshot?.players]);

  // Auto-switch to ranking tab when status becomes finished
  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    if (prevStatusRef.current !== 'finished' && status === 'finished') {
      setActiveTab('ranking');
    }
    prevStatusRef.current = status;
  }, [status]);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ── Header Row ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Arena de Trivia</h2>
          <p className="text-xs text-gray-500">Panel de Control del Administrador</p>
        </div>

        {/* ── Submodule Tabs ───────────────────────────────────────────────── */}
        <div className="flex bg-surface rounded-xl p-1 border border-surface-border gap-1">
          <button
            onClick={() => setActiveTab('control')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'control'
                ? 'bg-brand text-white shadow-lg shadow-brand/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Control de Partida
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'monitor'
                ? 'bg-brand text-white shadow-lg shadow-brand/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Monitor en Vivo 👁️
          </button>
          {isFinished && (
            <button
              onClick={() => setActiveTab('ranking')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ranking'
                  ? 'bg-amber-500 text-gray-900 shadow-lg shadow-amber-500/20'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              🏆 Ranking Final
            </button>
          )}
        </div>
      </div>

      {/* ── Treasure Roulette Notice ───────────────────────────────────────── */}
      {snapshot?.isRouletteActive && (
        <div className="bg-brand/10 border-2 border-brand/50 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4 animate-pulse">
          <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-2xl">💎</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-brand-light font-black text-lg">Ruleta del Tesoro Activa</h4>
            <p className="text-white text-sm">
              Un alumno ha activado un evento especial. El tiempo se ha detenido automáticamente.
            </p>
            <p className="text-[10px] text-brand-light/70 uppercase tracking-widest mt-1 font-bold">La partida se reanudará cuando termine la animación.</p>
          </div>
        </div>
      )}

      {/* ── Cheat Alert Notice ─────────────────────────────────────────────── */}
      {cheatAlert && (
        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-red-400 font-black text-lg">Posible Trampa Detectada</h4>
            <p className="text-white text-sm">
              El alumno <span className="font-black underline">{cheatAlert.nombre}</span> ({cheatAlert.rut}) ha salido de la pantalla de trivia.
            </p>
            <p className="text-[10px] text-red-400/70 uppercase tracking-widest mt-1 font-bold">El juego ha sido bloqueado para todos los alumnos.</p>
          </div>
          <button
            onClick={handleResume}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/30 shrink-0"
          >
            REANUDAR PARTIDA
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CONTROL DE PARTIDA
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'control' && (
        <div className="flex flex-col gap-5 animate-fade-in">

          {/* ── Stats Row ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Estado"
              value={{ idle: 'En espera', lobby: 'Lobby', question: 'Pregunta', reviewing: 'Revisión', finished: 'Finalizado' }[status] || status}
              color={status === 'question' ? 'text-amber-400' : status === 'finished' ? 'text-green-400' : 'text-white'}
            />
            <StatCard label="Jugadores" value={snapshot?.playerCount ?? 0} color="text-brand-light" />
            <StatCard
              label="Pregunta"
              value={snapshot?.currentQuestionIndex >= 0 ? `${snapshot.currentQuestionIndex + 1} / ${snapshot.totalQuestions}` : '—'}
            />
            <StatCard
              label="Respondieron"
              value={status === 'question' ? `${answerUpdate.answeredCount} / ${answerUpdate.playerCount}` : '—'}
              color="text-emerald-400"
            />
          </div>

          {/* ── 📝 PREPARACIÓN AUTOMÁTICA NOTICE ─────────────────────────────── */}
          {snapshot?.preparationInfo && (
            <div className="bg-brand/10 border-2 border-brand/40 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 animate-fade-in relative overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
              
              <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/10">
                <span className="text-3xl">⚙️</span>
              </div>
              
              <div className="flex-1 text-center md:text-left relative z-10">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-brand-light font-black text-xl">Trivia Preparada Automáticamente</h4>
                  <span className="bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Listo para iniciar</span>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  El sistema ha filtrado <span className="text-white font-black">{snapshot.preparationInfo.questionCount} preguntas</span> de los juegos ganadores.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-gray-900 font-black rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/20 text-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    ABRIR ARENA PARA ESTUDIANTES
                  </button>
                  
                  <div className="flex flex-wrap gap-2">
                    {snapshot.preparationInfo.top3.map((game, i) => (
                      <span key={game} className="bg-surface/50 border border-surface-border/50 px-2 py-1 rounded-lg flex items-center gap-1.5">
                        <span className="text-[10px]">{['🥇','🥈','🥉'][i]}</span>
                        <span className="text-[10px] font-bold text-gray-300">{game}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hora de Prep.</p>
                <p className="text-white font-mono text-sm">
                  {new Date(snapshot.preparationInfo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          {/* ── 🏆 PODIUM ANIMADO (cuando finaliza) ───────────────────────────── */}
          {isFinished && displayRanking.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-[#1a1225] to-[#0a0a0f] p-8 shadow-[0_0_60px_rgba(245,158,11,0.1)]">
              {/* Top shimmer bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
              {/* Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[100px] pointer-events-none" />

              <div className="text-center mb-8 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/70 mb-2">¡Partida Finalizada!</p>
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                  PODIO FINAL
                </h2>
              </div>

              {/* Podium visual (2nd, 1st, 3rd order) */}
              <div className="flex items-end justify-center gap-4 mb-8 relative z-10">
                {/* Always render 2nd, 1st, 3rd */}
                {[1, 0, 2].map((rankIdx) => {
                  const faction = displayRanking[rankIdx];
                  if (!faction) return null;
                  return (
                    <PodiumCard
                      key={faction.factionId}
                      faction={faction}
                      rank={rankIdx}
                      delay={rankIdx === 0 ? 100 : rankIdx === 1 ? 300 : 500}
                    />
                  );
                })}
              </div>

              {/* Rest of the list (4th+) */}
              {displayRanking.length > 3 && (
                <div className="relative z-10 mt-4 border-t border-surface-border/30 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-bold">Resto de clasificación</p>
                  <div className="flex flex-col gap-2">
                    {displayRanking.slice(3).map((faction, i) => (
                      <div key={faction.factionId} className="flex items-center gap-3 p-3 rounded-xl border border-surface-border/50 bg-surface/30">
                        <span className="text-gray-500 font-black text-sm w-6 text-center">#{i + 4}</span>
                        <p className="flex-1 text-sm font-bold text-gray-300">
                          {faction.members.map(m => m.nombre).join(' & ')}
                        </p>
                        <span className="text-gray-400 font-black tabular-nums">
                          {faction.factionScore.toLocaleString()} <span className="text-gray-600 text-xs">pts</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Projected Question Card ─────────────────────────────────────── */}
          {(status === 'question' || status === 'reviewing') && snapshot?.currentQuestion && (
            <div className={`relative overflow-hidden rounded-3xl p-8 border-2 transition-all duration-700 ${
              status === 'reviewing'
                ? 'bg-[#0f1117] border-green-500/40 shadow-[0_0_40px_rgba(34,197,94,0.15)]'
                : 'bg-gradient-to-br from-surface-card to-[#0d0f14] border-brand/40 shadow-2xl shadow-brand/20'
            }`}>
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r transition-all duration-1000 ${
                status === 'reviewing' ? 'from-green-500 to-emerald-400' : 'from-brand via-purple-500 to-cyan-500'
              }`} />

              {/* Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'question' ? 'bg-amber-400' : 'bg-green-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'question' ? 'bg-amber-500' : 'bg-green-500'}`} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  {status === 'question' ? 'En Vivo (Proyectando)' : 'Revisión'}
                </span>
              </div>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="badge bg-brand/15 border border-brand/30 text-brand-light text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                  {snapshot.currentQuestion.categoria}
                </span>
                <span className={`badge text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                  snapshot.currentQuestion.tipo_dificultad === 'Competitiva'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-surface-border/50 border-surface-border text-gray-400'
                }`}>
                  {snapshot.currentQuestion.tipo_dificultad} · M={snapshot.currentQuestion.tipo_dificultad === 'Competitiva' || snapshot.currentQuestion.categoria === 'Matematicas' ? '1.5' : '1.0'}
                </span>
              </div>

              {/* Question */}
              <h1 className="text-white font-black text-2xl md:text-3xl leading-snug mb-8 drop-shadow-md">
                {snapshot.currentQuestion.pregunta}
              </h1>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {snapshot.currentQuestion.opciones ? snapshot.currentQuestion.opciones.map((opt, i) => {
                  const isCorrectResult = i === snapshot.currentQuestion.respuesta_correcta && status === 'reviewing';
                  return (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-500 ${
                      isCorrectResult
                        ? 'border-green-500 bg-green-500/15 shadow-[0_0_20px_rgba(34,197,94,0.2)] transform scale-[1.02]'
                        : 'border-surface-border/60 bg-surface/40 text-gray-300'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
                        isCorrectResult ? 'bg-green-500 text-white' : 'bg-surface-border text-gray-500'
                      }`}>
                        {['A', 'B', 'C', 'D', 'E', 'F'][i] || '*'}
                      </div>
                      <p className={`flex-1 text-lg font-medium ${isCorrectResult ? 'text-green-300' : 'text-gray-300'}`}>
                        {opt}
                      </p>
                      {isCorrectResult && (
                        <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg shadow-green-500/30 shrink-0 animate-bounce">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className={`col-span-1 md:col-span-2 p-6 rounded-2xl border-2 text-center text-xl transition-all duration-500 ${
                    status === 'reviewing'
                      ? 'border-green-500 bg-green-500/15 text-green-300 font-black shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                      : 'border-surface-border/60 bg-surface/40 text-gray-400 font-medium'
                  }`}>
                    {status === 'reviewing'
                      ? `✨ Respuesta: ${snapshot.currentQuestion.respuesta_texto || snapshot.currentQuestion.respuesta_numero}`
                      : 'Respuesta Oculta (Proyectando en Vivo)'
                    }
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-8 pt-6 border-t border-surface-border/50">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-brand-light font-black uppercase tracking-widest mb-0.5">Participación</p>
                    <p className="text-gray-400 text-xs">Respuestas recibidas en tiempo real</p>
                  </div>
                  <span className="text-2xl font-black text-white">
                    {answerUpdate.answeredCount}
                    <span className="text-gray-600 text-lg">/{answerUpdate.playerCount}</span>
                  </span>
                </div>
                <div className="h-2.5 bg-surface-border/30 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: answerUpdate.playerCount > 0 ? `${(answerUpdate.answeredCount / answerUpdate.playerCount) * 100}%` : '0%' }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Control Buttons ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            {(status === 'idle' || status === 'finished') && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/80 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-brand/20"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Iniciar Partida
              </button>
            )}

            {(status === 'lobby' || status === 'question' || status === 'reviewing') && (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-500/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h11M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {snapshot?.currentQuestionIndex === -1 ? 'Enviar Pregunta 1' : `Siguiente Pregunta (${(snapshot?.currentQuestionIndex || 0) + 2})`}
              </button>
            )}

            {status === 'question' && (
              <button
                onClick={() => socket?.emit('admin:trivia:togglePause')}
                className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-lg ${
                  snapshot?.isPaused
                    ? 'bg-blue-500 text-white animate-pulse shadow-blue-500/30'
                    : 'bg-surface border border-surface-border text-blue-400 hover:bg-blue-500/10'
                }`}
              >
                <span className="text-lg">{snapshot?.isPaused ? '▶️' : '⏸️'}</span>
                {snapshot?.isPaused ? 'Reanudar Reloj' : 'Congelar Reloj'}
              </button>
            )}

            {status !== 'idle' && isAdmin && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-3 bg-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold rounded-xl transition-all text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Resetear
              </button>
            )}

            {/* ── Ruleta Config ── */}
            {isAdmin && (
              <div className="flex-1 min-w-[200px] bg-surface/50 border border-surface-border p-3 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-gray-500">Prob. Ruleta Global</span>
                  <span className="text-brand-light font-mono text-xs">
                    {Math.round((snapshot?.rouletteProbability ?? 0.15) * 100)}%
                  </span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={Math.round((snapshot?.rouletteProbability ?? 0.15) * 100)}
                  onChange={(e) => socket?.emit('admin:trivia:setRouletteConfig', { probability: parseInt(e.target.value) / 100 })}
                  className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>
            )}
          </div>

          {/* ── Faction Ranking En Vivo ─────────────────────────────────────── */}
          {ranking.length > 0 && !isFinished && (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Ranking de Facciones (En Vivo)
              </h3>
              <div className="flex flex-col gap-2">
                {ranking.map((faction, i) => (
                  <FactionRow key={faction.factionId} faction={faction} rank={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Question Manager ────────────────────────────────────────────── */}
          {status !== 'finished' && isAdmin && <QuestionManager />}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MONITOR EN VIVO
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'monitor' && (
        <div className="animate-fade-in">
          <div className="mb-6">
            <h3 className="text-xl font-black text-brand-light">Visión de Estudiantes ⚡</h3>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Monitoreo visual de cursor, actividad y estado de pestañas.</p>
          </div>
          <AdminLiveMonitor socket={socket} currentQuestion={snapshot?.currentQuestion} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: RANKING FINAL
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ranking' && (
        <div className="animate-fade-in flex flex-col gap-5">
          {/* Individual player table from snapshot.players */}
          {allPlayers.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xl font-black text-white">Tabla de Puntuaciones Individuales</h3>
                <span className="bg-brand/20 text-brand-light text-xs font-bold px-3 py-1 rounded-full border border-brand/30">
                  {allPlayers.length} jugadores
                </span>
              </div>
              <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2rem_1fr_auto] gap-4 px-5 py-3 bg-surface border-b border-surface-border">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">#</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">Jugador</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 text-right">Puntos</span>
                </div>
                <div className="divide-y divide-surface-border/50">
                  {allPlayers.map((p, i) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div
                        key={p.rut}
                        className={`grid grid-cols-[2rem_1fr_auto] items-center gap-4 px-5 py-3.5 ${
                          i === 0 ? 'bg-amber-500/5' : 'hover:bg-surface/50'
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {medals[i]
                            ? <span className="text-xl">{medals[i]}</span>
                            : <span className="text-sm font-bold text-gray-500 tabular-nums">#{i + 1}</span>
                          }
                        </div>
                        <p className={`font-bold ${i === 0 ? 'text-amber-300' : 'text-gray-200'}`}>{p.nombre}</p>
                        
                        <div className="flex items-center gap-2">
                          {isAdmin && !p.hasHadRoulette && (
                            <button
                              onClick={() => socket?.emit('admin:trivia:setRouletteConfig', { forceRut: p.rut })}
                              title="Forzar Ruleta (Testeo)"
                              className="w-8 h-8 rounded-lg bg-surface border border-brand/20 text-brand-light flex items-center justify-center hover:bg-brand/10 transition-colors"
                            >
                              ⚡
                            </button>
                          )}
                          <p className={`font-black text-lg tabular-nums text-right ${
                            i === 0 ? 'text-amber-300' : 'text-gray-300'
                          }`}>
                            {p.score.toLocaleString()}
                            <span className="text-gray-600 text-xs font-normal ml-1">pts</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-4">🏆</p>
              <p className="font-bold">Los resultados estarán aquí al finalizar la partida.</p>
            </div>
          )}

          {/* Reset button */}
          {status === 'finished' && isAdmin && (
            <button
              onClick={handleReset}
              className="self-start flex items-center gap-2 px-4 py-3 bg-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold rounded-xl transition-all text-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Nueva Partida
            </button>
          )}
        </div>
      )}
    </div>
  );
}
