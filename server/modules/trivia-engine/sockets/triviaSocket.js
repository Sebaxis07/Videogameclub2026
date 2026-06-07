"use strict";

/**
 * triviaSocket.js — Eventos en tiempo real de Pixel Quiz Arena
 * ==============================================================
 * Eventos prefijados con "pq:" para no chocar con el módulo all-vs-all.
 *
 * Cliente → server:
 *   pq:join         { rut, nombre }
 *   pq:leave        { rut }
 *   pq:answer       { rut, matchId, answerIndex }
 *
 * Server → cliente (broadcast en SOCKET_ROOM):
 *   pq:state        snapshot público
 *   pq:selection    { matchId, participants, categoria, awaitingReveal }
 *   pq:question     { matchId, question (sin respuesta), durationMs, startedAt }
 *   pq:tick         { remainingMs }
 *   pq:wrongAnswer  { rut, responseTimeMs }
 *   pq:resolution   { winner, loser, correctIndex, responseTimeMs, kingCrowned }
 *   pq:kingCrowned  { rut, nombre }
 *
 * Server → emisor:
 *   pq:answerAck    { ok, correct?, locked?, reason? }
 *   pq:joinAck      { ok, reason?, state }
 *   pq:leaveAck     { ok, reason? }
 */

const controller       = require("../controllers/triviaController");
const stateMachine     = require("../services/stateMachine");
const { SOCKET_ROOM, EVENT_PREFIX } = require("../config");

const ev = (name) => `${EVENT_PREFIX}:${name}`;

module.exports = function attachPixelQuizSockets(io) {
  controller.bind(io);

  io.on("connection", (socket) => {
    socket.on(ev("join"), async ({ rut, nombre } = {}) => {
      if (!rut) return socket.emit(ev("error"), "Falta rut");
      socket.join(SOCKET_ROOM);
      socket.data.pq_rut = rut;

      const result = await controller.joinQueue({ rut, nombre });
      socket.emit(ev("joinAck"), {
        ok:    result.ok,
        reason: result.reason || null,
        state: stateMachine.getPublicSnapshot(),
      });
    });

    socket.on(ev("leave"), ({ rut } = {}) => {
      const targetRut = rut || socket.data.pq_rut;
      if (!targetRut) return;
      const result = controller.leaveQueue({ rut: targetRut });
      socket.emit(ev("leaveAck"), { ok: result.ok, reason: result.reason || null });
      if (result.ok) socket.leave(SOCKET_ROOM);
    });

    socket.on(ev("answer"), async ({ rut, matchId, answerIndex } = {}) => {
      if (!rut || !matchId || answerIndex === undefined) {
        return socket.emit(ev("answerAck"), { ok: false, reason: "BAD_PAYLOAD" });
      }
      const result = await controller.submitAnswer({ rut, matchId, answerIndex });
      socket.emit(ev("answerAck"), result);
    });

    socket.on("disconnect", () => {
      const rut = socket.data && socket.data.pq_rut;
      if (!rut) return;

      // Si el desconectado es participante activo → forfeit (oponente gana).
      if (stateMachine.isCurrentParticipant(rut)) {
        controller.forfeitParticipant(rut);
        return;
      }
      // Si solo estaba en cola, sale de la cola.
      controller.leaveQueue({ rut });
    });
  });
};
