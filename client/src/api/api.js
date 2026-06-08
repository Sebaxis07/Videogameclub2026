/**
 * api.js — Cliente HTTP hacia el backend
 * =====================================
 * Usa el proxy de Vite: /api → http://localhost:3001/api
 */

import config from '../config/env';

const BASE_URL = config.API_URL;

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/** @returns {Promise<{players: Array, total: number, lastSync: string}>} */
export const fetchPlayers = () => request('/players')

/** @returns {Promise<{playerName: string, total: number, history: Array}>} */
export const fetchStudentHistory = (name) => request(`/sessions/player/${encodeURIComponent(name)}`)

/** @returns {Promise<{data: Array<{juego: string, count: number}>, lastSync: string}>} */
export const fetchDebate = () => request('/debate')

export const voteGame = (juego, amount) =>
  fetch(`${BASE_URL}/debate/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ juego, amount }),
  }).then((r) => r.json())

export const eliminateGame = (juego) =>
  fetch(`${BASE_URL}/debate/eliminate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ juego }),
  }).then((r) => r.json())

export const resetDebate = () =>
  fetch(`${BASE_URL}/debate/reset`, { method: 'POST' }).then((r) => r.json())

/**
 * @param {string} [game]  Nombre del juego para filtrar. Opcional.
 * @returns {Promise<{rounds: Array, bracketSize: number, totalPlayers: number, totalByes: number}>}
 */
export const fetchBracket = (game) =>
  request(game ? `/bracket?game=${encodeURIComponent(game)}` : '/bracket')

/** @returns {Promise<{leaderboard: Array, formula: string, lastSync: string}>} */
export const fetchLeaderboard = () => request('/leaderboard')

/** @returns {Promise<{message: string, lastSync: string, total: number}>} */
export const triggerSync = () =>
  fetch(`${BASE_URL}/sync`, { method: 'POST' }).then((r) => r.json())

/** @returns {Promise<{status: string, lastSync: string, playerCount: number, uptime: number}>} */
export const fetchStatus = () => request('/status')

export const loginUser = (username, password) =>
  fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(async (r) => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Error autenticando')
    return data
  })

export const changePassword = (rut, oldPassword, newPassword) =>
  fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rut, oldPassword, newPassword }),
  }).then(async (r) => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Error actualizando contraseña')
    return data
  })

// ─── Configuraciones (Settings) ──────────────────────────────────────────
export const fetchSettings = () => request('/settings')

export const toggleModuleVisibility = (moduleId) =>
  fetch(`${BASE_URL}/settings/modules/${moduleId}/toggle`, {
    method: 'POST',
  }).then(r => r.json())

export const toggleLoginActive = () =>
  fetch(`${BASE_URL}/settings/login/toggle`, {
    method: 'POST',
  }).then(r => r.json())

export const updateGeneralSettings = (settings) =>
  fetch(`${BASE_URL}/settings/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).then(r => r.json())

// ─── RSVP (Intención de Asistencia) ──────────────────────────────────────
export const fetchRsvps = () => request('/rsvp')

export const clearRsvps = () =>
  fetch(`${BASE_URL}/rsvp/clear`, {
    method: 'POST',
  }).then(r => r.json())

export const sendRsvp = (username, password, willAttend) =>
  fetch(`${BASE_URL}/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, willAttend }),
  }).then(async (r) => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Error enviando RSVP')
    return data
  })

// ─── Tournament Pre-Registration ─────────────────────────────────────────────

/** Obtiene los registrados en el formulario pre-torneo por juego */
export const fetchTournamentRegistrants = (game) =>
  request(`/tournament/registrants?game=${encodeURIComponent(game)}`)

/**
 * Registra o actualiza un jugador en el formulario pre-torneo.
 * @param {'minecraft'|'mk11'} game
 * @param {{ nombre, nivel, cps?, victorias?, personaje?, rango? }} data
 */
export const registerTournamentPlayer = (game, data) =>
  fetch(`${BASE_URL}/tournament/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, ...data }),
  }).then(async (r) => {
    const res = await r.json()
    if (!r.ok) throw new Error(res.error || 'Error al registrar jugador')
    return res
  })

/** Elimina un jugador del formulario pre-torneo */
export const removeTournamentPlayer = (game, id) =>
  fetch(`${BASE_URL}/tournament/registrant/${id}?game=${encodeURIComponent(game)}`, {
    method: 'DELETE',
  }).then((r) => r.json())

export const setPlayerRole = (rut, role) =>
  fetch(`${BASE_URL}/auth/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rut, role }),
  }).then((r) => r.json())

/** Limpia todos los registros de un juego */
export const resetTournament = (game) =>
  fetch(`${BASE_URL}/tournament/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game }),
  }).then((r) => r.json())

/** Genera el bracket a partir de los registros del formulario */
export const fetchTournamentBracket = (game) =>
  request(`/tournament/bracket?game=${encodeURIComponent(game)}`)

export const fetchTournamentGroups = (game) =>
  request(`/tournament/groups?game=${encodeURIComponent(game)}`)

export const fetchSavedGroups = (game) =>
  request(`/tournament/groups/saved?game=${encodeURIComponent(game)}`)

export const saveTournamentGroups = (game, groups) =>
  fetch(`${BASE_URL}/tournament/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, groups })
  }).then(async r => {
    const res = await r.json()
    if (!r.ok) throw new Error(res.error)
    return res
  })

export const generateGauntletBracket = (game, standings) =>
  fetch(`${BASE_URL}/tournament/gauntlet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, standings })
  }).then(async r => {
    const res = await r.json()
    if (!r.ok) throw new Error(res.error)
    return res
  })

/** Obtiene las respuestas de evaluación de Minecraft PvP (con puntos + grupo) */
export const fetchMinecraftEvaluations = () => request('/minecraft-eval')

export const createPlayer = (playerData) =>
  fetch(`${BASE_URL}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(playerData),
  }).then(async (r) => {
    const res = await r.json()
    if (!r.ok) throw new Error(res.error || 'Error al crear jugador')
    return res
  })

export const updatePlayer = (rut, playerData) =>
  fetch(`${BASE_URL}/players/${rut}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(playerData),
  }).then(async (r) => {
    const res = await r.json()
    if (!r.ok) throw new Error(res.error || 'Error al actualizar jugador')
    return res
  })

export const deletePlayer = (rut) =>
  fetch(`${BASE_URL}/players/${rut}`, {
    method: 'DELETE',
  }).then(async (r) => {
    const res = await r.json()
    if (!r.ok) throw new Error(res.error || 'Error al eliminar jugador')
    return res
  })

