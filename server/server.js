/**
 * server.js — Entry Point del Backend
 * =====================================
 * - Monta Express con CORS
 * - Inicia el polling de Google Sheets cada SYNC_INTERVAL_MS
 * - Expone las rutas /api/*
 */

"use strict";

const config = require("./config/env");
const express = require("express");
const cors = require("cors");
const { syncFromSheets } = require("./services/sheetsService");
const connectDB = require("./config/db");
const { passport } = require("./middlewares/auth");
const socketAuthMiddleware = require("./middlewares/socketAuth");
const apiRouter      = require("./routes/api");
const sessionsRouter = require("./routes/sessions");
const configRouter   = require("./routes/config");
const authRouter     = require("./routes/auth");
const settingsRouter = require("./routes/settings");
const triviaRouter   = require("./routes/trivia");
const rsvpRouter        = require("./routes/rsvp");
const tournamentRouter  = require("./routes/tournament");
const minecraftEvalRouter = require("./routes/minecraftEval");

const app = express();
const PORT = config.PORT;
const SYNC_INTERVAL = config.SYNC_INTERVAL_MS;

// Conectar a la base de datos (MongoDB Zero Trust)
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" })); // Ajusta el origin en producción
app.use(express.json());
if (passport) {
  app.use(passport.initialize());
}

// ─── Rutas ────────────────────────────────────────────────────────────────────
// ⚠️ sessionsRouter ANTES de apiRouter: Express evalúa de arriba a abajo.
//    Si apiRouter va primero, captura /api/sessions/* antes de llegar aquí.
app.use("/api/sessions",   sessionsRouter);
app.use("/api/config",     configRouter);
app.use("/api/auth",       authRouter);
app.use("/api/settings",   settingsRouter);
app.use("/api/trivia",     triviaRouter);
app.use("/api/rsvp",       rsvpRouter);
app.use("/api/tournament", tournamentRouter);
app.use("/api/minecraft-eval", minecraftEvalRouter);
app.use("/api",            apiRouter);

// Catch-all 404 SOLO PARA LA API
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado", path: req.path });
});

// ─── Servir el Frontend (React Build) ─────────────────────────────────────────
const path = require("path");
const clientBuildPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientBuildPath));

// Endpoint para que el cliente sepa si está en entorno de testing
app.get("/api/env", (req, res) => {
  const isTestingPath = req.headers.referer && req.headers.referer.includes("/testing");
  res.json({ env: "production" });
});

// Ruta /testing — sirve el mismo frontend pero con flag de testing
app.use("/testing", express.static(clientBuildPath));
app.get("/testing", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});
app.get("/testing/*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// Cualquier otra ruta que no sea /api, devuelve el index.html de React
app.get("*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// ─── Synchronización Periódica ────────────────────────────────────────────────
async function startSyncPolling() {
  // Sync inicial al arrancar
  console.log("[Server] Realizando sync inicial con Google Sheets...");
  await syncFromSheets();

  // Polling cada SYNC_INTERVAL ms
  setInterval(async () => {
    await syncFromSheets();
  }, SYNC_INTERVAL);

  console.log(`[Server] Polling activo — sync cada ${SYNC_INTERVAL / 1000}s`);
}

// ─── Arranque ─────────────────────────────────────────────────────────────────
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

// Configurar WebSockets
const io = new Server(server, {
  cors: {
    origin: "*", // Cambiar en producción a la IP del cliente
    methods: ["GET", "POST"]
  }
});

// Middleware estricto Zero Trust para Socket.io
// Intercepta configuraciones entrantes para validar JWT de Microsoft Entra ID
// NOTA: Comentado temporalmente para no quebrar el desarrollo actual de clientes locales
// io.use(socketAuthMiddleware);

// Guardamos la instancia de io en app para usarla en los routers
app.set("io", io);

// Inicializar manejador de debate
const debateHandler = require("./sockets/debateHandler");
debateHandler(io);

// Inicializar manejador de Trivia Arena
const triviaHandler = require("./sockets/triviaHandler");
triviaHandler(io);

// Inicializar manejador de Chat en Tiempo Real
const chatHandler = require("./sockets/chatHandler");
chatHandler(io);

// Inicializar manejador de la Sala de Espera (5 minijuegos)
const waitingRoomHandler = require("./sockets/waitingRoomHandler");
waitingRoomHandler(io);

// Inicializar manejador de Encuestas (Polls)
const pollHandler = require("./sockets/pollHandler");
pollHandler(io);

// Inicializar sincronización en vivo del escrutinio MC
const evalHandler = require("./sockets/evalHandler");
evalHandler(io);


server.listen(PORT, async () => {
  console.log(`[Server] Dashboard Club de Videojuegos corriendo en http://localhost:${PORT}`);
  await startSyncPolling();
});

module.exports = app;
