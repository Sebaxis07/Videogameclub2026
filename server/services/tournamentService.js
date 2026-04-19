/**
 * tournamentService.js
 * =====================================
 * Servicio en memoria para el formulario pre-torneo.
 * Almacena registros por juego SIN tocar Google Sheets.
 *
 * Niveles de habilidad (seeding weight):
 *   alto  → weight 3  (seed más bajo → R1 más fácil)
 *   medio → weight 2
 *   bajo  → weight 1
 *
 * Estructura de un registro:
 * {
 *   id        : string (uuid simple),
 *   game      : 'minecraft' | 'mk11',
 *   nombre    : string,
 *   nivel     : 'bajo' | 'medio' | 'alto',
 *   // Minecraft 1.8.9 extra:
 *   cps       : number (1–20),
 *   victorias : number,
 *   // MK11 extra:
 *   personaje : string,
 *   rango     : string,
 *   registeredAt: string (ISO)
 * }
 */

"use strict";

// ─── Estado ──────────────────────────────────────────────────────────────────

const VALID_GAMES  = ["minecraft", "mk11"];
const VALID_LEVELS = ["bajo", "medio", "alto"];

/** @type {Map<string, object[]>} game -> registros */
const registrantsByGame = new Map();
VALID_GAMES.forEach((g) => registrantsByGame.set(g, []));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Convierte nivel a peso numérico para seeding.
 * Peso mayor = seed más bajo (jugador más fuerte).
 */
function levelToWeight(nivel) {
  return nivel === "alto" ? 3 : nivel === "medio" ? 2 : 1;
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Registra o actualiza un jugador en el formulario pre-torneo.
 * Si ya existe un registro con el mismo nombre para ese juego, lo actualiza.
 *
 * @param {string} game       'minecraft' | 'mk11'
 * @param {object} data       campos del formulario
 * @returns {{ registrant: object, action: 'created'|'updated' }}
 */
function registerPlayer(game, data) {
  if (!VALID_GAMES.includes(game)) {
    throw new Error(`Juego inválido: "${game}". Válidos: ${VALID_GAMES.join(", ")}`);
  }
  if (!VALID_LEVELS.includes(data.nivel)) {
    throw new Error(`Nivel inválido: "${data.nivel}". Válidos: ${VALID_LEVELS.join(", ")}`);
  }
  if (!data.nombre || typeof data.nombre !== "string") {
    throw new Error("nombre es requerido");
  }

  const list = registrantsByGame.get(game);

  // Buscar por nombre (insensible a mayúsculas)
  const existingIdx = list.findIndex(
    (r) => r.nombre.toLowerCase() === data.nombre.toLowerCase()
  );

  const registrant = {
    id:           existingIdx >= 0 ? list[existingIdx].id : uid(),
    game,
    nombre:       data.nombre.trim(),
    nivel:        data.nivel,
    seedWeight:   levelToWeight(data.nivel),
    // Minecraft extras
    cps:          typeof data.cps === "number" ? data.cps : null,
    victorias:    typeof data.victorias === "number" ? data.victorias : null,
    // MK11 extras
    personaje:    data.personaje || null,
    rango:        data.rango     || null,
    registeredAt: new Date().toISOString(),
  };

  let action;
  if (existingIdx >= 0) {
    list[existingIdx] = registrant;
    action = "updated";
  } else {
    list.push(registrant);
    action = "created";
  }

  return { registrant, action };
}

/**
 * Devuelve los registros de un juego.
 * Ordenados por seedWeight desc (los más fuertes primero).
 *
 * @param {string} game
 * @returns {object[]}
 */
function getRegistrants(game) {
  if (!VALID_GAMES.includes(game)) {
    throw new Error(`Juego inválido: "${game}"`);
  }
  const list = registrantsByGame.get(game);
  return [...list].sort((a, b) => b.seedWeight - a.seedWeight);
}

/**
 * Elimina un registro específico por id y juego.
 *
 * @param {string} game
 * @param {string} id
 * @returns {boolean} true si se eliminó, false si no existía
 */
function removeRegistrant(game, id) {
  if (!VALID_GAMES.includes(game)) return false;
  const list = registrantsByGame.get(game);
  const before = list.length;
  const filtered = list.filter((r) => r.id !== id);
  registrantsByGame.set(game, filtered);
  return filtered.length < before;
}

/**
 * Limpia TODOS los registros de un juego.
 * @param {string} game
 */
function resetRegistrants(game) {
  if (!VALID_GAMES.includes(game)) {
    throw new Error(`Juego inválido: "${game}"`);
  }
  registrantsByGame.set(game, []);
}

/**
 * Convierte los registros al formato que espera matchmaking.buildBracket().
 * horasJugadas se sobreescribe con seedWeight para que el seeding sea por nivel.
 *
 * @param {string} game
 * @returns {Array<{ nombre, horasJugadas, ... }>}
 */
function getPlayersForMatchmaking(game) {
  return getRegistrants(game).map((r) => ({
    ...r,
    // matchmaking ordena por horasJugadas desc → reutilizamos el campo
    horasJugadas: r.seedWeight,
  }));
}

module.exports = {
  registerPlayer,
  getRegistrants,
  removeRegistrant,
  resetRegistrants,
  getPlayersForMatchmaking,
  VALID_GAMES,
  VALID_LEVELS,
};
