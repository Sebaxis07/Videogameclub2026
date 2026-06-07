"use strict";

let garticState = {
  phase: "lobby", // lobby, prompt, draw, guess, reveal
  players: [], // { socketId, rut, name }
  chains: {}, // rut -> { ownerName, originalPrompt, drawingUrl, finalGuess }
  assignments: {}, // socketId -> data for current phase
  readyPlayers: new Set(),
};

function broadcastState(io) {
  const safePlayers = garticState.players.map(p => ({
    rut: p.rut,
    name: p.name,
    ready: garticState.readyPlayers.has(p.socketId)
  }));
  
  io.to("gartic-room").emit("gartic:state", {
    phase: garticState.phase,
    players: safePlayers,
    chains: garticState.chains, // Solo el admin usa todo esto en reveal
  });
}

function sendAssignments(io) {
  // Enviar a cada socket su asignación personal para que no vea la de otros
  garticState.players.forEach(p => {
    const assignment = garticState.assignments[p.socketId];
    io.to(p.socketId).emit("gartic:assignment", assignment);
  });
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    const role = socket.handshake.query.role || "student";
    const userName = socket.handshake.query.userName || "Jugador";
    const userRut = socket.handshake.query.rut || null;

    socket.on("gartic:join", () => {
      socket.join("gartic-room");
      if (role !== "admin" && userRut) {
        // Evitar duplicados
        const existingIdx = garticState.players.findIndex(p => p.rut === userRut);
        if (existingIdx !== -1) {
          garticState.players[existingIdx].socketId = socket.id;
        } else {
          garticState.players.push({ socketId: socket.id, rut: userRut, name: userName });
        }
      }
      broadcastState(io);
      
      if (garticState.assignments[socket.id]) {
        socket.emit("gartic:assignment", garticState.assignments[socket.id]);
      }
    });

    socket.on("gartic:leave", () => {
      socket.leave("gartic-room");
      if (role !== "admin") {
        garticState.players = garticState.players.filter(p => p.socketId !== socket.id);
        garticState.readyPlayers.delete(socket.id);
      }
      broadcastState(io);
    });

    socket.on("disconnect", () => {
      // Opcional: no eliminamos al jugador por si reconecta, a menos que esté en lobby
      if (garticState.phase === "lobby" && role !== "admin") {
        garticState.players = garticState.players.filter(p => p.socketId !== socket.id);
        broadcastState(io);
      }
    });

    // ─── LÓGICA DEL JUEGO (ALUMNOS) ──────────────────────────────────────────

    socket.on("gartic:submit-prompt", ({ prompt }) => {
      if (garticState.phase !== "prompt") return;
      
      const player = garticState.players.find(p => p.socketId === socket.id);
      if (!player) return;

      if (!garticState.chains[player.rut]) {
        garticState.chains[player.rut] = { ownerName: player.name, originalPrompt: "", drawingUrl: "", finalGuess: "" };
      }
      garticState.chains[player.rut].originalPrompt = prompt;
      garticState.readyPlayers.add(socket.id);
      broadcastState(io);
    });

    socket.on("gartic:submit-draw", ({ drawingUrl }) => {
      if (garticState.phase !== "draw") return;
      
      const assignment = garticState.assignments[socket.id];
      if (assignment && assignment.targetRut) {
        garticState.chains[assignment.targetRut].drawingUrl = drawingUrl;
        garticState.readyPlayers.add(socket.id);
        broadcastState(io);
      }
    });

    socket.on("gartic:submit-guess", ({ guess }) => {
      if (garticState.phase !== "guess") return;
      
      const assignment = garticState.assignments[socket.id];
      if (assignment && assignment.targetRut) {
        garticState.chains[assignment.targetRut].finalGuess = guess;
        garticState.readyPlayers.add(socket.id);
        broadcastState(io);
      }
    });

    // ─── ADMIN CONTROLS ──────────────────────────────────────────────────────

    socket.on("gartic:admin-set-phase", ({ phase }) => {
      if (role !== "admin") return;
      
      garticState.phase = phase;
      garticState.readyPlayers.clear();
      garticState.assignments = {};

      const players = garticState.players;
      const n = players.length;

      if (phase === "prompt") {
        garticState.chains = {};
      } 
      else if (phase === "draw") {
        // Rotación: el jugador i dibuja la frase del jugador (i-1)
        for (let i = 0; i < n; i++) {
          const targetIndex = (i - 1 + n) % n;
          const targetRut = players[targetIndex].rut;
          garticState.assignments[players[i].socketId] = {
            targetRut,
            prompt: garticState.chains[targetRut]?.originalPrompt || "Frase perdida"
          };
        }
        sendAssignments(io);
      }
      else if (phase === "guess") {
        // Rotación: el jugador i adivina el dibujo que hizo el jugador (i-1)
        // Pero ese dibujo pertenece a la cadena del jugador (i-2)
        for (let i = 0; i < n; i++) {
          const targetIndex = (i - 2 + n) % n;
          const targetRut = players[targetIndex].rut;
          garticState.assignments[players[i].socketId] = {
            targetRut,
            drawingUrl: garticState.chains[targetRut]?.drawingUrl || ""
          };
        }
        sendAssignments(io);
      }

      broadcastState(io);
    });

    socket.on("gartic:admin-reset", () => {
      if (role !== "admin") return;
      garticState = {
        phase: "lobby",
        players: [],
        chains: {},
        assignments: {},
        readyPlayers: new Set(),
      };
      broadcastState(io);
    });
  });
};
