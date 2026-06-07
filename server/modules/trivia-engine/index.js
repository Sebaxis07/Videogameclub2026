"use strict";

/**
 * index.js — Bootstrap del módulo Pixel Quiz Arena
 * ==================================================
 * Punto de entrada único. Expone:
 *   - router: Express router con todas las rutas REST del módulo.
 *   - attachSockets(io): registra los handlers de Socket.io del módulo.
 *
 * Diseño "caja negra":
 *   El módulo solo importa ../../models/Jugador para validar inscritos.
 *   No depende de ningún sistema PvP ni del trivia legacy. Removerlo es
 *   simplemente quitar dos líneas en server.js (ver INTEGRATION abajo).
 */

const router         = require("./routes/triviaRoutes");
const attachSockets  = require("./sockets/triviaSocket");

module.exports = {
  router,
  attachSockets,
};
