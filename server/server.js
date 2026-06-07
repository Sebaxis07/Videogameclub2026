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
const sheetsService = require("./services/sheetsService");
const { syncFromSheets } = sheetsService;
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
const minecraftEvalRouter  = require("./routes/minecraftEval");
const mortalKombatEvalRouter = require("./routes/mortalKombatEval");
const mortalKombatTournamentRouter = require("./routes/mortalKombatTournament");
const gauntletRouter    = require("./routes/gauntlet");
const mcTournamentRouter = require("./routes/mcTournament");
const pixelQuiz         = require("./modules/trivia-engine");

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
app.use("/api/mk-eval",       mortalKombatEvalRouter);
app.use("/api/mk-tournament", mortalKombatTournamentRouter);
app.use("/api/gauntlet", gauntletRouter);
app.use("/api/mctournament", mcTournamentRouter);
app.use("/api/pixel-quiz", pixelQuiz.router);
app.use("/api",            apiRouter);

// Catch-all 404 SOLO PARA LA API
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado", path: req.path });
});

// ─── Servir Archivos Subidos ──────────────────────────────────────────────────
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// ─── Servir el Frontend (React Build) ─────────────────────────────────────────
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

// Emisor de eventos interno para comunicación entre handlers
io.localEvents = new (require('events').EventEmitter)();

// Middleware estricto Zero Trust para Socket.io
// Intercepta configuraciones entrantes para validar JWT de Microsoft Entra ID
// NOTA: Comentado temporalmente para no quebrar el desarrollo actual de clientes locales
// io.use(socketAuthMiddleware);

// Guardamos la instancia de io en app para usarla en los routers
app.set("io", io);

// Vincular io con el servicio de sheets para notificaciones de limpieza
sheetsService.setIo(io);


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

// Inicializar manejador de Gartic Phone
const garticHandler = require("./sockets/garticHandler");
garticHandler(io);

// Inicializar manejador de El Infiltrado
const infiltradoHandler = require("./sockets/infiltradoHandler");
infiltradoHandler(io);

// Inicializar manejador de Mensajes Directos (DM)
const dmHandler = require("./sockets/dmHandler");
dmHandler(io);

// Inicializar manejador de Encuestas (Polls)
const pollHandler = require("./sockets/pollHandler");
pollHandler(io);

// Inicializar manejador de Votación de Juegos (Voting)
const votingHandler = require("./sockets/votingHandler");
votingHandler.handler(io);

// Inicializar sincronización en vivo del escrutinio MC
const evalHandler = require("./sockets/evalHandler");
evalHandler(io);

// Inicializar sincronización en vivo del escrutinio Mortal Kombat
const mkEvalHandler = require("./sockets/mkEvalHandler");
mkEvalHandler(io);

// Inicializar sincronización del Torneo Minecraft
const mcTournamentHandler = require("./sockets/mcTournamentHandler");
mcTournamentHandler(io);

// Inicializar sincronización del Torneo Mortal Kombat
const mkTournamentHandler = require("./sockets/mkTournamentHandler");
mkTournamentHandler(io);

// Inicializar módulo Pixel Quiz Arena (caja negra, prefijo pq:*)
pixelQuiz.attachSockets(io);


server.listen(PORT, '0.0.0.0', async () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let networkUrl = '';

  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkUrl = `http://${iface.address}:${PORT}`;
        break;
      }
    }
    if (networkUrl) break;
  }

  console.log(`[Server] Dashboard Club de Videojuegos corriendo:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  if (networkUrl) {
    console.log(`  - Network: ${networkUrl}`);
  }
  await startSyncPolling();
});

module.exports = app;
