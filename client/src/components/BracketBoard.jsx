/**
 * BracketBoard.jsx — Rediseño Total
 * =====================================
 * Sistema de torneo en 3 fases:
 *
 *  FASE 0 — Selector de juego (Minecraft 1.8.9 vs MK11)
 *  FASE 1 — Formulario Pre-Torneo (Admin llena por cada jugador)
 *  FASE 2 — Bracket visual con reglas integradas
 *
 * Seeding:
 *   alto  → seed 1–2 (fork más fácil)
 *   medio → seed 3–4
 *   bajo  → seed 5+
 */

import React, { useEffect, useCallback, useState, useRef } from 'react'
import useStore from '../store/useStore'
// Eliminado GroupPhaseBoard
import {
  fetchPlayers,
  fetchTournamentRegistrants,
  registerTournamentPlayer,
  removeTournamentPlayer,
  resetTournament,
  fetchTournamentBracket,
  fetchMinecraftEvaluations,
  fetchTournamentGroups,
  fetchSavedGroups
} from '../api/api'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MK_CHARACTERS = [
  'Alien', 'Bo Rai Cho', 'Cassie Cage', 'D Vorah', 'Ermac',
  'Erron Black', 'Ferra/Torr', 'Goro', 'Jacqui Briggs', 'Jason Voorhees',
  'Jax', 'Johnny Cage', 'Kano', 'Kenshi', 'Kitana', 'Kotal Kahn',
  'Kung Jin', 'Kung Lao', 'Leatherface', 'Liu Kang', 'Mileena',
  'Predator', 'Quan Chi', 'Raiden', 'Reptile', 'Scorpion', 'Shinnok',
  'Sonya Blade', 'Sub-Zero', 'Takeda', 'Tanya', 'Tremor', 'Triborg',
]

const MK_RANKS = ['Sin rango', 'Apprentice', 'Warrior', 'Champion', 'Master', 'Grand Master']

const NIVEL_LABELS = {
  bajo: { label: 'Principiante', emoji: '🌱', color: '#4ade80', desc: 'Juega ocasionalmente, aprendiendo mecánicas' },
  medio: { label: 'Intermedio',   emoji: '⚡', color: '#fbbf24', desc: 'Juega regularmente, conoce combos básicos' },
  alto:  { label: 'Experto',      emoji: '🔥', color: '#f87171', desc: 'Juega competitivamente, domina el juego' },
}

const GAME_CONFIG = {
  mk11: {
    id: 'mk11',
    name: 'Mortal Kombat XL',
    version: 'Desafío a los Jefes',
    color: '#f87171',
    colorDark: '#b91c1c',
    colorGlow: 'rgba(248,113,113,0.15)',
    accent: '#a855f7',
    icon: '🥊',
    gradient: 'linear-gradient(135deg, #450a0a 0%, #1a1a1a 100%)',
    badge: 'Boss Fight · Random Select · No Fatalities',
  },
}

// ─── Reglas del Torneo ────────────────────────────────────────────────────────

const TOURNAMENT_RULES = {
  mk11: [
    { title: 'Estructura de Competencia', icon: '🏆', items: [
      'Bloque A (Novatos): Eliminatoria rápida entre principiantes hasta obtener un ganador.',
      'Bloque B (Intermedios): Intermedios compiten entre sí, incluyendo al ganador del Bloque A. Salen 2 Aspirantes.',
      'Bloque Final (Boss Fight): Los 2 Aspirantes desafían a los 2 Expertos del club.',
    ]},
    { title: 'Reglas del Boss Fight', icon: '⚔️', items: [
      'Selección Aleatoria: Los expertos deben jugar con el personaje que el sistema elija al azar (Random).',
      'Ventaja de Retador: El Aspirante tiene 2 vidas (formato al mejor de 3).',
      'Desventaja de Experto: El Experto tiene solo 1 vida (si pierde una sola pelea, queda eliminado).',
    ]},
    { title: 'Definición del Campeón', icon: '🥇', items: [
      'Duelo de Titanes: Si ambos expertos ganan, pelean entre ellos sin restricciones por el trofeo.',
      'La Gran Sorpresa: Si los dos aspirantes ganan, la final es entre ellos por el primer lugar.',
      'David vs. Goliat: Si ganan un experto y un aspirante, pelean la final manteniendo el personaje aleatorio para el experto.',
    ]},
    { title: 'Normas de Agilidad', icon: '⏱️', items: [
      'Prohibición de Fatalities: No se permiten Fatalities ni Cinemáticas largas hasta la Gran Final.',
      'Continuidad: Jugador que no esté al llamado pierde por W.O. tras 2 minutos de espera.',
    ]},
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoundLabel(roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return 'FINAL'
  if (roundIndex === totalRounds - 2) return 'SEMIFINAL'
  if (roundIndex === totalRounds - 3) return 'CUARTOS'
  return `RONDA ${roundIndex + 1}`
}

function getInitials(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 640)
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// Eliminado GameSelector
// ─── Subcomponente: Panel de Reglas ───────────────────────────────────────────

function RulesPanel({ game, onClose }) {
  const cfg = GAME_CONFIG[game]
  const rules = TOURNAMENT_RULES[game] || []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      padding: 16,
      animation: 'fadeIn 0.2s ease',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a2e',
          border: `1px solid ${cfg.color}40`,
          borderRadius: 20,
          padding: 28,
          maxWidth: 560,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 40px ${cfg.colorGlow}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <span style={{ fontSize: 24 }}>{cfg.icon}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginLeft: 10 }}>
              Reglas — {cfg.name}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#ffffff15', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}
          >✕</button>
        </div>

        {rules.map((section, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{section.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {section.title}
              </span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((item, j) => (
                <li key={j} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px', borderRadius: 8, marginBottom: 4,
                  background: '#ffffff06',
                  fontSize: 13, color: '#d1d5db', lineHeight: 1.5,
                }}>
                  <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Subcomponente: Formulario Pre-Torneo ────────────────────────────────────

function PreTournamentForm({ game, sheetPlayers, onBracketGenerated }) {
  const cfg = GAME_CONFIG[game]
  const {
    tournamentRegistrants,
    setTournamentRegistrants,
    setTournamentPhase,
    setTournamentBracket,
    setTournamentGroups,
    user
  } = useStore()

  const isAdmin = user?.role === 'admin';
  const isAssistant = user?.role === 'asistente';
  const isAdminOrAssistant = isAdmin || isAssistant;

  const [form, setForm] = useState({
    nombre: '',
    nivel: '',
    cps: 8,
    victorias: 0,
    personaje: MK_CHARACTERS[0],
    rango: MK_RANKS[0],
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const inputRef = useRef(null)

  const filtered = sheetPlayers.filter(p =>
    form.nombre.length > 0 &&
    p.nombre.toLowerCase().includes(form.nombre.toLowerCase())
  ).slice(0, 6)

  const loadRegistrants = useCallback(async () => {
    try {
      const data = await fetchTournamentRegistrants(game)
      setTournamentRegistrants(data.registrants)
    } catch { /* silenciar */ }
  }, [game, setTournamentRegistrants])

  useEffect(() => { loadRegistrants() }, [loadRegistrants])

  const handleSave = async () => {
    if (!form.nombre.trim()) return setFeedback({ type: 'error', msg: 'Ingresa el nombre del jugador' })
    if (!form.nivel)         return setFeedback({ type: 'error', msg: 'Selecciona el nivel del jugador' })

    setSaving(true)
    setFeedback(null)
    try {
      const payload = { nombre: form.nombre.trim(), nivel: form.nivel }
      payload.personaje = form.personaje
      payload.rango     = form.rango
      const res = await registerTournamentPlayer(game, payload)
      setFeedback({ type: 'ok', msg: res.action === 'created' ? `✅ ${payload.nombre} registrado` : `🔄 ${payload.nombre} actualizado` })
      setForm(f => ({ ...f, nombre: '', nivel: '', cps: 8, victorias: 0 }))
      await loadRegistrants()
    } catch (e) {
      setFeedback({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id) => {
    await removeTournamentPlayer(game, id)
    await loadRegistrants()
  }

  const handleReset = async () => {
    await resetTournament(game)
    setTournamentRegistrants([])
    setConfirmReset(false)
  }

  const handleGenerate = async () => {
    if (tournamentRegistrants.length < 2) {
      return setFeedback({ type: 'error', msg: 'Necesitas al menos 2 jugadores registrados' })
    }
    setGenerating(true)
    try {
      const data = await fetchTournamentBracket(game)
      setTournamentBracket(data)
      setTournamentPhase('bracket')
      if (onBracketGenerated) onBracketGenerated(data)
    } catch (e) {
      setFeedback({ type: 'error', msg: e.message })
    } finally {
      setGenerating(false)
    }
  }


  const accentColor = cfg.color

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header del juego */}
      <div style={{
        background: cfg.gradient,
        border: `1px solid ${accentColor}30`,
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{cfg.name}</div>
            <div style={{ fontSize: 12, color: accentColor, fontWeight: 600 }}>{cfg.badge}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
            borderRadius: 20, padding: '4px 12px', fontSize: 12, color: accentColor, fontWeight: 700
          }}>
            {tournamentRegistrants.length} jugadores
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,1fr) 1fr', gap: 20 }}>

        {/* Panel izquierdo: formulario */}
        <div>
          <div style={{
            background: '#12121e',
            border: '1px solid #ffffff12',
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📋 Registrar Jugador
            </div>

            {/* Nombre con autocompletado */}
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                Nombre del jugador
              </label>
              <input
                ref={inputRef}
                value={form.nombre}
                onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setShowSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Escribe el nombre..."
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#1e1e2e', border: '1px solid #ffffff20',
                  borderRadius: 10, color: '#fff', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {showSuggestions && filtered.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#1e1e2e', border: '1px solid #ffffff20',
                  borderRadius: 10, overflow: 'hidden', marginTop: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {filtered.map(p => (
                    <div
                      key={p.rut || p.nombre}
                      onMouseDown={() => { setForm(f => ({ ...f, nombre: p.nombre })); setShowSuggestions(false) }}
                      style={{
                        padding: '8px 14px', cursor: 'pointer',
                        fontSize: 13, color: '#e5e7eb',
                        display: 'flex', justifyContent: 'space-between',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff10'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>{p.nombre}</span>
                      <span style={{ color: '#6b7280', fontSize: 11 }}>{p.juegosPropuesto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nivel (Bajo / Medio / Alto) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8 }}>
                Nivel de habilidad
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Object.entries(NIVEL_LABELS).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, nivel: key }))}
                    title={info.desc}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: `2px solid ${form.nivel === key ? info.color : '#ffffff15'}`,
                      background: form.nivel === key ? `${info.color}18` : '#1e1e2e',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{info.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: form.nivel === key ? info.color : '#9ca3af' }}>
                      {info.label}
                    </div>
                  </button>
                ))}
              </div>
              {form.nivel && (
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6, textAlign: 'center' }}>
                  {NIVEL_LABELS[form.nivel].desc}
                </p>
              )}
            </div>

            {/* Campos extra según juego */}
            {game === 'minecraft' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                    CPS aproximado — <span style={{ color: accentColor, fontWeight: 700 }}>{form.cps} clics/seg</span>
                  </label>
                  <input
                    type="range" min={1} max={20} value={form.cps}
                    onChange={e => setForm(f => ({ ...f, cps: +e.target.value }))}
                    style={{ width: '100%', accentColor: accentColor }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4b5563', marginTop: 2 }}>
                    <span>1 (bajo)</span><span>10 (normal)</span><span>20 (alto)</span>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                    Victorias PvP históricas — <span style={{ color: accentColor, fontWeight: 700 }}>{form.victorias}</span>
                  </label>
                  <input
                    type="range" min={0} max={50} value={form.victorias}
                    onChange={e => setForm(f => ({ ...f, victorias: +e.target.value }))}
                    style={{ width: '100%', accentColor: accentColor }}
                  />
                </div>
              </>
            )}

            {game === 'mk11' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                    Personaje Main
                  </label>
                  <select
                    value={form.personaje}
                    onChange={e => setForm(f => ({ ...f, personaje: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: '#1e1e2e', border: '1px solid #ffffff20',
                      borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none',
                    }}
                  >
                    {MK_CHARACTERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                    Rango Online (opcional)
                  </label>
                  <select
                    value={form.rango}
                    onChange={e => setForm(f => ({ ...f, rango: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: '#1e1e2e', border: '1px solid #ffffff20',
                      borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none',
                    }}
                  >
                    {MK_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Feedback */}
            {feedback && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 12,
                background: feedback.type === 'ok' ? '#16a34a20' : '#dc262620',
                border: `1px solid ${feedback.type === 'ok' ? '#16a34a40' : '#dc262640'}`,
                color: feedback.type === 'ok' ? '#4ade80' : '#f87171',
                fontSize: 13,
              }}>
                {feedback.msg}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '12px',
                background: saving ? '#374151' : `linear-gradient(135deg, ${accentColor}, ${cfg.colorDark})`,
                border: 'none', borderRadius: 10,
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: saving ? 'none' : `0 4px 16px ${cfg.colorGlow}`,
              }}
            >
              {saving ? 'Guardando...' : '+ Registrar Jugador'}
            </button>
          </div>
        </div>

        {/* Panel derecho: lista de registrados */}
        <div>
          <div style={{
            background: '#12121e',
            border: '1px solid #ffffff12',
            borderRadius: 14,
            padding: 20,
            height: '100%',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                👥 Lista del Torneo
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {game === 'minecraft' && (
                  <button
                    onClick={handleImportEvals}
                    disabled={saving}
                    style={{ background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 8, padding: '4px 10px', color: '#60a5fa', fontSize: 11, cursor: saving ? 'not-allowed' : 'pointer' }}
                  >
                    📥 Importar Evaluados
                  </button>
                )}
                {tournamentRegistrants.length > 0 && !confirmReset && isAdmin && (
                  <button
                    onClick={() => setConfirmReset(true)}
                    style={{ background: '#dc262615', border: '1px solid #dc262630', borderRadius: 8, padding: '4px 10px', color: '#f87171', fontSize: 11, cursor: 'pointer' }}
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
              {confirmReset && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleReset} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                    ¿Confirmar?
                  </button>
                  <button onClick={() => setConfirmReset(false)} style={{ background: '#374151', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                    No
                  </button>
                </div>
              )}
            </div>

            {tournamentRegistrants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4b5563' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <p style={{ fontSize: 13 }}>Sin jugadores registrados.</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Usa el formulario para agregar participantes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                {tournamentRegistrants.map((p, i) => {
                  const lvl = NIVEL_LABELS[p.nivel] || {}
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#1e1e2e', borderRadius: 10,
                      padding: '8px 12px',
                      border: `1px solid #ffffff0a`,
                      transition: 'border-color 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = `${accentColor}40`}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#ffffff0a'}
                    >
                      {/* Seed number */}
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `${accentColor}25`, color: accentColor,
                        fontSize: 11, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>

                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `${lvl.color || '#6b7280'}25`,
                        border: `1px solid ${lvl.color || '#6b7280'}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: lvl.color || '#9ca3af',
                        flexShrink: 0,
                      }}>
                        {getInitials(p.nombre)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {lvl.emoji} {lvl.label}
                          {game === 'minecraft' && ` · ${p.victorias} pts`}
                          {game === 'mk11' && p.personaje && ` · ${p.personaje}`}
                        </div>
                      </div>

                      {/* Nivel badge */}
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        background: `${lvl.color || '#6b7280'}18`,
                        color: lvl.color || '#9ca3af',
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {p.nivel?.toUpperCase()}
                      </span>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(p.id)}
                        style={{
                          background: 'none', border: 'none',
                          color: '#4b5563', cursor: 'pointer', padding: 4,
                          borderRadius: 6, fontSize: 14, flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Generar bracket */}
            {tournamentRegistrants.length >= 2 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 8, background: '#ffffff08',
                  marginBottom: 12, fontSize: 12, color: '#9ca3af',
                }}>
                  <span>
                    {tournamentRegistrants.length} jugadores →&nbsp;
                    {Math.pow(2, Math.ceil(Math.log2(tournamentRegistrants.length)))} slots en bracket
                  </span>
                  {tournamentRegistrants.length % 2 !== 0 && (
                    <span style={{ color: '#fbbf24', fontSize: 11 }}>
                      ⚠️ {Math.pow(2, Math.ceil(Math.log2(tournamentRegistrants.length))) - tournamentRegistrants.length} BYE(s)
                    </span>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    width: '100%', padding: '14px',
                    background: generating ? '#374151' : `linear-gradient(135deg, ${accentColor} 0%, ${cfg.accent} 100%)`,
                    border: 'none', borderRadius: 12,
                    color: '#fff', fontWeight: 800, fontSize: 15,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.03em',
                    boxShadow: generating ? 'none' : `0 8px 32px ${cfg.colorGlow}`,
                  }}
                >
                  {generating ? '⚙️ Construyendo...' : (game === 'minecraft' ? `⚔️ Generar Grupos PVP (${tournamentRegistrants.length} jugadores)` : `🏆 Generar Bracket (${tournamentRegistrants.length} jugadores)`)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponente: MatchCard ─────────────────────────────────────────────────

function MatchCard({ match, roundIndex, matchIndex, cfg, isMobile }) {
  const { advanceWinner, usedComodins, useComodin, user } = useStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'asistente'

  const handleClick = (playerKey) => {
    const player = match[playerKey]
    if (!player || player.isBye || match.winner) return
    advanceWinner(roundIndex, matchIndex, playerKey)
  }

  const cardW  = isMobile ? 148 : 210
  const padH   = isMobile ? 8   : 10
  const padSide= isMobile ? 10  : 12
  const fSize  = isMobile ? 11  : 13
  const avaW   = isMobile ? 22  : 26

  const renderPlayer = (playerKey) => {
    const player = match[playerKey]
    if (!player) {
      return (
        <div style={{
          padding: `${padH}px ${padSide}px`, display: 'flex', alignItems: 'center', gap: 6,
          opacity: 0.35, cursor: 'not-allowed',
        }}>
          <span style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic' }}>Esperando...</span>
        </div>
      )
    }

    const isWinner = match.winner?.nombre === player.nombre && !player.isBye
    const isLoser  = match.winner && !isWinner
    const isBye    = player.isBye
    const lvl      = !isBye ? (NIVEL_LABELS[player.nivel] || {}) : {}
    const comodinUsado = !isBye && usedComodins[player.nombre]

    return (
      <div
        onClick={() => handleClick(playerKey)}
        style={{
          padding: `${padH}px ${padSide}px`,
          display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10,
          cursor: match.winner || isBye ? 'default' : 'pointer',
          opacity: isLoser ? 0.35 : 1,
          textDecoration: isLoser ? 'line-through' : 'none',
          background: isWinner ? `${cfg.color}18` : (comodinUsado ? 'rgba(249, 115, 22, 0.1)' : 'transparent'),
          transition: 'background 0.2s',
          borderRadius: 8,
          borderColor: comodinUsado ? 'rgba(249, 115, 22, 0.4)' : 'transparent',
          borderWidth: comodinUsado ? 1 : 0,
        }}
        onMouseEnter={e => {
          if (!match.winner && !isBye) e.currentTarget.style.background = '#ffffff0a'
        }}
        onMouseLeave={e => {
          if (!match.winner && !isBye) e.currentTarget.style.background = isWinner ? `${cfg.color}18` : (comodinUsado ? 'rgba(249, 115, 22, 0.1)' : 'transparent')
        }}
      >
        {/* Seed */}
        <span style={{
          fontSize: 9, fontWeight: 800, color: isBye ? '#4b5563' : cfg.color,
          width: 14, textAlign: 'right', flexShrink: 0, fontFamily: 'monospace',
        }}>
          {isBye ? '—' : `#${player.seed}`}
        </span>

        {/* Avatar — hidden on very small cards to save space */}
        {!isBye && !isMobile && (
          <div style={{
            width: avaW, height: avaW, borderRadius: '50%',
            background: `${lvl.color || '#6b7280'}20`,
            border: `1px solid ${isWinner ? cfg.color : (lvl.color || '#6b7280')}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: lvl.color || '#9ca3af',
            flexShrink: 0,
          }}>
            {getInitials(player.nombre)}
          </div>
        )}

        {/* Nombre */}
        <span style={{
          fontSize: fSize, fontWeight: 600, color: isWinner ? '#fff' : '#d1d5db',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {isBye ? 'BYE' : player.nombre}
        </span>

        {/* Meta info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {!isBye && comodinUsado && (
            <span title="Tiró el Comodín (Acompañante)" style={{ fontSize: isMobile ? 12 : 14 }}>🔥</span>
          )}
          {!isBye && !comodinUsado && isAdmin && !match.winner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`¿Acompañante entra por ${player.nombre}?\n\n(Solo puede usarse UNA VEZ en el torneo)`)) {
                  useComodin(player.nombre)
                }
              }}
              title="Sacar Comodín (Relevo)"
              style={{
                background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                fontSize: isMobile ? 12 : 14, opacity: 0.6, transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
            >
              🃏
            </button>
          )}
          {!isBye && lvl.emoji && (
            <span title={lvl.label} style={{ fontSize: isMobile ? 10 : 12 }}>{lvl.emoji}</span>
          )}
          {isWinner && (
            <span style={{ fontSize: isMobile ? 12 : 14 }}>🏆</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#12121e',
      border: `1px solid ${match.winner ? cfg.color + '50' : '#ffffff12'}`,
      borderRadius: 10,
      overflow: 'hidden',
      width: cardW,
      minWidth: cardW,
      boxShadow: match.winner ? `0 0 20px ${cfg.colorGlow}` : 'none',
      transition: 'all 0.3s',
    }}>
      {renderPlayer('player1')}
      <div style={{ height: 1, background: '#ffffff10', margin: `0 ${padSide}px` }} />
      {renderPlayer('player2')}
    </div>
  )
}

// ─── Subcomponente: Bracket Visual ────────────────────────────────────────────

function BracketVisual({ bracket, game, onBack }) {
  const { tournamentBracket: tb } = useStore()
  const [showRules, setShowRules] = useState(false)
  const isMobile = useIsMobile()
  const cfg  = GAME_CONFIG[game]
  const data = tb || bracket

  if (!data || data.rounds.length === 0) return null

  const totalRounds = data.rounds.length
  const champion    = data.rounds[totalRounds - 1]?.[0]?.winner

  // Responsive spacing
  const colGap          = isMobile ? 16 : 32
  const matchHeightUnit = isMobile ? 64 : 88   // vertical unit per match slot

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {showRules && <RulesPanel game={game} onClose={() => setShowRules(false)} />}

      {/* Header */}
      <div style={{
        background: cfg.gradient,
        border: `1px solid ${cfg.color}30`,
        borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? '14px 16px' : '18px 22px',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: isMobile ? 22 : 28 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: isMobile ? 14 : 17, fontWeight: 800, color: '#fff' }}>
              {cfg.name} — Bracket Oficial
            </div>
            <div style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>
              {data.totalPlayers} jugadores{data.totalByes > 0 ? ` · ${data.totalByes} BYE(s)` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowRules(true)}
            style={{
              background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`,
              borderRadius: 8, padding: isMobile ? '5px 10px' : '7px 14px',
              color: cfg.color, fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            📜 {isMobile ? 'Reglas' : 'Ver Reglas'}
          </button>
          <button
            onClick={onBack}
            style={{
              background: '#ffffff10', border: '1px solid #ffffff20',
              borderRadius: 8, padding: isMobile ? '5px 10px' : '7px 14px',
              color: '#9ca3af', fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← {isMobile ? 'Volver' : 'Volver al Form'}
          </button>
        </div>
      </div>

      {/* Campeón */}
      {champion && (
        <div style={{
          background: `linear-gradient(135deg, ${cfg.color}25, ${cfg.accent}15)`,
          border: `1px solid ${cfg.color}60`,
          borderRadius: 14, padding: isMobile ? '12px 16px' : '16px 22px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'fadeIn 0.5s ease',
          boxShadow: `0 0 40px ${cfg.colorGlow}`,
        }}>
          <span style={{ fontSize: isMobile ? 28 : 36 }}>👑</span>
          <div>
            <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ¡Campeón!
            </div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#fff' }}>{champion.nombre}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {NIVEL_LABELS[champion.nivel]?.emoji} {NIVEL_LABELS[champion.nivel]?.label}
              {game === 'mk11' && champion.personaje && ` · ${champion.personaje}`}
            </div>
          </div>
        </div>
      )}

      {/* MK XL reminder */}
      {game === 'mk11' && (
        <div style={{
          background: '#7c3aed18', border: '1px solid #7c3aed40',
          borderRadius: 10, padding: '8px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontSize: isMobile ? 11 : 12, color: '#c4b5fd',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>
            <strong>Reglas Desafío a los Jefes:</strong> Aspirante 2 vidas (Bo3), Experto 1 vida (Muerte Súbita) y personaje Aleatorio. Sin Fatalities hasta la final.
          </span>
        </div>
      )}

      {/* Bracket grid — scrollable horizontally on all screen sizes */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'visible',
        paddingBottom: 16,
        WebkitOverflowScrolling: 'touch', // smooth iOS scroll
        cursor: 'grab',
        borderRadius: 12,
      }}>
        <div style={{
          display: 'flex',
          gap: colGap,
          alignItems: 'flex-start',
          minWidth: 'max-content',
          padding: isMobile ? '8px 4px' : '8px 0',
        }}>
          {data.rounds.map((round, roundIndex) => {
            const spacingFactor    = Math.pow(2, roundIndex)
            const gapBetweenMatches = (spacingFactor - 1) * matchHeightUnit + 8
            const label             = getRoundLabel(roundIndex, totalRounds)
            const isLast            = roundIndex === totalRounds - 1

            return (
              <div key={roundIndex} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Round label */}
                <div style={{
                  textAlign: 'center', marginBottom: 8,
                  padding: '3px 12px', borderRadius: 20,
                  background: isLast ? `${cfg.color}25` : '#ffffff0a',
                  border: `1px solid ${isLast ? cfg.color + '60' : '#ffffff15'}`,
                  display: 'inline-block', alignSelf: 'center',
                }}>
                  <span style={{
                    fontSize: isMobile ? 9 : 10, fontWeight: 800,
                    color: isLast ? cfg.color : '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {label}
                  </span>
                </div>

                {/* Matches */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${gapBetweenMatches}px` }}>
                  {round.map((match, matchIndex) => (
                    <MatchCard
                      key={match.id || `${roundIndex}-${matchIndex}`}
                      match={match}
                      roundIndex={roundIndex}
                      matchIndex={matchIndex}
                      cfg={cfg}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: isMobile ? 10 : 16, marginTop: 12,
        paddingTop: 12, borderTop: '1px solid #ffffff10',
        fontSize: 10, color: '#4b5563',
      }}>
        {Object.entries(NIVEL_LABELS).map(([key, info]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{info.emoji}</span>
            <span style={{ color: info.color }}>{info.label}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🏆</span><span>Ganador avanzado</span>
        </span>
        <span style={{ color: '#374151' }}>· Toca/clic un jugador para avanzarlo</span>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function BracketBoard() {
  const {
    tournamentGame,
    tournamentPhase,
    tournamentBracket,
    setTournamentGame,
    setTournamentPhase,
    setTournamentBracket,
    setBracket,
    bracket,
  } = useStore()

  const [sheetPlayers, setSheetPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  // Cargar jugadores del Sheet para autocompletado
  useEffect(() => {
    setLoadingPlayers(true)
    fetchPlayers()
      .then(d => setSheetPlayers(d.players || []))
      .catch(() => {})
      .finally(() => setLoadingPlayers(false))
  }, [])

  // Sync bracket con el store global también (para compatibilidad)
  useEffect(() => {
    if (tournamentBracket) setBracket(tournamentBracket)
  }, [tournamentBracket, setBracket])

  const handleBracketGenerated = (data) => {
    setTournamentBracket(data)
    setBracket(data)
  }

  const handleBack = () => {
    setTournamentPhase('form')
  }

  return (
    <div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* FASE 1: Formulario pre-torneo */}
      {tournamentPhase === 'form' && (
        <PreTournamentForm
          game="mk11"
          sheetPlayers={sheetPlayers}
          onBracketGenerated={handleBracketGenerated}
        />
      )}

      {/* FASE 2: Bracket visual */}
      {tournamentPhase === 'bracket' && tournamentBracket && (
        <BracketVisual
          bracket={tournamentBracket}
          game="mk11"
          onBack={handleBack}
        />
      )}
    </div>
  )
}
