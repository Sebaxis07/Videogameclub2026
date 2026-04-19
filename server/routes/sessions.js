/**
 * sessions.js — Rutas REST del Módulo de Sesiones
 * =================================================
 */

"use strict";

const express = require("express");
const router  = express.Router();
const {
  getAllSessions, getActiveSession, getSessionById,
  startSession, updateSession,
  toggleAttendance, addEquipment, removeEquipment, returnEquipment,
  addUniversityEquipment, removeUniversityEquipment, returnUniversityEquipment,
  getUniversityEquipmentHistory,
  addPeerLoan, removePeerLoan, returnPeerLoan, getPeerLoansHistory,
  endSession, getReport,
} = require("../services/sessionService");

// Utilidad para envolver errores
function wrap(fn) {
  return async (req, res) => {
    try { fn(req, res); }
    catch (err) { res.status(400).json({ error: err.message }); }
  };
}

// GET /api/sessions
router.get("/", (req, res) => {
  const { status, from, to } = req.query;
  res.json(getAllSessions({ status, from, to }));
});

// GET /api/sessions/active
router.get("/active", (req, res) => {
  const session = getActiveSession();
  if (!session) return res.status(404).json({ error: "No hay sesión activa." });
  res.json(session);
});

// GET /api/sessions/reports/summary
router.get("/reports/summary", (req, res) => {
  const { range = "week", date } = req.query;
  res.json(getReport(range, date));
});

// GET /api/sessions/player/:name — historial de un alumno
router.get("/player/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const all  = getAllSessions();
  const history = all
    .filter((s) => s.attendance.some((a) => a.playerName === name))
    .map((s) => {
      const attendee = s.attendance.find((a) => a.playerName === name);
      return {
        sessionId:  s.id,
        date:       s.date,
        startedAt:  s.startedAt,
        endedAt:    s.endedAt,
        status:     s.status,
        game:       s.game,
        present:    attendee?.present  ?? false,
        equipment:  attendee?.equipment ?? [],
      };
    });
  res.json({ playerName: name, total: history.length, history });
});

// GET /api/sessions/:id
router.get("/:id", (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada." });
  res.json(session);
});

// POST /api/sessions — iniciar sesión
router.post("/", wrap((req, res) => {
  const { game, notes, playerNames } = req.body;
  const session = startSession({ game, notes, playerNames: playerNames || [] });
  res.status(201).json(session);
}));

// PUT /api/sessions/:id — actualizar datos generales
router.put("/:id", (req, res) => {
  const updated = updateSession(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Sesión no encontrada." });
  res.json(updated);
});

// POST /api/sessions/:id/end — finalizar sesión
router.post("/:id/end", wrap((req, res) => {
  const session = endSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada." });
  res.json(session);
}));

// POST /api/sessions/:id/attendance — marcar/desmarcar asistencia
router.post("/:id/attendance", wrap((req, res) => {
  const { playerName, present } = req.body;
  if (!playerName) return res.status(400).json({ error: "playerName es requerido." });
  const session = toggleAttendance(req.params.id, playerName, Boolean(present));
  if (!session) return res.status(404).json({ error: "Sesión no encontrada." });
  res.json(session);
}));

// POST /api/sessions/:id/equipment — agregar equipo a un alumno
router.post("/:id/equipment", wrap((req, res) => {
  const { playerName, ...eqData } = req.body;
  if (!playerName) return res.status(400).json({ error: "playerName es requerido." });
  const eq = addEquipment(req.params.id, playerName, eqData);
  if (!eq) return res.status(404).json({ error: "Sesión no encontrada." });
  res.status(201).json(eq);
}));

// DELETE /api/sessions/:id/equipment/:eqId — eliminar equipo
router.delete("/:id/equipment/:eqId", wrap((req, res) => {
  const { playerName } = req.body;
  const deleted = removeEquipment(req.params.id, playerName, req.params.eqId);
  if (!deleted) return res.status(404).json({ error: "Equipo no encontrado." });
  res.json({ message: "Equipo eliminado." });
}));

// PUT /api/sessions/:id/equipment/:eqId/return — marcar equipo devuelto
router.put("/:id/equipment/:eqId/return", wrap((req, res) => {
  const { playerName } = req.body;
  const eq = returnEquipment(req.params.id, playerName, req.params.eqId);
  if (!eq) return res.status(404).json({ error: "Equipo no encontrado." });
  res.json(eq);
}));

// ─── Equipos de la Universidad (nivel sesión) ────────────────────────────────

// GET /api/sessions/university-equipment/history
router.get("/university-equipment/history", (req, res) => {
  res.json(getUniversityEquipmentHistory());
});

// POST /api/sessions/:id/university-equipment
router.post("/:id/university-equipment", wrap((req, res) => {
  const eq = addUniversityEquipment(req.params.id, req.body);
  if (!eq) return res.status(404).json({ error: "Sesión no encontrada." });
  res.status(201).json(eq);
}));

// DELETE /api/sessions/:id/university-equipment/:eqId
router.delete("/:id/university-equipment/:eqId", wrap((req, res) => {
  const deleted = removeUniversityEquipment(req.params.id, req.params.eqId);
  if (!deleted) return res.status(404).json({ error: "Equipo no encontrado." });
  res.json({ message: "Equipo universitario eliminado." });
}));

// PUT /api/sessions/:id/university-equipment/:eqId/return
router.put("/:id/university-equipment/:eqId/return", wrap((req, res) => {
  const eq = returnUniversityEquipment(req.params.id, req.params.eqId);
  if (!eq) return res.status(404).json({ error: "Equipo no encontrado." });
  res.json(eq);
}));

// ─── Préstamos entre Estudiantes (P2P Loans) ─────────────────────────────────

// GET /api/sessions/peer-loans/history
router.get("/peer-loans/history", (req, res) => {
  res.json(getPeerLoansHistory());
});

// POST /api/sessions/:id/peer-loans
router.post("/:id/peer-loans", wrap((req, res) => {
  const loan = addPeerLoan(req.params.id, req.body);
  if (!loan) return res.status(404).json({ error: "Sesión no encontrada." });
  res.status(201).json(loan);
}));

// DELETE /api/sessions/:id/peer-loans/:loanId
router.delete("/:id/peer-loans/:loanId", wrap((req, res) => {
  const deleted = removePeerLoan(req.params.id, req.params.loanId);
  if (!deleted) return res.status(404).json({ error: "Préstamo no encontrado." });
  res.json({ message: "Préstamo eliminado." });
}));

// PUT /api/sessions/:id/peer-loans/:loanId/return
router.put("/:id/peer-loans/:loanId/return", wrap((req, res) => {
  const loan = returnPeerLoan(req.params.id, req.params.loanId);
  if (!loan) return res.status(404).json({ error: "Préstamo no encontrado." });
  res.json(loan);
}));

module.exports = router;
