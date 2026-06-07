"use strict";

/**
 * gauntlet.js — Rutas REST del Torneo Gauntlet
 * ==============================================
 * POST /api/gauntlet/init          → Crea jugadores desde evaluaciones
 * POST /api/gauntlet/grupos/:grupo → Genera Round Robin de un grupo
 * POST /api/gauntlet/grupos/:grupo/finalizar → Calcula posiciones y crea Promoción
 * POST /api/gauntlet/duelo/:id/resolver → Resuelve un duelo y avanza la escalada
 * GET  /api/gauntlet/snapshot       → Estado completo del torneo para el frontend
 */

const express = require("express");
const router = express.Router();

const MinecraftEval = require("../models/MinecraftEval");
const GauntletPlayer = require("../models/GauntletPlayer");
const Duelo = require("../models/Duelo");

const {
  inicializarJugadores,
  generarRondaArena,
  getTorneoSnapshot,
  añadirJugadorTardio,
} = require("../services/gauntlet/matchScheduler");

const {
  resolverDuelo,
  resolverDueloGrupos,
  finalizarFaseGrupos,
} = require("../services/gauntlet/transitionEngine");

const { PlayerState } = require("../services/gauntlet/playerStates");

// Helper para calcular el grupo basado en la evaluación técnica
function calculatePlayerGroup(ev) {
  const pointsMap = { "Sí": 3, "Más o menos": 1, "No": 0 };
  const raw = ev.toObject ? ev.toObject() : ev;
  const pts = 
    (pointsMap[raw.controlHotbar] || 0) +
    (pointsMap[raw.controlCriticos] || 0) +
    (pointsMap[raw.dominioPvP] || 0) +
    (pointsMap[raw.dominioClicks] || 0);

  if (pts >= 10) return "A";
  if (pts >= 4)  return "B";
  return "C";
}

// ─── POST /api/gauntlet/init ─────────────────────────────────────────────────
// Importa evaluaciones de MinecraftEval e inicializa el torneo.
router.post("/init", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });

    const evals = await MinecraftEval.find({});
    if (evals.length === 0) {
      return res.status(400).json({ error: "No hay jugadores evaluados en el sistema" });
    }

    const evaluaciones = evals.map((ev) => ({
      nombre: ev.jugador.nombre,
      rut:    ev.jugador.rut,
      grupo:  calculatePlayerGroup(ev),
    }));

    const jugadores = await inicializarJugadores(torneo_id, evaluaciones);

    res.status(201).json({
      success: true,
      torneo_id,
      total: jugadores.length,
      grupos: {
        A: jugadores.filter((j) => j.grupo === "A").length,
        B: jugadores.filter((j) => j.grupo === "B").length,
        C: jugadores.filter((j) => j.grupo === "C").length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gauntlet/init-manual ──────────────────────────────────────────
// Inicializa el torneo con una lista explícita de jugadores (sin MinecraftEval).
router.post("/init-manual", async (req, res) => {
  try {
    const { torneo_id, evaluaciones } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });
    if (!Array.isArray(evaluaciones) || evaluaciones.length === 0) {
      return res.status(400).json({ error: "Falta array 'evaluaciones'" });
    }

    const jugadores = await inicializarJugadores(torneo_id, evaluaciones);

    res.status(201).json({
      success: true,
      torneo_id,
      total: jugadores.length,
      grupos: {
        A: jugadores.filter((j) => j.grupo === "A").length,
        B: jugadores.filter((j) => j.grupo === "B").length,
        C: jugadores.filter((j) => j.grupo === "C").length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gauntlet/add-player ───────────────────────────────────────────
// Añade un jugador individual al torneo.
router.post("/add-player", async (req, res) => {
  try {
    const { torneo_id, nombre, rut, grupo } = req.body;
    if (!torneo_id || !nombre || !grupo) {
      return res.status(400).json({ error: "Faltan datos (torneo_id, nombre, grupo)" });
    }

    const jugador = await añadirJugadorTardio(torneo_id, { nombre, rut, grupo });
    res.status(201).json({ success: true, jugador });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gauntlet/grupos/:grupo ─────────────────────────────────────────
// Genera los partidos de Round Robin para un grupo específico.
router.post("/grupos/:grupo", async (req, res) => {
  try {
    const { grupo } = req.params;
    const { torneo_id } = req.body;

    if (!["A", "B", "C"].includes(grupo)) {
      return res.status(400).json({ error: "Grupo inválido. Usa A, B o C" });
    }

    const duelos = await generarRondaArena(torneo_id, grupo);
    res.json({ success: true, grupo, total_duelos: duelos.length, duelos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gauntlet/grupos/:grupo/finalizar ───────────────────────────────
// Cierra la Fase de Grupos de un nivel, calcula posiciones y si es C, crea el duelo de Promoción.
router.post("/grupos/:grupo/finalizar", async (req, res) => {
  try {
    const { grupo } = req.params;
    const { torneo_id } = req.body;

    if (!["A", "B", "C"].includes(grupo)) {
      return res.status(400).json({ error: "Grupo inválido" });
    }

    const resultado = await finalizarFaseGrupos(torneo_id, grupo);
    res.json({ success: true, grupo, ...resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/gauntlet/duelo/:id/grupos/resolver ────────────────────────────
// Resuelve un duelo de la Fase de Grupos (Round Robin).
router.post("/duelo/:id/grupos/resolver", async (req, res) => {
  try {
    const { id } = req.params;
    const { ganador_id } = req.body;

    if (!ganador_id) return res.status(400).json({ error: "Falta ganador_id" });

    const resultado = await resolverDueloGrupos(id, ganador_id);
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/gauntlet/duelo/:id/resolver ────────────────────────────────────
// Resuelve un duelo de la Escalada (Promoción, Camino, Gauntlet, Final).
router.post("/duelo/:id/resolver", async (req, res) => {
  try {
    const { id } = req.params;
    const { ganador_id } = req.body;

    if (!ganador_id) return res.status(400).json({ error: "Falta ganador_id" });

    const resultado = await resolverDuelo(id, ganador_id);
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /api/gauntlet/snapshot ───────────────────────────────────────────────
// Estado completo del torneo para renderizar el tablero en el frontend.
router.get("/snapshot", async (req, res) => {
  try {
    const { torneo_id } = req.query;
    if (!torneo_id) return res.status(400).json({ error: "Falta ?torneo_id=" });

    const snapshot = await getTorneoSnapshot(torneo_id);
    res.json({ success: true, torneo_id, ...snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gauntlet/duelos-pendientes ─────────────────────────────────────
router.get("/duelos-pendientes", async (req, res) => {
  try {
    const { torneo_id } = req.query;
    const duelos = await Duelo.find({ torneo_id, estado: "pendiente" })
      .populate("jugador1_id", "nombre grupo posicion_grupo estado")
      .populate("jugador2_id", "nombre grupo posicion_grupo estado");
    res.json({ success: true, total: duelos.length, duelos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gauntlet/reset ───────────────────────────────────────────────
// Reinicia el torneo completo (borra jugadores y duelos).
router.delete("/reset", async (req, res) => {
  try {
    const { torneo_id } = req.body;
    if (!torneo_id) return res.status(400).json({ error: "Falta torneo_id" });

    await Promise.all([
      GauntletPlayer.deleteMany({ torneo_id }),
      Duelo.deleteMany({ torneo_id }),
    ]);

    res.json({ success: true, message: `Torneo ${torneo_id} reiniciado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
