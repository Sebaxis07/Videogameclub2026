"use strict";

/**
 * config.js — Constantes del módulo Pixel Quiz Arena
 * ===================================================
 * Centralizado para que el resto del módulo no tenga magic numbers.
 */

module.exports = {
  // Mínimo de jugadores en cola para iniciar SELECTION
  MIN_PLAYERS_TO_START: 2,

  // Tiempo activo de respuesta por pregunta (ms). Server es la única fuente de verdad.
  QUESTION_TIMER_MS: 15_000,

  // Pequeña ventana entre RESOLUTION y la siguiente SELECTION (ms)
  RESOLUTION_LINGER_MS: 4_000,

  // Victorias consecutivas requeridas para coronar al "Rey"
  KING_THRESHOLD: 10,

  // Estados de la máquina (string enum)
  PHASES: Object.freeze({
    QUEUE:         "QUEUE",
    SELECTION:     "SELECTION",
    QUESTION:      "QUESTION_PHASE",
    RESOLUTION:    "RESOLUTION",
    KING_CROWNED:  "KING_OF_THE_HILL",
  }),

  // Sala de Socket.io exclusiva del módulo (no choca con "triviaRoom" del módulo legado)
  SOCKET_ROOM: "pixelQuizArena",

  // Namespace de eventos de socket — todos prefijados con "pq:" para no chocar con
  // los eventos "trivia:*" del módulo de trivia all-vs-all preexistente.
  EVENT_PREFIX: "pq",
};
