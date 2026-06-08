/**
 * votingHandler.js
 * =================
 * Maneja el proceso de votación de los alumnos por su juego favorito.
 * Los 3 juegos más votados se seleccionarán para la partida de Trivia.
 */

"use strict";

const GAMES_LIST = [
  "Minecraft",
  "Fortnite",
  "Mortal Kombat XL",
  "League of Legends",
  "Roblox",
  "Elden Ring"
];

function createInitialState() {
  return {
    isOpen: false,
    votes: {},     // { rut: gameName }
    results: {},   // { gameName: count }
    top3: []       // ["Game A", "Game B", "Game C"]
  };
}

let state = createInitialState();
let ioInstance = null;

// Initialize results object
GAMES_LIST.forEach(game => {
  state.results[game] = 0;
});

function calculateTop3() {
  const sorted = Object.entries(state.results)
    .sort((a, b) => b[1] - a[1]);
  
  return sorted.slice(0, 3).map(entry => entry[0]);
}

function broadcastUpdate() {
  if (!ioInstance) return;
  const payload = {
    isOpen: state.isOpen,
    results: state.results,
    top3: state.top3,
    totalVotes: Object.keys(state.votes).length
  };
  ioInstance.to("votingRoom").emit("voting:update", payload);
  
  // Also emit to admins
  const adminSockets = [...ioInstance.sockets.sockets.values()].filter(
    s => s.handshake.query.role === "admin"
  );
  adminSockets.forEach(s => s.emit("admin:voting:update", payload));
}

module.exports = {
  // We export getState so triviaHandler can read it later
  getState: () => state,
  
  handler: function (io) {
    ioInstance = io;

    io.on("connection", (socket) => {
      const role = socket.handshake.query.role || "student";

      socket.on("voting:join", ({ rut }) => {
        socket.join("votingRoom");
        
        const payload = {
          games: GAMES_LIST,
          isOpen: state.isOpen,
          results: state.results,
          myVote: rut ? state.votes[rut] : null,
          top3: state.top3,
          totalVotes: Object.keys(state.votes).length
        };
        socket.emit("voting:init", payload);
      });

      // ─── ADMIN EVENTS ───
      socket.on("admin:voting:start", () => {
        if (role !== "admin") return;
        state = createInitialState();
        GAMES_LIST.forEach(game => {
          state.results[game] = 0;
        });
        state.isOpen = true;
        broadcastUpdate();
        console.log("[Voting] Votación Iniciada");
      });

      socket.on("admin:voting:stop", () => {
        if (role !== "admin") return;
        state.isOpen = false;
        state.top3 = calculateTop3();
        broadcastUpdate();
        
        // Avisar internamente a otros módulos (como triviaHandler) que la votación terminó
        if (ioInstance && ioInstance.localEvents) {
          ioInstance.localEvents.emit("internal:voting:stop", state.top3);
        }
        
        console.log(`[Voting] Votación Cerrada. Top 3: ${state.top3.join(", ")}`);
      });

      // ─── STUDENT EVENTS ───
      socket.on("voting:cast", ({ rut, game }) => {
        if (!state.isOpen) {
          return socket.emit("voting:error", "La votación está cerrada.");
        }
        if (!GAMES_LIST.includes(game)) {
          return socket.emit("voting:error", "Juego no válido.");
        }
        
        // Si ya había votado por otro juego, restamos ese voto
        if (state.votes[rut]) {
          const oldGame = state.votes[rut];
          if (state.results[oldGame] > 0) {
            state.results[oldGame]--;
          }
        }
        
        state.votes[rut] = game;
        state.results[game]++;
        
        // Actualizamos top 3 en vivo (opcional, para que los estudiantes vean la carrera)
        state.top3 = calculateTop3();
        
        socket.emit("voting:success", { myVote: game });
        broadcastUpdate();
      });
    });
  }
};
