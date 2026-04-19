/**
 * PlayersTable.jsx
 * =====================================
 * Vista de todos los jugadores registrados en Google Sheets.
 * Permite filtrar por plataforma y por TraeEquipo.
 */

import React, { useEffect, useCallback, useState } from 'react'
import useStore from '../store/useStore'
import { fetchPlayers, setPlayerRole } from '../api/api'

export default function PlayersTable() {
  const { user, players, setPlayers, setLastSync } = useStore()
  const isAdmin = user?.role === 'admin'
  const [filter, setFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const res = await fetchPlayers()
      setPlayers(res.players)
      setLastSync(res.lastSync)
    } catch (e) {
      console.error('[PlayersTable] Error:', e)
    }
  }, [setPlayers, setLastSync])

  useEffect(() => { load() }, [load])

  const platforms = ['all', ...new Set(players.map((p) => p.plataforma).filter(Boolean))]

  const filtered = players.filter((p) => {
    const matchesName = p.nombre.toLowerCase().includes(filter.toLowerCase()) ||
      p.rut.includes(filter)
    const matchesPlatform = platformFilter === 'all' || p.plataforma === platformFilter
    return matchesName && matchesPlatform
  })

  const handleRoleToggle = async (rut, currentRole) => {
    const newRole = currentRole === 'asistente' ? 'student' : 'asistente'
    try {
      await setPlayerRole(rut, newRole)
      setPlayers(players.map(p => p.rut === rut ? { ...p, role: newRole } : p))
    } catch (e) {
      console.error('Error cambando rol:', e)
      alert("Error al cambiar rol")
    }
  }

  return (
    <div className="card-glow animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Jugadores Registrados</h2>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} de {players.length} jugadores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar nombre o RUT..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-surface-hover border border-surface-border rounded-xl pl-4 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50 w-full sm:w-56"
            />
          </div>
          {/* Platform filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-surface-hover border border-surface-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
          >
            {platforms.map((p) => (
              <option key={p} value={p}>{p === 'all' ? 'Todas las plataformas' : p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-surface-border">
              {['#', 'Nombre', 'RUT', 'Juego Propuesto', 'Plataforma', 'Horas', 'Equipo'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                  {h}
                </th>
              ))}
              {isAdmin && (
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                  Permisos
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-10">
                  No se encontraron jugadores.
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => (
                <tr
                  key={p.rut}
                  className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors"
                >
                  <td className="py-3 pr-4 text-gray-600 font-mono text-xs">{idx + 1}</td>
                  <td className="py-3 pr-4 font-medium text-white">{p.nombre}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-400">{p.rut}</td>
                  <td className="py-3 pr-4">
                    <span className="badge bg-brand/15 text-brand-light">{p.juegosPropuesto}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{p.plataforma || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className="font-mono font-semibold text-accent-cyan">{p.horasJugadas}h</span>
                  </td>
                  <td className="py-3">
                    {p.traeEquipo ? (
                      <span className="badge bg-accent-green/20 text-accent-green">Sí</span>
                    ) : (
                      <span className="badge bg-surface-hover text-gray-500">No</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-3">
                      <button
                        onClick={() => handleRoleToggle(p.rut, p.role)}
                        className={`text-xs px-2 py-1 rounded-md font-bold transition-colors ${
                          p.role === 'asistente' 
                            ? 'bg-brand/20 text-brand-light border border-brand/50' 
                            : 'bg-surface hover:bg-surface-hover text-gray-400 border border-surface-border'
                        }`}
                      >
                        {p.role === 'asistente' ? '🛡️ Asistente' : '👤 Estudiante'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
