/**
 * PixelQuizArena.jsx — Vista del jugador
 * ========================================
 * Conecta a los eventos pq:* del backend. El cronómetro local interpola
 * suavemente entre los ticks del servidor (que son la única fuente de verdad).
 *
 * Anti-cheat respetado:
 *   - El cliente NUNCA envía timestamps.
 *   - Cuando llega `pq:resolution` los botones se bloquean en cliente.
 *     El bloqueo real lo aplica el mutex del server.
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import useStore from '../store/useStore'
import { getSocket } from '../api/socket'

const PHASES = {
  QUEUE:        'QUEUE',
  SELECTION:    'SELECTION',
  QUESTION:     'QUESTION_PHASE',
  RESOLUTION:   'RESOLUTION',
  KING_CROWNED: 'KING_OF_THE_HILL',
}

const TIMER_MS = 15000

const CATEGORY_THEME = {
  'Lore':              { ring: 'stroke-purple-400', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]', chip: 'bg-purple-500/20 text-purple-200 border-purple-500/40', accent: 'text-purple-300', icon: '⚔' },
  'Hardware/Historia': { ring: 'stroke-amber-400',  glow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]', chip: 'bg-amber-500/20 text-amber-200 border-amber-500/40', accent: 'text-amber-300', icon: '⌬' },
  'Audio':             { ring: 'stroke-cyan-400',   glow: 'shadow-[0_0_30px_rgba(34,211,238,0.4)]', chip: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',     accent: 'text-cyan-300',  icon: '♪' },
  'Gameplay':          { ring: 'stroke-emerald-400',glow: 'shadow-[0_0_30px_rgba(52,211,153,0.4)]', chip: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40', accent: 'text-emerald-300', icon: '▶' },
}
const DEFAULT_THEME = CATEGORY_THEME.Gameplay

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════

export default function PixelQuizArena() {
  const { user } = useStore()
  const socket   = useMemo(() => getSocket(user), [user])

  const [arena, setArena]           = useState(null)
  const [serverRemaining, setServerRemaining] = useState(0)
  const [serverTickAt, setServerTickAt]       = useState(0) // performance.now() del último tick
  const [smoothMs, setSmoothMs]     = useState(0)
  const [resolution, setResolution] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [answerLocked, setAnswerLocked] = useState(false)
  const [toast, setToast]           = useState(null) // { kind, text }
  const [showCrown, setShowCrown]   = useState(null) // king when crowned
  const [splash, setSplash]         = useState(null) // { participants, categoria, until }
  const toastTimer  = useRef(null)
  const splashTimer = useRef(null)

  const flashToast = useCallback((kind, text, ms = 2400) => {
    setToast({ kind, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }, [])

  // ─── Pull inicial vía REST + listeners socket ──────────────────────────
  useEffect(() => {
    if (!user?.rut) return

    fetch('/api/pixel-quiz/state').then(r => r.json()).then(setArena).catch(() => {})

    const onState     = (s) => setArena(s)
    const onSelection = ({ participants, categoria }) => {
      setResolution(null)
      setSelectedIdx(null)
      setAnswerLocked(false)
      setSplash({ participants, categoria })
      clearTimeout(splashTimer.current)
      splashTimer.current = setTimeout(() => setSplash(null), 1800)
    }
    const onQuestion  = (q) => {
      setResolution(null)
      setSelectedIdx(null)
      setAnswerLocked(false)
      setServerRemaining(q.durationMs)
      setServerTickAt(performance.now())
      setSmoothMs(q.durationMs)
    }
    const onTick      = (t) => {
      setServerRemaining(t.remainingMs)
      setServerTickAt(performance.now())
    }
    const onResolution = (r) => {
      setResolution(r)
      setAnswerLocked(true)
      setSmoothMs(0)
      if (r.winner && r.winner.rut === user.rut)        flashToast('ok',    'Te quedas en la Colina', 2600)
      else if (r.loser && r.loser.rut === user.rut)     flashToast('bad',   'Has sido eliminado', 2600)
      else if (r.resultado === 'TIMEOUT_DOUBLE_KO')     flashToast('warn',  'Tiempo agotado · Doble KO', 2600)
    }
    const onAnswerAck = (ack) => {
      if (!ack.ok) {
        if      (ack.reason === 'LOCK_TAKEN')        flashToast('warn', 'Tu rival respondió primero')
        else if (ack.reason === 'STALE_MATCH')       flashToast('warn', 'Pregunta caducada')
        else if (ack.reason === 'TIMEOUT')           flashToast('warn', 'Llegaste tarde')
        else if (ack.reason === 'ALREADY_ANSWERED')  flashToast('warn', 'Ya tuviste tu intento')
        else                                          flashToast('warn', `Rechazado: ${ack.reason || 'error'}`)
        // Si fue rechazo del server NO desbloqueamos en general; lock_taken/timeout/already
        // son terminales para este match. Solo BAD_PAYLOAD podría reintentarse.
        if (ack.reason === 'BAD_PAYLOAD') setAnswerLocked(false)
        return
      }
      if (ack.correct === false) {
        // Una sola oportunidad: queda bloqueado para este match.
        flashToast('bad', 'Incorrecta · pierdes tu turno')
      }
    }
    const onWrong = ({ rut }) => {
      if (rut === user.rut) return
      flashToast('info', 'El rival falló · ¡tu turno!')
    }
    const onKing = (king) => {
      setShowCrown(king)
      setTimeout(() => setShowCrown(null), 5500)
    }
    const onJoinAck = (ack) => {
      if (ack.ok) {
        flashToast('info', 'Te uniste a la cola')
        return
      }
      const text = {
        ELIMINATED:        'Fuiste eliminado en este combate. Espera a la siguiente sesión.',
        ALREADY_IN_QUEUE:  null, // silencio — ya estabas dentro
        ON_HILL:           null,
        IN_ACTIVE_MATCH:   'Ya estás disputando un match.',
        MISSING_RUT:       'Falta RUT.',
      }[ack.reason]
      if (text) flashToast('bad', text)
    }
    const onLeaveAck = (ack) => {
      if (ack.ok) {
        flashToast('info', 'Saliste de la cola')
      } else if (ack.reason === 'IN_ACTIVE_MATCH') {
        flashToast('warn', 'No puedes salir mientras dispute el match')
      }
    }

    socket.on('pq:state',       onState)
    socket.on('pq:selection',   onSelection)
    socket.on('pq:question',    onQuestion)
    socket.on('pq:tick',        onTick)
    socket.on('pq:resolution',  onResolution)
    socket.on('pq:answerAck',   onAnswerAck)
    socket.on('pq:wrongAnswer', onWrong)
    socket.on('pq:kingCrowned', onKing)
    socket.on('pq:joinAck',     onJoinAck)
    socket.on('pq:leaveAck',    onLeaveAck)

    return () => {
      socket.off('pq:state',       onState)
      socket.off('pq:selection',   onSelection)
      socket.off('pq:question',    onQuestion)
      socket.off('pq:tick',        onTick)
      socket.off('pq:resolution',  onResolution)
      socket.off('pq:answerAck',   onAnswerAck)
      socket.off('pq:wrongAnswer', onWrong)
      socket.off('pq:kingCrowned', onKing)
      socket.off('pq:joinAck',     onJoinAck)
      socket.off('pq:leaveAck',    onLeaveAck)
      clearTimeout(toastTimer.current)
      clearTimeout(splashTimer.current)
    }
  }, [socket, user?.rut, flashToast])

  // ─── Cronómetro suave (interpola entre ticks server) ───────────────────
  useEffect(() => {
    let raf
    const loop = () => {
      const since = performance.now() - serverTickAt
      const next  = Math.max(0, serverRemaining - since)
      setSmoothMs(next)
      if (next > 0) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [serverRemaining, serverTickAt])

  // ─── Acciones ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(() => {
    if (!user?.rut) return
    // No mostramos toast optimista: la confirmación llega vía pq:joinAck.
    socket.emit('pq:join', { rut: user.rut, nombre: user.nombre })
  }, [socket, user])

  const leaveQueue = useCallback(() => {
    if (!user?.rut) return
    // El server confirma con pq:leaveAck (puede rechazar si estás en match activo).
    socket.emit('pq:leave', { rut: user.rut })
  }, [socket, user])

  const submitAnswer = useCallback((idx) => {
    if (answerLocked) return
    const matchId = arena?.currentMatch?.matchId
    if (!matchId) return
    setSelectedIdx(idx)
    setAnswerLocked(true)
    socket.emit('pq:answer', { rut: user.rut, matchId, answerIndex: idx })
  }, [socket, user, arena, answerLocked])

  // ─── Derivados ─────────────────────────────────────────────────────────
  const phase   = arena?.phase || PHASES.QUEUE
  const hill    = arena?.hill  || null
  const king    = arena?.king  || null
  const queue   = arena?.queue || []
  const match   = arena?.currentMatch || null
  const eliminated = arena?.eliminated || []
  const isParticipant = !!(match && user?.rut && match.participants?.includes(user.rut))
  const isInQueue     = queue.some(p => p.rut === user?.rut) || (hill && hill.rut === user?.rut)
  const isEliminated  = !!(user?.rut && eliminated.some(p => p.rut === user.rut))
  const remainingSec  = Math.max(0, Math.ceil(smoothMs / 1000))
  const timerPct      = Math.max(0, Math.min(1, smoothMs / TIMER_MS))

  if (!user?.rut) {
    return <NotLoggedIn />
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-5">
      {/* Banner Hill / King */}
      <HillKingBanner hill={hill} king={king} youRut={user.rut} threshold={arena?.kingThreshold || 10} />

      {/* Phase-driven main panel */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card via-surface-card to-surface min-h-[440px]">
        <BackgroundGrid />

        {splash && (
          <VsSplash participants={splash.participants} categoria={splash.categoria} />
        )}

        {!splash && phase === PHASES.QUEUE && (
          <QueueView
            isInQueue={isInQueue}
            isEliminated={isEliminated}
            queueLen={queue.length}
            onJoin={joinQueue}
            onLeave={leaveQueue}
          />
        )}

        {!splash && phase === PHASES.SELECTION && (
          <VsSplash
            participants={match?.participantsFull}
            categoria={match?.categoria}
          />
        )}

        {!splash && phase === PHASES.QUESTION && match && (
          <QuestionView
            match={match}
            isParticipant={isParticipant}
            onAnswer={submitAnswer}
            selectedIdx={selectedIdx}
            answerLocked={answerLocked}
            remainingSec={remainingSec}
            timerPct={timerPct}
          />
        )}

        {!splash && phase === PHASES.RESOLUTION && resolution && (
          <ResolutionView resolution={resolution} youRut={user.rut} selectedIdx={selectedIdx} />
        )}

        {!splash && phase === PHASES.KING_CROWNED && resolution?.kingCrowned && (
          <KingScreen king={resolution.kingCrowned} youRut={user.rut} threshold={arena?.kingThreshold || 10} />
        )}
      </div>

      {/* Cola visual */}
      <QueueStrip queue={queue} hill={hill} youRut={user.rut} />

      {/* Toast flotante */}
      {toast && <Toast kind={toast.kind} text={toast.text} />}

      {/* Confetti / corona overlay */}
      {showCrown && <CrownOverlay king={showCrown} youRut={user.rut} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-componentes
// ═══════════════════════════════════════════════════════════════════════════

function BackgroundGrid() {
  return (
    <div
      className="absolute inset-0 opacity-[0.05] pointer-events-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
  )
}

function HillKingBanner({ hill, king, youRut, threshold }) {
  const youAreOnHill = hill && hill.rut === youRut
  const pct = hill ? Math.min(100, (hill.streak / threshold) * 100) : 0
  const remaining = hill ? Math.max(0, threshold - hill.streak) : threshold
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Hill */}
      <div className={[
        'relative overflow-hidden rounded-2xl border p-5 transition-all',
        hill
          ? 'bg-gradient-to-br from-amber-500/20 via-amber-700/10 to-transparent border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.15)]'
          : 'bg-surface-card border-surface-border',
      ].join(' ')}>
        <div className="absolute -top-4 -right-4 text-7xl opacity-10 select-none">♛</div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-300/80 font-bold">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          En la Colina
        </div>
        {hill ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-2xl font-black text-white truncate">
                {hill.nombre}
                {youAreOnHill && <span className="ml-2 text-xs px-2 py-0.5 bg-brand text-white rounded-full uppercase tracking-wider align-middle">tú</span>}
              </p>
              <div className="flex-shrink-0 flex items-baseline gap-1 font-mono">
                <span className="text-3xl font-black text-amber-300 leading-none">{hill.streak}</span>
                <span className="text-sm text-amber-200/60">/ {threshold}</span>
              </div>
            </div>
            <div className="mt-3 h-2.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-amber-200/80">
              {remaining === 0
                ? 'Coronación inminente'
                : `${remaining} ${remaining === 1 ? 'victoria más' : 'victorias más'} para coronarse`}
            </p>
          </>
        ) : (
          <p className="mt-3 text-gray-400">Colina vacía. El próximo combate la decide.</p>
        )}
      </div>

      {/* King */}
      <div className={[
        'relative overflow-hidden rounded-2xl border p-5 transition-all',
        king
          ? 'bg-gradient-to-br from-purple-500/20 via-purple-700/10 to-transparent border-brand/50 shadow-[0_0_30px_rgba(124,58,237,0.18)]'
          : 'bg-surface-card border-surface-border',
      ].join(' ')}>
        <div className="absolute -top-4 -right-4 text-7xl opacity-10 select-none">★</div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-purple-300/80 font-bold">
          <span className="inline-block w-2 h-2 rounded-full bg-brand animate-pulse" />
          Último Rey de la Sesión
        </div>
        {king ? (
          <>
            <p className="mt-3 text-2xl font-black text-white truncate">{king.nombre}</p>
            <p className="mt-2 text-xs text-purple-200/80">Coronado tras {threshold} victorias consecutivas</p>
          </>
        ) : (
          <p className="mt-3 text-gray-400">Aún sin rey en esta sesión.</p>
        )}
      </div>
    </div>
  )
}

function QueueView({ isInQueue, isEliminated, queueLen, onJoin, onLeave }) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-14 min-h-[440px]">
      <div className="text-xs uppercase tracking-[0.4em] text-brand-light/80 font-bold mb-3">PIXEL QUIZ ARENA</div>
      <h2 className="text-4xl md:text-5xl font-black text-gradient leading-tight mb-4">
        King of the Hill
      </h2>
      <p className="text-gray-400 max-w-md mb-8">
        Trivia 1v1. Categoría aleatoria. <span className="text-white font-bold">15 segundos</span> por pregunta.
        Una sola respuesta por jugador: si fallas, pierdes el turno. El admin activa cada pregunta. <span className="text-white font-bold">10 victorias seguidas</span> = Rey.
      </p>

      <div className="flex items-center gap-2 mb-8 text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-gray-400">{queueLen} {queueLen === 1 ? 'jugador' : 'jugadores'} en cola</span>
      </div>

      {isEliminated ? (
        <div className="flex flex-col items-center gap-3 max-w-md">
          <div className="px-6 py-3 rounded-xl bg-red-500/15 text-red-200 border-2 border-red-500/50 font-black uppercase tracking-wider">
            Has sido eliminado
          </div>
          <p className="text-sm text-gray-400">
            No puedes reentrar a la cola en esta sesión. Espera a que el admin reabilite a los eliminados o se corone un nuevo rey.
          </p>
        </div>
      ) : !isInQueue ? (
        <button
          onClick={onJoin}
          className="group relative px-10 py-4 rounded-xl font-black uppercase tracking-wider text-white
                     bg-gradient-to-r from-brand to-brand-light
                     shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)]
                     hover:scale-[1.03] active:scale-95 transition-all duration-200"
        >
          <span className="relative">Entrar a la Cola</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-300 font-bold animate-pulse-slow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-5 h-5">
              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            En la cola — esperando rivales
          </div>
          <button
            onClick={onLeave}
            className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider
                       bg-red-500/15 text-red-300 border border-red-500/40
                       hover:bg-red-500/25 transition-all"
          >
            Salir de la Cola
          </button>
        </div>
      )}
    </div>
  )
}

function VsSplash({ participants, categoria }) {
  const [a, b] = participants || []
  return (
    <div className="relative z-10 flex flex-col items-center justify-center px-6 py-14 min-h-[440px] animate-fade-in">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8 w-full max-w-3xl">
        <FighterCard player={a} side="left" />
        <div className="text-center">
          <div className="text-6xl md:text-8xl font-black text-gradient leading-none drop-shadow-[0_0_20px_rgba(124,58,237,0.5)] animate-pulse-slow">
            VS
          </div>
        </div>
        <FighterCard player={b} side="right" />
      </div>
      {categoria && (
        <div className="mt-8 px-5 py-2 rounded-full border border-brand/40 bg-brand/10 text-brand-light text-sm font-bold uppercase tracking-[0.3em]">
          Categoría · {categoria}
        </div>
      )}
    </div>
  )
}

function FighterCard({ player, side }) {
  const initials = player?.nombre ? player.nombre.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() : '?'
  return (
    <div className={[
      'relative rounded-2xl bg-surface-card border border-surface-border p-4 md:p-6 transition-all',
      'animate-slide-up',
      side === 'left' ? 'text-left' : 'text-right',
    ].join(' ')}>
      <div className={[
        'flex items-center gap-3',
        side === 'left' ? 'flex-row' : 'flex-row-reverse',
      ].join(' ')}>
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white text-xl md:text-2xl font-black shadow-lg">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Retador</p>
          <p className="text-base md:text-lg font-black text-white truncate">{player?.nombre || '—'}</p>
        </div>
      </div>
    </div>
  )
}

function QuestionView({ match, isParticipant, onAnswer, selectedIdx, answerLocked, remainingSec, timerPct }) {
  const cat   = match.categoria
  const theme = CATEGORY_THEME[cat] || DEFAULT_THEME
  const danger = remainingSec <= 5

  return (
    <div className="relative z-10 px-5 md:px-8 py-7 space-y-6">
      {/* Header: categoría + cronómetro */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${theme.chip}`}>
          <span className="text-lg leading-none">{theme.icon}</span>
          <span className="uppercase tracking-wider">{cat}</span>
        </div>

        {!isParticipant && (
          <span className="ml-auto px-3 py-1 rounded-full bg-surface border border-surface-border text-xs uppercase tracking-wider text-gray-400">
            Espectador
          </span>
        )}
      </div>

      {/* Pregunta + cronómetro circular */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        <CircularTimer remainingSec={remainingSec} pct={timerPct} danger={danger} theme={theme} />

        <h3 className="flex-1 text-xl md:text-2xl font-bold text-white leading-snug pt-2">
          {match.question.pregunta}
        </h3>
      </div>

      {/* Opciones */}
      <div className="grid md:grid-cols-2 gap-3">
        {match.question.opciones.map((opt, idx) => {
          const isSelected = selectedIdx === idx
          const disabled   = !isParticipant || answerLocked
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onAnswer(idx)}
              className={[
                'group relative text-left px-4 py-4 rounded-xl border-2 transition-all duration-150',
                'disabled:cursor-not-allowed',
                isSelected
                  ? 'bg-brand/25 border-brand text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                  : 'bg-surface border-surface-border text-gray-200 hover:border-brand/60 hover:bg-brand/5 hover:-translate-y-0.5',
                disabled && !isSelected ? 'opacity-50' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <span className={[
                  'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black',
                  isSelected ? 'bg-brand text-white' : 'bg-surface-hover text-gray-400 group-hover:bg-brand/40 group-hover:text-white',
                ].join(' ')}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="font-medium">{opt}</span>
              </div>
            </button>
          )
        })}
      </div>

      {!isParticipant && (
        <p className="text-center text-sm text-gray-500 italic">
          Mira el combate · entrarás cuando te toque en la cola.
        </p>
      )}
    </div>
  )
}

function CircularTimer({ remainingSec, pct, danger, theme }) {
  const R = 42, C = 2 * Math.PI * R
  return (
    <div className={`relative w-28 h-28 flex-shrink-0 ${danger ? 'animate-pulse' : ''}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} className="fill-none stroke-surface-border" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={R}
          className={`fill-none transition-[stroke-dashoffset] duration-100 ${danger ? 'stroke-red-400' : theme.ring}`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ filter: `drop-shadow(0 0 6px ${danger ? 'rgba(248,113,113,0.6)' : 'rgba(168,85,247,0.5)'})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black font-mono ${danger ? 'text-red-300' : 'text-white'}`}>{remainingSec}</span>
        <span className="text-[10px] uppercase tracking-widest text-gray-500">seg</span>
      </div>
    </div>
  )
}

function ResolutionView({ resolution, youRut, selectedIdx }) {
  const isTimeout = resolution.resultado === 'TIMEOUT_DOUBLE_KO'
  const youWon    = resolution.winner && resolution.winner.rut === youRut
  const youLost   = resolution.loser  && resolution.loser.rut  === youRut
  const theme     = CATEGORY_THEME[resolution.categoria] || DEFAULT_THEME

  return (
    <div className="relative z-10 px-5 md:px-8 py-8 animate-fade-in space-y-6">
      <div className="text-center">
        {isTimeout ? (
          <>
            <div className="text-6xl mb-2 animate-bounce-subtle">✗</div>
            <p className="text-3xl font-black text-red-300">Tiempo Agotado</p>
            <p className="text-gray-400 mt-1">Doble KO · ambos eliminados</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2">{youWon ? '★' : '✓'}</div>
            <p className="text-3xl font-black text-emerald-300">{resolution.winner.nombre}</p>
            <p className="text-gray-400 mt-1">
              acertó en <span className="font-mono text-white">{(resolution.responseTimeMs / 1000).toFixed(2)}s</span>
            </p>
            {youWon && <p className="mt-3 inline-block px-4 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">Te quedas en la Colina</p>}
            {youLost && <p className="mt-3 inline-block px-4 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold">Has sido eliminado</p>}
          </>
        )}
      </div>

      {/* Reveal de opciones */}
      {resolution.question?.opciones && (
        <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {resolution.question.opciones.map((opt, idx) => {
            const isCorrect = idx === resolution.correctIndex
            const wasYourPick = idx === selectedIdx
            return (
              <div
                key={idx}
                className={[
                  'px-4 py-3 rounded-xl border-2 flex items-center gap-3',
                  isCorrect
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-100'
                    : wasYourPick
                      ? 'bg-red-500/15 border-red-500/50 text-red-200'
                      : 'bg-surface border-surface-border text-gray-400',
                ].join(' ')}
              >
                <span className={[
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black',
                  isCorrect ? 'bg-emerald-500 text-white' : wasYourPick ? 'bg-red-500/40 text-white' : 'bg-surface-hover',
                ].join(' ')}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
                {isCorrect && <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Correcta</span>}
                {!isCorrect && wasYourPick && <span className="text-xs font-bold uppercase tracking-wider text-red-300">Tu elección</span>}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-500 uppercase tracking-widest animate-pulse">
        Próximo combate en breve...
      </p>
    </div>
  )
}

function KingScreen({ king, youRut, threshold }) {
  const isYou = king && king.rut === youRut
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center min-h-[440px] px-6 animate-fade-in">
      <div className="text-8xl mb-2 drop-shadow-[0_0_25px_rgba(251,191,36,0.7)]">♛</div>
      <p className="text-xs uppercase tracking-[0.4em] text-amber-300/80 font-bold mb-2">Coronación</p>
      <p className="gold-text text-5xl md:text-6xl font-black leading-tight">{king.nombre}</p>
      <p className="text-gray-300 mt-3 max-w-sm">{threshold} victorias consecutivas. Reina sobre la Pixel Quiz Arena.</p>
      {isYou && (
        <p className="mt-5 px-4 py-2 inline-block rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold uppercase tracking-wider">
          ¡Eres tú!
        </p>
      )}
    </div>
  )
}

function CrownOverlay({ king, youRut }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-3 rounded-sm animate-confetti-drop"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-5%',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1.6 + Math.random() * 1.6}s`,
            backgroundColor: ['#fbbf24', '#a78bfa', '#22d3eee0', '#34d399', '#f87171'][i % 5],
          }}
        />
      ))}
    </div>
  )
}

function QueueStrip({ queue, hill, youRut }) {
  if (queue.length === 0 && !hill) return null
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Cola de retadores</p>
        <p className="text-xs text-gray-600">{queue.length} en espera</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {queue.length === 0
          ? <span className="text-sm text-gray-500">Cola vacía.</span>
          : queue.map((p, i) => (
              <div
                key={p.rut}
                className={[
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all',
                  p.rut === youRut
                    ? 'bg-brand/25 border-brand text-white font-bold shadow-[0_0_12px_rgba(124,58,237,0.35)]'
                    : 'bg-surface border-surface-border text-gray-300 hover:border-brand/40',
                ].join(' ')}
              >
                <span className="text-[10px] text-gray-500 font-mono">#{i + 1}</span>
                <span className="truncate max-w-[140px]">{p.nombre}</span>
              </div>
            ))}
      </div>
    </div>
  )
}

function Toast({ kind, text }) {
  const palette = {
    ok:    'bg-emerald-500/15 border-emerald-500/50 text-emerald-200',
    bad:   'bg-red-500/15 border-red-500/50 text-red-200',
    warn:  'bg-amber-500/15 border-amber-500/50 text-amber-200',
    info:  'bg-brand/15 border-brand/50 text-brand-light',
  }[kind] || 'bg-surface-card border-surface-border text-white'

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] animate-slide-up">
      <div className={`px-4 py-2.5 rounded-xl border-2 backdrop-blur-md font-bold text-sm shadow-2xl ${palette}`}>
        {text}
      </div>
    </div>
  )
}

function NotLoggedIn() {
  return (
    <div className="card text-center py-16">
      <p className="text-2xl font-black text-white mb-2">Inicia sesión como estudiante</p>
      <p className="text-gray-400">Necesitamos tu RUT para ubicarte en la cola.</p>
    </div>
  )
}
