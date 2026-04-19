/**
 * waitingRoomHandler.js
 * =====================
 * WebSocket handler para la Sala de Espera con 5 minijuegos.
 *
 * Prefijo de eventos: wr:*
 *
 * Minijuegos:
 *  1. guess       — Adivina el Personaje
 *  2. rps         — Piedra, Papel, Tijeras (duelos)
 *  3. clicker     — Club Clicker (incremental)
 *  4. dino        — Dino Run (high score)
 *  5. simon       — Simón Dice (record de nivel)
 */

"use strict";

const WRScore = require("../models/WRScore");

// ─── Personajes para "Adivina el Personaje" ──────────────────────────────────
const CHARACTERS = [
  { name: "Mario",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/mario/main.png" },
  { name: "Link",          imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/link/main.png" },
  { name: "Pikachu",       imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/pikachu/main.png" },
  { name: "Samus",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/samus/main.png" },
  { name: "Kirby",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/kirby/main.png" },
  { name: "Sonic",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/sonic/main.png" },
  { name: "Mega Man",      imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/mega_man/main.png" },
  { name: "Pac-Man",       imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/pac_man/main.png" },
  { name: "Donkey Kong",   imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/donkey_kong/main.png" },
  { name: "Yoshi",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/yoshi/main.png" },
  { name: "Fox McCloud",   imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/fox/main.png" },
  { name: "Cloud Strife",  imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/cloud/main.png" },
  { name: "Solid Snake",   imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/snake/main.png" },
  { name: "Ryu",           imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/ryu/main.png" },
  { name: "Inkling",       imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/inkling/main.png" },
  { name: "Villager",      imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/villager/main.png" },
  { name: "Steve",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/steve/main.png" },
  { name: "Luigi",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/luigi/main.png" },
  { name: "Zelda",         imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/zelda/main.png" },
  { name: "Bowser",        imageUrl: "https://www.smashbros.com/assets_v2/img/fighter/bowser/main.png" }
];

const CANVAS_TOPICS = [
  "Una Espada de Minecraft", "Un Champiñón de Mario", "Una Pokebola", "El logo de Super Smash Bros",
  "Un Creeper", "Un pico de diamante", "Una estrella de invencibilidad", "Un fantasma de Pac-Man",
  "El trifuerza de Zelda", "El casco de Master Chief", "El escudo de Link", "Un mando de Xbox",
  "Un mando de PlayStation", "Una Game Boy", "El logo de Steam", "Un corazón de vida retro",
  "El sombrero de Mario", "Un bloque '?'", "Un barril de Donkey Kong", "Un huevo de Yoshi",
  "Una ruina de Tetris", "Una manzana", "Gato", "Perro", "Una nave espacial", "Un Alien",
  "El logo de INACAP", "Computadora", "Teclado", "Ratón/Mouse", "Auriculares", "Cáliz sagrado",
  "Poción roja", "Poción azul", "Un anillo (Sonic)", "Moneda", "Gema", "Un dragón pequeño",
  "Espada láser", "Darth Vader", "Batman", "Spider-Man", "Una casa sencilla", "Un árbol",
  "Una flor de fuego", "Una guitarra", "El martillo de Thor", "Un escudo del Capitán América",
  "Un slime", "Un zombie", "Calavera", "Una corona", "Un ojo místico", "Luna", "Sol", "Estrella",
  "Rayo", "Nube", "Fuego", "Gota de agua", "Hoja", "Seta/Hongo", "Pez", "Cangrejo", "Pulpo",
  "Alien de Space Invaders", "Pac-Man comiendo", "Cereza de Pac-Man", "Pikachu (Cara)", "Charizard (Cabeza)",
  "Una poción de maná", "Arco y flecha", "Hacha de guerra", "Escudo de madera", "Casco vikingo",
  "Una mochila", "Una tienda de campaña", "Una fogata", "Bruja", "Fantasma", "Murciélago",
  "Llave", "Cofre del tesoro", "Mapa del tesoro", "Bandera pirata", "Barco", "Submarino", "Helicóptero",
  "Coche de carreras", "El logo de Batman", "Superman 'S'", "Una pizza", "Hamburguesa", "Taza de café",
  "Pastel", "Helado", "Galleta", "Donut", "Bomba", "Dinamita/TNT", "Una moneda de oro"
];

// ─── Estado en memoria ────────────────────────────────────────────────────────
let roomState = {
  isOpen: false,
  connectedPlayers: new Map(), // socketId -> { name, rut, role }
  activeGame: null,            // null | 'guess' | 'rps' | 'clicker' | 'dino' | 'simon'
};

// Clicker: sessionId -> { name, rut, clicks, lastBatch }
const clickerData = new Map();

// RPS: challengeId -> { p1: socketId, p2: socketId, p1Name, p2Name, choice1, choice2, timeout }
const rpsChallenges = new Map();

// Guess: estado actual
let guessState = {
  currentCharacter: null,
  blurPx: 20,
  solved: false,
  winners: [],     // últimos 5 ganadores
  intervalId: null,
};

// Canvas
const CANVAS_WIDTH = 50;
const CANVAS_HEIGHT = 50;
let canvasGrid = Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(null);
let canvasTopic = CANVAS_TOPICS[Math.floor(Math.random() * CANVAS_TOPICS.length)];
const canvasCooldowns = new Map(); // socketId -> timestamp

// Simon & Dino records (en memoria, persisten a DB)
let simonRecord  = { name: '', level: 0 };
let dinoRecord   = { name: '', score: 0 };

let ioInstance = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRoomPlayers() {
  return Array.from(roomState.connectedPlayers.values()).map(p => ({
    name: p.name, role: p.role, socketId: p.socketId,
  }));
}

function broadcastRoomState() {
  if (!ioInstance) return;
  ioInstance.to("waiting-room").emit("wr:room-state", {
    isOpen:   roomState.isOpen,
    players:  getRoomPlayers(),
    activeGame: roomState.activeGame,
  });
}

function getClickerRanking() {
  return Array.from(clickerData.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)
    .map(({ name, clicks }) => ({ name, clicks }));
}

// ─── Guess: Lanzar nuevo personaje ───────────────────────────────────────────
function launchNewCharacter() {
  if (!ioInstance) return;
  const idx = Math.floor(Math.random() * CHARACTERS.length);
  guessState = {
    currentCharacter: CHARACTERS[idx],
    blurPx: 20, // Empezamos en 20 en vez de 40 para que no sea un bloque negro
    solved: false,
    winners: guessState.winners,
    intervalId: guessState.intervalId,
  };
  ioInstance.to("waiting-room").emit("wr:new-character", {
    imageUrl:  guessState.currentCharacter.imageUrl,
    blurPx:    guessState.blurPx,
    solved:    false,
    hint:      `${guessState.currentCharacter.name.length} letras`,
  });

  // Reducir blur cada 10s
  let revealStep = 0;
  const revealInterval = setInterval(() => {
    if (guessState.solved || !ioInstance) {
      clearInterval(revealInterval);
      return;
    }
    revealStep++;
    guessState.blurPx = revealStep === 1 ? 12 : revealStep === 2 ? 6 : revealStep === 3 ? 3 : 0;
    ioInstance.to("waiting-room").emit("wr:character-hint", {
      blurPx: guessState.blurPx,
      hint: revealStep >= 4 ? "¡Última pista! Es hora de adivinar." : `Pista ${revealStep}: ${guessState.currentCharacter.name.length} letras`,
    });
    if (revealStep >= 4) clearInterval(revealInterval);
  }, 10000);
}

// ─── RPS helpers ──────────────────────────────────────────────────────────────
function rpsWinner(c1, c2) {
  if (c1 === c2) return "draw";
  if (
    (c1 === "rock" && c2 === "scissors") ||
    (c1 === "scissors" && c2 === "paper") ||
    (c1 === "paper" && c2 === "rock")
  ) return "p1";
  return "p2";
}

// ─── Persistir score ──────────────────────────────────────────────────────────
async function persistScore(name, rut, game, score) {
  try {
    await WRScore.create({ playerName: name, rut, game, score });
  } catch (e) {
    console.error("[WRScore] Error persistiendo score:", e.message);
  }
}

async function loadRecords() {
  try {
    const [dino, simon] = await Promise.all([
      WRScore.findOne({ game: "dino" }).sort({ score: -1 }),
      WRScore.findOne({ game: "simon" }).sort({ score: -1 }),
    ]);
    if (dino)  dinoRecord  = { name: dino.playerName,  score: dino.score };
    if (simon) simonRecord = { name: simon.playerName, level: simon.score };
  } catch (e) {
    console.error("[WR] Error cargando records:", e.message);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
module.exports = function (io) {
  ioInstance = io;
  loadRecords();

  // Broadcast de clicker cada 2 segundos
  setInterval(() => {
    if (clickerData.size > 0) {
      io.to("waiting-room").emit("wr:click-ranking", getClickerRanking());
    }
  }, 2000);

  // Rotar personaje cada 60s automáticamente si hay gente
  setInterval(() => {
    const count = roomState.connectedPlayers.size;
    if (count > 0 && !guessState.solved) return; // esperar a que alguien adivine
    if (count > 0) launchNewCharacter();
  }, 60000);

  io.on("connection", (socket) => {
    const role     = socket.handshake.query.role     || "student";
    const userName = socket.handshake.query.userName || "Jugador";
    const userRut  = socket.handshake.query.userRut  || null;

    // ─── UNIRSE A LA SALA ───────────────────────────────────────────────────
    socket.on("wr:join", () => {
      socket.join("waiting-room");
      roomState.connectedPlayers.set(socket.id, {
        name: userName, rut: userRut, role, socketId: socket.id,
      });

      // Init: estado completo
      socket.emit("wr:init", {
        isOpen:      roomState.isOpen,
        players:     getRoomPlayers(),
        activeGame:  roomState.activeGame,
        clickRanking: getClickerRanking(),
        dinoRecord,
        simonRecord,
        canvasTopic,
        guess: guessState.currentCharacter ? {
          imageUrl: guessState.currentCharacter.imageUrl,
          blurPx:  guessState.blurPx,
          solved:  guessState.solved,
          winners: guessState.winners,
          hint:    `${guessState.currentCharacter.name.length} letras`,
        } : null,
      });

      broadcastRoomState();
    });

    // ─── SALIR DE LA SALA ───────────────────────────────────────────────────
    socket.on("wr:leave", () => {
      socket.leave("waiting-room");
      roomState.connectedPlayers.delete(socket.id);
      broadcastRoomState();
    });

    // ─── ADMIN: Abrir / cerrar sala ─────────────────────────────────────────
    socket.on("wr:admin-toggle", () => {
      if (role !== "admin") return;
      roomState.isOpen = !roomState.isOpen;
      broadcastRoomState();
    });

    // ─── ADMIN: Cambiar juego activo ────────────────────────────────────────
    socket.on("wr:admin-set-game", (game) => {
      if (role !== "admin") return;
      roomState.activeGame = game;
      if (game === "guess" && !guessState.currentCharacter) {
        launchNewCharacter();
      }
      broadcastRoomState();
    });

    // ─── ADMIN: Lanzar nuevo personaje manualmente ──────────────────────────
    socket.on("wr:admin-new-character", () => {
      if (role !== "admin") return;
      launchNewCharacter();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // MINIJUEGO 1: Adivinar el Personaje
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("wr:guess", ({ answer }) => {
      if (!guessState.currentCharacter || guessState.solved) return;
      const correct = guessState.currentCharacter.name.toLowerCase().trim();
      const attempt = (answer || "").toLowerCase().trim();
      if (attempt === correct) {
        guessState.solved = true;
        guessState.winners.unshift({ name: userName, ts: Date.now() });
        if (guessState.winners.length > 5) guessState.winners.pop();
        io.to("waiting-room").emit("wr:guess-correct", {
          winner:  userName,
          answer:  guessState.currentCharacter.name,
          imageUrl: guessState.currentCharacter.imageUrl,
          winners: guessState.winners,
        });
        // Nuevo personaje en 5s
        setTimeout(launchNewCharacter, 5000);
      } else {
        socket.emit("wr:guess-wrong", { attempt });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // MINIJUEGO 2: Piedra, Papel, Tijeras
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("wr:rps-challenge", ({ targetSocketId }) => {
      const target = io.sockets.sockets.get(targetSocketId);
      if (!target) return socket.emit("wr:rps-error", { msg: "El jugador ya no está conectado." });

      const challengeId = `rps_${Date.now()}_${socket.id.slice(0, 6)}`;
      // Guardar desafío
      const timeout = setTimeout(() => {
        rpsChallenges.delete(challengeId);
        socket.emit("wr:rps-timeout", { challengeId });
      }, 15000);

      rpsChallenges.set(challengeId, {
        p1: socket.id, p1Name: userName,
        p2: targetSocketId, p2Name: roomState.connectedPlayers.get(targetSocketId)?.name || "???",
        choice1: null, choice2: null, timeout,
      });

      // ¡Le avisamos al creador (p1) cuál es el ID del desafío para que pueda elegir!
      socket.emit("wr:rps-challenge-sent", { challengeId });

      target.emit("wr:rps-challenge-recv", {
        challengeId,
        from: userName,
        fromSocketId: socket.id,
      });
    });

    socket.on("wr:rps-choice", ({ challengeId, choice }) => {
      const ch = rpsChallenges.get(challengeId);
      if (!ch) return;
      if (socket.id === ch.p1) ch.choice1 = choice;
      else if (socket.id === ch.p2) ch.choice2 = choice;
      else return;

      if (ch.choice1 && ch.choice2) {
        clearTimeout(ch.timeout);
        const result = rpsWinner(ch.choice1, ch.choice2);
        const winnerName = result === "draw" ? null : result === "p1" ? ch.p1Name : ch.p2Name;

        const payload = {
          challengeId,
          p1: ch.p1Name, p2: ch.p2Name,
          choice1: ch.choice1, choice2: ch.choice2,
          result, winner: winnerName,
        };

        const p1Socket = io.sockets.sockets.get(ch.p1);
        const p2Socket = io.sockets.sockets.get(ch.p2);
        if (p1Socket) p1Socket.emit("wr:rps-result", payload);
        if (p2Socket) p2Socket.emit("wr:rps-result", payload);

        // Broadcast visible para todos
        io.to("waiting-room").emit("wr:rps-announce", payload);
        rpsChallenges.delete(challengeId);
      }
    });

    socket.on("wr:rps-reject", ({ challengeId }) => {
      const ch = rpsChallenges.get(challengeId);
      if (!ch) return;
      clearTimeout(ch.timeout);
      const p1Socket = io.sockets.sockets.get(ch.p1);
      if (p1Socket) p1Socket.emit("wr:rps-rejected", { by: userName });
      rpsChallenges.delete(challengeId);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // MINIJUEGO 3: Club Clicker
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("wr:click", () => {
      const existing = clickerData.get(socket.id) || { name: userName, rut: userRut, clicks: 0 };
      existing.clicks += 1;
      existing.name = userName;
      clickerData.set(socket.id, existing);
      // Ack inmediato con total personal
      socket.emit("wr:click-ack", { total: existing.clicks });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // MINIJUEGO 4 & 5: Dino Run y Simón Dice — Submit de score
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("wr:score-submit", async ({ game, score }) => {
      if (!["dino", "simon"].includes(game)) return;
      const s = parseInt(score, 10);
      if (isNaN(s) || s < 0 || s > 999999) return;

      await persistScore(userName, userRut, game, s);

      if (game === "dino" && s > dinoRecord.score) {
        dinoRecord = { name: userName, score: s };
        io.to("waiting-room").emit("wr:dino-record", dinoRecord);
      }
      if (game === "simon" && s > simonRecord.level) {
        simonRecord = { name: userName, level: s };
        io.to("waiting-room").emit("wr:simon-record", simonRecord);
      }

      socket.emit("wr:score-saved", { game, score: s });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // MINIJUEGO 6: Canvas del Club
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("wr:canvas-get", () => {
      socket.emit("wr:canvas-full", { grid: canvasGrid, topic: canvasTopic });
    });

    socket.on("wr:canvas-place", ({ x, y, color }) => {
      // Validar bounds
      if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return;
      if (!color || typeof color !== "string") return;

      // Validar cooldown (3000 ms)
      const lastPlace = canvasCooldowns.get(socket.id) || 0;
      const now = Date.now();
      if (now - lastPlace < 3000) return; // Cooldown no cumplido

      // Aplicar
      canvasCooldowns.set(socket.id, now);
      const index = y * CANVAS_WIDTH + x;
      canvasGrid[index] = color;

      // Broadcast a todos incluyéndolo a él mismo para confirmar
      io.to("waiting-room").emit("wr:canvas-update", { index, color });
      socket.emit("wr:canvas-cooldown", { readyAt: now + 3000 });
    });

    socket.on("wr:admin-canvas-new", () => {
      if (role !== "admin") return;
      canvasGrid = Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(null);
      canvasCooldowns.clear();
      canvasTopic = CANVAS_TOPICS[Math.floor(Math.random() * CANVAS_TOPICS.length)];
      
      io.to("waiting-room").emit("wr:canvas-full", { grid: canvasGrid, topic: canvasTopic });
    });

    // ─── DESCONEXIÓN ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      roomState.connectedPlayers.delete(socket.id);

      // Persistir clicks del clicker al desconectar
      const cd = clickerData.get(socket.id);
      if (cd && cd.clicks > 0) {
        persistScore(cd.name, cd.rut, "clicker", cd.clicks).catch(() => {});
        clickerData.delete(socket.id);
      }

      // Cancelar desafíos RPS pendientes
      for (const [id, ch] of rpsChallenges.entries()) {
        if (ch.p1 === socket.id || ch.p2 === socket.id) {
          clearTimeout(ch.timeout);
          const other = ch.p1 === socket.id ? ch.p2 : ch.p1;
          const otherSocket = io.sockets.sockets.get(other);
          if (otherSocket) otherSocket.emit("wr:rps-error", { msg: "El oponente se desconectó." });
          rpsChallenges.delete(id);
        }
      }

      broadcastRoomState();
    });
  });
};
