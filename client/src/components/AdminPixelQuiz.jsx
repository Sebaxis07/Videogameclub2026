/**
 * AdminPixelQuiz.jsx — Panel de control del admin
 * ==================================================
 * Vista en vivo del estado de la arena, historial reciente y controles.
 * El server sigue siendo la única fuente de verdad: estos botones
 * solo emiten al endpoint `/admin/*` protegido por x-admin-key.
 */

import React, { useEffect, useMemo, useState, useRef } from 'react'
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

export default function AdminPixelQuiz() {
  const { user } = useStore()
  const socket   = useMemo(() => getSocket(user), [user])

  const [arena, setArena]   = useState({ queue: [], phase: 'QUEUE', eliminated: [] })
  const [serverRemaining, setServerRemaining] = useState(0)
  const [serverTickAt, setServerTickAt]       = useState(0)
  const [smoothMs, setSmoothMs]   = useState(0)
  const [history, setHistory]     = useState([])
  const [actionMsg, setActionMsg] = useState(null)
  const [preview, setPreview]     = useState(null) // pendingMatch con respuesta correcta (solo admin)
  const actionTimer = useRef(null)

  const flashAction = (kind, text) => {
    setActionMsg({ kind, text })
    clearTimeout(actionTimer.current)
    actionTimer.current = setTimeout(() => setActionMsg(null), 3000)
  }

  // ─── Cargar estado inicial ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/pixel-quiz/state').then(r => r.json()).then(setArena).catch(() => {})
    fetch('/api/pixel-quiz/history')
      .then(r => r.json())
      .then(rows => setHistory(rows.map(toHistoryItem)))
      .catch(() => {})
  }, [])

  // ─── Sockets ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    const onState     = (s) => {
      setArena(s)
      // Si entramos a SELECTION, cargamos el preview privado (con respuesta correcta).
      if (s?.phase === 'SELECTION' && s?.currentMatch?.awaitingReveal) {
        fetch('/api/pixel-quiz/admin/preview')
          .then(r => r.json())
          .then(j => setPreview(j.pending || null))
          .catch(() => setPreview(null))
      } else if (s?.phase !== 'SELECTION') {
        setPreview(null)
      }
    }
    const onTick      = (t) => { setServerRemaining(t.remainingMs); setServerTickAt(performance.now()) }
    const onQuestion  = (q) => {
      setPreview(null)
      setServerRemaining(q.durationMs); setServerTickAt(performance.now()); setSmoothMs(q.durationMs)
    }
    const onResolution = (r) => {
      setSmoothMs(0)
      setHistory(prev => [{
        matchId:   r.matchId,
        ganador:   r.winner ? r.winner.nombre : null,
        resultado: r.resultado,
        tiempoMs:  r.responseTimeMs,
        categoria: r.categoria || (arena?.currentMatch?.categoria),
        at:        Date.now(),
      }, ...prev].slice(0, 20))
    }

    socket.on('pq:state',      onState)
    socket.on('pq:tick',       onTick)
    socket.on('pq:question',   onQuestion)
    socket.on('pq:resolution', onResolution)
    return () => {
      socket.off('pq:state',      onState)
      socket.off('pq:tick',       onTick)
      socket.off('pq:question',   onQuestion)
      socket.off('pq:resolution', onResolution)
    }
  }, [socket, arena?.currentMatch?.categoria])

  // ─── Cronómetro suave ──────────────────────────────────────────────────
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

  // ─── Acciones admin ────────────────────────────────────────────────────
  const REASON_TEXT = {
    NOT_ENOUGH_PLAYERS:      'No hay suficientes jugadores en la cola.',
    MATCH_ALREADY_PREPARING: 'Ya hay un combate en curso.',
    NOT_IN_SELECTION:        'No hay match esperando ser revelado.',
    NO_QUESTION_LOADED:      'La pregunta aún no se cargó.',
    EMPTY_BANK:              'Banco de preguntas vacío.',
    NOTHING_TO_SKIP:         'No hay nada que saltar.',
  }

  const callAdmin = async (path) => {
    try {
      const res = await fetch(`/api/pixel-quiz/admin/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (json.state) setArena(json.state)

      if (json.ok === false) {
        const txt = REASON_TEXT[json.reason] || `No se pudo: ${json.reason || 'error'}`
        flashAction('error', txt)
        return
      }

      let msg = 'Acción realizada.'
      if (path === 'reset')             msg = 'Arena reseteada.'
      if (path === 'start')              msg = 'Match preparado. Listo para revelar la pregunta.'
      if (path === 'reveal')             msg = '¡Pregunta activada para los jugadores!'
      if (path === 'add-bot')            msg = `Bot "${json.botName}" añadido.`
      if (path === 'skip')               msg = 'Combate saltado.'
      if (path === 'clear-eliminated')   msg = 'Eliminados reabilitados.'

      flashAction('ok', msg)
    } catch {
      flashAction('error', 'Error de red al llamar admin.')
    }
  }

  // ─── Derivados ─────────────────────────────────────────────────────────
  const phase = arena?.phase || PHASES.QUEUE
  const hill  = arena?.hill  || null
  const king  = arena?.king  || null
  const queue = arena?.queue || []
  const match = arena?.currentMatch || null
  const eliminated = arena?.eliminated || []
  const awaitingReveal = !!(match && match.awaitingReveal)
  const inActiveMatch  = !!(match && !match.awaitingReveal)
  const remainingSec = Math.max(0, Math.ceil(smoothMs / 1000))
  const timerPct     = Math.max(0, Math.min(1, smoothMs / TIMER_MS))
  const canPrepare   = !match && (queue.length + (hill ? 1 : 0)) >= 2

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-2 md:p-0">
      
      {/* ── HEADER & STATS ── */}
      <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            PixelQuiz Arena
            <span className="bg-brand/20 text-brand-light text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-brand/30">
              Admin Control
            </span>
          </h2>
          <p className="text-gray-500 text-sm">Gestiona la cola de combate y el estado de la arena.</p>
        </div>

        {/* Action Flash Message */}
        {actionMsg && (
          <div className={`px-4 py-2 rounded-xl border text-sm font-bold animate-bounce shadow-lg ${
            actionMsg.kind === 'ok' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            {actionMsg.text}
          </div>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Estado" value={phase} accent={phase === 'QUESTION_PHASE' ? 'emerald' : 'surface'} />
        <Tile label="En Cola" value={String(queue.length)} accent="brand" />
        <Tile label="El Rey" value={king?.nombre || 'Vacante'} accent="amber" />
        <Tile label="En el Cerro" value={hill?.nombre || 'Nadie'} accent="cyan" />
      </div>

      {/* ── CONTROL PANEL ── */}
      <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-surface px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 12H13.5" />
            </svg>
            Consola de Comandos
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => { if(window.confirm('¿Resetear arena?')) callAdmin('reset') }}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              Reset Arena 🔄
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Add Bot */}
          <button
            onClick={() => callAdmin('add-bot')}
            className="flex flex-col items-center gap-3 p-6 bg-surface border border-surface-border rounded-2xl hover:bg-brand/10 hover:border-brand/40 transition-all group"
          >
            <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🤖
            </div>
            <div className="text-center">
              <p className="text-white font-bold">Añadir Bot</p>
              <p className="text-xs text-gray-500 mt-1">Suma un dummy a la cola</p>
            </div>
          </button>

          {/* Action 2: dinámica — Iniciar combate / Activar pregunta */}
          {awaitingReveal ? (
            <button
              onClick={() => callAdmin('reveal')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all group bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30 animate-pulse-slow"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-emerald-500 group-hover:scale-110 transition-transform">
                ▶
              </div>
              <div className="text-center">
                <p className="text-white font-bold">Activar Pregunta</p>
                <p className="text-xs text-emerald-300 mt-1">Los jugadores la verán y arrancará el timer</p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => callAdmin('start')}
              disabled={!canPrepare || inActiveMatch}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all group ${
                !canPrepare || inActiveMatch
                  ? 'bg-gray-500/5 border-gray-500/20 opacity-50 cursor-not-allowed'
                  : 'bg-brand/20 border-brand/40 hover:bg-brand/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform ${
                !canPrepare || inActiveMatch ? 'bg-gray-600' : 'bg-brand'
              }`}>
                ⚔️
              </div>
              <div className="text-center">
                <p className="text-white font-bold">Iniciar Combate</p>
                <p className="text-xs text-gray-500 mt-1">
                  {inActiveMatch ? 'Match en curso' : 'Sortea rivales (2+ en cola)'}
                </p>
              </div>
            </button>
          )}

          {/* Action 3: Skip / Clear */}
          <button
            onClick={() => callAdmin('skip')}
            className="flex flex-col items-center gap-3 p-6 bg-surface border border-surface-border rounded-2xl hover:bg-amber-500/10 hover:border-amber-500/40 transition-all group"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl group-hover:translate-x-1 transition-transform">
              ⏩
            </div>
            <div className="text-center">
              <p className="text-white font-bold">Saltar / Limpiar</p>
              <p className="text-xs text-gray-500 mt-1">Resuelve match actual</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── QUEUE & GAME SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        
        {/* Main Area: Match or Info */}
        <div className="space-y-6">
          {awaitingReveal && preview ? (
            <div className="bg-surface-card border-2 border-emerald-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="badge bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase px-3 py-1 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Esperando revelar · {preview.categoria}
                </span>
                <span className="text-gray-500 font-mono text-xs">{preview.matchId}</span>
              </div>

              <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Vista previa (solo admin)</p>
              <h3 className="text-2xl font-black text-white mb-4 leading-tight">
                {preview.question?.pregunta}
              </h3>

              <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
                {preview.question?.opciones?.map((opt, idx) => {
                  const correct = idx === preview.question.respuesta_correcta
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-2xl border ${
                        correct
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-100'
                          : 'bg-surface border-surface-border text-gray-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                        correct ? 'bg-emerald-500 text-white' : 'bg-surface-border text-gray-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="font-medium flex-1">{opt}</span>
                      {correct && <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-black">Correcta</span>}
                    </div>
                  )
                })}
              </div>

              <p className="mt-4 text-xs text-amber-300/80">
                Los jugadores aún NO ven la pregunta. Pulsa "Activar Pregunta" cuando estés listo.
              </p>
            </div>
          ) : inActiveMatch ? (
            <div className="bg-surface-card border border-surface-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-brand"></div>

              <div className="flex items-center justify-between mb-6">
                <span className="badge bg-brand/20 text-brand-light text-xs font-black uppercase px-3 py-1 rounded-lg">
                  En Combate: {match.categoria}
                </span>
                <div className="flex items-center gap-4">
                   <CircularTimer pct={timerPct} secs={remainingSec} danger={remainingSec <= 5} size="sm" />
                   <span className="text-gray-500 font-mono text-xs">{match.matchId}</span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white mb-6 leading-tight">
                {match.question?.pregunta}
              </h3>

              <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
                {match.question?.opciones?.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-4 bg-surface border border-surface-border rounded-2xl text-gray-300"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center font-black text-gray-500">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-medium">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-surface-card border border-surface-border rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-surface rounded-3xl border border-surface-border flex items-center justify-center text-4xl mx-auto mb-6">
                ⏳
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Esperando Acción del Admin</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Cuando haya 2+ jugadores en la cola, pulsa <span className="text-white font-bold">"Iniciar Combate"</span> para sortear los rivales y luego <span className="text-white font-bold">"Activar Pregunta"</span> para arrancar el timer.
              </p>
            </div>
          )}

          {/* King Info */}
          <div className="bg-surface-card border border-surface-border rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-9xl opacity-5 grayscale">👑</div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/40 rounded-full flex items-center justify-center text-4xl shadow-lg shadow-amber-500/10">
                👑
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black mb-1">Rey de la Colina</h4>
                <p className="text-2xl font-black text-white">
                  {king ? king.nombre : 'No hay rey coronado'}
                </p>
                {king && (
                  <div className="flex gap-4 mt-2 justify-center md:justify-start">
                    <span className="text-amber-400 font-bold text-sm">🔥 Racha: {king.streak}</span>
                    <span className="text-gray-500 font-bold text-sm">💰 Puntos: {king.score}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historial Compacto */}
          <div className="bg-surface-card border border-surface-border rounded-3xl p-6">
             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Últimos Combates</h4>
             <div className="space-y-3">
                {history.slice(0, 5).map(h => (
                   <div key={h.matchId} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-surface-border/50">
                      <div className={`w-2 h-2 rounded-full ${h.resultado === 'WINNER' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <p className="text-sm font-bold text-gray-200 flex-1 truncate">{h.ganador || 'Doble KO'}</p>
                      <p className="text-xs text-gray-500">{h.categoria}</p>
                      <p className="text-xs font-mono text-gray-600">{h.tiempoMs ? `${(h.tiempoMs/1000).toFixed(1)}s` : '-'}</p>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Sidebar: Queue */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-card border border-surface-border rounded-3xl p-6 h-full shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-border">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Cola de Espera</h4>
              <span className="bg-brand text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {queue.length}
              </span>
            </div>
            
            <div className="space-y-2">
              {queue.length === 0 ? (
                <p className="text-gray-600 text-xs italic text-center py-4">Cola vacía</p>
              ) : (
                queue.map((p, idx) => (
                  <div key={p.rut} className="flex items-center gap-3 p-3 bg-surface border border-surface-border rounded-xl">
                    <span className="text-xs font-bold text-gray-600 w-4">#{idx + 1}</span>
                    <p className="text-sm font-bold text-gray-200 truncate flex-1">{p.nombre}</p>
                  </div>
                ))
              )}
            </div>

            {hill && (
              <div className="mt-8">
                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3">En el Cerro (Retador)</h4>
                <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-xl">
                  <span className="text-lg">🛡️</span>
                  <p className="text-sm font-black text-white truncate flex-1">{hill.nombre}</p>
                </div>
              </div>
            )}

            {/* Eliminados */}
            <div className="mt-8 pt-6 border-t border-surface-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Eliminados ({eliminated.length})</h4>
                {eliminated.length > 0 && (
                  <button
                    onClick={() => { if (window.confirm('¿Reabilitar a todos los eliminados?')) callAdmin('clear-eliminated') }}
                    className="text-[10px] font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200"
                  >
                    Reabilitar todos
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {eliminated.length === 0 ? (
                  <p className="text-gray-600 text-xs italic text-center py-2">Nadie eliminado</p>
                ) : (
                  eliminated.map((p) => (
                    <div key={p.rut} className="flex items-center gap-3 p-2 bg-red-500/5 border border-red-500/30 rounded-xl">
                      <span className="text-xs">✗</span>
                      <p className="text-xs font-bold text-red-200 truncate flex-1">{p.nombre}</p>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-2 text-[10px] text-gray-600">
                Los eliminados no pueden reentrar a la cola hasta que reseteen, se corone un rey, o se reabilite.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function Tile({ label, value, accent }) {
  const accentClass = {
    amber:   'border-amber-500/30 bg-amber-500/5 text-amber-400',
    brand:   'border-brand/30 bg-brand/5 text-brand-light',
    cyan:    'border-cyan-500/30 bg-cyan-500/5 text-cyan-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
  }[accent] || 'border-surface-border bg-surface'

  return (
    <div className={`p-4 rounded-2xl border ${accentClass}`}>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-black truncate">{value}</p>
    </div>
  )
}

function CircularTimer({ pct, secs, danger, size = 'md' }) {
  const R = 18, C = 2 * Math.PI * R
  const dim = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16'
  return (
    <div className={`relative ${dim}`}>
      <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
        <circle cx="25" cy="25" r={R} className="fill-none stroke-surface-border" strokeWidth="4" />
        <circle
          cx="25" cy="25" r={R}
          className={`fill-none transition-[stroke-dashoffset] duration-100 ${danger ? 'stroke-red-400' : 'stroke-brand'}`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-black font-mono ${size === 'sm' ? 'text-sm' : 'text-lg'} ${danger ? 'text-red-300' : 'text-white'}`}>
          {secs}
        </span>
      </div>
    </div>
  )
}

function toHistoryItem(r) {
  return {
    matchId:   r.matchId,
    ganador:   r.ganador_rut ? (r.participantes.find(p => p.rut === r.ganador_rut)?.nombre || r.ganador_rut) : null,
    categoria: r.categoria,
    resultado: r.resultado,
    tiempoMs:  r.tiempoRespuestaMs,
    at:        new Date(r.createdAt).getTime(),
  }
}
