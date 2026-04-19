/**
 * api.js — Rutas REST del Dashboard
 * =====================================
 * GET /api/players       → todos los jugadores en caché
 * GET /api/debate        → frecuencia agrupada por juego propuesto
 * GET /api/bracket       → bracket generado para un juego (?game=...)
 * GET /api/leaderboard   → Top 5 por fórmula de puntos
 * GET /api/sync          → dispara sync manual + estado
 */

"use strict";

const express = require("express");
const router = express.Router();

const {
  getPlayers,
  getLastSync,
  getPlayersByGame,
  syncFromSheets,
} = require("../services/sheetsService");
const {
  getDebate,
  voteGame,
  eliminateGame,
  resetDebate,
} = require("../services/debateService");
const { buildBracket } = require("../services/matchmaking");
const { getTopN } = require("../services/leaderboard");

// ─── GET /api/players ─────────────────────────────────────────────────────────
router.get("/players", (req, res) => {
  const players = getPlayers();
  
  // Inject roles from users.json so UI knows who is assistant
  const { getUsersCache } = require("../services/authService");
  const users = getUsersCache();
  
  const mappedPlayers = players.map(p => {
    const rutNorm = p.rut ? String(p.rut).replace(/[^0-9Kk]/g, '').toUpperCase() : '';
    const u = users.find(x => x.rut && String(x.rut).replace(/[^0-9Kk]/g, '').toUpperCase() === rutNorm);
    return { ...p, role: u && u.role === 'asistente' ? 'asistente' : 'student' };
  });

  res.json({
    total: mappedPlayers.length,
    lastSync: getLastSync(),
    players: mappedPlayers,
  });
});

// ─── GET /api/debate ──────────────────────────────────────────────────────────
router.get("/debate", (req, res) => {
  const state = getDebate();
  // Filter out eliminated games and sort by votes desc
  const activeGames = state
    .filter((g) => !g.eliminated)
    .sort((a, b) => b.votes - a.votes);
  
  res.json({
    total: activeGames.reduce((acc, s) => acc + s.votes, 0),
    lastSync: getLastSync(),
    data: activeGames.map((g) => ({ juego: g.juego, count: g.votes })),
  });
});

// ─── POST /api/debate/vote ────────────────────────────────────────────────────
router.post("/debate/vote", express.json(), (req, res) => {
  const { juego, amount } = req.body;
  if (!juego || typeof amount !== "number") {
    return res.status(400).json({ error: "Falta juego o amount" });
  }
  const newState = voteGame(juego, amount);
  res.json({ success: true });
});

// ─── POST /api/debate/eliminate ───────────────────────────────────────────────
router.post("/debate/eliminate", express.json(), (req, res) => {
  const { juego } = req.body;
  if (!juego) {
    return res.status(400).json({ error: "Falta juego" });
  }
  eliminateGame(juego);
  res.json({ success: true });
});

// ─── POST /api/debate/reset ───────────────────────────────────────────────────
router.post("/debate/reset", (req, res) => {
  resetDebate();
  res.json({ success: true });
});

// ─── GET /api/bracket ─────────────────────────────────────────────────────────
router.get("/bracket", (req, res) => {
  const { game } = req.query;
  let players;

  if (game) {
    players = getPlayersByGame(game);
    if (players.length === 0) {
      return res.status(404).json({ error: `No hay jugadores para el juego: "${game}"` });
    }
  } else {
    players = getPlayers();
  }

  if (players.length < 2) {
    return res.status(400).json({ error: "Se necesitan al menos 2 jugadores para generar un bracket." });
  }

  const bracket = buildBracket(players);
  res.json({
    game: game || "Todos los juegos",
    ...bracket,
  });
});

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────
router.get("/leaderboard", (req, res) => {
  const n = parseInt(req.query.n) || 5;
  const players = getPlayers();
  const top = getTopN(players, n);
  res.json({
    formula: "(Partidas_Jugadas × 10) + (Partidas_Ganadas × 50)",
    lastSync: getLastSync(),
    leaderboard: top,
  });
});

// ─── POST /api/sync ───────────────────────────────────────────────────────────
router.post("/sync", async (req, res) => {
  const result = await syncFromSheets();
  res.json({
    message: result.error ? "Sync con errores" : "Sync completado",
    lastSync: result.lastSync,
    total: result.total,
    ...(result.error && { error: result.error }),
  });
});

// ─── GET /api/status ─────────────────────────────────────────────────────────
router.get("/status", (req, res) => {
  res.json({
    status: "ok",
    lastSync: getLastSync(),
    playerCount: getPlayers().length,
    uptime: process.uptime(),
  });
});

module.exports = router;
