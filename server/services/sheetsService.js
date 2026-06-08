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

const Jugador = require("../models/Jugador");
const MinecraftEval = require("../models/MinecraftEval");
const MortalKombatEval = require("../models/MortalKombatEval");
const MortalKombatTournament = require("../models/MortalKombatTournament");
const GauntletPlayer = require("../models/GauntletPlayer");
const Duelo = require("../models/Duelo");

let io = null;

// ─── Cache en Memoria ─────────────────────────────────────────────────────────

let cachedPlayers = [];
let lastSyncTime = null;
let isSyncing = false;

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Descarga los datos actuales de MongoDB (Jugador) y actualiza la caché.
 *
 * @returns {Promise<{players: Array, lastSync: string, total: number}>}
 */
async function syncFromSheets() {
  if (isSyncing) {
    console.log("[Sheets/DB] Sync ya en curso, saltando...");
    return { players: cachedPlayers, lastSync: lastSyncTime, total: cachedPlayers.length };
  }

  isSyncing = true;
  console.log("[Sheets/DB] Sincronizando jugadores desde la base de datos MongoDB...");

  try {
    const dbPlayers = await Jugador.find({}).lean();

    cachedPlayers = dbPlayers.map((p) => ({
      rut: p.rut || "",
      nombre: p.nombre || "",
      discord: p.discord || "",
      juegosPropuesto: p.juegosPropuesto || p.juego_main || "Sin definir",
      plataforma: p.plataforma || "",
      horasJugadas: Number(p.horasJugadas) || 0,
      traeEquipo: Boolean(p.traeEquipo),
      partidasJugadas: Number(p.partidasJugadas) || 0,
      partidasGanadas: Number(p.partidasGanadas) || 0,
    }));

    lastSyncTime = new Date().toISOString();

    console.log(`[Sheets/DB] Sync OK — ${cachedPlayers.length} jugadores cargados desde MongoDB.`);

    // Ejecutar limpieza de datos (evaluaciones y torneos) para los que ya no están
    const activeRuts = cachedPlayers.map((p) => p.rut);
    performCleanup(activeRuts);

    return { players: cachedPlayers, lastSync: lastSyncTime, total: cachedPlayers.length };
  } catch (error) {
    console.error("[Sheets/DB] Error en sync:", error.message);
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
