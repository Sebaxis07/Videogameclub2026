/**
 * HardwareModule.jsx — Módulo Completo de Inventario de Hardware
 * ================================================================
 * Características:
 *  - Tabla de equipos con filtros por tipo y estado + búsqueda
 *  - Formulario modal para crear / editar equipos
 *  - Vinculación de equipos a jugadores del roster
 *  - Estadísticas rápidas (tarjetas superiores)
 *  - Confirmación antes de eliminar
 *  - Datos persistidos en el backend (JSON en disco)
 */

import React, { useEffect, useState, useCallback } from 'react'
import useStore from '../store/useStore'
import {
  fetchHardware,
  fetchHardwareStats,
  createHardwareItem,
  updateHardwareItem,
  deleteHardwareItem,
} from '../api/hardwareApi'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPES    = ['Televisión', 'Consola', 'Periférico', 'PC', 'Router/Red', 'Otro']
const STATUSES = ['disponible', 'en_uso', 'mantenimiento', 'baja']

const STATUS_META = {
  disponible:    { label: 'Disponible',    color: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' },
  en_uso:        { label: 'En uso',        color: 'text-sky-400    bg-sky-400/10    border border-sky-400/20'    },
  mantenimiento: { label: 'Mantenimiento', color: 'text-amber-400  bg-amber-400/10  border border-amber-400/20'  },
  baja:          { label: 'Baja',          color: 'text-rose-400   bg-rose-400/10   border border-rose-400/20'   },
}

const TYPE_ICONS = {
  'Televisión':  '',
  'Consola':     '',
  'Periférico':  '',
  'PC':          '',
  'Router/Red':  '',
  'Otro':        '',
}

const EMPTY_FORM = {
  name: '', type: 'Consola', brand: '', model: '',
  serial: '', location: '', status: 'disponible',
  assignedTo: [], notes: '',
}

// ─── Sub-componente: Tarjeta de estadística ───────────────────────────────────
function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`rounded-2xl p-4 bg-surface-card border border-surface-border flex items-center gap-4`}>
      <div className={`text-2xl w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Sub-componente: Badge de estado ─────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'text-gray-400 bg-gray-400/10' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.color}`}>
      {meta.label}
    </span>
  )
}

// ─── Sub-componente: Modal formulario ────────────────────────────────────────
function HardwareFormModal({ item, players, onClose, onSave }) {
  const [form, setForm]   = useState(item ? { ...item } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const isEdit = !!item

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })) }

  function togglePlayer(name) {
    setForm((f) => {
      const list = f.assignedTo.includes(name)
        ? f.assignedTo.filter((n) => n !== name)
        : [...f.assignedTo, name]
      return { ...f, assignedTo: list }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        const updated = await updateHardwareItem(item.id, form)
        onSave(updated, 'update')
      } else {
        const created = await createHardwareItem(form)
        onSave(created, 'create')
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-bold text-white text-base">
            {isEdit ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="text-rose-400 text-sm bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          {/* Fila 1: Nombre + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Nombre del equipo *</span>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="ej. TV Samsung 55&quot;"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Tipo</span>
              <select className="input-field" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          {/* Fila 2: Marca + Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Marca</span>
              <input className="input-field" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="ej. Sony" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Modelo</span>
              <input className="input-field" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="ej. KD-55X80J" />
            </label>
          </div>

          {/* Fila 3: N° Serie + Ubicación */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">N° de Serie</span>
              <input className="input-field font-mono" value={form.serial} onChange={(e) => set('serial', e.target.value)} placeholder="SN-XXXXXXXX" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Ubicación</span>
              <input className="input-field" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="ej. Sala A · Mesa 2" />
            </label>
          </div>

          {/* Estado */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Estado</span>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    form.status === s
                      ? STATUS_META[s].color + ' opacity-100'
                      : 'border-surface-border text-gray-500 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </label>

          {/* Vincular a jugadores */}
          {players.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-gray-400 font-medium">Vincular a jugadores</span>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1">
                {players.map((p) => {
                  const sel = form.assignedTo.includes(p.name)
                  return (
                    <button
                      type="button"
                      key={p.name}
                      onClick={() => togglePlayer(p.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                        sel
                          ? 'bg-brand/20 border-brand/50 text-brand-light'
                          : 'border-surface-border text-gray-500 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      {sel ? '✓ ' : ''}{p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notas */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Notas de seguridad / descripción</span>
            <textarea
              className="input-field min-h-[72px] resize-none"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Descripción adicional, observaciones, estado físico, etc."
            />
          </label>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-componente: Modal confirmación eliminar ──────────────────────────────
function DeleteConfirmModal({ item, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onConfirm(item.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-slide-up p-6 text-center">
        <div className="text-4xl mb-3"></div>
        <h3 className="font-bold text-white text-base mb-1">Eliminar equipo</h3>
        <p className="text-sm text-gray-400 mb-6">
          ¿Estás seguro de eliminar <span className="text-white font-medium">"{item.name}"</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose}    className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function HardwareModule() {
  const { players } = useStore()

  const [hardware, setHardware]   = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Filtros
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modales
  const [editItem, setEditItem]   = useState(null)   // null = cerrado, {} = nuevo, {...} = editar
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [hw, st] = await Promise.all([
        fetchHardware({ type: filterType, status: filterStatus, search }),
        fetchHardwareStats(),
      ])
      setHardware(hw.hardware)
      setStats(st)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStatus, search])

  useEffect(() => {
    const t = setTimeout(loadData, 300)
    return () => clearTimeout(t)
  }, [loadData])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSave(savedItem, action) {
    if (action === 'create') {
      setHardware((prev) => [savedItem, ...prev])
    } else {
      setHardware((prev) => prev.map((h) => h.id === savedItem.id ? savedItem : h))
    }
    fetchHardwareStats().then(setStats).catch(() => {})
  }

  async function handleDelete(id) {
    try {
      await deleteHardwareItem(id)
      setHardware((prev) => prev.filter((h) => h.id !== id))
      setDeleteTarget(null)
      fetchHardwareStats().then(setStats).catch(() => {})
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Modales */}
      {modalOpen && (
        <HardwareFormModal
          item={editItem}
          players={players}
          onClose={() => { setModalOpen(false); setEditItem(null) }}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Tarjetas de estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="" label="Total equipos"  value={stats.total}                              accent="bg-brand/10 text-brand-light" />
          <StatCard icon="" label="Disponibles"    value={stats.byStatus?.disponible    ?? 0}       accent="bg-emerald-400/10 text-emerald-400" />
          <StatCard icon="" label="En uso"         value={stats.byStatus?.en_uso        ?? 0}       accent="bg-sky-400/10 text-sky-400" />
          <StatCard icon="" label="Mantenimiento"  value={stats.byStatus?.mantenimiento ?? 0}       accent="bg-amber-400/10 text-amber-400" />
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="input-field pl-9 w-full"
            placeholder="Buscar por nombre, marca, modelo, N° serie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro tipo */}
        <select className="input-field" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Filtro estado */}
        <select className="input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>

        {/* Botón nuevo */}
        <button
          onClick={() => { setEditItem(null); setModalOpen(true) }}
          className="btn-primary whitespace-nowrap"
        >
          ＋ Nuevo equipo
        </button>
      </div>

      {/* Estado de carga / error */}
      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3 animate-pulse"></div>
          <p>Cargando inventario…</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-rose-400 text-sm bg-rose-400/10 border border-rose-400/20 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl font-bold">!</span>
          <div>
            <p className="font-medium">No se pudo conectar con el servidor</p>
            <p className="text-xs text-rose-400/70 mt-0.5">{error}</p>
          </div>
          <button onClick={loadData} className="ml-auto text-xs underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {/* Tabla de hardware */}
      {!loading && !error && (
        hardware.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-5xl mb-4"></div>
            <p className="text-base font-medium text-gray-500">Sin equipos registrados</p>
            <p className="text-sm mt-1">Haz clic en "Nuevo equipo" para comenzar.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-card border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">N° Serie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ubicación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vinculado a</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {hardware.map((h, i) => (
                  <tr
                    key={h.id}
                    className={`border-b border-surface-border/50 hover:bg-surface-hover transition-colors ${i % 2 === 0 ? '' : 'bg-surface-card/30'}`}
                  >
                    {/* Equipo */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{TYPE_ICONS[h.type] || ''}</span>
                        <div>
                          <p className="font-medium text-white leading-tight">{h.name}</p>
                          <p className="text-[10px] text-gray-600">{h.type}</p>
                        </div>
                      </div>
                    </td>

                    {/* Marca / Modelo */}
                    <td className="px-4 py-3 text-gray-400">
                      {h.brand && <span className="text-gray-300 font-medium">{h.brand}</span>}
                      {h.brand && h.model && <span className="text-gray-600"> · </span>}
                      {h.model}
                    </td>

                    {/* N° Serie */}
                    <td className="px-4 py-3">
                      {h.serial
                        ? <code className="font-mono text-[11px] text-gray-400 bg-surface-border/40 px-1.5 py-0.5 rounded">{h.serial}</code>
                        : <span className="text-gray-700">—</span>
                      }
                    </td>

                    {/* Ubicación */}
                    <td className="px-4 py-3 text-gray-400 text-xs">{h.location || '—'}</td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <StatusBadge status={h.status} />
                    </td>

                    {/* Vinculado a */}
                    <td className="px-4 py-3">
                      {h.assignedTo && h.assignedTo.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {h.assignedTo.slice(0, 3).map((name) => (
                            <span key={name} className="text-[10px] border border-brand/30 text-brand-light bg-brand/10 px-1.5 py-0.5 rounded-md">
                              {name}
                            </span>
                          ))}
                          {h.assignedTo.length > 3 && (
                            <span className="text-[10px] text-gray-600">+{h.assignedTo.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-700 text-xs">Sin asignar</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          title="Editar"
                          onClick={() => { setEditItem(h); setModalOpen(true) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-surface-hover transition-all"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          title="Eliminar"
                          onClick={() => setDeleteTarget(h)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pie de página */}
      {!loading && hardware.length > 0 && (
        <p className="text-xs text-gray-700 text-center">
          {hardware.length} equipo{hardware.length !== 1 ? 's' : ''} mostrado{hardware.length !== 1 ? 's' : ''}
          {(filterType || filterStatus || search) ? ' (filtrado)' : ''}
        </p>
      )}
    </div>
  )
}
