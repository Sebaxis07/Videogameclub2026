/**
 * ChatModule.jsx — Módulo de Mensajería en Tiempo Real
 * =====================================================
 * Soporte: GIFs (GIPHY), Emojis, Texto
 * Modos controlados por admin: gif-only, text-gif, free, emoji-only, etc.
 * Anti-spam: countdown visual de 10 segundos
 * Admin: gestión de modos, eliminación de mensajes, limpieza de historial
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../api/socket'
import useStore from '../store/useStore'

const GIPHY_API_KEY = 'c2fY4eDxlNjVjFBp7UgvFYbkse932duP'
const GIPHY_BASE = 'https://api.giphy.com/v1'

// ─── Modos disponibles ────────────────────────────────────────────────────────
const MODES = [
  { key: 'free', label: 'Todo', icon: '🌈', desc: 'Texto + GIFs + Emojis' },
  { key: 'gif-only', label: 'Solo GIFs', icon: '🎬', desc: 'Solo se pueden enviar GIFs' },
  { key: 'text-gif', label: 'Texto + GIF', icon: '💬', desc: 'Texto y GIFs habilitados' },
  { key: 'text-emoji', label: 'Texto + Emoji', icon: '😊', desc: 'Texto y emojis habilitados' },
  { key: 'emoji-only', label: 'Solo Emojis', icon: '🎭', desc: 'Solo se pueden enviar emojis' },
]

// ─── Emoji set ────────────────────────────────────────────────────────────────
const EMOJI_GROUPS = [
  { label: '😀', title: 'Caras', emojis: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤩', '😏', '😴', '😭', '😤', '🤔', '😱', '🥳', '😇', '🤗', '😬', '🙄', '😵', '🥺', '😆', '😋', '🤪', '🤑'] },
  { label: '👍', title: 'Gestos', emojis: ['👍', '👎', '👏', '🙌', '🤝', '👊', '✊', '🤞', '🙏', '👌', '🤙', '💪', '🖐️', '✋', '🤚', '🫶', '💅', '🤌', '🫵', '👉'] },
  { label: '🎮', title: 'Gaming', emojis: ['🎮', '🕹️', '🏆', '🥇', '⚡', '🔥', '💥', '🎯', '🎲', '👾', '🕵️', '🎭', '🎪', '🎉', '🎊', '🚀', '⚔️', '🛡️', '💎', '🌟'] },
  { label: '❤️', title: 'Corazones', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💓', '💞', '💔', '❣️', '💟', '🫀', '🩷', '🩵', '🩶'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
}

const AVATAR_PALETTE = [
  ['#7c3aed', '#6d28d9'],
  ['#0891b2', '#0e7490'],
  ['#db2777', '#be185d'],
  ['#059669', '#047857'],
  ['#d97706', '#b45309'],
  ['#dc2626', '#b91c1c'],
]
function getAvatarColors(name = '') {
  const [a, b] = AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

// ─── Componente: Avatar ───────────────────────────────────────────────────────
function Avatar({ name, role, size = 'sm' }) {
  const sz = size === 'lg' ? { width: 40, height: 40, fontSize: 14 } : { width: 32, height: 32, fontSize: 11 }
  return (
    <div
      style={{ background: getAvatarColors(name), width: sz.width, height: sz.height, fontSize: sz.fontSize }}
      className="rounded-full flex-shrink-0 flex items-center justify-center font-black text-white shadow-lg ring-1 ring-white/10"
    >
      {role === 'admin' ? '⚡' : getInitials(name)}
    </div>
  )
}

// ─── Componente: Burbuja de Mensaje ──────────────────────────────────────────
function MessageBubble({ msg, isOwn, isAdmin, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`flex gap-2 items-end group animate-fade-in ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar name={msg.sender.name} role={msg.sender.role} />
      </div>

      {/* Contenido */}
      <div className={`max-w-[85%] sm:max-w-[72%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className={`flex items-center gap-1.5 px-1 flex-wrap ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[11px] font-bold text-gray-400 truncate max-w-[100px] sm:max-w-none">{msg.sender.name}</span>
          {msg.sender.role === 'admin' && (
            <span style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))',
              border: '1px solid rgba(124,58,237,0.4)',
            }} className="text-[8px] uppercase tracking-widest text-violet-300 px-1.5 py-0.5 rounded-full font-black">
              Lider del club
            </span>
          )}
          <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(msg.timestamp)}
          </span>
          {/* Botón de eliminación (solo admin) */}
          {isAdmin && hovered && (
            <button
              onClick={() => onDelete(msg.id)}
              className="p-0.5 text-red-500/70 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100"
              title="Eliminar mensaje"
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {/* Texto */}
        {msg.type === 'text' && (
          <div
            style={isOwn ? {
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              borderBottomRightRadius: 4,
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottomLeftRadius: 4,
            }}
            className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words text-white"
          >
            {msg.text}
          </div>
        )}

        {/* Emoji */}
        {msg.type === 'emoji' && (
          <div className="text-[42px] leading-none py-1 select-none" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
            {msg.emoji}
          </div>
        )}

        {/* GIF */}
        {msg.type === 'gif' && (
          <div
            className="rounded-2xl overflow-hidden shadow-xl cursor-pointer hover:scale-[1.02] transition-transform"
            style={{
              maxWidth: 220,
              border: '1px solid rgba(255,255,255,0.1)',
              ...(isOwn ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }),
            }}
          >
            <img
              src={msg.gifUrl}
              alt={msg.gifTitle || 'GIF'}
              className="w-full h-auto object-cover block"
              loading="lazy"
            />
            {msg.gifTitle && (
              <div className="px-2 py-1 text-[10px] text-gray-400 truncate"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                {msg.gifTitle}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente: GIF Picker ───────────────────────────────────────────────────
function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [tab, setTab] = useState('gifs')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  const search = useCallback(async (q, type) => {
    setLoading(true)
    try {
      const endpoint = type === 'stickers' ? 'stickers' : 'gifs'
      const path = !q.trim() ? 'trending' : 'search'
      const params = !q.trim()
        ? `api_key=${GIPHY_API_KEY}&limit=30&rating=pg`
        : `api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=30&rating=pg`
      const res = await fetch(`${GIPHY_BASE}/${endpoint}/${path}?${params}`)
      const data = await res.json()
      setResults(data.data || [])
    } catch (e) {
      console.error('[GifPicker]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { search('', tab); inputRef.current?.focus() }, [tab, search])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q, tab), 380)
  }

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-3 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col w-full sm:w-[400px] sm:left-0 sm:right-auto"
      style={{
        height: 340,
        background: '#0a0a18',
        border: '1px solid rgba(124,58,237,0.25)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex rounded-xl overflow-hidden text-[11px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {['gifs', 'stickers'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuery('') }}
              className="px-3 py-1.5 font-bold uppercase tracking-wider transition-all"
              style={tab === t
                ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' }
                : { color: 'rgba(255,255,255,0.3)' }
              }
            >
              {t === 'gifs' ? '🎬 GIFs' : '✨ Stickers'}
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar GIFs..."
          className="flex-1 text-xs text-white placeholder-gray-600 outline-none rounded-xl px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-gray-500 text-xs">Sin resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {results.map(gif => {
              const url = gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url || gif.images?.downsized?.url
              return (
                <button
                  key={gif.id}
                  onClick={() => onSelect({ url, title: gif.title })}
                  className="aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 hover:ring-2"
                  style={{ border: '1px solid rgba(255,255,255,0.06)', '--tw-ring-color': '#7c3aed' }}
                >
                  <img src={url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* GIPHY branding */}
      <div className="px-3 py-1.5 flex items-center justify-between border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Powered by GIPHY</span>
        <span className="text-[9px] text-gray-700">{results.length} resultados</span>
      </div>
    </div>
  )
}

// ─── Componente: Emoji Picker ─────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(0)
  return (
    <div
      className="absolute bottom-full left-0 right-0 sm:right-auto mb-3 rounded-2xl overflow-hidden shadow-2xl z-50 w-full sm:w-72"
      style={{
        background: '#0a0a18',
        border: '1px solid rgba(124,58,237,0.25)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={i}
            onClick={() => setActiveGroup(i)}
            className="flex-1 py-2.5 text-sm transition-all"
            style={activeGroup === i
              ? { color: '#a78bfa', borderBottom: '2px solid #7c3aed' }
              : { color: 'rgba(255,255,255,0.3)' }
            }
            title={g.title}
          >
            {g.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="px-2.5 text-gray-600 hover:text-white transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
        {EMOJI_GROUPS[activeGroup].emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="text-xl p-1.5 rounded-lg transition-all hover:scale-125 hover:bg-white/10"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Componente: Countdown Anti-Spam ─────────────────────────────────────────
function SpamCountdown({ endsAt, cooldownMs }) {
  const [remaining, setRemaining] = useState(0)
  const [progress, setProgress] = useState(1)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!endsAt) return
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now())
      setRemaining(Math.ceil(left / 1000))
      setProgress(left / cooldownMs)
      if (left > 0) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [endsAt, cooldownMs])

  if (!endsAt || remaining === 0) return null

  const r = 16
  const circ = 2 * Math.PI * r
  const dash = circ * progress

  return (
    <div className="flex items-center gap-2 select-none px-1">
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="3" />
        {/* Progress */}
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          stroke="rgb(249,115,22)"
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
        {/* Número */}
        <text
          x="20" y="25"
          textAnchor="middle"
          fill="rgb(249,115,22)"
          fontSize="12"
          fontWeight="800"
          style={{ transform: 'rotate(90deg)', transformOrigin: '20px 20px' }}
        >
          {remaining}
        </text>
      </svg>
      <span className="text-xs font-bold text-orange-400">espera...</span>
    </div>
  )
}

// ─── Componente: Panel Admin ──────────────────────────────────────────────────
function AdminPanel({ config, socket, msgCount, onlineCount }) {
  const [activePreset, setActivePreset] = useState(config.mode || 'free')

  useEffect(() => setActivePreset(config.mode || 'free'), [config.mode])

  const setMode = (mode) => {
    setActivePreset(mode)
    socket?.emit('chat:admin-set-mode', mode)
  }

  const togglePause = () => {
    socket?.emit('chat:admin-config', { isPaused: !config.isPaused })
  }

  const clearHistory = () => {
    if (window.confirm('¿Limpiar todo el historial del chat?')) {
      socket?.emit('chat:admin-clear')
    }
  }

  const handleCooldownChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) socket?.emit('chat:admin-set-cooldown', val);
  }

  return (
    <div
      className="flex flex-col gap-3 w-full lg:w-64 lg:flex-shrink-0"
    >
      {/* Modos */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: '#0d0d1c',
          border: '1px solid rgba(124,58,237,0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚡</span>
          <h3 className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Modo de Chat</h3>
        </div>

        <div className="flex flex-col gap-1.5">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group"
              style={activePreset === m.key
                ? {
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))',
                  border: '1px solid rgba(124,58,237,0.5)',
                }
                : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }
              }
            >
              <span className="text-base">{m.icon}</span>
              <div>
                <div className={`text-xs font-bold ${activePreset === m.key ? 'text-violet-200' : 'text-gray-400 group-hover:text-gray-300'}`}>
                  {m.label}
                </div>
                <div className="text-[9px] text-gray-600">{m.desc}</div>
              </div>
              {activePreset === m.key && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Temporizador AntiSpam */}
      <div className="rounded-2xl p-4 mt-2" style={{ background: '#0d0d1c', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Spam Cooldown</h3>
          <span className="text-xs font-bold text-violet-400">{config.cooldown || 0}s</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 5, 10, 15, 30].map(sec => (
            <button
              key={sec}
              onClick={() => socket?.emit('chat:admin-set-cooldown', sec)}
              className={
                'text-[10px] px-2 py-1.5 rounded-md font-bold transition-all border ' +
                (config.cooldown === sec ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white')
              }
            >
              {sec === 0 ? 'Sin límite' : sec + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Controles rápidos */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: '#0d0d1c',
          border: '1px solid rgba(124,58,237,0.2)',
        }}
      >
        <h3 className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Acciones</h3>

        {/* Pause toggle */}
        <button
          onClick={togglePause}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
          style={config.isPaused
            ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
          }
        >
          <div className="flex items-center gap-2">
            <span>{config.isPaused ? '▶️' : '⏸️'}</span>
            <span className={`text-sm font-semibold ${config.isPaused ? 'text-orange-300' : 'text-gray-300'}`}>
              {config.isPaused ? 'Reanudar chat' : 'Pausar chat'}
            </span>
          </div>
          <div
            className="w-8 h-4 rounded-full transition-all relative"
            style={{ background: config.isPaused ? 'rgb(249,115,22)' : 'rgba(255,255,255,0.15)' }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
              style={{ left: config.isPaused ? '17px' : '2px' }}
            />
          </div>
        </button>

        {/* Clear history */}
        <button
          onClick={clearHistory}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10"
          style={{ border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <TrashIcon />
          Limpiar historial
        </button>
      </div>

      {/* Stats */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: '#0d0d1c',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Estadísticas</h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            En línea
          </span>
          <span className="text-xs font-bold text-emerald-400">{onlineCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Mensajes</span>
          <span className="text-xs font-bold text-gray-300">{msgCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Modo actual</span>
          <span className="text-xs font-bold text-violet-300">
            {MODES.find(m => m.key === config.mode)?.label || config.mode}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Componente: Notificación ─────────────────────────────────────────────────
function Notification({ notification }) {
  if (!notification) return null

  const styles = {
    error: { bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.3)', text: '#fca5a5', icon: '❌' },
    warning: { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', text: '#fdba74', icon: '⚠️' },
    success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7', icon: '✅' },
  }
  const s = styles[notification.type] || styles.error

  return (
    <div
      className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span>{s.icon}</span>
      {notification.msg}
    </div>
  )
}

// ─── Componente: Barra de entrada ─────────────────────────────────────────────
function InputBar({
  config, isAdmin, isCoolingDown,
  cooldownEndsAt, cooldownMs,
  text, setText, onSendText,
  onSelectGif, onSelectEmoji,
  showNotif,
}) {
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const inputRef = useRef(null)

  const canText = config.allowText || isAdmin
  const canGifs = config.allowGifs || isAdmin
  const canEmojis = config.allowEmojis || isAdmin

  const handleSend = () => {
    if (!text.trim()) return
    if (!canText && !isAdmin) return showNotif('El texto está deshabilitado.', 'error')
    onSendText()
    inputRef.current?.focus()
  }

  const handleGifSelect = ({ url, title }) => {
    onSelectGif({ url, title })
    setShowGifPicker(false)
  }

  const handleEmojiSelect = (emoji) => {
    onSelectEmoji(emoji)
    setShowEmojiPicker(false)
  }

  return (
    <div className="relative">
      {showGifPicker && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />}
      {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}

      <div
        className="flex items-center gap-1.5 sm:gap-2 rounded-2xl px-2 sm:px-3 py-2 transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
        onFocus={() => { }}
      >
        {/* Botón Emoji */}
        {canEmojis && (
          <button
            onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false) }}
            className="p-1 sm:p-1.5 rounded-xl transition-all flex-shrink-0"
            style={showEmojiPicker
              ? { color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }
              : { color: 'rgba(255,255,255,0.3)' }
            }
            title="Emojis"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
          </button>
        )}

        {/* Input */}
        {canText ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={isCoolingDown ? 'Espera antes de enviar...' : 'Escribe un mensaje...'}
            disabled={!!isCoolingDown}
            maxLength={300}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        ) : (
          <div className="flex-1 text-xs italic px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {!canGifs && !canEmojis && !isAdmin
              ? '💤 El chat está en modo solo admin'
              : canGifs
                ? '🎬 Modo GIF — busca un GIF para enviar'
                : '😊 Modo emoji — elige un emoji'
            }
          </div>
        )}

        {/* Cooldown ring */}
        {isCoolingDown && (
          <SpamCountdown endsAt={cooldownEndsAt} cooldownMs={cooldownMs} />
        )}

        {/* Botón GIF */}
        {canGifs && (
          <button
            onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false) }}
            className="px-2.5 py-1 rounded-xl text-xs font-black tracking-wider border transition-all flex-shrink-0"
            style={showGifPicker
              ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: '1px solid #7c3aed' }
              : { color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)' }
            }
          >
            GIF
          </button>
        )}

        {/* Botón enviar */}
        {canText && (
          <button
            onClick={handleSend}
            disabled={!text.trim() || !!isCoolingDown}
            className="p-1.5 sm:p-2 rounded-xl transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' }}
            title="Enviar (Enter)"
          >
            <SendIcon />
          </button>
        )}
      </div>

      {/* Contador de caracteres */}
      {canText && text.length > 200 && (
        <div className="text-right text-[10px] mt-1 pr-1" style={{ color: text.length > 270 ? '#f87171' : 'rgba(255,255,255,0.3)' }}>
          {text.length}/300
        </div>
      )}
    </div>
  )
}

// ─── Componente Principal: ChatModule ─────────────────────────────────────────
export default function ChatModule() {
  const { user } = useStore()
  const isAdmin = user?.role === 'admin'

  const [messages, setMessages] = useState([])
  const [config, setConfig] = useState({
    mode: 'free', allowText: true, allowGifs: true, allowEmojis: true, isPaused: false, onlineCount: 0,
  })
  const [text, setText] = useState('')
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null)
  const [cooldownMs, setCooldownMs] = useState(10000)
  const [onlineCount, setOnlineCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [notification, setNotification] = useState(null)

  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  const isCoolingDown = !isAdmin && cooldownEndsAt && Date.now() < cooldownEndsAt
  const isChatBlocked = config.isPaused && !isAdmin

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const showNotif = useCallback((msg, type = 'error') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // ─── Socket.IO ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket(user)
    socketRef.current = socket

    socket.io.opts.query = {
      ...socket.io.opts.query,
      userName: user?.nombre || 'Anónimo',
      userRut: user?.rut || null,
    }

    setIsConnected(socket.connected)
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('chat:init', ({ config: cfg, messages: msgs }) => {
      setConfig({ mode: 'free', ...cfg })
      setMessages(msgs)
    })

    socket.on('chat:new-message', msg => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('chat:config-updated', cfg => {
      setConfig(prev => ({ ...prev, ...cfg }))
    })

    socket.on('chat:online-count', count => setOnlineCount(count))

    socket.on('chat:history-cleared', () => {
      setMessages([])
      showNotif('Historial limpiado por el admin.', 'warning')
    })

    socket.on('chat:message-deleted', msgId => {
      setMessages(prev => prev.filter(m => m.id !== msgId))
    })

    socket.on('chat:sent-ok', ({ cooldownMs: ms, endsAt }) => {
      setCooldownMs(ms)
      setCooldownEndsAt(endsAt)
    })

    socket.on('chat:cooldown', ({ remaining, cooldownMs: ms, endsAt }) => {
      setCooldownMs(ms)
      setCooldownEndsAt(endsAt)
      showNotif(`Espera ${remaining}s antes de volver a enviar. 🕐`, 'warning')
    })

    socket.on('chat:error', ({ message: m }) => showNotif(m, 'error'))

    if (socket.connected) socket.emit('chat:request-init')

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('chat:init')
      socket.off('chat:new-message')
      socket.off('chat:config-updated')
      socket.off('chat:online-count')
      socket.off('chat:history-cleared')
      socket.off('chat:message-deleted')
      socket.off('chat:sent-ok')
      socket.off('chat:cooldown')
      socket.off('chat:error')
    }
  }, [user, showNotif])

  // ─── Acciones de envío ────────────────────────────────────────────────────
  const sendMessage = useCallback((payload) => {
    if (!socketRef.current) return
    socketRef.current.emit('chat:send-message', payload)
  }, [])

  const handleSendText = () => {
    const t = text.trim()
    if (!t) return
    sendMessage({ type: 'text', text: t })
    setText('')
  }

  const handleSelectGif = ({ url, title }) => {
    if (!config.allowGifs && !isAdmin) return showNotif('Los GIFs están deshabilitados.', 'error')
    if (config.isPaused && !isAdmin) return showNotif('El chat está pausado.', 'warning')
    sendMessage({ type: 'gif', gifUrl: url, gifTitle: title })
  }

  const handleSelectEmoji = (emoji) => {
    if (!config.allowEmojis && !isAdmin) return showNotif('Los emojis están deshabilitados.', 'error')
    if (config.isPaused && !isAdmin) return showNotif('El chat está pausado.', 'warning')
    sendMessage({ type: 'emoji', emoji })
  }

  const handleDeleteMessage = (msgId) => {
    socketRef.current?.emit('chat:delete-message', msgId)
  }

  // ─── Badges activos ───────────────────────────────────────────────────────
  const activeBadges = [
    config.allowText && { label: '💬 Texto', color: 'rgba(255,255,255,0.08)' },
    config.allowGifs && { label: '🎬 GIFs', color: 'rgba(124,58,237,0.2)' },
    config.allowEmojis && { label: '😊 Emojis', color: 'rgba(251,191,36,0.15)' },
  ].filter(Boolean)

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 520 }}>

      {/* ─── Panel Admin ───────────────────────────────────────────────────── */}
      {isAdmin && (
        <AdminPanel
          config={config}
          socket={socketRef.current}
          msgCount={messages.length}
          onlineCount={onlineCount}
        />
      )}

      {/* ─── Panel de Chat ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col overflow-hidden rounded-2xl shadow-2xl h-[600px] lg:h-[calc(100vh-160px)]"
        style={{
          background: '#080814',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(13,13,28,0.9)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}
            >
              💬
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">Chat del Club</h2>
              <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>Mensajes en tiempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Badges de modos activos */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {config.isPaused
                ? (
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse"
                    style={{ background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)', color: '#fdba74' }}
                  >
                    ⏸ Pausado
                  </span>
                )
                : activeBadges.map(b => (
                  <span
                    key={b.label}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: b.color, border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                  >
                    {b.label}
                  </span>
                ))
              }
            </div>

            {/* Online + conexión */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isConnected ? '#34d399' : '#f87171', boxShadow: isConnected ? '0 0 6px #34d399' : 'none' }}
              />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isConnected ? `${onlineCount > 0 ? onlineCount + ' en línea' : 'Conectado'}` : 'Sin conexión'}
              </span>
            </div>
          </div>
        </div>

        {/* Feed de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center select-none">
              <div className="text-6xl" style={{ filter: 'drop-shadow(0 4px 16px rgba(124,58,237,0.3))' }}>💬</div>
              <div>
                <p className="font-bold text-gray-400">¡Aún no hay mensajes!</p>
                <p className="text-xs text-gray-600 mt-1">
                  {config.allowGifs ? 'Envía el primer GIF 🎬' : config.allowText ? 'Sé el primero en escribir algo' : 'El chat está esperando...'}
                </p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.sender.socketId === socketRef.current?.id || msg.sender.rut === user?.rut}
                isAdmin={isAdmin}
                onDelete={handleDeleteMessage}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Notificación */}
        <Notification notification={notification} />

        {/* Chat bloqueado */}
        {isChatBlocked && (
          <div
            className="mx-4 mb-3 px-4 py-3 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fdba74' }}
          >
            <span>⏸️</span> El chat está pausado por el administrador
          </div>
        )}

        {/* Barra de entrada */}
        {!isChatBlocked && (
          <div
            className="px-4 pb-4 pt-2 flex-shrink-0 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(13,13,28,0.8)' }}
          >
            <InputBar
              config={config}
              isAdmin={isAdmin}
              isCoolingDown={isCoolingDown}
              cooldownEndsAt={cooldownEndsAt}
              cooldownMs={cooldownMs}
              text={text}
              setText={setText}
              onSendText={handleSendText}
              onSelectGif={handleSelectGif}
              onSelectEmoji={handleSelectEmoji}
              showNotif={showNotif}
            />
          </div>
        )}
      </div>
    </div>
  )
}
