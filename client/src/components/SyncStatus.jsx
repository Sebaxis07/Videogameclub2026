/**
 * SyncStatus.jsx
 * =====================================
 * Módulo 1: Indicador de sincronización en tiempo real.
 * Muestra el timestamp del último sync con Google Sheets,
 * un indicador de estado animado, y un botón de sync manual.
 */

import React, { useState } from 'react'
import useStore from '../store/useStore'
import { triggerSync, fetchPlayers, fetchDebate, fetchLeaderboard } from '../api/api'

function formatRelativeTime(isoString) {
  if (!isoString) return 'Nunca'
  const diff = Date.now() - new Date(isoString).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 10) return 'Ahora mismo'
  if (secs < 60) return `hace ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins}m`
  return `hace ${Math.floor(mins / 60)}h`
}

export default function SyncStatus() {
  const { lastSync, setLastSync, setPlayers, setDebateData, setLeaderboard } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  const handleManualSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await triggerSync()
      setLastSync(result.lastSync)
      // Refrescar todos los datos en paralelo
      const [players, debate, lb] = await Promise.all([
        fetchPlayers(),
        fetchDebate(),
        fetchLeaderboard(),
      ])
      setPlayers(players.players)
      setDebateData(debate.data)
      setLeaderboard(lb.leaderboard)
    } catch (e) {
      setSyncError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-surface-card border border-surface-border rounded-xl text-sm">
      {/* Status dot */}
      <div className="relative shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            syncError
              ? 'bg-accent-red'
              : syncing
              ? 'bg-accent-amber animate-pulse'
              : 'bg-accent-green'
          }`}
        />
        {!syncing && !syncError && (
          <div className="absolute inset-0 rounded-full bg-accent-green animate-ping opacity-40" />
        )}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        {syncError ? (
          <span className="text-accent-red text-xs truncate">{syncError}</span>
        ) : (
          <span className="text-gray-400 text-xs">
            Sheets · {syncing ? 'Sincronizando...' : formatRelativeTime(lastSync)}
          </span>
        )}
      </div>

      {/* Manual sync button */}
      <button
        onClick={handleManualSync}
        disabled={syncing}
        className="shrink-0 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
        title="Sincronizar ahora"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
    </div>
  )
}
