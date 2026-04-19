/**
 * DebateChart.jsx
 * =====================================
 * Módulo de Votación en Vivo de Debate (Admin View)
 *
 * Flujo Admin:
 * 1. intro       → Inicia el debate en WebSockets.
 * 2. presenting  → Revela juego por juego (sincronizado a alumnos).
 * 3. live-voting → Activa la votación y mira cómo suben los votos en vivo.
 * 4. results     → Top 3 ganadores + calendario automático.
 */

import React, { useEffect, useState, useCallback } from 'react'
import useStore from '../store/useStore'
import { fetchDebate, resetDebate, fetchPlayers } from '../api/api'
import { getSocket } from '../api/socket'

// ─── Constantes ────────────────────────────────────────────────────────────────
const DEBATE_DATE   = new Date('2026-04-08T00:00:00')
const LS_FINALISTS  = 'debate_finalists_live'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function topN(votes, n) {
  return Object.entries(votes || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
}

// ─── Componente Admin ──────────────────────────────────────────────────────────
export default function DebateChart() {
  const { user, debateData, setDebateData, setLastSync, selectedGame, setSelectedGame, setActiveView } = useStore()
  const isAdmin = user?.role === 'admin'

  // Flujo UI local: intro -> presenting -> live-voting -> results
  const [step, setStep] = useState('intro')
  
  // Data local
  const [playersList, setPlayersList] = useState([])
  const [playerIndex, setPlayerIndex] = useState(0)
  
  // WebSockets State
  const [socket, setSocket] = useState(null)
  const [liveState, setLiveState] = useState({ status: 'idle', games: [], votes: {}, votedStudents: [], totalStudentsOnline: 0 })

  // Finalistas persistidos localmente
  const [finalists, setFinalists] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_FINALISTS)) || null } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const dbRes = await fetchDebate()
      setDebateData(dbRes.data)
      setLastSync(dbRes.lastSync)
      const plRes = await fetchPlayers()
      setPlayersList(plRes.players || [])
    } catch (e) { console.error('[DebateChart] Error:', e) }
    finally { setLoading(false) }
  }, [setDebateData, setLastSync])

  // Carga inicial y conexión de sockets
  useEffect(() => {
    loadData();
    const s = getSocket('admin');
    setSocket(s);

    s.on('debate-state', (state) => {
      setLiveState(state);
    });

    return () => {
      s.off('debate-state');
    };
  }, [loadData]);

  // Si hay finalistas guardados, ir directo a resultados
  useEffect(() => {
    if (finalists && step === 'intro') setStep('results')
  }, [finalists]) // eslint-disable-line

  const gameOptions = [...new Map((debateData || []).map((d) => [d.juego, d])).values()]

  // ─── Handlers Presentación ────────────────────────────────────────
  const startPresentation = () => {
    if (!socket) return;
    const allGames = gameOptions.map(g => g.juego);
    socket.emit('admin:start-debate', allGames);
    setPlayerIndex(0); 
    setStep('presenting');
  }

  const nextPlayer = () => {
    if (!socket) return;
    const p = playersList[playerIndex];
    if (p && p.juegosPropuesto) {
      // Revelamos el juego de este jugador a los alumnos
      socket.emit('admin:reveal-game', p.juegosPropuesto);
    }

    if (playerIndex + 1 < playersList.length) {
      setPlayerIndex(playerIndex + 1);
    } else {
      socket.emit('admin:open-voting');
      setStep('live-voting');
    }
  }

  const skipPresentation = () => {
    if (socket) {
      gameOptions.forEach(g => socket.emit('admin:reveal-game', g.juego));
      socket.emit('admin:open-voting');
    }
    setStep('live-voting');
  }

  // ─── Handlers Votación en Vivo ────────────────────────────────────
  const closeVoting = () => {
    if (socket) socket.emit('admin:close-voting');
    // Calcular top 3 y guardar
    const top3 = topN(liveState.votes, 3).map(([juego]) => juego)
    if (top3.length > 0) {
      localStorage.setItem(LS_FINALISTS, JSON.stringify(top3))
      setFinalists(top3)
    }
    setStep('results')
  }

  // ─── Handlers Resultados ──────────────────────────────────────────
  const handleSelectGame = (juego) => {
    setSelectedGame(juego === selectedGame ? null : juego)
    setActiveView('bracket')
  }

  const handleReset = async () => {
    if (!window.confirm('¿Reiniciar todo el debate? Se borrarán finalistas y se reseteará la sala.')) return
    try {
      if (socket) socket.emit('admin:reset-debate');
      await resetDebate()
      const dbRes = await fetchDebate()
      setDebateData(dbRes.data)
      setSelectedGame(null)
      setFinalists(null)
      localStorage.removeItem(LS_FINALISTS)
      setStep('intro')
    } catch (err) { console.error(err) }
  }


  // ─── Loading / Empty ─────────────────────────────────────────────
  if (loading) return (
    <div className="card-glow flex flex-col items-center justify-center min-h-[400px] gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )
  if (playersList.length === 0 && !finalists) return (
    <div className="card-glow flex flex-col items-center justify-center min-h-[400px] gap-3 text-center">
      <h3 className="text-white font-bold text-lg">No hay jugadores registrados</h3>
    </div>
  )
  if ((!debateData || debateData.length === 0) && !finalists) return (
    <div className="card-glow flex flex-col items-center justify-center min-h-[400px] gap-3 text-center">
      <h3 className="text-white font-bold text-lg">No hay juegos propuestos</h3>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────
  // INTRO
  // ─────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] text-center p-4 sm:p-8 animate-fade-in relative">
        <div className="absolute top-4 left-4 bg-brand/10 border border-brand/30 px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-light"></span>
          </span>
          <span className="text-xs font-bold text-brand-light uppercase tracking-wider">
            {liveState.totalStudentsOnline} Alumnos Conectados
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Control de Debate en Vivo</h2>
        <p className="text-gray-400 max-w-lg mb-8">
          Al iniciar, controlarás lo que ven los alumnos. Podrás revelar juego por juego de forma interactiva y abrir la votación para recolectar sus respuestas en tiempo real.
        </p>
        <button onClick={startPresentation} className="btn-primary px-8 py-3 rounded-full text-lg shadow-[0_0_20px_rgba(124,58,237,0.4)]">
          Iniciar Debate en Vivo
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // PRESENTACIÓN
  // ─────────────────────────────────────────────────────────────────
  if (step === 'presenting') {
    const p = playersList[playerIndex]
    const progress = ((playerIndex + 1) / playersList.length) * 100
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] p-4 sm:p-8 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1 bg-gray-800 w-full">
          <div className="h-full bg-brand transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        
        <div className="absolute top-4 left-4 bg-brand/10 border border-brand/30 px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-brand opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-brand-light"></span></span>
          <span className="text-xs font-bold text-brand-light uppercase">{liveState.totalStudentsOnline} online</span>
        </div>

        <button onClick={skipPresentation} className="absolute top-4 right-4 text-xs text-gray-500 hover:text-white underline">
          Revelar Todos Directo
        </button>
        <h3 className="text-brand-light font-bold tracking-widest uppercase text-xs sm:text-sm mb-8 mt-6 sm:mt-0 text-center">
          Revelando Opciones: Jugador {playerIndex + 1} de {playersList.length}
        </h3>
        <div className="flex flex-col items-center flex-1 justify-center w-full max-w-2xl text-center" key={playerIndex}>
          <div className="animate-slide-up w-full px-2">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 break-words">{p.nombre}</h2>
            <p className="text-gray-400 text-lg mb-4">propone jugar...</p>
            <div className="bg-[#1A1A2E] border-2 border-brand shadow-[0_0_30px_rgba(124,58,237,0.3)] rounded-2xl py-6 px-12 inline-block">
              <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-brand to-cyan-400 tracking-wide">
                {p.juegosPropuesto}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-8 w-full max-w-md flex flex-col gap-3 relative z-10">
          <button onClick={nextPlayer} className="btn-primary w-full py-4 text-xl font-bold rounded-2xl shadow-xl hover:-translate-y-1 transition-all group">
            <span className="group-active:scale-95 inline-block transition-transform">
               {playerIndex + 1 === playersList.length ? 'Abrir Votación a los Alumnos' : 'Revelar Siguiente Juego (Alumnos)'}
            </span>
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // VOTACIÓN EN VIVO (ADMIN VIEW)
  // ─────────────────────────────────────────────────────────────────
  if (step === 'live-voting') {
    const totalVotes = liveState.votedStudents.length;
    return (
      <div className="card-glow flex flex-col min-h-[500px] p-4 sm:p-6 animate-fade-in relative z-10">
        <div className="flex items-center justify-between mb-8 border-b border-surface-border pb-4">
          <div>
            <h2 className="text-3xl font-black text-white flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              Votación Activa
            </h2>
            <p className="text-gray-400 text-sm mt-1">Los alumnos están votando desde sus dispositivos.</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-brand-light">{totalVotes}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Votos Emitidos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto mb-6 pr-2">
          {gameOptions.map((item) => {
            const count = liveState.votes[item.juego] || 0;
            const pct = totalVotes > 0 ? Math.round((count/totalVotes)*100) : 0;
            return (
              <div key={item.juego} className="bg-surface-card border border-surface-border p-4 rounded-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-brand/10 transition-all duration-700 ease-out" style={{ width: `${pct}%`}}></div>
                <div className="relative z-10 flex justify-between items-center">
                  <span className="font-bold text-white max-w-[70%] truncate">{item.juego}</span>
                  <div className="text-right flex items-center justify-end gap-3 min-w-[70px]">
                    <span className="text-lg font-black text-brand-light">{count}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-surface-border flex-wrap gap-4">
          <div className="text-sm text-gray-400 font-medium">
            <span className="text-white font-bold">{liveState.totalStudentsOnline}</span> estudiantes conectados a la sala.
          </div>
          {isAdmin && (
            <button onClick={closeVoting} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold px-8 py-3 rounded-full flex gap-2 items-center shadow-lg hover:-translate-y-0.5 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" /></svg>
              Cerrar Votación y Ver Resultados
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // RESULTADOS + CALENDARIO (IGUAL QUE ANTES)
  // ─────────────────────────────────────────────────────────────────
  const activeFinalists = finalists || topN(liveState.votes, 3).map(([j]) => j)
  const voteMap = finalists ? (liveState.votes || {}) : liveState.votes
  const sortedGames = topN(voteMap, gameOptions.length)
  const rest           = sortedGames.slice(3)
  const totalVotes     = Object.values(voteMap).reduce((a, b) => a + b, 0)

  const medals = ['#FFD700', '#C0C0C0', '#CD7F32']
  const labels = ['1°', '2°', '3°']

  return (
    <div className="card-glow animate-fade-in relative overflow-hidden min-h-[500px] p-4 sm:p-6 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-800/60">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
            Juegos de la Temporada
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            {totalVotes > 0 ? `${totalVotes} votos emitidos` : 'Resultados de la sesión anterior'}
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0 flex-wrap justify-end">
          {isAdmin && (
            <button onClick={handleReset} className="text-xs text-gray-500 hover:text-red-400 transition-colors underline">
              Reiniciar debate
            </button>
          )}
        </div>
      </div>

      {/* Top 3 */}
      <div>
        <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-3">Finalistas</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeFinalists.map((juego, idx) => {
            const count = voteMap[juego] || 0
            const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : null
            return (
              <div key={juego} className="rounded-2xl p-5 border border-amber-400/30 bg-amber-400/5 flex flex-col items-center text-center gap-2 shadow-lg">
                <span className="text-2xl font-black" style={{ color: medals[idx] }}>{labels[idx]}</span>
                <h3 className="text-white font-extrabold text-lg leading-tight">{juego}</h3>
                {pct !== null && (
                  <>
                    <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${medals[idx]}, ${medals[idx]}99)` }} />
                    </div>
                    <p className="text-xs text-gray-400"><span className="font-bold text-white text-sm">{count}</span> votos · {pct}%</p>
                  </>
                )}
                <button onClick={() => handleSelectGame(juego)} className={`mt-1 text-xs px-4 py-1.5 rounded-xl font-bold transition-all border ${selectedGame === juego ? 'bg-brand text-white border-brand' : 'bg-surface-hover border-surface-border text-gray-300 hover:border-brand/50'}`}>
                  {selectedGame === juego ? 'Ocultar bracket' : 'Ver bracket'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
