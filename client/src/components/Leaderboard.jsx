/**
 * Leaderboard.jsx
 * =====================================
 * Módulo 4: Ranking Mensual — Top 5
 *
 * Fórmula: Puntos = (Partidas_Jugadas × 10) + (Partidas_Ganadas × 50)
 */

import React, { useEffect, useCallback } from 'react'
import useStore from '../store/useStore'
import { fetchLeaderboard } from '../api/api'

const MEDALS = ['1.', '2.', '3.', '4.', '5.']

const POSITION_COLORS = [
  'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  'from-gray-400/20 to-gray-400/5 border-gray-400/30',
  'from-orange-600/20 to-orange-600/5 border-orange-600/30',
  'from-surface-hover/50 to-surface-card/50 border-surface-border',
  'from-surface-hover/50 to-surface-card/50 border-surface-border',
]

export default function Leaderboard() {
  const { leaderboard, setLeaderboard, setLastSync } = useStore()

  const load = useCallback(async () => {
    try {
      const res = await fetchLeaderboard()
      setLeaderboard(res.leaderboard)
      setLastSync(res.lastSync)
    } catch (e) {
      console.error('[Leaderboard] Error:', e)
    }
  }, [setLeaderboard, setLastSync])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="card-glow animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Leaderboard Mensual</h2>
          <p className="text-xs font-mono text-gray-500 mt-0.5">
            Puntos = (Jugadas × 10) + (Ganadas × 50)
          </p>
        </div>
        <button className="btn-ghost text-xs self-start sm:self-auto" onClick={load}>Actualizar</button>
      </div>

      {/* Table */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay datos de partidas aún.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {leaderboard.map((p, idx) => (
            <div
              key={p.rut}
              className={`relative bg-gradient-to-r ${POSITION_COLORS[idx]} border rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 transition-all duration-200 hover:scale-[1.01]`}
            >
              <div className="flex items-center gap-4">
                {/* Position */}
                <span className="text-2xl w-8 text-center shrink-0">
                  {MEDALS[idx]}
                </span>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{p.discord || p.rut}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-around sm:justify-end gap-2 sm:gap-4 shrink-0 sm:ml-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-surface-border">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500">Jugadas</p>
                  <p className="font-bold text-white">{p.partidasJugadas}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500">Ganadas</p>
                  <p className="font-bold text-accent-green">{p.partidasGanadas}</p>
                </div>
                <div className="text-center min-w-[64px]">
                  <p className="text-[10px] sm:text-xs text-gray-500">Puntos</p>
                  <p className="font-bold text-xl text-gradient leading-none">{p.puntos}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formula breakdown */}
      <div className="mt-4 pt-4 border-t border-surface-border">
        <p className="text-xs text-gray-600 text-center font-mono">
          Cada partida jugada = +10pts · Cada victoria = +50pts
        </p>
      </div>
    </div>
  )
}
