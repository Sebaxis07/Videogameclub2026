/**
 * evalHandler.js
 * =================
 * WebSocket Sync for Live Minecraft PvP Evaluation
 * Allows Admin + Assistant to see each other's player selection
 * AND ratings (radio buttons) in real time.
 *
 * Events:
 *   CLIENT → SERVER: eval:update      { role, rut, nombre, scores }
 *   SERVER → CLIENT: eval:partnerUpdate { role, rut, nombre, scores }
 *   SERVER → CLIENT: eval:fullState    { admin, asistente }  (on connect)
 */

"use strict";

let evalState = {
  admin:     null, // { rut, nombre, scores: { controlHotbar, ... } } | null
  asistente: null,
};

module.exports = function attachEvalHandler(io) {
  io.on('connection', (socket) => {

    // Send current full state on connect so late-joiners sync immediately
    socket.emit('eval:fullState', evalState);

    // An evaluator updates their player OR their ratings
    socket.on('eval:update', ({ role, rut, nombre, scores }) => {
      if (role !== 'admin' && role !== 'asistente') return;

      evalState[role] = rut ? { rut, nombre, scores: scores || {} } : null;

      // Broadcast updated selection + scores to ALL clients
      io.emit('eval:partnerUpdate', { role, rut, nombre, scores: scores || {} });
    });
  });
};
