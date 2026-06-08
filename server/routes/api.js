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
const Jugador = require("../models/Jugador");

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

// ─── GET /api/seed-evals ─────────────────────────────────────────────────────
router.get("/seed-evals", async (req, res) => {
  try {
    const MinecraftEval = require("../models/MinecraftEval");
    const MortalKombatEval = require("../models/MortalKombatEval");

    const mcEvals = [
      {
        jugador: { rut: "21336688-2", nombre: "francisco ribeiro" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "21.411.204-3", nombre: "Sebastian Alexander Anabalon Rojas" },
        controlHotbar: "Sí", controlCriticos: "Sí", dominioPvP: "Sí", dominioClicks: "Sí"
      },
      {
        jugador: { rut: "11.111.111-1", nombre: "Rodrigo2" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "21.355.768-8", nombre: "Fernanda Carvajal" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "26.324.548-2", nombre: "deibi" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "24.763.951-9", nombre: "Angel Torres" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "4.444.444-4", nombre: "kevin" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "22288480-2", nombre: "elias valenzuela" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "22.090.451-2", nombre: "Tomas Pizarro" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "28.832.015-2", nombre: "Carmen Huaman" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "22.169.741-3", nombre: "Miguel aguilera" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "22.315.927-3", nombre: "Sebastián Rojas" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "3.333.333-3", nombre: "Cristopher" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "2.222.222-2", nombre: "Benjamin U" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "21135332-K", nombre: "Yamir" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "22.340.829-k", nombre: "Marcelo" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "20.416.069-4", nombre: "Deyanira Rojas" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "23189772-0", nombre: "Derek Gallardo" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "21586510-k", nombre: "Francisca" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
      },
      {
        jugador: { rut: "21985425-9", nombre: "Gabriel" },
        controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "44.444.444-4", nombre: "Katalina Club" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      },
      {
        jugador: { rut: "77.777.777-7", nombre: "Sebastian Miranda" },
        controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
      }
    ];

    const mkEvals = [
      {
        jugador: { rut: "22.169.741-3", nombre: "Miguel aguilera" },
        movilidad: "Sí", peligrosidad: "Sí", energia: "Sí", defensa: "Sí"
      },
      {
        jugador: { rut: "24.763.951-9", nombre: "Angel Torres" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "22.090.451-2", nombre: "Tomas Pizarro" },
        movilidad: "No", peligrosidad: "No", energia: "No", defensa: "Más o menos"
      },
      {
        jugador: { rut: "28.832.015-2", nombre: "Carmen Huaman" },
        movilidad: "No", peligrosidad: "No", energia: "No", defensa: "No"
      },
      {
        jugador: { rut: "21.355.768-8", nombre: "Fernanda Carvajal" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "21.411.204-3", nombre: "Sebastian Alexander Anabalon Rojas" },
        movilidad: "Sí", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "22.315.927-3", nombre: "Sebastián Rojas" },
        movilidad: "Sí", peligrosidad: "Sí", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "22288480-2", nombre: "elias valenzuela" },
        movilidad: "Más o menos", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
      },
      {
        jugador: { rut: "26.324.548-2", nombre: "deibi" },
        movilidad: "Más o menos", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
      },
      {
        jugador: { rut: "23189772-0", nombre: "Derek Gallardo" },
        movilidad: "Más o menos", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
      },
      {
        jugador: { rut: "21336688-2", nombre: "francisco ribeiro" },
        movilidad: "Sí", peligrosidad: "Sí", energia: "Sí", defensa: "Sí"
      },
      {
        jugador: { rut: "3.333.333-3", nombre: "Cristopher" },
        movilidad: "Sí", peligrosidad: "Sí", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "2.222.222-2", nombre: "Benjamin U" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "21135332-K", nombre: "Yamir" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "22.340.829-k", nombre: "Marcelo" },
        movilidad: "Sí", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
      },
      {
        jugador: { rut: "21586510-k", nombre: "Francisca" },
        movilidad: "Más o menos", peligrosidad: "No", energia: "No", defensa: "Más o menos"
      },
      {
        jugador: { rut: "4.444.444-4", nombre: "kevin" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "11.111.111-1", nombre: "Rodrigo2" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "20.416.069-4", name: "Deyanira Rojas", nombre: "Deyanira Rojas" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "44.444.444-4", nombre: "Katalina Club" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "21985425-9", nombre: "Gabriel" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      },
      {
        jugador: { rut: "77.777.777-7", nombre: "Sebastian Miranda" },
        movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
      }
    ];

    await MinecraftEval.deleteMany({});
    await MortalKombatEval.deleteMany({});

    await MinecraftEval.insertMany(mcEvals);
    await MortalKombatEval.insertMany(mkEvals);

    res.json({ success: true, message: "Evaluaciones de Minecraft y Mortal Kombat pobladas con éxito en Atlas." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/seed-players ───────────────────────────────────────────────────
router.get("/seed-players", async (req, res) => {
  try {
    const playersToSeed = [
      {
        rut: "22.169.741-3",
        nombre: "Miguel aguilera",
        discord: "56930611858",
        juegosPropuesto: "Sin definir",
        plataforma: "xbox",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "24.763.951-9",
        nombre: "Angel Torres",
        discord: "56997663772",
        juegosPropuesto: "mortal Kombat XL",
        plataforma: "ps4",
        horasJugadas: 10,
        traeEquipo: true
      },
      {
        rut: "22.090.451-2",
        nombre: "Tomas Pizarro",
        discord: "56946185965",
        juegosPropuesto: "ultrakill",
        plataforma: "pc",
        horasJugadas: 27,
        traeEquipo: false
      },
      {
        rut: "28.832.015-2",
        nombre: "Carmen Huaman",
        discord: "56978967516",
        juegosPropuesto: "mobile legends",
        plataforma: "movil",
        horasJugadas: 20,
        traeEquipo: false
      },
      {
        rut: "21.355.768-8",
        nombre: "Fernanda Carvajal",
        discord: "lunita<3 56920973629",
        juegosPropuesto: "Minecraft",
        plataforma: "pc",
        horasJugadas: 14,
        traeEquipo: false
      },
      {
        rut: "21.411.204-3",
        nombre: "Sebastian Alexander Anabalon Rojas",
        discord: "shn._ 56940705043",
        juegosPropuesto: "Valorant",
        plataforma: "PC",
        horasJugadas: 450,
        traeEquipo: false
      },
      {
        rut: "22.315.927-3",
        nombre: "Sebastián Rojas",
        discord: "56991961303",
        juegosPropuesto: "Pokemon",
        plataforma: "Switch",
        horasJugadas: 100,
        traeEquipo: true
      },
      {
        rut: "22288480-2",
        nombre: "elias valenzuela",
        discord: "933589167",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "20.416.069-4",
        nombre: "Deyanira Rojas",
        discord: "945226696",
        juegosPropuesto: "Valorant",
        plataforma: "pc",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "44.444.444-4",
        nombre: "Katalina Club",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "26.324.548-2",
        nombre: "deibi",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "23189772-0",
        nombre: "Derek Gallardo",
        discord: "986211504",
        juegosPropuesto: "Dragon ball fighter Z",
        plataforma: "ps4",
        horasJugadas: 17520,
        traeEquipo: false
      },
      {
        rut: "21336688-2",
        nombre: "francisco ribeiro",
        discord: "966101381",
        juegosPropuesto: "mortal kombat x",
        plataforma: "pc",
        horasJugadas: 7.8,
        traeEquipo: true
      },
      {
        rut: "3.333.333-3",
        nombre: "Cristopher",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "2.222.222-2",
        nombre: "Benjamin U",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "21135332-K",
        nombre: "Yamir",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "22.340.829-k",
        nombre: "Marcelo",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "21586510-k",
        nombre: "Francisca",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "4.444.444-4",
        nombre: "kevin",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "11.111.111-1",
        nombre: "Rodrigo2",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "21985425-9",
        nombre: "Gabriel",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      },
      {
        rut: "77.777.777-7",
        nombre: "Sebastian Miranda",
        discord: "",
        juegosPropuesto: "Sin definir",
        plataforma: "",
        horasJugadas: 0,
        traeEquipo: false
      }
    ];

    await Jugador.deleteMany({});
    await Jugador.insertMany(playersToSeed);

    // Sincronizar la caché con los nuevos datos de MongoDB
    await syncFromSheets();

    res.json({
      success: true,
      message: "Jugadores poblados con éxito en la base de datos MongoDB Atlas y caché sincronizada.",
      total: playersToSeed.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
