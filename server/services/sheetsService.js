/**
 * sheetsService.js
 * =====================================
 * Servicio de integración con Google Sheets API v4.
 * Single Source of Truth: El spreadsheet es la única fuente de datos.
 *
 * Columnas esperadas (en orden, fila 1 = cabeceras):
 *   A: Nombre_Completo
 *   B: RUT               ← Primary Key
 *   C: Discord_WhatsApp
 *   D: Juego_Propuesto
 *   E: Plataforma
 *   F: Horas_Jugadas     ← peso para matchmaking
 *   G: Trae_Equipo
 */

"use strict";

const config = require("../config/env");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Crea el cliente autenticado de Google Sheets usando Service Account.
 * @returns {import('googleapis').sheets_v4.Sheets}
 */
function createSheetsClient() {
  const keyFilePath = config.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(
      `Service Account key file not found at: ${keyFilePath}\n` +
        "Configure GOOGLE_SERVICE_ACCOUNT_KEY_FILE en .env"
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

// ─── Mapeo de Tipos ───────────────────────────────────────────────────────────

/**
 * Convierte una fila cruda del spreadsheet (array de strings) en un
 * objeto de jugador correctamente tipado.
 *
 * @param {string[]} row
 * @returns {{
 *   nombre: string,
 *   rut: string,
 *   discord: string,
 *   juegosPropuesto: string,
 *   plataforma: string,
 *   horasJugadas: number,
 *   traeEquipo: boolean,
 *   partidasJugadas: number,
 *   partidasGanadas: number
 * }|null}
 */
function mapRowToPlayer(row) {
  // Ignorar filas vacías o sin RUT
  if (!row || row.length < 2 || !row[0]) return null;

  const rawHoras = row[5] ? row[5].toString().replace(",", ".").trim() : "0";
  const horasJugadas = parseFloat(rawHoras) || 0;

  const rawTrae = (row[6] || "").toString().toLowerCase().trim();
  const traeEquipo = rawTrae === "true" || rawTrae === "sí" || rawTrae === "si" || rawTrae === "1";

  return {
    rut: (row[0] || "").toString().trim(),           // Primary Key
    nombre: (row[1] || "").toString().trim(),
    discord: (row[2] || "").toString().trim(),
    juegosPropuesto: (row[3] || "Sin definir").toString().trim(),
    plataforma: (row[4] || "").toString().trim(),
    horasJugadas,
    traeEquipo,
    // Campos de leaderboard — se pueden añadir más columnas al sheet
    // Por ahora se inicializan en 0 hasta que el admin los complete
    partidasJugadas: 0,
    partidasGanadas: 0,
  };
}

// ─── Cache en Memoria ─────────────────────────────────────────────────────────

let cachedPlayers = [];
let lastSyncTime = null;
let isSyncing = false;

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Descarga los datos actuales del spreadsheet y actualiza la caché.
 * Incluye manejo de errores robusto: si falla, conserva la caché anterior.
 *
 * @returns {Promise<{players: Array, lastSync: string, total: number}>}
 */
async function syncFromSheets() {
  if (isSyncing) {
    console.log("[Sheets] Sync ya en curso, saltando...");
    return { players: cachedPlayers, lastSync: lastSyncTime, total: cachedPlayers.length };
  }

  isSyncing = true;
  console.log("[Sheets] Iniciando sync con Google Sheets...");

  try {
    const sheets = createSheetsClient();
    const spreadsheetId = config.SPREADSHEET_ID;
    const range = config.SHEET_RANGE;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      console.warn("[Sheets] La hoja está vacía.");
      cachedPlayers = [];
      lastSyncTime = new Date().toISOString();
      return { players: [], lastSync: lastSyncTime, total: 0 };
    }

    // La fila 0 son cabeceras → skip
    const dataRows = rows.slice(1);
    const players = dataRows
      .map(mapRowToPlayer)
      .filter((p) => p !== null && p.rut !== "");

    // Deduplicar por RUT (Primary Key) — conserva la primera ocurrencia
    const seen = new Set();
    const unique = players.filter((p) => {
      if (seen.has(p.rut)) return false;
      seen.add(p.rut);
      return true;
    });

    cachedPlayers = unique;
    lastSyncTime = new Date().toISOString();

    console.log(`[Sheets] Sync OK — ${unique.length} jugadores cargados.`);
    return { players: cachedPlayers, lastSync: lastSyncTime, total: cachedPlayers.length };
  } catch (error) {
    console.error("[Sheets] Error en sync:", error.message);
    // Conservar caché anterior para no romper el frontend
    return {
      players: cachedPlayers,
      lastSync: lastSyncTime,
      total: cachedPlayers.length,
      error: error.message,
    };
  } finally {
    isSyncing = false;
  }
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve los jugadores en caché.
 * @returns {Array}
 */
function getPlayers() {
  return cachedPlayers;
}

/**
 * Devuelve el timestamp del último sync exitoso.
 * @returns {string|null}
 */
function getLastSync() {
  return lastSyncTime;
}

/**
 * Agrupa jugadores por juegosPropuesto y cuenta frecuencias.
 * @returns {Array<{juego: string, count: number}>} Ordenado desc por count
 */
function getDebateStats() {
  const freq = {};
  for (const p of cachedPlayers) {
    const key = p.juegosPropuesto || "Sin definir";
    freq[key] = (freq[key] || 0) + 1;
  }
  return Object.entries(freq)
    .map(([juego, count]) => ({ juego, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Filtra jugadores por juego propuesto.
 * @param {string} juego
 * @returns {Array}
 */
function getPlayersByGame(juego) {
  return cachedPlayers.filter(
    (p) => p.juegosPropuesto.toLowerCase() === juego.toLowerCase()
  );
}

module.exports = {
  syncFromSheets,
  getPlayers,
  getLastSync,
  getDebateStats,
  getPlayersByGame,
};
