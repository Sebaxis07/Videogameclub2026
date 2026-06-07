/**
 * mkEvalHandler.js
 * =================
 * WebSocket Sync for Live Mortal Kombat 11 Evaluation
 * Mirror of evalHandler.js but using separate mk_eval:* event namespace.
 *
 * Events:
 *   CLIENT → SERVER: mk_eval:update       { role, rut, nombre, scores }
 *   SERVER → CLIENT: mk_eval:partnerUpdate { role, rut, nombre, scores }
 *   SERVER → CLIENT: mk_eval:fullState     { admin, asistente }  (on connect)
 */

"use strict";

let mkEvalState = {
  admin:     null, // { rut, nombre, scores: { movilidad, peligrosidad, energia, defensa } } | null
  asistente: null,
};

module.exports = function attachMkEvalHandler(io) {
  io.on('connection', (socket) => {

    // Send current full state on connect so late-joiners sync immediately
    socket.emit('mk_eval:fullState', mkEvalState);

    // An evaluator updates their player OR their ratings
    socket.on('mk_eval:update', ({ role, rut, nombre, scores }) => {
      if (role !== 'admin' && role !== 'asistente') return;

      mkEvalState[role] = rut ? { rut, nombre, scores: scores || {} } : null;

      // Broadcast to ALL clients
      io.emit('mk_eval:partnerUpdate', { role, rut, nombre, scores: scores || {} });
    });
  });
};
