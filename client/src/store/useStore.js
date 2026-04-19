/**
 * useStore.js — Zustand Store Central
 * =====================================
 * Estado global del dashboard. Slices:
 *  - players       : array de jugadores desde API
 *  - debateData    : frecuencias agrupadas por juego
 *  - bracket       : estructura de bracket generado
 *  - leaderboard   : Top 5 jugadores
 *  - lastSync      : timestamp del último sync
 *  - selectedGame  : juego actualmente seleccionado para el bracket
 *  - activeView    : vista activa en el sidebar
 *  - isLoading     : estado de carga global
 *  - error         : error message global
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(persist((set, get) => ({
  // ── Auth State ─────────────────────────────────────────────────────────
  user: null, // { role: 'admin' | 'student', rut?: string, nombre?: string }

  // ── Data ───────────────────────────────────────────────────────────────
  players: [],
  debateData: [],
  bracket: null,
  leaderboard: [],
  lastSync: null,
  visibleModules: [],

  // ── UI State ───────────────────────────────────────────────────────────
  selectedGame: null,
  activeView: 'debate',        // 'debate' | 'bracket' | 'leaderboard' | 'players'
  isLoading: false,
  syncStatus: 'idle',          // 'idle' | 'syncing' | 'ok' | 'error'
  error: null,

  // ── Tournament (Pre-Form) State ────────────────────────────────────────────
  // phase: 'form' = filling form | 'bracket' = bracket generated
  tournamentGame: null,        // null = mostrar selector | 'minecraft' | 'mk11'
  tournamentPhase: 'form',
  tournamentRegistrants: [],   // jugadores registrados desde el formulario
  tournamentGroups: [],        // bracket de fase de grupos
  tournamentStandings: {},     // { A: [], B: [], C: [] } resultados
  tournamentBracket: null,     // bracket generado a partir del formulario

  // ── Actions ────────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),
  logout: () => {
    // Also clear session storage if we want to drop module locks
    sessionStorage.clear()
    set({ user: null })
  },
  setPlayers: (players) => set({ players }),
  setDebateData: (debateData) => set({ debateData }),
  setBracket: (bracket) => set({ bracket }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setLastSync: (lastSync) => set({ lastSync }),
  setSelectedGame: (selectedGame) => set({ selectedGame }),
  setActiveView: (activeView) => set({ activeView }),
  setError: (error) => set({ error }),
  setVisibleModules: (visibleModules) => set({ visibleModules }),

  // Tournament actions
  setTournamentGame: (g) => set({ tournamentGame: g, tournamentPhase: 'form', tournamentRegistrants: [], tournamentGroups: [], tournamentStandings: {}, tournamentBracket: null }),
  setTournamentPhase: (phase) => set({ tournamentPhase: phase }),
  setTournamentRegistrants: (list) => set({ tournamentRegistrants: list }),
  setTournamentGroups: (groups) => set({ tournamentGroups: groups }),
  setTournamentStandings: (standings) => set({ tournamentStandings: standings }),
  setTournamentBracket: (bracket) => set({ tournamentBracket: bracket }),

  /**
   * Avanza un ganador a la siguiente ronda en el bracket local.
   * @param {number} roundIndex  Índice de la ronda actual (0-based)
   * @param {number} matchIndex  Índice del partido en la ronda
   * @param {'player1'|'player2'} winnerKey
   */
  advanceWinner: (roundIndex, matchIndex, winnerKey) => {
    const { bracket } = get()
    if (!bracket) return

    const newRounds = bracket.rounds.map((round, ri) =>
      round.map((match, mi) => ({ ...match }))
    )

    const match = newRounds[roundIndex][matchIndex]
    const winner = match[winnerKey]
    if (!winner || winner.isBye) return

    // Marcar ganador en la ronda actual
    newRounds[roundIndex][matchIndex] = {
      ...match,
      winner,
      player1: { ...match.player1, isWinner: winnerKey === 'player1' },
      player2: { ...match.player2, isWinner: winnerKey === 'player2' },
    }

    // Avanzar a la siguiente ronda si existe
    const nextRoundIndex = roundIndex + 1
    if (nextRoundIndex < newRounds.length) {
      const nextMatchIndex = Math.floor(matchIndex / 2)
      const isPlayer1Slot = matchIndex % 2 === 0

      // Check if nextMatch is valid
      if (newRounds[nextRoundIndex][nextMatchIndex]) {
        const nextMatch = { ...newRounds[nextRoundIndex][nextMatchIndex] }
        if (isPlayer1Slot) {
          nextMatch.player1 = { ...winner, isWinner: false }
        } else {
          nextMatch.player2 = { ...winner, isWinner: false }
        }
        newRounds[nextRoundIndex][nextMatchIndex] = nextMatch
      }
    }

    set({ bracket: { ...bracket, rounds: newRounds }, tournamentBracket: { ...bracket, rounds: newRounds } })
  },

  /**
   * Resetea el bracket a la primera ronda (limpia los ganadores).
   */
  resetBracket: () => {
    const { bracket } = get()
    if (!bracket) return
    const resetRounds = bracket.rounds.map((round, ri) =>
      round.map((match) => ({
        ...match,
        winner: ri === 0 ? match.winner : null,
        player1: ri === 0 ? match.player1 : null,
        player2: ri === 0 ? match.player2 : null,
      }))
    )
    set({ bracket: { ...bracket, rounds: resetRounds }, tournamentBracket: { ...bracket, rounds: resetRounds } })
  },
}), {
  name: 'club-dashboard-storage',
  partialize: (state) => ({ 
    user: state.user, 
    visibleModules: state.visibleModules, 
    activeView: state.activeView,
    tournamentGame: state.tournamentGame,
    tournamentPhase: state.tournamentPhase,
    tournamentRegistrants: state.tournamentRegistrants,
    tournamentGroups: state.tournamentGroups,
    tournamentBracket: state.tournamentBracket,
    bracket: state.bracket
  }),
}))

export default useStore
