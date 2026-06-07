/**
 * tournament.js — Rutas del sistema de Torneo Pre-Registration
 * =====================================
 * POST   /api/tournament/register       → registrar/actualizar jugador
 * GET    /api/tournament/registrants    → listar registrados por juego
 * DELETE /api/tournament/registrant/:id → quitar jugador de la lista
 * POST   /api/tournament/reset          → limpiar todos los registros del juego
 * GET    /api/tournament/bracket        → generar bracket desde registros del formulario
 */

"use strict";

const express = require("express");
const router  = express.Router();

const {
  registerPlayer,
  getRegistrants,
  removeRegistrant,
  resetRegistrants,
  getPlayersForMatchmaking,
} = require("../services/tournamentService");

const { buildBracket } = require("../services/matchmaking");

// ─── POST /api/tournament/register ───────────────────────────────────────────
router.post("/register", (req, res) => {
  const { game, nombre, nivel, cps, victorias, personaje, rango } = req.body;

  if (!game || !nombre || !nivel) {
    return res.status(400).json({ error: "Faltan campos: game, nombre, nivel" });
  }

  try {
    const result = registerPlayer(game, {
      nombre,
      nivel,
      cps:       typeof cps       === "number" ? cps       : null,
      victorias: typeof victorias === "number" ? victorias : null,
      personaje: personaje || null,
      rango:     rango     || null,
    });

    return res.status(result.action === "created" ? 201 : 200).json({
      success:    true,
      action:     result.action,
      registrant: result.registrant,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── GET /api/tournament/registrants?game=minecraft|mk11 ─────────────────────
router.get("/registrants", (req, res) => {
  const { game } = req.query;
  if (!game) return res.status(400).json({ error: "Parámetro ?game= requerido" });

  try {
    const list = getRegistrants(game);
    return res.json({
      game,
      total: list.length,
      registrants: list,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /api/tournament/registrant/:id?game=... ──────────────────────────
router.delete("/registrant/:id", (req, res) => {
  const { id }  = req.params;
  const { game } = req.query;

  if (!game || !id) {
    return res.status(400).json({ error: "Faltan parámetros: id, ?game=" });
  }

  const removed = removeRegistrant(game, id);
  return res.json({ success: removed, id });
});

// ─── POST /api/tournament/reset?game=... ─────────────────────────────────────
router.post("/reset", (req, res) => {
  const game = req.body?.game || req.query?.game;
  if (!game) return res.status(400).json({ error: "Campo game requerido" });

  try {
    resetRegistrants(game);
    return res.json({ success: true, game });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── GET /api/tournament/bracket?game=... ────────────────────────────────────
router.get("/bracket", (req, res) => {
  const { game } = req.query;
  if (!game) return res.status(400).json({ error: "Parámetro ?game= requerido" });

  try {
    const players = getPlayersForMatchmaking(game);

    if (players.length < 2) {
      return res.status(400).json({
        error: `Se necesitan al menos 2 jugadores registrados para ${game}. Actualmente: ${players.length}`,
      });
    }

    const bracket = buildBracket(players);
    return res.json({
      game,
      source: "tournament-form",
      ...bracket,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});


module.exports = router;
