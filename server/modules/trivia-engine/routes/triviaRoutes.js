"use strict";

/**
 * triviaRoutes.js — API REST de Pixel Quiz Arena
 * ================================================
 * Montado bajo /api/pixel-quiz desde index.js del módulo.
 *
 *   POST /api/pixel-quiz/queue/join              body: { rut, nombre? }
 *   POST /api/pixel-quiz/queue/leave             body: { rut }
 *   GET  /api/pixel-quiz/state                   snapshot público
 *   GET  /api/pixel-quiz/hill                    quién está en la colina y la cola
 *   GET  /api/pixel-quiz/history                 últimos 20 matches persistidos
 *   POST /api/pixel-quiz/admin/reset             reset total
 *   POST /api/pixel-quiz/admin/start             prepara siguiente match (SELECTION)
 *   POST /api/pixel-quiz/admin/reveal            revela la pregunta (SELECTION → QUESTION)
 *   POST /api/pixel-quiz/admin/skip              cierra el match actual / cancela selección
 *   POST /api/pixel-quiz/admin/add-bot           añade un bot a la cola
 *   POST /api/pixel-quiz/admin/clear-eliminated  reabre la cola a eliminados
 */

const express          = require("express");
const router           = express.Router();
const controller       = require("../controllers/triviaController");
const stateMachine     = require("../services/stateMachine");
const matchService     = require("../services/matchService");
const questionService  = require("../services/questionService");

router.post("/queue/join", async (req, res) => {
  const { rut, nombre } = req.body || {};
  if (!rut) return res.status(400).json({ error: "Falta rut" });
  const result = await controller.joinQueue({ rut, nombre });
  if (!result.ok) return res.status(409).json(result);
  res.json({ ok: true, state: stateMachine.getPublicSnapshot() });
});

router.post("/queue/leave", (req, res) => {
  const { rut } = req.body || {};
  if (!rut) return res.status(400).json({ error: "Falta rut" });
  const result = controller.leaveQueue({ rut });
  if (!result.ok) return res.status(409).json({ ...result, state: stateMachine.getPublicSnapshot() });
  res.json({ ok: true, state: stateMachine.getPublicSnapshot() });
});

router.get("/state", (req, res) => {
  res.json(stateMachine.getPublicSnapshot());
});

router.get("/hill", (req, res) => {
  const s = stateMachine.getState();
  res.json({
    hill:  s.hill,
    king:  s.king,
    queue: s.queue,
    phase: s.phase,
  });
});

router.get("/history", async (req, res) => {
  const recent = await matchService.getRecentMatches(20);
  res.json(recent);
});

router.get("/bank/summary", (req, res) => {
  res.json(questionService.getBankSummary());
});

router.post("/admin/reset", (req, res) => {
  controller.resetArena();
  res.json({ ok: true, state: stateMachine.getPublicSnapshot() });
});

router.post("/admin/start", async (req, res) => {
  const result = await controller.prepareNextMatch();
  res.json({ ...result, state: stateMachine.getPublicSnapshot() });
});

router.post("/admin/reveal", (req, res) => {
  const result = controller.revealQuestion();
  res.json({ ...result, state: stateMachine.getPublicSnapshot() });
});

router.post("/admin/add-bot", async (req, res) => {
  const result = await controller.addBot();
  res.json({ ...result, state: stateMachine.getPublicSnapshot() });
});

router.post("/admin/skip", (req, res) => {
  const result = controller.skipMatch();
  res.json({ ...result, state: stateMachine.getPublicSnapshot() });
});

router.post("/admin/clear-eliminated", (req, res) => {
  controller.clearEliminated();
  res.json({ ok: true, state: stateMachine.getPublicSnapshot() });
});

/** Vista privada: la pregunta cargada que el admin está por revelar. */
router.get("/admin/preview", (req, res) => {
  const s = stateMachine.getState();
  const pm = s.pendingMatch;
  if (!pm) return res.json({ pending: null });
  res.json({
    pending: {
      matchId:      pm.matchId,
      categoria:    pm.categoria,
      participants: (pm.participantsFull || []).map(p => ({ rut: p.rut, nombre: p.nombre })),
      question: pm.question ? {
        id:                 pm.question.id,
        pregunta:           pm.question.pregunta,
        opciones:           pm.question.opciones,
        respuesta_correcta: pm.question.respuesta_correcta,
      } : null,
    },
  });
});

module.exports = router;
