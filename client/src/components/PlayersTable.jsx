/**
 * PlayersTable.jsx
 * =====================================
 * Vista de todos los jugadores registrados en la base de datos.
 * Permite filtrar por plataforma, buscar, y gestionar el CRUD de jugadores de manera inline (Admin).
 */

import React, { useEffect, useCallback, useState } from 'react'
import useStore from '../store/useStore'
import {
  fetchPlayers,
  setPlayerRole,
  createPlayer,
  updatePlayer,
  deletePlayer,
  seedPlayers
} from '../api/api'

export default function PlayersTable() {
  const { user, players, setPlayers, setLastSync } = useStore()
  const isAdmin = user?.role === 'admin'
  const [filter, setFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')

  // Estado del Formulario Inline
  const [showForm, setShowForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    discord: '',
    juegosPropuesto: '',
    plataforma: '',
    horasJugadas: '',
    traeEquipo: false
  })

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
    const nameMatch = p.nombre ? p.nombre.toLowerCase().includes(filter.toLowerCase()) : false
    const rutMatch = p.rut ? p.rut.includes(filter) : false
    const matchesName = nameMatch || rutMatch
    const matchesPlatform = platformFilter === 'all' || p.plataforma === platformFilter
    return matchesName && matchesPlatform
  })

  const handleRoleToggle = async (rut, currentRole) => {
    const newRole = currentRole === 'asistente' ? 'student' : 'asistente'
    try {
      await setPlayerRole(rut, newRole)
      setPlayers(players.map(p => p.rut === rut ? { ...p, role: newRole } : p))
    } catch (e) {
      console.error('Error cambiando rol:', e)
      alert("Error al cambiar el rol")
    }
  }

  const openAddForm = () => {
    setEditingPlayer(null)
    setFormData({
      rut: '',
      nombre: '',
      discord: '',
      juegosPropuesto: '',
      plataforma: '',
      horasJugadas: '',
      traeEquipo: false
    })
    setShowForm(true)
  }

  const openEditForm = (player) => {
    setEditingPlayer(player)
    setFormData({
      rut: player.rut,
      nombre: player.nombre,
      discord: player.discord || '',
      juegosPropuesto: player.juegosPropuesto || '',
      plataforma: player.plataforma || '',
      horasJugadas: player.horasJugadas || '',
      traeEquipo: !!player.traeEquipo
    })
    setShowForm(true)
    // Desplazarse al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingPlayer(null)
  }

  const handleDelete = async (rut) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente a este jugador?")) {
      return
    }
    try {
      await deletePlayer(rut)
      setPlayers(players.filter(p => p.rut !== rut))
    } catch (e) {
      console.error('Error al eliminar jugador:', e)
      alert(e.message || "Error al eliminar el jugador")
    }
  }

  const handleSeedPlayers = async () => {
    if (!window.confirm("¿Deseas poblar la base de datos con los 22 alumnos iniciales? Esto borrará el listado actual y lo reestablecerá.")) {
      return
    }
    try {
      const res = await seedPlayers()
      if (res.success) {
        alert("¡Base de datos poblada exitosamente con los 22 alumnos!")
        await load() // Recargar listado
      } else {
        alert(res.message || "Error al poblar base de datos")
      }
    } catch (e) {
      console.error('Error al poblar base de datos:', e)
      alert(e.message || "Error al poblar la base de datos. Inténtalo de nuevo.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPlayer) {
        // Modo Edición
        const res = await updatePlayer(editingPlayer.rut, formData)
        if (res.success) {
          setPlayers(players.map(p => p.rut === editingPlayer.rut ? { ...p, ...formData, horasJugadas: Number(formData.horasJugadas) || 0 } : p))
          closeForm()
        }
      } else {
        // Modo Creación
        const res = await createPlayer(formData)
        if (res.success) {
          await load() // Recargar para obtener todo limpio
          closeForm()
        }
      }
    } catch (e) {
      console.error('Error al guardar jugador:', e)
      alert(e.message || "Error al guardar el jugador. Verifica que el RUT no esté duplicado.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario Inline de Registro/Edición (Solo Admin) */}
      {isAdmin && showForm && (
        <div className="card-glow border border-brand/20 bg-surface-hover/20 p-6 rounded-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingPlayer ? '📝 Editar Jugador' : '👤 Registrar Nuevo Jugador'}
            </h3>
            <button
              onClick={closeForm}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">RUT *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingPlayer}
                  placeholder="12.345.678-9"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Discord / WhatsApp</label>
                <input
                  type="text"
                  placeholder="user#1234 o +569..."
                  value={formData.discord}
                  onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Juego Propuesto</label>
                <input
                  type="text"
                  placeholder="Minecraft, Valorant, etc."
                  value={formData.juegosPropuesto}
                  onChange={(e) => setFormData({ ...formData, juegosPropuesto: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Plataforma</label>
                <input
                  type="text"
                  placeholder="PC, PS4, Switch, etc."
                  value={formData.plataforma}
                  onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Horas Jugadas</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.horasJugadas}
                  onChange={(e) => setFormData({ ...formData, horasJugadas: e.target.value })}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="traeEquipo"
                checked={formData.traeEquipo}
                onChange={(e) => setFormData({ ...formData, traeEquipo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <label htmlFor="traeEquipo" className="text-sm text-gray-300 cursor-pointer select-none">
                Trae su propio equipo (Mouse, Teclado, Control, etc.)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all"
              >
                {editingPlayer ? 'Guardar Cambios' : 'Registrar Jugador'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla Principal de Jugadores */}
      <div className="card-glow animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">Jugadores Registrados</h2>
            <p className="text-sm text-gray-400 mt-0.5">{filtered.length} de {players.length} jugadores</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Action button for Admin */}
            {isAdmin && !showForm && (
              <>
                <button
                  onClick={openAddForm}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-brand/10 hover:shadow-brand/20 active:scale-95 animate-pulse"
                >
                  ➕ Registrar Jugador
                </button>
                <button
                  onClick={handleSeedPlayers}
                  className="bg-accent-green hover:bg-accent-green/80 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95"
                >
                  🌱 Poblar Alumnos
                </button>
              </>
            )}

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
                  <>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                      Permisos
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                      Acciones
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="text-center text-gray-500 py-10">
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
                    <td className="py-3 pr-4">
                      {p.traeEquipo ? (
                        <span className="badge bg-accent-green/20 text-accent-green">Sí</span>
                      ) : (
                        <span className="badge bg-surface-hover text-gray-500">No</span>
                      )}
                    </td>
                    {isAdmin && (
                      <>
                        <td className="py-3 pr-4">
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
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditForm(p)}
                              title="Editar Jugador"
                              className="p-1 hover:text-accent-cyan text-gray-400 transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(p.rut)}
                              title="Eliminar Jugador"
                              className="p-1 hover:text-red-500 text-gray-400 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
