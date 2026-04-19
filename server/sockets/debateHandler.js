/**
 * debateHandler.js
 * =================
 * WebSockets Logic for Live Debate & Voting
 */

"use strict";

// Estructura de estado en memoria del debate
let activeDebate = {
  status: 'idle', // 'idle' | 'revealing' | 'voting' | 'finished'
  games: [], // lista de { name, status: 'hidden' | 'revealed' }
  votes: {}, // key: gameName, value: number (count)
  votedStudents: [], // array de ruts
  totalStudentsOnline: 0
};

// broadcast function will be set on init
let ioInstance = null;

function broadcastState() {
  if (ioInstance) {
    ioInstance.emit('debate-state', activeDebate);
  }
}

module.exports = function(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Alguien se conecta
    const role = socket.handshake.query.role || 'student';
    console.log(`[Sockets] Nuevo cliente conectado: ${socket.id} (Rol: ${role})`);
    
    if (role === 'student') {
      activeDebate.totalStudentsOnline++;
      broadcastState();
    }

    // Le enviamos el estado inicial nada más conectarse
    socket.emit('debate-state', activeDebate);

    // ─── ACCIONES ADMIN ──────────────────────────────────────────

    socket.on('admin:start-debate', (gamesList) => {
      // gamesList = ['Juego A', 'Juego B', ...]
      activeDebate = {
        status: 'revealing',
        games: gamesList.map(g => ({ name: g, status: 'hidden' })),
        votes: {},
        votedStudents: [],
        totalStudentsOnline: activeDebate.totalStudentsOnline // mantenemos online count
      };

      // Inicializar contador de votos en 0
      gamesList.forEach(g => { activeDebate.votes[g] = 0; });
      broadcastState();
    });

    socket.on('admin:reveal-game', (gameName) => {
      const g = activeDebate.games.find(x => x.name === gameName);
      if (g) {
        g.status = 'revealed';
        broadcastState();
      }
    });

    socket.on('admin:open-voting', () => {
      activeDebate.status = 'voting';
      broadcastState();
    });

    socket.on('admin:close-voting', () => {
      activeDebate.status = 'finished';
      broadcastState();
    });

    socket.on('admin:reset-debate', () => {
      activeDebate.status = 'idle';
      activeDebate.games = [];
      activeDebate.votes = {};
      activeDebate.votedStudents = [];
      broadcastState();
    });

    // ─── ACCIONES ESTUDIANTES ────────────────────────────────────

    socket.on('student:vote', ({ rut, selectedGames }) => {
      if (activeDebate.status !== 'voting') {
        return socket.emit('error', 'La votación no está abierta.');
      }
      
      if (activeDebate.votedStudents.includes(rut)) {
        return socket.emit('error', 'Ya has votado en este debate.');
      }

      // Evitamos error si manda más juegos o null
      if (!Array.isArray(selectedGames)) return;

      // Registrar los votos
      selectedGames.forEach(gameName => {
        if (activeDebate.votes[gameName] !== undefined) {
          activeDebate.votes[gameName]++;
        }
      });

      // Marcar alumno como que ya votó
      activeDebate.votedStudents.push(rut);

      // Le confirmamos a este socket específico
      socket.emit('vote-success');

      // Avisamos a todos (especialmente para que el admin vea la barra subir en vivo)
      broadcastState();
    });

    socket.on('disconnect', () => {
      console.log(`[Sockets] Cliente desconectado: ${socket.id} (Rol: ${role})`);
      if (role === 'student') {
        activeDebate.totalStudentsOnline = Math.max(0, activeDebate.totalStudentsOnline - 1);
        broadcastState();
      }
    });
  });
};
