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

const MinecraftEval = require("../models/MinecraftEval");
const MortalKombatEval = require("../models/MortalKombatEval");
const MortalKombatTournament = require("../models/MortalKombatTournament");
const GauntletPlayer = require("../models/GauntletPlayer");
const Duelo = require("../models/Duelo");

let io = null;

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Crea el cliente autenticado de Google Sheets usando Service Account.
 * @returns {import('googleapis').sheets_v4.Sheets}
 */
function createSheetsClient() {
  const keyJson = config.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (keyJson) {
    try {
      const credentials = JSON.parse(keyJson);
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      return google.sheets({ version: "v4", auth });
    } catch (e) {
      console.error("[Sheets] Error parsing GOOGLE_SERVICE_ACCOUNT_KEY_JSON:", e.message);
    }
  }

  const keyFilePath = config.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (!keyFilePath || !fs.existsSync(keyFilePath)) {
    throw new Error(
      `Service Account key file not found.\n` +
        "Configure GOOGLE_SERVICE_ACCOUNT_KEY_JSON o GOOGLE_SERVICE_ACCOUNT_KEY_FILE en .env"
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

    // Ejecutar limpieza de datos (evaluaciones y torneos) para los que ya no están
    const activeRuts = unique.map(p => p.rut);
    performCleanup(activeRuts);

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

/**
 * Vincula la instancia de Socket.io para notificaciones.
 */
function setIo(ioInstance) {
  io = ioInstance;
}

/**
 * Elimina evaluaciones y ajusta el torneo para jugadores que ya no existen en el Sheet.
 * @param {string[]} activeRuts
 */
async function performCleanup(activeRuts) {
  try {
    if (!activeRuts || activeRuts.length === 0) {
      console.error("[Sheets] Limpieza abortada: activeRuts está vacío. Evitando borrado masivo por seguridad.");
      return;
    }

    // 1. Eliminar evaluaciones
    const mcRes = await MinecraftEval.deleteMany({ "jugador.rut": { $nin: activeRuts } });
    const mkRes = await MortalKombatEval.deleteMany({ "jugador.rut": { $nin: activeRuts } });
    
    if (mcRes.deletedCount > 0 || mkRes.deletedCount > 0) {
      console.log(`[Sheets] Limpieza: Eliminadas ${mcRes.deletedCount} eval MC y ${mkRes.deletedCount} eval MK.`);
      if (io) io.emit("eval_updated");
    }

    // 2. Limpiar Torneo Mortal Kombat
    const t = await MortalKombatTournament.findOne({ singleton: "main" });
    if (t) {
      let modified = false;

      const filterRoster = (arr) => {
        const initialLen = arr.length;
        const filtered = arr.filter(p => activeRuts.includes(p.rut));
        if (filtered.length !== initialLen) {
          modified = true;
          return filtered;
        }
        return arr;
      };

      t.novatos = filterRoster(t.novatos);
      t.intermedios = filterRoster(t.intermedios);
      t.expertos = filterRoster(t.expertos);
      t.aspirantes = filterRoster(t.aspirantes);

      const cleanupMatches = (matches) => {
        if (!matches) return;
        matches.forEach(m => {
          // Solo limpiar si no está terminado
          if (m.estado === "completado" || m.estado === "wo") return;

          const j1In = m.jugador1 ? activeRuts.includes(m.jugador1.rut) : true;
          const j2In = m.jugador2 ? activeRuts.includes(m.jugador2.rut) : true;

          if (!j1In || !j2In) {
            modified = true;
            m.estado = "wo";
            if (!j1In && !j2In) {
              m.ganador = null;
            } else if (!j1In) {
              m.ganador = m.jugador2.rut;
            } else {
              m.ganador = m.jugador1.rut;
            }
          }
        });
      };

      cleanupMatches(t.bloqueA);
      cleanupMatches(t.bloqueB);
      cleanupMatches(t.bossFight);

      if (t.finalMatch && t.finalMatch.estado === "pendiente") {
        const j1In = t.finalMatch.jugador1 ? activeRuts.includes(t.finalMatch.jugador1.rut) : true;
        const j2In = t.finalMatch.jugador2 ? activeRuts.includes(t.finalMatch.jugador2.rut) : true;
        
        if (!j1In || !j2In) {
          modified = true;
          t.finalMatch.estado = "completado";
          if (!j1In && !j2In) t.finalMatch.ganador = null;
          else if (!j1In) t.finalMatch.ganador = t.finalMatch.jugador2.rut;
          else t.finalMatch.ganador = t.finalMatch.jugador1.rut;
        }
      }

      if (modified) {
        t.updatedAt = new Date();
        await t.save();
        console.log("[Sheets] Torneo MK actualizado automáticamente tras limpieza.");
        if (io) io.emit("mk_tournament_updated", t);
      }
    }

    // 3. Limpiar Torneo Minecraft (Gauntlet)
    const playersToRemove = await GauntletPlayer.find({ rut: { $nin: activeRuts } });
    if (playersToRemove.length > 0) {
      const removedIds = playersToRemove.map(p => p._id);
      
      // Encontrar duelos pendientes donde participen estos jugadores
      const duelos = await Duelo.find({
        estado: "pendiente",
        $or: [
          { jugador1_id: { $in: removedIds } },
          { jugador2_id: { $in: removedIds } }
        ]
      }).populate('jugador1_id jugador2_id');

      let duelosModificados = 0;
      for (const d of duelos) {
        const j1Gone = d.jugador1_id ? !activeRuts.includes(d.jugador1_id.rut) : false;
        const j2Gone = d.jugador2_id ? !activeRuts.includes(d.jugador2_id.rut) : false;

        d.estado = "completado";
        if (j1Gone && j2Gone) {
          d.ganador_id = null;
        } else if (j1Gone) {
          d.ganador_id = d.jugador2_id ? d.jugador2_id._id : null;
          d.perdedor_id = d.jugador1_id ? d.jugador1_id._id : null;
        } else {
          d.ganador_id = d.jugador1_id ? d.jugador1_id._id : null;
          d.perdedor_id = d.jugador2_id ? d.jugador2_id._id : null;
        }
        d.resolvedAt = new Date();
        await d.save();
        duelosModificados++;
      }

      await GauntletPlayer.deleteMany({ _id: { $in: removedIds } });
      console.log(`[Sheets] Limpieza: Eliminados ${playersToRemove.length} jugadores de Gauntlet y resueltos ${duelosModificados} duelos por WO.`);
      if (io) io.emit("mc_tournament_updated");
    }
  } catch (err) {
    console.error("[Sheets] Error crítico en performCleanup:", err);
  }
}

module.exports = {
  syncFromSheets,
  getPlayers,
  getLastSync,
  getDebateStats,
  getPlayersByGame,
  setIo,
  performCleanup,
};
