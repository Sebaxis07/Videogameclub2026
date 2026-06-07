"use strict";

// Estado global en memoria para el cronómetro del Torneo Minecraft
let timerState = {
  running: false,
  seconds: 90, // MATCH_SECONDS por defecto
  lastUpdate: Date.now(),
};

function getTimerState() {
  if (timerState.running) {
    const elapsed = Math.floor((Date.now() - timerState.lastUpdate) / 1000);
    return Math.max(0, timerState.seconds - elapsed);
  }
  return timerState.seconds;
}

module.exports = function attachMcTournamentHandler(io) {
  io.on('connection', (socket) => {
    // Enviar el estado actual al conectarse para sincronizar clientes nuevos
    socket.emit('mc_timer:sync', timerState);

    // Escuchar comandos de control del cronómetro (start, pause, reset)
    socket.on('mc_timer:control', (data) => {
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
        timerState.seconds = data.seconds || 90;
        timerState.lastUpdate = Date.now();
      }

      // Retransmitir el evento a todos los demás clientes conectados
      socket.broadcast.emit('mc_timer:control', data);
    });

    // Permitir solicitud explícita de sincronización
    socket.on('mc_timer:request_sync', () => {
      socket.emit('mc_timer:sync', timerState);
    });
  });
};

module.exports.timerState = timerState;
module.exports.getTimerState = getTimerState;
