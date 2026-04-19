/**
 * SessionModule.jsx — Módulo de Sesiones del Club
 * ==================================================
 * Pestaña "Sesión Activa":
 *   - Iniciar sesión (con juego opcional)
 *   - Pasar asistencia (toggle por alumno)
 *   - Registrar equipo por alumno presente
 *   - Marcar equipo como devuelto individualmente
 *   - Finalizar sesión (devuelve todo automáticamente)
 *
 * Pestaña "Reportes":
 *   - Selector: Hoy / Esta semana / Este mes
 *   - Métricas de asistencia y equipos
 *   - Historial de sesiones en el rango
 */

import React, { useEffect, useState, useCallback } from 'react'
import useStore from '../store/useStore'
import {
  fetchActiveSession, fetchSessionById,
  startSession, endSession,
  toggleAttendance, addEquipment, removeEquipment, returnEquipment,
  fetchReport, fetchPlayerHistory,
  addUniversityEquipment, removeUniversityEquipment, returnUniversityEquipment,
  fetchUniversityEquipmentHistory,
  addPeerLoan, removePeerLoan, returnPeerLoan, fetchPeerLoansHistory,
} from '../api/sessionApi'
import { fetchPlayers, fetchRsvps, clearRsvps } from '../api/api'
import { getSocket } from '../api/socket'

// ─── Constantes ───────────────────────────────────────────────────────────────

const EQ_TYPES = ['Consola', 'Televisión', 'Periférico', 'PC', 'Router/Red', 'Otro']

const TYPE_ICONS = {
  Consola: '', Televisión: '', Periférico: '',
  PC: '', 'Router/Red': '', Otro: '',
}

const EMPTY_EQ_FORM = { type: 'Consola', brand: '', model: '', serial: '', description: '' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}
function elapsed(startIso) {
  const ms = Date.now() - new Date(startIso).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Sub: Formulario de inicio de sesión ─────────────────────────────────────
function StartSessionModal({ players, onClose, onStarted }) {
  const [game, setGame]     = useState('')
  const [notes, setNotes]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState(null)

  async function handleStart(e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const session = await startSession({ game, notes, playerNames: players.map((p) => p.nombre) })
      onStarted(session)
      onClose()
    } catch (error) { setErr(error.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-bold text-white">Iniciar Nueva Sesión</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleStart} className="p-6 space-y-4">
          {err && <p className="text-rose-400 text-sm bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-2">{err}</p>}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Juego de hoy (opcional)</span>
            <input className="input-field" value={game} onChange={(e) => setGame(e.target.value)} placeholder="ej. FIFA 25, Smash Bros…" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Notas</span>
            <textarea className="input-field resize-none min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones generales…" />
          </label>
          <p className="text-xs text-gray-600">
            {players.length > 0
              ? `Se cargarán ${players.length} alumno${players.length !== 1 ? 's' : ''} desde el roster.`
              : '⚠️ No hay alumnos en el roster (verificá la conexión con Google Sheets).'}
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Iniciando…' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Sub: Formulario inline de equipo ────────────────────────────────────────
function AddEquipmentForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_EQ_FORM })
  const [busy, setBusy] = useState(false)
  function f(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  async function handle(e) {
    e.preventDefault()
    setBusy(true)
    await onAdd(form)
    setBusy(false)
  }

  return (
    <form onSubmit={handle} className="mt-2 p-3 rounded-xl bg-surface border border-surface-border space-y-2 animate-slide-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select className="input-field text-xs py-1.5" value={form.type} onChange={(e) => f('type', e.target.value)}>
          {EQ_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input className="input-field text-xs py-1.5" placeholder="Marca" value={form.brand} onChange={(e) => f('brand', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className="input-field text-xs py-1.5" placeholder="Modelo" value={form.model} onChange={(e) => f('model', e.target.value)} />
        <input className="input-field text-xs py-1.5 font-mono" placeholder="N° serie (opcional)" value={form.serial} onChange={(e) => f('serial', e.target.value)} />
      </div>
      <input className="input-field text-xs py-1.5 w-full" placeholder="Descripción adicional (opcional)" value={form.description} onChange={(e) => f('description', e.target.value)} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded-lg transition-colors">Cancelar</button>
        <button type="submit" disabled={busy} className="text-xs bg-brand/20 border border-brand/40 text-brand-light hover:bg-brand/30 px-3 py-1 rounded-lg transition-colors">
          {busy ? '…' : 'Registrar equipo'}
        </button>
      </div>
    </form>
  )
}

// ─── Sub: Fila de alumno en sesión activa ─────────────────────────────────────
function AttendeeRow({ attendee, sessionId, onSessionUpdate }) {
  const [addingEq, setAddingEq] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    try {
      const updated = await toggleAttendance(sessionId, attendee.playerName, !attendee.present)
      onSessionUpdate(updated)
    } catch (e) { alert(e.message) }
    finally { setToggling(false) }
  }

  async function handleAddEq(data) {
    try {
      await addEquipment(sessionId, attendee.playerName, data)
      const session = await fetchSessionById(sessionId)
      onSessionUpdate(session)
    } catch (e) { alert(e.message) }
    setAddingEq(false)
  }

  async function handleReturn(eqId) {
    try {
      await returnEquipment(sessionId, attendee.playerName, eqId)
      const session = await fetchSessionById(sessionId)
      onSessionUpdate(session)
    } catch (e) { alert(e.message) }
  }

  async function handleRemoveEq(eqId) {
    try {
      await removeEquipment(sessionId, attendee.playerName, eqId)
      const session = await fetchSessionById(sessionId)
      onSessionUpdate(session)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className={`rounded-xl border transition-all duration-200 ${attendee.present ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-surface-border bg-surface-card'}`}>
      {/* Header del alumno */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox de asistencia */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`w-6 h-6 rounded-md shrink-0 border-2 flex items-center justify-center transition-all ${
            attendee.present
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-surface-border hover:border-gray-400'
          }`}
        >
          {attendee.present && (
            <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>

        {/* Avatar + Nombre */}
        <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-xs font-bold text-brand-light shrink-0">
          {(attendee.playerName || '?').slice(0, 1).toUpperCase()}
        </div>
        <p className={`font-medium text-sm flex-1 ${attendee.present ? 'text-white' : 'text-gray-500'}`}>
          {attendee.playerName || '(sin nombre)'}
        </p>

        {attendee.present && (
          <div className="flex items-center gap-2">
            {attendee.arrivedAt && (
              <span className="text-[10px] text-gray-600">Llegó {fmtTime(attendee.arrivedAt)}</span>
            )}
            <button
              onClick={() => setAddingEq((v) => !v)}
              className="text-[10px] border border-brand/30 text-brand-light bg-brand/10 hover:bg-brand/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              {addingEq ? 'Cancelar' : '+ Equipo'}
            </button>
          </div>
        )}
      </div>

      {/* Equipos del alumno */}
      {attendee.present && (
        <div className="px-4 pb-3 space-y-2">
          {attendee.equipment.length > 0 && attendee.equipment.map((eq) => (
            <div key={eq.id} className={`flex flex-wrap items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-all ${
              eq.returnedAt
                ? 'border-gray-700/50 bg-gray-800/30 text-gray-600 line-through'
                : 'border-amber-500/20 bg-amber-500/5 text-gray-300'
            }`}>
              <span className="text-base">{TYPE_ICONS[eq.type] || ''}</span>
              <span className="font-medium no-underline not-italic">{eq.type}</span>
              {eq.brand && <span className="text-gray-500 no-underline not-italic">· {eq.brand} {eq.model}</span>}
              {eq.serial && <code className="font-mono text-gray-600 break-all no-underline not-italic">{eq.serial}</code>}
              <div className="ml-auto flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                {!eq.returnedAt ? (
                  <>
                    <button
                      onClick={() => handleReturn(eq.id)}
                      title="Marcar como devuelto"
                      className="text-[10px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-2 py-0.5 rounded-md transition-colors"
                    >
                      ✓ Devuelto
                    </button>
                    <button
                      onClick={() => handleRemoveEq(eq.id)}
                      title="Eliminar"
                      className="text-gray-600 hover:text-rose-400 transition-colors px-1"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="text-emerald-700 text-[10px]">✓ devuelto {fmtTime(eq.returnedAt)}</span>
                )}
              </div>
            </div>
          ))}
          {addingEq && <AddEquipmentForm onAdd={handleAddEq} onCancel={() => setAddingEq(false)} />}
        </div>
      )}
    </div>
  )
}

// ─── Sub: Equipos de la Universidad (nivel sesión) ───────────────────────────

const EMPTY_UNI_FORM = { type: 'Consola', brand: '', model: '', serial: '', description: '' }

function UniversityEquipmentSection({ session, onSessionUpdate }) {
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState({ ...EMPTY_UNI_FORM })
  const [busy, setBusy]     = useState(false)
  function f(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  const uniEq = session.universityEquipment || []
  const pending = uniEq.filter((e) => !e.returnedAt).length

  async function handleAdd(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await addUniversityEquipment(session.id, form)
      const updated = await fetchSessionById(session.id)
      onSessionUpdate(updated)
      setForm({ ...EMPTY_UNI_FORM })
      setOpen(false)
    } catch (err) { alert(err.message) }
    finally { setBusy(false) }
  }

  async function handleReturn(eqId) {
    try {
      await returnUniversityEquipment(session.id, eqId)
      const updated = await fetchSessionById(session.id)
      onSessionUpdate(updated)
    } catch (err) { alert(err.message) }
  }

  async function handleRemove(eqId) {
    try {
      await removeUniversityEquipment(session.id, eqId)
      const updated = await fetchSessionById(session.id)
      onSessionUpdate(updated)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-sky-300">Equipos de la Universidad</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md font-medium">Encargado: Sebastian Vasquez</span>
            <p className="text-[10px] text-gray-500">
              {uniEq.length === 0
                ? 'Sin equipos registrados'
                : `${uniEq.length} equipo${uniEq.length !== 1 ? 's' : ''} — ${pending} por devolver`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] border border-sky-500/40 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-xl transition-colors"
        >
          {open ? 'Cancelar' : '+ Agregar equipo'}
        </button>
      </div>

      {/* Formulario inline */}
      {open && (
        <form onSubmit={handleAdd} className="p-3 rounded-xl bg-surface border border-sky-500/20 space-y-2 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select className="input-field text-xs py-1.5" value={form.type} onChange={(e) => f('type', e.target.value)}>
              {EQ_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input-field text-xs py-1.5" placeholder="Marca" value={form.brand} onChange={(e) => f('brand', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="input-field text-xs py-1.5" placeholder="Modelo" value={form.model} onChange={(e) => f('model', e.target.value)} />
            <input className="input-field text-xs py-1.5 font-mono" placeholder="N° serie (opcional)" value={form.serial} onChange={(e) => f('serial', e.target.value)} />
          </div>
          <input className="input-field text-xs py-1.5 w-full" placeholder="Descripción adicional (opcional)" value={form.description} onChange={(e) => f('description', e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={busy} className="text-xs bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 px-3 py-1 rounded-lg transition-colors">
              {busy ? '…' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de equipos universitarios */}
      {uniEq.length > 0 && (
        <div className="space-y-2">
          {uniEq.map((eq) => (
            <div
              key={eq.id}
              className={`flex flex-wrap items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-all ${
                eq.returnedAt
                  ? 'border-gray-700/50 bg-gray-800/30 text-gray-600 line-through'
                  : 'border-sky-500/20 bg-sky-500/5 text-gray-300'
              }`}
            >
              <span className="text-base">{TYPE_ICONS[eq.type] || ''}</span>
              <span className="font-medium no-underline not-italic">{eq.type}</span>
              {eq.brand && <span className="text-gray-500 no-underline not-italic">· {eq.brand} {eq.model}</span>}
              {eq.serial && <code className="font-mono text-gray-600 break-all no-underline not-italic">{eq.serial}</code>}
              {eq.addedAt && (
                <span className="text-[10px] text-sky-400/80 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md ml-1 no-underline not-italic">
                  Pedido a las {fmtTime(eq.addedAt)}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0 justify-end">
                {!eq.returnedAt ? (
                  <>
                    <button
                      onClick={() => handleReturn(eq.id)}
                      className="text-[10px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-2 py-0.5 rounded-md transition-colors"
                    >
                      ✓ Devuelto
                    </button>
                    <button
                      onClick={() => handleRemove(eq.id)}
                      className="text-gray-600 hover:text-rose-400 transition-colors px-1"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="text-emerald-700 text-[10px] no-underline not-italic">✓ devuelto {fmtTime(eq.returnedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub: Préstamos entre Estudiantes (P2P Loans) ─────────────────────────────

const EMPTY_LOAN_FORM = { equipmentId: '', borrowerName: '' }

function PeerLoansSection({ session, onSessionUpdate }) {
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState({ ...EMPTY_LOAN_FORM })
  const [busy, setBusy]     = useState(false)
  function f(k, v) { setForm((p) => ({ ...p, [k]: v })) }

  const loans = session.peerLoans || []
  const pending = loans.filter((e) => !e.returnedAt).length

  const availableEquipment = [];
  session.attendance.forEach(a => {
    if (a.present) {
      (a.equipment || []).forEach(eq => {
        if (!eq.returnedAt) {
          availableEquipment.push({
            id: eq.id,
            label: `${a.playerName} — ${eq.type} ${eq.brand} ${eq.model}`.trim()
          });
        }
      });
    }
  });

  async function handleAdd(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await addPeerLoan(session.id, form)
      const updated = await fetchSessionById(session.id)
      onSessionUpdate(updated)
      setForm({ ...EMPTY_LOAN_FORM })
      setOpen(false)
    } catch (err) { alert(err.message) }
    finally { setBusy(false) }
  }

  async function handleReturn(loanId) {
    try {
      await returnPeerLoan(session.id, loanId)
      const updated = await fetchSessionById(session.id)
      onSessionUpdate(updated)
    } catch (err) { alert(err.message) }
  }

  async function handleRemove(loanId) {
    try {
      await removePeerLoan(session.id, loanId)
      const updated = await fetchSessionById(session.id)
      onSessionUpdate(updated)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-purple-300">Préstamos entre Estudiantes</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-gray-500">
              {loans.length === 0
                ? 'Ningún préstamo registrado'
                : `${loans.length} préstamo${loans.length !== 1 ? 's' : ''} — ${pending} activo${pending !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] border border-purple-500/40 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-xl transition-colors"
        >
          {open ? 'Cancelar' : '+ Registrar préstamo'}
        </button>
      </div>

      {/* Formulario inline */}
      {open && (
        <form onSubmit={handleAdd} className="p-3 rounded-xl bg-surface border border-purple-500/20 space-y-2 animate-slide-up">
          <label className="flex flex-col gap-1.5 text-xs text-gray-400">
            <span>¿Qué equipo prestará?</span>
            <select className="input-field text-xs py-1.5" value={form.equipmentId} onChange={(e) => f('equipmentId', e.target.value)} required>
              <option value="">Seleccione equipo registrado en sesión</option>
              {availableEquipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-400 mt-2">
            <span>¿A quién (o para qué)?</span>
            <select className="input-field text-xs py-1.5" value={form.borrowerName} onChange={(e) => f('borrowerName', e.target.value)} required>
              <option value="">Seleccione asistente o actividad</option>
              <optgroup label="Alumnos Presentes">
                {session.attendance.filter(a => a.present).map(a => (
                  <option key={a.playerName} value={a.playerName}>{a.playerName}</option>
                ))}
              </optgroup>
              <optgroup label="Otros">
                <option value="Torneo / Evento Oficial">Torneo / Evento Oficial</option>
                <option value="Uso General del Club">Uso General del Club</option>
              </optgroup>
            </select>
          </label>
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={busy} className="text-xs bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 px-3 py-1 rounded-lg transition-colors">
              {busy ? '…' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de préstamos */}
      {loans.length > 0 && (
        <div className="space-y-2">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`flex flex-wrap items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-all ${
                loan.returnedAt
                  ? 'border-gray-700/50 bg-gray-800/30 text-gray-600 line-through'
                  : 'border-purple-500/20 bg-purple-500/5 text-gray-300'
              }`}
            >
              <span className="font-medium no-underline not-italic">{loan.item}</span>
              <span className="text-gray-500 no-underline not-italic">· De <strong className="text-purple-300 font-normal">{loan.providerName}</strong> a <strong className="text-purple-300 font-normal">{loan.borrowerName}</strong></span>
              {loan.loanedAt && (
                <span className="text-[10px] text-purple-400/80 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md ml-1 no-underline not-italic">
                  {fmtTime(loan.loanedAt)}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0 justify-end">
                {!loan.returnedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReturn(loan.id)}
                      className="text-[10px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-2 py-0.5 rounded-md transition-colors"
                    >
                      ✓ Devuelto
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(loan.id)}
                      className="text-gray-600 hover:text-rose-400 transition-colors px-1"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="text-emerald-700 text-[10px] no-underline not-italic">✓ devuelto {fmtTime(loan.returnedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub: Vista de sesión activa ──────────────────────────────────────────────
function ActiveSessionView({ session, players, onSessionUpdate, onEndSession }) {
  const [ending, setEnding] = useState(false)
  const [elapsed_, setElapsed] = useState(elapsed(session.startedAt))

  useEffect(() => {
    const t = setInterval(() => setElapsed(elapsed(session.startedAt)), 30_000)
    return () => clearInterval(t)
  }, [session.startedAt])

  async function handleEnd() {
    if (!confirm('¿Finalizar la sesión? Todos los equipos pendientes se marcarán como devueltos.')) return
    setEnding(true)
    try {
      const ended = await endSession(session.id)
      onEndSession(ended)
    } catch (e) { alert(e.message) }
    finally { setEnding(false) }
  }

  const presentCount  = session.attendance.filter((a) => a.present).length
  const totalEquipment = session.attendance.reduce((acc, a) => acc + a.equipment.length, 0)
  const pendingReturn  = session.attendance.reduce((acc, a) => acc + a.equipment.filter((e) => !e.returnedAt).length, 0)

  return (
    <div className="space-y-4">
      {/* Banner sesión activa */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Sesión en curso</span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">
              {session.game || 'Sesión libre'}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">{fmtDate(session.startedAt)} · Inició a las {fmtTime(session.startedAt)}</p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-2xl font-bold text-white">{elapsed_}</p>
            <p className="text-[10px] text-gray-600">duración</p>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="mt-4 flex gap-4 text-sm">
          <div>
            <p className="text-lg font-bold text-white">{presentCount}</p>
            <p className="text-[10px] text-gray-500">presentes</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{totalEquipment}</p>
            <p className="text-[10px] text-gray-500">equipos</p>
          </div>
          {pendingReturn > 0 && (
            <div>
              <p className="text-lg font-bold text-amber-400">{pendingReturn}</p>
              <p className="text-[10px] text-gray-500">por devolver</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleEnd}
            disabled={ending}
            className="px-5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 text-sm font-medium transition-all"
          >
            {ending ? 'Finalizando…' : 'Finalizar sesión'}
          </button>
        </div>
      </div>

      {/* Lista de asistencia */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Asistencia — {session.attendance.length} alumnos</h4>
          <span className="text-xs text-gray-600">{presentCount} presentes</span>
        </div>
        <div className="space-y-2">
          {session.attendance.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">No se cargaron alumnos en esta sesión.</p>
          ) : (
            session.attendance.map((attendee, idx) => (
              <AttendeeRow
                key={attendee.playerName ?? `attendee-${idx}`}
                attendee={attendee}
                sessionId={session.id}
                onSessionUpdate={onSessionUpdate}
              />
            ))
          )}
        </div>
      </div>

      {/* Equipos de la Universidad */}
      <UniversityEquipmentSection session={session} onSessionUpdate={onSessionUpdate} />

      {/* Préstamos entre Estudiantes */}
      <PeerLoansSection session={session} onSessionUpdate={onSessionUpdate} />
    </div>
  )
}

// ─── Sub: Sesión finalizada (read-only) ───────────────────────────────────────
function EndedSessionView({ session, onNewSession }) {
  const presentCount   = session.attendance.filter((a) => a.present).length
  const totalEquipment = session.attendance.reduce((acc, a) => acc + a.equipment.length, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-surface-border bg-surface-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Última sesión finalizada</span>
            <h3 className="text-white font-bold text-lg mt-1">{session.game || 'Sesión libre'}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{fmtDate(session.startedAt)} · {fmtTime(session.startedAt)} → {fmtTime(session.endedAt)}</p>
          </div>
          <div className="flex gap-4 sm:gap-3 text-left sm:text-right">
            <div><p className="text-xl font-bold text-white">{presentCount}</p><p className="text-[10px] text-gray-600">presentes</p></div>
            <div><p className="text-xl font-bold text-white">{totalEquipment}</p><p className="text-[10px] text-gray-600">equipos</p></div>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={onNewSession} className="btn-primary">Iniciar nueva sesión</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub: Sin sesión ─────────────────────────────────────────────────────────
function NoSessionView({ onNewSession, rsvps, setRsvps }) {
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    if (!confirm('¿Estás seguro de que deseas limpiar todas las respuestas de asistencia?')) return
    setClearing(true)
    try {
      const data = await clearRsvps()
      setRsvps(data.rsvps)
    } catch (e) {
      alert("Error al limpiar")
    }
    setClearing(false)
  }

  const yesCount = rsvps.filter(r => r.willAttend).length
  const noCount = rsvps.filter(r => !r.willAttend).length

  return (
    <div className="space-y-6">
      <div className="text-center py-10 bg-surface-card rounded-2xl border border-surface-border">
        <div className="text-5xl mb-4"></div>
        <p className="text-white font-bold text-lg">No hay sesión activa</p>
        <p className="text-sm text-gray-500 mt-1 mb-6">Inicia una sesión para registrar asistencia y equipos.</p>
        <button onClick={onNewSession} className="btn-primary">Iniciar sesión</button>
      </div>

      {rsvps.length > 0 && (
        <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface">
            <div>
              <h3 className="font-bold text-white text-base">Intención de Asistencia (RSVP)</h3>
              <p className="text-xs text-gray-500 mt-0.5">Respuestas de alumnos bloqueados por horario o cierre manual</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs flex gap-3 font-semibold">
                <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">Sí: {yesCount}</span>
                <span className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded-lg">No: {noCount}</span>
              </div>
              <button 
                onClick={handleClear} 
                disabled={clearing}
                className="text-xs bg-surface border border-surface-border text-gray-400 hover:text-white hover:bg-surface-hover px-3 py-1.5 rounded-lg transition-colors"
                title="Limpiar todas las respuestas"
              >
                {clearing ? '...' : 'Limpiar lista'}
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-surface-border/50 text-gray-500">
                <th className="text-left px-4 py-2 font-medium text-xs">Alumno</th>
                <th className="text-center px-4 py-2 font-medium text-xs">¿Asistirá?</th>
                <th className="text-right px-4 py-2 font-medium text-xs">Aviso enviado</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r, i) => (
                <tr key={r.rut} className={`border-b border-surface-border/30 hover:bg-surface-hover transition-colors ${i % 2 === 0 ? '' : 'bg-surface/30'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-300">{r.nombre}</td>
                  <td className="px-4 py-2.5 text-center">
                    {r.willAttend ? (
                      <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded text-xs border border-emerald-400/20">SÍ</span>
                    ) : (
                      <span className="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded text-xs border border-rose-400/20">NO</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                    {fmtDate(r.timestamp)} a las {fmtTime(r.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Sub: Reportes ───────────────────────────────────────────────────────────
const RANGES = [
  { id: 'day',   label: 'Hoy' },
  { id: 'week',  label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
]

function ReportsView() {
  const [range, setRange]   = useState('week')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadReport = useCallback(async () => {
    setLoading(true)
    try { setReport(await fetchReport(range)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [range])

  useEffect(() => { loadReport() }, [loadReport])

  return (
    <div className="space-y-5">
      {/* Selector de rango */}
      <div className="flex overflow-x-auto gap-2 pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
              range === r.id
                ? 'bg-brand/20 border-brand/50 text-brand-light'
                : 'border-surface-border text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-gray-500 animate-pulse">Cargando reportes…</div>}

      {!loading && report && (
        <>
          {/* Tarjetas métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '', label: 'Sesiones', value: report.totalSessions, accent: 'bg-brand/10 text-brand-light' },
              { icon: '', label: 'Asistencias totales', value: report.totalPresent, accent: 'bg-sky-400/10 text-sky-400' },
              { icon: '', label: 'Prom. asistentes', value: report.avgAttendance, accent: 'bg-emerald-400/10 text-emerald-400' },
              { icon: '', label: 'Equipos registrados', value: report.totalEquipment, accent: 'bg-amber-400/10 text-amber-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl p-4 bg-surface-card border border-surface-border flex items-center gap-3">
                <div className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center ${c.accent}`}>{c.icon}</div>
                <div>
                  <p className="text-xl font-bold text-white">{c.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top destacados */}
          {(report.topPlayer || report.topEquipment) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.topPlayer && (
                <div className="rounded-2xl p-4 bg-surface-card border border-surface-border">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Alumno más frecuente</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-sm font-bold text-brand-light">
                      {report.topPlayer.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{report.topPlayer.name}</p>
                      <p className="text-[10px] text-gray-500">{report.topPlayer.sessions} sesión{report.topPlayer.sessions !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>
                </div>
              )}
              {report.topEquipment && (
                <div className="rounded-2xl p-4 bg-surface-card border border-surface-border">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Equipo más traído</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-base">
                      
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{report.topEquipment.label}</p>
                      <p className="text-[10px] text-gray-500">{report.topEquipment.count} vez{report.topEquipment.count !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historial de sesiones */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-3">
              Historial — {report.from === report.to ? report.from : `${report.from} → ${report.to}`}
            </h4>
            {report.sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <div className="text-4xl mb-3"></div>
                <p>No hay sesiones en este período.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-border overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-card border-b border-surface-border whitespace-nowrap">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Juego</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Asistentes</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipos</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duración</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sessions.map((s, i) => {
                      const present = s.attendance.filter((a) => a.present).length
                      const eqCount = s.attendance.reduce((a, at) => a + at.equipment.length, 0)
                      let dur = '—'
                      if (s.endedAt) {
                        const ms = new Date(s.endedAt) - new Date(s.startedAt)
                        const h = Math.floor(ms / 3_600_000)
                        const m = Math.floor((ms % 3_600_000) / 60_000)
                        dur = h > 0 ? `${h}h ${m}m` : `${m}m`
                      }
                      return (
                        <tr key={s.id} className={`border-b border-surface-border/50 hover:bg-surface-hover transition-colors ${i % 2 === 0 ? '' : 'bg-surface-card/30'}`}>
                          <td className="px-4 py-3 text-gray-300">
                            <p className="font-medium">{fmtDate(s.startedAt)}</p>
                            <p className="text-[10px] text-gray-600">{fmtTime(s.startedAt)}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{s.game || <span className="text-gray-700 italic">Libre</span>}</td>
                          <td className="px-4 py-3 text-white font-medium">{present}</td>
                          <td className="px-4 py-3 text-white font-medium">{eqCount}</td>
                          <td className="px-4 py-3 text-gray-400">{dur}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              s.status === 'active'
                                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                                : 'text-gray-500 bg-surface-hover border-surface-border'
                            }`}>
                              {s.status === 'active' ? 'En curso' : 'Finalizada'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub: Historial por Alumno ───────────────────────────────────────────────
function PlayerHistoryView({ players }) {
  const [selected, setSelected] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async (name) => {
    if (!name) { setData(null); return }
    setLoading(true)
    try {
      const res = await fetchPlayerHistory(name)
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadHistory(selected) }, [selected, loadHistory])

  // Get unique player names that have non-empty names
  const validPlayers = players.filter((p) => p.nombre && p.nombre.trim())

  return (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-300">Seleccionar Alumno</span>
          <select
            className="input-field w-full max-w-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">-- Elige un alumno --</option>
            {validPlayers.map((p) => (
              <option key={p.rut || p.nombre} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <div className="text-center py-10 text-gray-500 animate-pulse">Cargando historial…</div>}

      {!loading && data && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-surface-card border border-surface-border rounded-2xl p-4">
              <p className="text-xl font-bold text-white">{data.total}</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Sesiones asistidas</p>
            </div>
            <div className="flex-1 bg-surface-card border border-surface-border rounded-2xl p-4">
              <p className="text-xl font-bold text-amber-400">
                {data.history.reduce((acc, s) => acc + (s.equipment?.length || 0), 0)}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Equipos traídos</p>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-gray-400 mt-6 mb-3">Línea de tiempo de asistencias</h4>
          
          {data.history.length === 0 ? (
            <div className="text-center py-10 text-gray-600 border border-surface-border border-dashed rounded-2xl">
              No hay registros de sesiones para este alumno.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-border before:to-transparent">
              {data.history.map((session, idx) => {
                const eqCount = session.equipment?.length || 0
                return (
                  <div key={session.sessionId} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Marker */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-brand/20 text-brand-light shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      {eqCount > 0 ? '' : ''}
                    </div>
                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-surface-border bg-surface-card hover:bg-surface-hover transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-bold text-sm">{fmtDate(session.date)}</p>
                          <p className="text-xs text-gray-500">{session.game || 'Sesión libre'} · {fmtTime(session.startedAt)}</p>
                        </div>
                        {!session.present && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md border border-rose-500/20">Ausente</span>
                        )}
                      </div>
                      
                      {eqCount > 0 ? (
                        <div className="mt-3 space-y-1.5 pt-3 border-t border-surface-border">
                          <p className="text-[10px] text-gray-500 uppercase font-semibold">Equipos ({eqCount})</p>
                          {session.equipment.map(eq => (
                            <div key={eq.id} className="text-xs flex items-center gap-2 text-gray-300">
                              <span>{TYPE_ICONS[eq.type] || ''}</span>
                              <span className="font-medium text-amber-500/90">{eq.type}</span>
                              <span className="text-gray-500">{eq.brand} {eq.model}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 mt-2 italic">Sin equipos registrados</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub: Historial de Equipos de la Universidad ────────────────────────────
function UniversityEquipmentHistoryView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchUniversityEquipmentHistory()
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-surface-card border border-surface-border rounded-2xl p-5">
        <div>
          <h3 className="text-lg font-bold text-white">Equipos de la Universidad</h3>
          <p className="text-sm text-gray-400 mt-1">Historial de todos los equipos prestados a lo largo del tiempo.</p>
        </div>
        <div className="text-center shrink-0">
          <p className="text-2xl font-bold text-sky-400">{data ? data.length : 0}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Préstamos</p>
        </div>
      </div>

      {loading && <div className="text-center py-10 text-gray-500 animate-pulse">Cargando historial…</div>}

      {!loading && data && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Línea de tiempo de préstamos</h4>
          
          {data.length === 0 ? (
            <div className="text-center py-10 text-gray-600 border border-surface-border border-dashed rounded-2xl">
              No hay registros de préstamos de la universidad.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-border before:to-transparent">
              {data.map((eq, idx) => (
                <div key={`${eq.id}-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Marker */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-sky-500/20 text-sky-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <span className="text-base">{TYPE_ICONS[eq.type] || ''}</span>
                  </div>
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-surface-border bg-surface-card hover:bg-surface-hover transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-bold text-sm">{fmtDate(eq.date)}</p>
                        <p className="text-xs text-gray-500">{eq.sessionGame} · Pedido a las {fmtTime(eq.addedAt)}</p>
                      </div>
                      <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-md border border-sky-500/20 whitespace-nowrap">Encargado: S. Vásquez</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-surface-border">
                      <div className="text-xs flex flex-col gap-1 text-gray-300">
                        <div className="flex items-center gap-2">
                           <span className="font-medium text-sky-400">{eq.type}</span>
                           <span className="text-gray-400">{eq.brand} {eq.model}</span>
                        </div>
                        {eq.serial && <code className="text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded w-fit mt-1">S/N: {eq.serial}</code>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub: Historial de Préstamos P2P ──────────────────────────────────────────
function PeerLoansHistoryView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchPeerLoansHistory()
      setData(res)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-surface-card border border-surface-border rounded-2xl p-5">
        <div>
          <h3 className="text-lg font-bold text-white">Historial de Préstamos P2P</h3>
          <p className="text-sm text-gray-400 mt-1">Historial de todos los préstamos entre estudiantes y al club.</p>
        </div>
        <div className="text-center shrink-0">
          <p className="text-2xl font-bold text-purple-400">{data ? data.length : 0}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Préstamos</p>
        </div>
      </div>

      {loading && <div className="text-center py-10 text-gray-500 animate-pulse">Cargando historial…</div>}

      {!loading && data && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Línea de tiempo de préstamos P2P</h4>
          
          {data.length === 0 ? (
            <div className="text-center py-10 text-gray-600 border border-surface-border border-dashed rounded-2xl">
              No hay registros de préstamos P2P.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-surface-border before:to-transparent">
              {data.map((loan, idx) => (
                <div key={`${loan.id}-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Marker */}
                  <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-surface bg-purple-500/80 text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 mt-[1.2rem] md:mt-0 z-10">
                  </div>
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-surface-border bg-surface-card hover:bg-surface-hover transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-bold text-sm">{fmtDate(loan.date)}</p>
                        <p className="text-xs text-gray-500">{loan.sessionGame} · Prestado a las {fmtTime(loan.loanedAt)}</p>
                      </div>
                      {loan.returnedAt && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                          ✓ Dev. {fmtTime(loan.returnedAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-surface-border">
                      <div className="text-xs flex flex-col gap-1 text-gray-300">
                        <div className="flex items-center gap-2">
                           <span className="font-medium text-purple-400">{loan.item}</span>
                        </div>
                        <p className="text-gray-400 mt-1">De <strong className="text-white font-normal">{loan.providerName}</strong> a <strong className="text-white font-normal">{loan.borrowerName}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function SessionModule() {
  const { players, setPlayers, setLastSync, user } = useStore()
  const [tab, setTab]         = useState('session')
  const [session, setSession] = useState(undefined)
  const [rsvps, setRsvps]     = useState([])
  const [showStart, setShowStart] = useState(false)
  const [loading, setLoading] = useState(true)

  // Cargar jugadores si el store aún no los tiene (no depende de PlayersTable)
  useEffect(() => {
    if (players.length === 0) {
      fetchPlayers()
        .then((res) => { setPlayers(res.players); setLastSync(res.lastSync) })
        .catch((e) => console.warn('[SessionModule] No se pudieron cargar jugadores:', e))
    }
  }, [players.length, setPlayers, setLastSync])

  const loadActive = useCallback(async () => {
    setLoading(true)
    try {
      const [active, rsvpData] = await Promise.all([fetchActiveSession(), fetchRsvps()])
      setSession(active.session)
      setRsvps(rsvpData || [])
    } catch {
      setSession(null)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadActive() }, [loadActive])

  useEffect(() => {
    if (user?.role) {
      const socket = getSocket(user)
      const handleRsvpUpdate = (data) => setRsvps(data)
      socket.on('rsvp:updated', handleRsvpUpdate)
      return () => socket.off('rsvp:updated', handleRsvpUpdate)
    }
  }, [user])

  function handleSessionUpdate(updated) { setSession(updated) }
  function handleEndSession(ended) { setSession(ended) }

  return (
    <div className="space-y-5">
      {/* Pestañas */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-surface-card border border-surface-border rounded-2xl w-full md:w-fit scrollbar-hide">
        {[
          { id: 'session', label: 'Sesión activa' },
          { id: 'reports', label: 'Reportes globales' },
          { id: 'history', label: 'Historial por alumno' },
          { id: 'uni-history', label: 'Historial Univ.' },
          { id: 'p2p-history', label: 'Historial P2P' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-brand/20 text-brand-light'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'session' && (
        <>
          {showStart && (
            <StartSessionModal
              players={players}
              onClose={() => setShowStart(false)}
              onStarted={(s) => { setSession(s); setShowStart(false) }}
            />
          )}
          {loading || session === undefined ? (
            <div className="text-center py-16 text-gray-500 animate-pulse">Cargando sesión…</div>
          ) : session === null ? (
            <NoSessionView onNewSession={() => setShowStart(true)} rsvps={rsvps} setRsvps={setRsvps} />
          ) : session.status === 'active' ? (
            <ActiveSessionView
              session={session}
              players={players}
              onSessionUpdate={handleSessionUpdate}
              onEndSession={handleEndSession}
            />
          ) : (
            <EndedSessionView session={session} onNewSession={() => setShowStart(true)} />
          )}
        </>
      )}

      {tab === 'reports' && <ReportsView />}
      {tab === 'history' && <PlayerHistoryView players={players} />}
      {tab === 'uni-history' && <UniversityEquipmentHistoryView />}
      {tab === 'p2p-history' && <PeerLoansHistoryView />}
    </div>
  )
}
