"use strict";

/**
 * mcTournament.js — Rutas REST del Torneo Minecraft v2.
 * =====================================================================
 * Sistema: Liga Suiza + Playoffs Doble Eliminación.
 *
 * POST   /api/mctournament/init               → Importa jugadores desde MinecraftEval
 * POST   /api/mctournament/init-manual        → Inicializa con lista explícita
 * POST   /api/mctournament/add-player         → Joiner tardío (mediana de tier)
 * POST   /api/mctournament/liga/ronda         → Genera nueva ronda Swiss
 * POST   /api/mctournament/duelo/:id/resolver → Resuelve duelo (liga o playoff)
 * POST   /api/mctournament/duelo/:id/handicap → Registra elección de debuff leve
 * POST   /api/mctournament/playoffs/iniciar   → Cierra liga, genera bracket
 * GET    /api/mctournament/snapshot           → Estado completo
 * DELETE /api/mctournament/reset              → Reinicia torneo
 */

const express = require("express");
const router  = express.Router();

const MinecraftEval  = require("../models/MinecraftEval");
const GauntletPlayer = require("../models/GauntletPlayer");
const Duelo          = require("../models/Duelo");

const { generarRondaLiga }   = require("../services/mcTournament/swissPairing");
const { generarPlayoffs }    = require("../services/mcTournament/playoffBracket");
const {
  resolverLiga,
  resolverPlayoff,
  elegirLightHandicap,
  getSnapshot,
} = require("../services/mcTournament/tournamentEngine");

const { PlayerState, DuelPhase } = require("../services/gauntlet/playerStates");

// Calcular grupo desde evaluación técnica
function calculatePlayerGroup(ev) {
  const pointsMap = { "Sí": 3, "Más o menos": 1, "No": 0 };
  const raw = ev.toObject ? ev.toObject() : ev;
  const pts =
    (pointsMap[raw.controlHotbar]   || 0) +
    (pointsMap[raw.controlCriticos] || 0) +
    (pointsMap[raw.dominioPvP]      || 0) +
    (pointsMap[raw.dominioClicks]   || 0);
  if (pts >= 10) return "A";
  if (pts >= 4)  return "B";
  return "C";
}

function emitUpdate(req) {
  try {
    const io = req.app.get("io");
    if (io) io.emit("mc_tournament_updated", { ts: Date.now() });
  } catch { /* noop */ }
}

// ─── INIT ────────────────────────────────────────────────────────────────────
router.post("/init", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });

    const evals = await MinecraftEval.find({});
    if (evals.length === 0) return res.status(400).json({ error: "No hay jugadores evaluados" });

    await Promise.all([
      GauntletPlayer.deleteMany({ torneo_id }),
      Duelo.deleteMany({ torneo_id }),
    ]);

    const docs = evals.map(ev => ({
      torneo_id,
      nombre: ev.jugador.nombre,
      rut:    ev.jugador.rut,
      grupo:  calculatePlayerGroup(ev),
      estado: PlayerState.ESPERANDO_INICIO,
    }));
    const jugadores = await GauntletPlayer.insertMany(docs);

    emitUpdate(req);
    res.status(201).json({ success: true, total: jugadores.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/init-manual", async (req, res) => {
  try {
    const { torneo_id, evaluaciones } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });
    if (!Array.isArray(evaluaciones)) return res.status(400).json({ error: "Falta evaluaciones[]" });

    await Promise.all([
      GauntletPlayer.deleteMany({ torneo_id }),
      Duelo.deleteMany({ torneo_id }),
    ]);

    const docs = evaluaciones.map(ev => ({
      torneo_id,
      nombre: ev.nombre,
      rut:    ev.rut || null,
      grupo:  ev.grupo,
      estado: PlayerState.ESPERANDO_INICIO,
    }));
    const jugadores = await GauntletPlayer.insertMany(docs);

    emitUpdate(req);
    res.status(201).json({ success: true, total: jugadores.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADD PLAYER (joiner tardío) ──────────────────────────────────────────────
router.post("/add-player", async (req, res) => {
  try {
    const { torneo_id, nombre, rut, grupo } = req.body;
    if (!torneo_id || !nombre || !grupo) {
      return res.status(400).json({ error: "Faltan datos (torneo_id, nombre, grupo)" });
    }

    // Verificar duplicado
    const yaExiste = await GauntletPlayer.findOne({ torneo_id, nombre });
    if (yaExiste) return res.status(409).json({ error: "Ya existe un jugador con ese nombre." });

    // Bloquear si playoffs ya iniciados
    const hayPlayoff = await Duelo.findOne({ torneo_id, bracket_side: { $ne: null } });
    if (hayPlayoff) return res.status(403).json({ error: "Los playoffs ya iniciaron. No se admiten más jugadores." });

    // Determinar puntos iniciales: mediana del tier
    const sameTier = await GauntletPlayer.find({ torneo_id, grupo }).lean();
    let puntosIniciales = 0;
    let partidasIniciales = 0;
    if (sameTier.length > 0) {
      const pts = sameTier.map(j => j.puntos_liga || 0).sort((a, b) => a - b);
      puntosIniciales = pts[Math.floor(pts.length / 2)] || 0;
      const parts = sameTier.map(j => j.partidas_liga || 0).sort((a, b) => a - b);
      partidasIniciales = Math.max(0, (parts[Math.floor(parts.length / 2)] || 0) - 1);
    }

    // Bloquear si ya pasamos la "ronda 4" (regla del diseño)
    const ultRonda = await Duelo.findOne({ torneo_id, fase: DuelPhase.LIGA })
      .sort({ ronda_liga: -1 }).select("ronda_liga").lean();
    if ((ultRonda?.ronda_liga || 0) >= 4) {
      return res.status(403).json({ error: "Cierre de inscripciones: ya pasamos la ronda 4." });
    }

    const jugador = await GauntletPlayer.create({
      torneo_id,
      nombre,
      rut: rut || null,
      grupo,
      estado: PlayerState.JUGANDO_GRUPOS,
      puntos_liga: puntosIniciales,
      partidas_liga: 0, // empieza desde 0 partidas reales jugadas
    });

    emitUpdate(req);
    res.status(201).json({ success: true, jugador, puntosIniciales });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SYNC EXCEL (sincronizar inscripciones) ──────────────────────────────────
router.post("/sync-excel", async (req, res) => {
  try {
    const { torneo_id, excelUrl, fileBase64 } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });

    let buffer = null;

    if (fileBase64) {
      buffer = Buffer.from(fileBase64, "base64");
    } else {
      let targetUrl = excelUrl;
      if (!targetUrl) {
        const settingsService = require("../services/settingsService");
        const settings = settingsService.getSettings();
        targetUrl = settings.minecraftExcelUrl;
      }

      if (!targetUrl) {
        return res.status(400).json({ error: "No se proporcionó una URL ni archivo Excel, y no hay URL configurada." });
      }

      // Si es una URL de Google Sheets, la convertimos para que descargue en formato xlsx
      if (targetUrl.includes("docs.google.com/spreadsheets")) {
        const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
        }
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Error al descargar el archivo: HTTP ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "El archivo Excel está vacío o no se pudo obtener." });
    }

    const xlsx = require("xlsx");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(200).json({ success: true, added: [], count: 0, message: "El archivo no tiene filas de datos." });
    }

    // Mapear filas buscando cabeceras comunes de manera insensible a mayúsculas
    const parsedPlayers = rawData.map(row => {
      let nombre = "";
      let rut = "";
      let correo = "";

      for (const [key, value] of Object.entries(row)) {
        const lowerKey = key.toLowerCase();
        if (!nombre && (lowerKey.includes("nombre") || lowerKey.includes("name") || lowerKey.includes("jugador"))) {
          nombre = String(value).trim();
        }
        if (!rut && (lowerKey.includes("rut") || lowerKey.includes("run") || lowerKey.includes("ident") || lowerKey.includes("r.u.t") || lowerKey.includes("documento"))) {
          rut = String(value).trim();
        }
        if (!correo && (lowerKey.includes("correo") || lowerKey.includes("email") || lowerKey.includes("mail"))) {
          correo = String(value).trim();
        }
      }
      return { nombre, rut, correo };
    }).filter(p => p.nombre);

    if (parsedPlayers.length === 0) {
      return res.status(400).json({ error: "No se encontraron columnas de nombres en el archivo (Ej: 'Nombre', 'Jugador')." });
    }

    // Obtener los jugadores existentes
    const existingPlayers = await GauntletPlayer.find({ torneo_id }).lean();
    const existingNames = new Set(existingPlayers.map(p => p.nombre.toLowerCase()));
    const existingRuts = new Set(existingPlayers.filter(p => p.rut).map(p => p.rut.toLowerCase()));

    // Bloquear si playoffs ya iniciados
    const hayPlayoff = await Duelo.findOne({ torneo_id, bracket_side: { $ne: null } });
    if (hayPlayoff) {
      return res.status(403).json({ error: "Los playoffs ya iniciaron. No se admiten más incorporaciones." });
    }

    // Calcular la mediana de puntos del Tier B (según requerimiento, van al B)
    const sameTier = existingPlayers.filter(j => j.grupo === "B");
    let puntosIniciales = 0;
    if (sameTier.length > 0) {
      const pts = sameTier.map(j => j.puntos_liga || 0).sort((a, b) => a - b);
      puntosIniciales = pts[Math.floor(pts.length / 2)] || 0;
    }

    // Bloquear si ya pasamos la ronda 4 (regla de diseño)
    const ultRonda = await Duelo.findOne({ torneo_id, fase: DuelPhase.LIGA })
      .sort({ ronda_liga: -1 }).select("ronda_liga").lean();
    if ((ultRonda?.ronda_liga || 0) >= 4) {
      return res.status(403).json({ error: "Inscripciones cerradas: ya pasó la ronda 4 del torneo." });
    }

    // Filtrar nuevos y armar inserciones
    const newPlayersToInsert = [];
    const addedNames = [];

    for (const p of parsedPlayers) {
      const nameLower = p.nombre.toLowerCase();
      const rutLower = p.rut ? p.rut.toLowerCase() : "";

      if (existingNames.has(nameLower)) continue;
      if (rutLower && existingRuts.has(rutLower)) continue;
      // Evitar meter duplicados del mismo excel
      if (addedNames.includes(nameLower)) continue;

      newPlayersToInsert.push({
        torneo_id,
        nombre: p.nombre,
        rut: p.rut || null,
        grupo: "B", // Fuerza a Tier B "porque es más intermedio"
        estado: PlayerState.JUGANDO_GRUPOS,
        puntos_liga: puntosIniciales,
        partidas_liga: 0,
      });
      addedNames.push(nameLower);
    }

    if (newPlayersToInsert.length > 0) {
      await GauntletPlayer.insertMany(newPlayersToInsert);
      emitUpdate(req);
    }

    res.status(200).json({
      success: true,
      count: newPlayersToInsert.length,
      added: newPlayersToInsert.map(p => p.nombre),
      puntosIniciales,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper para auto-proyectar los siguientes 2 duelos pendientes del torneo
async function autoProjectNextDuelos(torneoId) {
  try {
    // Quitar proyección de los completados para que salgan de la pantalla de espectador
    await Duelo.updateMany(
      { torneo_id: torneoId, estado: 'completado', projected: true },
      { $set: { projected: false } }
    );

    const activeProjected = await Duelo.find({
      torneo_id: torneoId,
      projected: true,
      estado: { $ne: 'completado' }
    });
    if (activeProjected.length >= 2) return;

    const needed = 2 - activeProjected.length;
    const nextDuelos = await Duelo.find({
      torneo_id: torneoId,
      estado: 'pendiente',
      jugador1_id: { $ne: null },
      jugador2_id: { $ne: null },
      projected: { $ne: true }
    }).sort({ ronda_liga: 1, bracket_slot: 1 }).limit(needed);

    for (const d of nextDuelos) {
      d.projected = true;
      await d.save();
    }
  } catch (e) {
    console.error("Error auto-proyectando duelos:", e);
  }
}

// ─── LIGA: Generar Ronda ─────────────────────────────────────────────────────
router.post("/liga/ronda", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });

    const result = await generarRondaLiga(torneo_id);
    await autoProjectNextDuelos(torneo_id);
    emitUpdate(req);
    res.status(201).json({ success: true, ...result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Resolver duelo (auto-route: liga o playoff) ─────────────────────────────
router.post("/duelo/:id/resolver", async (req, res) => {
  try {
    const { id } = req.params;
    const { ganador_id, remaining_seconds, flawless } = req.body;
    if (!ganador_id) return res.status(400).json({ error: "Falta ganador_id" });

    const duelo = await Duelo.findById(id);
    if (!duelo) return res.status(404).json({ error: "Duelo no encontrado" });

    let finalRemainingSeconds = remaining_seconds;
    if (finalRemainingSeconds === undefined || finalRemainingSeconds === null) {
      if (duelo.projected) {
        try {
          const { getTimerState } = require("../sockets/mcTournamentHandler");
          finalRemainingSeconds = getTimerState();
        } catch (e) {
          console.error("Error al obtener cronómetro del servidor:", e);
        }
      }
    }

    let result;
    if (duelo.fase === DuelPhase.LIGA) {
      result = await resolverLiga(id, ganador_id, finalRemainingSeconds, flawless === true || flawless === "true");
    } else if (duelo.bracket_side) {
      result = await resolverPlayoff(id, ganador_id);
    } else {
      return res.status(400).json({ error: "Tipo de duelo no soportado por este endpoint." });
    }

    res.json({ success: true, ...result });

    // Verificar si todos los duelos proyectados están completados
    const activeProjected = await Duelo.find({
      torneo_id: duelo.torneo_id,
      projected: true,
      estado: 'pendiente'
    });

    if (activeProjected.length === 0) {
      // Verificar si quedan duelos pendientes en la ronda
      const pendingDuelos = await Duelo.find({
        torneo_id: duelo.torneo_id,
        estado: 'pendiente',
        jugador1_id: { $ne: null },
        jugador2_id: { $ne: null }
      });

      if (pendingDuelos.length > 0) {
        emitUpdate(req); // Actualizar para mostrar los actuales completados
        setTimeout(async () => {
          await autoProjectNextDuelos(duelo.torneo_id);
          emitUpdate(req);
        }, 15000);
      } else {
        emitUpdate(req);
      }
    } else {
      emitUpdate(req);
    }
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Elegir debuff leve del handicap ─────────────────────────────────────────
router.post("/duelo/:id/handicap", async (req, res) => {
  try {
    const { id } = req.params;
    const { debuff_id } = req.body;
    if (!debuff_id) return res.status(400).json({ error: "Falta debuff_id" });
    const duelo = await elegirLightHandicap(id, debuff_id);
    emitUpdate(req);
    res.json({ success: true, duelo });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Iniciar playoffs ────────────────────────────────────────────────────────
router.post("/playoffs/iniciar", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });

    const result = await generarPlayoffs(torneo_id);
    await autoProjectNextDuelos(torneo_id);
    emitUpdate(req);
    res.status(201).json({ success: true, ...result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Omitir tiempo de transición (auto-proyectar al instante) ───────────────────
router.post("/project/skip-transition", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });
    await autoProjectNextDuelos(torneo_id);
    emitUpdate(req);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Proyectar duelo en pantalla grande ──────────────────────────────────────
router.post("/duelo/:id/project", async (req, res) => {
  try {
    const { id } = req.params;
    const { projected } = req.body;

    const duelo = await Duelo.findById(id);
    if (!duelo) return res.status(404).json({ error: "Duelo no encontrado" });

    if (projected) {
      // Buscar duelos ya proyectados del torneo
      const activeProjected = await Duelo.find({ torneo_id: duelo.torneo_id, projected: true });
      if (activeProjected.length >= 2) {
        // Desmarcar el más antiguo (primer elemento del array)
        const oldest = activeProjected[0];
        oldest.projected = false;
        await oldest.save();
      }
      duelo.projected = true;
    } else {
      duelo.projected = false;
    }

    await duelo.save();
    emitUpdate(req);
    res.json({ success: true, duelo });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── Snapshot ────────────────────────────────────────────────────────────────
router.get("/snapshot", async (req, res) => {
  try {
    const { torneo_id } = req.query;
    if (!torneo_id) return res.status(400).json({ error: "Falta ?torneo_id" });
    const snapshot = await getSnapshot(torneo_id);
    res.json({ success: true, torneo_id, ...snapshot });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE: jugador ─────────────────────────────────────────────────────────
router.delete("/player/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const j = await GauntletPlayer.findById(id);
    if (!j) return res.status(404).json({ error: "Jugador no encontrado" });
    // No permitir eliminación si tiene duelos completados
    const tieneDuelos = await Duelo.countDocuments({
      $or: [{ jugador1_id: id }, { jugador2_id: id }],
      estado: "completado",
    });
    if (tieneDuelos > 0) return res.status(403).json({ error: "Tiene partidas registradas, no se puede eliminar." });
    await GauntletPlayer.findByIdAndDelete(id);
    emitUpdate(req);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RESET ───────────────────────────────────────────────────────────────────
router.delete("/reset", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });
    await Promise.all([
      GauntletPlayer.deleteMany({ torneo_id }),
      Duelo.deleteMany({ torneo_id }),
    ]);
    emitUpdate(req);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
