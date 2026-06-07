/**
 * infiltradoHandler.js
 * =====================
 * WebSocket handler para el juego "El Infiltrado" (Undercover).
 * Temática: Videojuegos y películas de videojuegos.
 *
 * Incluye simulación de bots utilizando cuentas reales de la base de datos para pruebas.
 * Prefijo de eventos: infil:*
 */

"use strict";

const Jugador = require("../models/Jugador");

const CATEGORIES = {
  "Personajes Legendarios": [
    "Mario", "Luigi", "Link", "Zelda", "Pikachu", "Steve", "Sonic", "Kratos", "Donkey Kong", "Samus", "Master Chief", "Sans"
  ],
  "Juegos Populares": [
    "Minecraft", "GTA V", "Tetris", "League of Legends", "Fortnite", "Valorant", "FIFA", "Pac-Man", "Among Us", "Roblox", "Fall Guys"
  ],
  "Consolas & Hardware": [
    "Nintendo Switch", "PlayStation 5", "Xbox Series X", "Game Boy", "Atari", "PC Gamer", "Wii", "Dreamcast"
  ],
  "Objetos y Power-Ups": [
    "Pokebola", "Caparazón Azul", "Poción de Vida", "Escudo Hyliano", "Estrella de Invencibilidad", "Pico de Diamante", "Bloque de Tetris", "Portal Gun"
  ],
  "Películas de Videojuegos": [
    "Resident Evil", "Mortal Kombat", "Detective Pikachu", "Tomb Raider", "Warcraft", "Silent Hill", "Uncharted", "Doom"
  ]
};

let gameState = {
  phase: "lobby", // lobby, clues, voting, reveal_accused, guess_word, results
  players: [], // { socketId, rut, name, role: 'innocent' | 'impostor', votedFor: null, isBot: boolean }
  category: "",
  secretWord: "",
  clues: {}, // socketId -> word
  turnOrder: [], // array de socketIds que define el orden de juego
  currentTurnIndex: 0,
  impostorSocketId: null,
  accusedSocketId: null,
  accusedName: "",
  winnerTeam: null, // 'innocents' | 'impostor'
  accusedIsImpostor: false,
  guessOptions: [], // 5 options shuffled
};

let ioInstance = null;

function broadcastState() {
  if (!ioInstance) return;

  // Contar votos en tiempo real
  const voteCounts = {};
  gameState.players.forEach(p => {
    if (p.votedFor) {
      voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
    }
  });

  // Generar lista de jugadores con info segura según rol (ocultar roles si no es admin o resultados)
  const playersSafe = gameState.players.map(p => {
    const isVoteComplete = p.votedFor !== null;
    return {
      socketId: p.socketId,
      name: p.name,
      rut: p.rut,
      clue: gameState.clues[p.socketId] || null,
      voted: isVoteComplete,
      voteCount: voteCounts[p.socketId] || 0,
      isBot: p.isBot || false
    };
  });

  // El admin puede ver los roles reales y la palabra secreta siempre
  ioInstance.to("infil-admin").emit("infil:admin-state", {
    ...gameState,
    players: gameState.players.map(p => ({
      ...p,
      clue: gameState.clues[p.socketId] || null,
      voteCount: voteCounts[p.socketId] || 0
    }))
  });

  // Los estudiantes solo ven el estado limitado
  gameState.players.forEach(p => {
    if (p.isBot) return; // No enviar sockets a bots virtuales

    const revealAll = ["results", "guess_word"].includes(gameState.phase);
    
    ioInstance.to(p.socketId).emit("infil:state", {
      phase: gameState.phase,
      players: playersSafe.map(ps => {
        const originalPlayer = gameState.players.find(o => o.socketId === ps.socketId);
        return {
          ...ps,
          role: revealAll ? originalPlayer.role : (ps.socketId === p.socketId ? originalPlayer.role : null)
        };
      }),
      category: gameState.category,
      secretWord: (p.role === "innocent" || revealAll) ? gameState.secretWord : null,
      turnOrder: gameState.turnOrder,
      currentTurnIndex: gameState.currentTurnIndex,
      accusedSocketId: gameState.accusedSocketId,
      accusedName: gameState.accusedName,
      winnerTeam: gameState.winnerTeam,
      accusedIsImpostor: gameState.accusedIsImpostor,
      guessOptions: p.socketId === gameState.impostorSocketId ? gameState.guessOptions : (revealAll ? gameState.guessOptions : []),
      myRole: p.role,
      myTurn: gameState.phase === "clues" && gameState.turnOrder[gameState.currentTurnIndex] === p.socketId,
      hasVoted: p.votedFor !== null,
    });
  });
}

function checkAllVoted() {
  const activeStudents = gameState.players;
  if (activeStudents.length === 0) return false;
  return activeStudents.every(p => p.votedFor !== null);
}

function resolveVoting() {
  if (gameState.phase !== "voting") return;

  const votes = {};
  gameState.players.forEach(p => {
    if (p.votedFor) {
      votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
    }
  });

  let maxVotes = -1;
  let accusedId = null;

  gameState.players.forEach(p => {
    const count = votes[p.socketId] || 0;
    if (count > maxVotes) {
      maxVotes = count;
      accusedId = p.socketId;
    }
  });

  const accused = gameState.players.find(p => p.socketId === accusedId);
  if (!accused) {
    gameState.winnerTeam = "impostor";
    gameState.phase = "results";
    broadcastState();
    return;
  }

  gameState.accusedSocketId = accused.socketId;
  gameState.accusedName = accused.name;

  if (accused.socketId === gameState.impostorSocketId) {
    gameState.accusedIsImpostor = true;
    gameState.phase = "guess_word";

    const catWords = CATEGORIES[gameState.category] || [];
    const distractors = catWords.filter(w => w.toLowerCase() !== gameState.secretWord.toLowerCase());
    const shuffledDistractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 4);
    gameState.guessOptions = [...shuffledDistractors, gameState.secretWord].sort(() => 0.5 - Math.random());
  } else {
    gameState.accusedIsImpostor = false;
    gameState.winnerTeam = "impostor";
    gameState.phase = "results";
  }

  broadcastState();
}

// Lógica de simulación automatizada de Bots
function runBotActions() {
  if (gameState.phase === "clues") {
    const currentTurnSocketId = gameState.turnOrder[gameState.currentTurnIndex];
    const player = gameState.players.find(p => p.socketId === currentTurnSocketId);
    
    if (player && player.isBot) {
      setTimeout(() => {
        if (gameState.phase !== "clues" || gameState.turnOrder[gameState.currentTurnIndex] !== player.socketId) return;

        const catWords = CATEGORIES[gameState.category] || [];
        let clue = "Videojuego";
        if (player.role === "innocent") {
          const possible = catWords.filter(w => w.toLowerCase() !== gameState.secretWord.toLowerCase());
          if (possible.length > 0) {
            clue = possible[Math.floor(Math.random() * possible.length)];
          }
        } else {
          const allCats = Object.keys(CATEGORIES);
          const randCat = allCats[Math.floor(Math.random() * allCats.length)];
          const possible = CATEGORIES[randCat];
          clue = possible[Math.floor(Math.random() * possible.length)];
        }

        gameState.clues[player.socketId] = clue;
        gameState.currentTurnIndex++;

        if (gameState.currentTurnIndex >= gameState.turnOrder.length) {
          gameState.phase = "voting";
        }

        broadcastState();
        runBotActions();
      }, 2000);
    }
  } 
  else if (gameState.phase === "voting") {
    const botsToVote = gameState.players.filter(p => p.isBot && p.votedFor === null);
    if (botsToVote.length > 0) {
      setTimeout(() => {
        if (gameState.phase !== "voting") return;

        botsToVote.forEach(bot => {
          const candidates = gameState.players.filter(p => p.socketId !== bot.socketId);
          if (candidates.length > 0) {
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            bot.votedFor = chosen.socketId;
          }
        });

        broadcastState();

        if (checkAllVoted()) {
          resolveVoting();
          runBotActions();
        }
      }, 2500);
    }
  } 
  else if (gameState.phase === "guess_word") {
    const impostor = gameState.players.find(p => p.socketId === gameState.impostorSocketId);
    if (impostor && impostor.isBot && gameState.accusedSocketId === impostor.socketId) {
      setTimeout(() => {
        if (gameState.phase !== "guess_word") return;

        // 35% de probabilidad de que el bot adivine la palabra secreta correcta
        const guessCorrect = Math.random() < 0.35;
        const guess = guessCorrect ? gameState.secretWord : gameState.guessOptions.find(o => o.toLowerCase() !== gameState.secretWord.toLowerCase());

        if (guess && guess.toLowerCase() === gameState.secretWord.toLowerCase()) {
          gameState.winnerTeam = "impostor";
        } else {
          gameState.winnerTeam = "innocents";
        }

        gameState.phase = "results";
        broadcastState();
      }, 3000);
    }
  }
}

module.exports = function (io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    const role     = socket.handshake.query.role     || "student";
    const userName = socket.handshake.query.userName || "Jugador";
    const userRut  = socket.handshake.query.userRut  || null;

    socket.on("infil:join", () => {
      if (role === "admin") {
        socket.join("infil-admin");
        socket.join("infil-room");
        
        // Emitir estado para el panel de administración
        socket.emit("infil:admin-state", {
          ...gameState,
          players: gameState.players.map(p => ({
            ...p,
            clue: gameState.clues[p.socketId] || null,
            voteCount: 0
          }))
        });

        // Si el admin también es un jugador activo, le enviamos su estado de jugador en "infil:state"
        const isPlayer = gameState.players.find(p => p.socketId === socket.id);
        if (isPlayer) {
          const revealAll = ["results", "guess_word"].includes(gameState.phase);
          const voteCounts = {};
          gameState.players.forEach(pl => {
            if (pl.votedFor) {
              voteCounts[pl.votedFor] = (voteCounts[pl.votedFor] || 0) + 1;
            }
          });
          const playersSafe = gameState.players.map(pl => ({
            socketId: pl.socketId,
            name: pl.name,
            rut: pl.rut,
            clue: gameState.clues[pl.socketId] || null,
            voted: pl.votedFor !== null,
            voteCount: voteCounts[pl.socketId] || 0,
            isBot: pl.isBot || false
          }));

          socket.emit("infil:state", {
            phase: gameState.phase,
            players: playersSafe.map(ps => {
              const originalPlayer = gameState.players.find(o => o.socketId === ps.socketId);
              return {
                ...ps,
                role: revealAll ? originalPlayer.role : (ps.socketId === socket.id ? originalPlayer.role : null)
              };
            }),
            category: gameState.category,
            secretWord: (isPlayer.role === "innocent" || revealAll) ? gameState.secretWord : null,
            turnOrder: gameState.turnOrder,
            currentTurnIndex: gameState.currentTurnIndex,
            accusedSocketId: gameState.accusedSocketId,
            accusedName: gameState.accusedName,
            winnerTeam: gameState.winnerTeam,
            accusedIsImpostor: gameState.accusedIsImpostor,
            guessOptions: isPlayer.socketId === gameState.impostorSocketId ? gameState.guessOptions : (revealAll ? gameState.guessOptions : []),
            myRole: isPlayer.role,
            myTurn: gameState.phase === "clues" && gameState.turnOrder[gameState.currentTurnIndex] === socket.id,
            hasVoted: isPlayer.votedFor !== null,
          });
        }
        return;
      }

      socket.join("infil-room");

      if (gameState.phase === "lobby") {
        const existingIdx = gameState.players.findIndex(p => p.rut === userRut);
        if (existingIdx !== -1) {
          gameState.players[existingIdx].socketId = socket.id;
          gameState.players[existingIdx].name = userName;
        } else {
          gameState.players.push({
            socketId: socket.id,
            rut: userRut,
            name: userName,
            role: null,
            votedFor: null,
            isBot: false
          });
        }
      } else {
        const existing = gameState.players.find(p => p.rut === userRut);
        if (existing) {
          const oldSocketId = existing.socketId;
          existing.socketId = socket.id;
          
          const turnIdx = gameState.turnOrder.indexOf(oldSocketId);
          if (turnIdx !== -1) {
            gameState.turnOrder[turnIdx] = socket.id;
          }
          
          if (gameState.clues[oldSocketId]) {
            gameState.clues[socket.id] = gameState.clues[oldSocketId];
            delete gameState.clues[oldSocketId];
          }

          gameState.players.forEach(p => {
            if (p.votedFor === oldSocketId) p.votedFor = socket.id;
          });
        }
      }

      broadcastState();
    });

    socket.on("infil:leave", () => {
      socket.leave("infil-room");
      socket.leave("infil-admin");

      if (role !== "admin" && gameState.phase === "lobby") {
        gameState.players = gameState.players.filter(p => p.socketId !== socket.id);
      }
      broadcastState();
    });

    // ─── AGREGAR BOTS CON CUENTAS REALES DE LA BD ───
    socket.on("infil:admin-add-bots", async () => {
      if (role !== "admin") return;
      if (gameState.phase !== "lobby") return;

      try {
        // Buscar jugadores registrados en MongoDB
        const dbPlayers = await Jugador.find({}).limit(10);
        
        let addedCount = 0;
        dbPlayers.forEach((player) => {
          // Verificar si ya existe en la lista de jugadores por rut o nombre
          const exists = gameState.players.some(p => p.rut === player.rut || p.name === player.nombre);
          
          if (!exists && addedCount < 4) {
            gameState.players.push({
              socketId: `bot_${player.rut}`,
              rut: player.rut,
              name: player.nombre,
              role: null,
              votedFor: null,
              isBot: true
            });
            addedCount++;
          }
        });

        // Si no hay suficientes jugadores en la BD, rellenamos con bots ficticios emblemáticos
        const defaultBots = [
          { name: "Seba_VIP", rut: "bot_seba_123" },
          { name: "Caine_CPU", rut: "bot_caine_456" },
          { name: "Antigravity_Bot", rut: "bot_anti_789" },
          { name: "Inacap_Player", rut: "bot_ina_999" }
        ];

        let index = 0;
        while (gameState.players.length < 5 && index < defaultBots.length) {
          const mock = defaultBots[index];
          const exists = gameState.players.some(p => p.rut === mock.rut || p.name === mock.name);
          if (!exists) {
            gameState.players.push({
              socketId: `bot_${mock.rut}`,
              rut: mock.rut,
              name: mock.name,
              role: null,
              votedFor: null,
              isBot: true
            });
          }
          index++;
        }

        broadcastState();
      } catch (err) {
        console.error("Error al cargar bots desde la base de datos:", err);
        socket.emit("infil:error", { msg: "Error al sincronizar cuentas reales de la base de datos para bots." });
      }
    });

    socket.on("infil:admin-join-game", () => {
      if (role !== "admin") return;
      const exists = gameState.players.some(p => p.socketId === socket.id);
      if (!exists && gameState.phase === "lobby") {
        gameState.players.push({
          socketId: socket.id,
          rut: "admin_rut",
          name: userName + " (Admin)",
          role: null,
          votedFor: null,
          isBot: false
        });
      }
      broadcastState();
    });

    socket.on("infil:admin-leave-game", () => {
      if (role !== "admin") return;
      if (gameState.phase === "lobby") {
        gameState.players = gameState.players.filter(p => p.socketId !== socket.id);
      }
      broadcastState();
    });

    socket.on("infil:admin-start", ({ category }) => {
      if (role !== "admin") return;

      const activePlayers = gameState.players;
      if (activePlayers.length < 3) {
        socket.emit("infil:error", { msg: "Se necesitan al menos 3 jugadores en sala para iniciar." });
        return;
      }

      let selectedCat = category;
      const availableCats = Object.keys(CATEGORIES);
      if (!selectedCat || !availableCats.includes(selectedCat)) {
        selectedCat = availableCats[Math.floor(Math.random() * availableCats.length)];
      }

      const words = CATEGORIES[selectedCat];
      const secret = words[Math.floor(Math.random() * words.length)];

      const impostorIdx = Math.floor(Math.random() * activePlayers.length);
      activePlayers.forEach((p, idx) => {
        p.role = idx === impostorIdx ? "impostor" : "innocent";
        p.votedFor = null;
      });

      gameState.category = selectedCat;
      gameState.secretWord = secret;
      gameState.clues = {};
      gameState.impostorSocketId = activePlayers[impostorIdx].socketId;
      gameState.accusedSocketId = null;
      gameState.accusedName = "";
      gameState.winnerTeam = null;
      gameState.accusedIsImpostor = false;
      gameState.guessOptions = [];

      gameState.turnOrder = activePlayers.map(p => p.socketId).sort(() => 0.5 - Math.random());
      gameState.currentTurnIndex = 0;
      gameState.phase = "clues";

      broadcastState();

      // Disparar lógica de automatización de bots si aplica
      runBotActions();
    });

    socket.on("infil:admin-force-voting", () => {
      if (role !== "admin") return;
      resolveVoting();
      runBotActions();
    });

    socket.on("infil:admin-skip-turn", () => {
      if (role !== "admin") return;
      if (gameState.phase !== "clues") return;

      gameState.currentTurnIndex++;
      if (gameState.currentTurnIndex >= gameState.turnOrder.length) {
        gameState.phase = "voting";
      }
      broadcastState();
      runBotActions();
    });

    socket.on("infil:admin-reset", () => {
      if (role !== "admin") return;

      gameState = {
        phase: "lobby",
        players: gameState.players.map(p => ({
          socketId: p.socketId,
          rut: p.rut,
          name: p.name,
          role: null,
          votedFor: null,
          isBot: p.isBot || false
        })),
        category: "",
        secretWord: "",
        clues: {},
        turnOrder: [],
        currentTurnIndex: 0,
        impostorSocketId: null,
        accusedSocketId: null,
        accusedName: "",
        winnerTeam: null,
        accusedIsImpostor: false,
        guessOptions: [],
      };

      broadcastState();
    });

    socket.on("infil:submit-clue", ({ clue }) => {
      if (gameState.phase !== "clues") return;

      const activeSocketId = gameState.turnOrder[gameState.currentTurnIndex];
      if (socket.id !== activeSocketId) return;

      const clean = (clue || "").trim();
      if (!clean) {
        return socket.emit("infil:error", { msg: "La palabra no puede estar vacía." });
      }
      if (clean.includes(" ")) {
        return socket.emit("infil:error", { msg: "Solo debes ingresar una única palabra." });
      }

      if (clean.toLowerCase() === gameState.secretWord.toLowerCase()) {
        return socket.emit("infil:error", { msg: "¡No puedes usar la palabra secreta!" });
      }

      gameState.clues[socket.id] = clean;
      gameState.currentTurnIndex++;

      if (gameState.currentTurnIndex >= gameState.turnOrder.length) {
        gameState.phase = "voting";
      }

      broadcastState();
      runBotActions();
    });

    socket.on("infil:submit-vote", ({ targetSocketId }) => {
      if (gameState.phase !== "voting") return;

      const player = gameState.players.find(p => p.socketId === socket.id);
      if (!player) return;

      if (socket.id === targetSocketId) {
        return socket.emit("infil:error", { msg: "No puedes votar por ti mismo." });
      }

      player.votedFor = targetSocketId;
      broadcastState();

      if (checkAllVoted()) {
        resolveVoting();
        runBotActions();
      }
    });

    socket.on("infil:impostor-guess", ({ guess }) => {
      if (gameState.phase !== "guess_word") return;
      if (socket.id !== gameState.impostorSocketId) return;

      if (guess && guess.toLowerCase() === gameState.secretWord.toLowerCase()) {
        gameState.winnerTeam = "impostor";
      } else {
        gameState.winnerTeam = "innocents";
      }

      gameState.phase = "results";
      broadcastState();
    });

    socket.on("disconnect", () => {
      if (role !== "admin" && gameState.phase === "lobby") {
        gameState.players = gameState.players.filter(p => p.socketId !== socket.id);
        broadcastState();
      }
    });
  });
};
