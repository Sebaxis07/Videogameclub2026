"use strict";

// Estado global en memoria para el cronómetro del Torneo Mortal Kombat
let timerState = {
  running: false,
  seconds: 99, // MATCH_SECONDS por defecto para MK (99s es el estándar)
  lastUpdate: Date.now(),
};

function getTimerState() {
  if (timerState.running) {
    const elapsed = Math.floor((Date.now() - timerState.lastUpdate) / 1000);
    return Math.max(0, timerState.seconds - elapsed);
  }
  return timerState.seconds;
}

module.exports = function attachMkTournamentHandler(io) {
  io.on('connection', (socket) => {
    // Enviar el estado actual al conectarse para sincronizar clientes nuevos
    socket.emit('mk_timer:sync', timerState);

    // Escuchar comandos de control del cronómetro (start, pause, reset)
    socket.on('mk_timer:control', (data) => {
      // data: { action: 'start' | 'pause' | 'reset', seconds: number }
      if (data.action === 'start') {
        timerState.running = true;
        timerState.seconds = data.seconds;
        timerState.lastUpdate = Date.now();
      } else if (data.action === 'pause') {
        timerState.running = false;
        timerState.seconds = data.seconds;
        timerState.lastUpdate = Date.now();
      } else if (data.action === 'reset') {
        timerState.running = false;
        timerState.seconds = data.seconds || 99;
        timerState.lastUpdate = Date.now();
      }

      // Retransmitir el evento a todos los demás clientes conectados
      socket.broadcast.emit('mk_timer:control', data);
    });

    // Permitir solicitud explícita de sincronización
    socket.on('mk_timer:request_sync', () => {
      socket.emit('mk_timer:sync', timerState);
    });
  });
};

module.exports.timerState = timerState;
module.exports.getTimerState = getTimerState;
