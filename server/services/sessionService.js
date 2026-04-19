/**
 * sessionService.js — Servicio de Sesiones del Club
 * ====================================================
 * Gestiona el ciclo de vida de cada sesión:
 *   iniciar → pasar asistencia → registrar equipos → finalizar
 *
 * Los equipos pueden ser traídos por el alumno o provistos por la universidad.
 * Toda la data se persiste en data/sessions.json.
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const DATA_FILE = path.join(__dirname, "../data/sessions.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFromDisk() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}

function saveToDisk(items) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

// ─── Estado ───────────────────────────────────────────────────────────────────

let sessions = loadFromDisk();

// ─── Helpers internos ─────────────────────────────────────────────────────────

function makeAttendeeEntry(playerName) {
  return {
    playerName,
    present: false,
    arrivedAt: null,
    equipment: [],
  };
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/** Devuelve todas las sesiones (ordenadas por fecha desc) */
function getAllSessions({ status, from, to } = {}) {
  let list = [...sessions].sort((a, b) =>
    new Date(b.startedAt) - new Date(a.startedAt)
  );
  if (status) list = list.filter((s) => s.status === status);
  if (from)   list = list.filter((s) => s.date >= from);
  if (to)     list = list.filter((s) => s.date <= to);
  return list;
}

/** Devuelve la sesión activa actual (sólo puede haber una) */
function getActiveSession() {
  return sessions.find((s) => s.status === "active") || null;
}

/** Devuelve una sesión por ID */
function getSessionById(id) {
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Inicia una nueva sesión.
 * Lanza error si ya hay una activa.
 */
function startSession({ game = "", notes = "", playerNames = [] } = {}) {
  if (getActiveSession()) {
    throw new Error("Ya hay una sesión activa. Finalizala antes de iniciar una nueva.");
  }
  const now  = new Date();
  const session = {
    id:                 randomUUID(),
    date:               now.toISOString().slice(0, 10),
    startedAt:          now.toISOString(),
    endedAt:            null,
    status:             "active",
    game:               game.trim(),
    notes:              notes.trim(),
    universityEquipment: [],
    peerLoans:          [],
    attendance:         playerNames
      .filter((n) => n && String(n).trim())
      .map((n) => makeAttendeeEntry(String(n).trim())),
  };
  sessions.unshift(session);
  saveToDisk(sessions);
  return session;
}

/**
 * Actualiza campos generales de una sesión (game, notes).
 */
function updateSession(id, { game, notes }) {
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  if (game  !== undefined) sessions[idx].game  = game.trim();
  if (notes !== undefined) sessions[idx].notes = notes.trim();
  saveToDisk(sessions);
  return sessions[idx];
}

/**
 * Marca o desmarca la asistencia de un alumno.
 * Si el alumno no existía en la lista, lo agrega.
 */
function toggleAttendance(sessionId, playerName, present) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (session.status !== "active") throw new Error("La sesión ya está finalizada.");

  let attendee = session.attendance.find((a) => a.playerName === playerName);
  if (!attendee) {
    attendee = makeAttendeeEntry(playerName);
    session.attendance.push(attendee);
  }
  attendee.present   = present;
  attendee.arrivedAt = present ? new Date().toISOString() : null;
  if (!present) attendee.equipment = []; // al desmarcar, limpia equipos

  saveToDisk(sessions);
  return session;
}

/**
 * Agrega un equipo a un alumno dentro de una sesión.
 */
function addEquipment(sessionId, playerName, { type, brand, model, serial, description, universityOwned } = {}) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (session.status !== "active") throw new Error("La sesión ya está finalizada.");

  const attendee = session.attendance.find((a) => a.playerName === playerName && a.present);
  if (!attendee) throw new Error(`El alumno "${playerName}" no está marcado como presente.`);

  const equipment = {
    id:              randomUUID(),
    type:            type             || "Otro",
    brand:           brand            || "",
    model:           model            || "",
    serial:          serial           || "",
    description:     description      || "",
    universityOwned: Boolean(universityOwned),
    addedAt:         new Date().toISOString(),
    returnedAt:      null,
  };
  attendee.equipment.push(equipment);
  saveToDisk(sessions);
  return equipment;
}

/**
 * Elimina un equipo de un alumno (solo si no fue finalizada la sesión).
 */
function removeEquipment(sessionId, playerName, equipmentId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return false;
  const attendee = session.attendance.find((a) => a.playerName === playerName);
  if (!attendee) return false;
  const before = attendee.equipment.length;
  attendee.equipment = attendee.equipment.filter((e) => e.id !== equipmentId);
  saveToDisk(sessions);
  return attendee.equipment.length < before;
}

/**
 * Marca un equipo específico como devuelto.
 */
function returnEquipment(sessionId, playerName, equipmentId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const attendee = session.attendance.find((a) => a.playerName === playerName);
  if (!attendee) return null;
  const eq = attendee.equipment.find((e) => e.id === equipmentId);
  if (!eq) return null;
  eq.returnedAt = new Date().toISOString();
  saveToDisk(sessions);
  return eq;
}

/**
 * Finaliza la sesión activa:
 *  - Marca todos los equipos pendientes como devueltos
 *  - Cambia status a "ended"
 */
// ─── Equipos Universitarios (nivel sesión) ────────────────────────────────────

/** Agrega un equipo de la universidad a la sesión (no vinculado a ningún alumno). */
function addUniversityEquipment(sessionId, { type, brand, model, serial, description } = {}) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (session.status !== "active") throw new Error("La sesión ya está finalizada.");
  if (!session.universityEquipment) session.universityEquipment = [];

  const eq = {
    id:          randomUUID(),
    type:        type        || "Otro",
    brand:       brand       || "",
    model:       model       || "",
    serial:      serial      || "",
    description: description || "",
    addedAt:     new Date().toISOString(),
    returnedAt:  null,
  };
  session.universityEquipment.push(eq);
  saveToDisk(sessions);
  return eq;
}

/** Elimina un equipo universitario por ID (solo en sesión activa). */
function removeUniversityEquipment(sessionId, equipmentId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return false;
  const before = (session.universityEquipment || []).length;
  session.universityEquipment = (session.universityEquipment || []).filter((e) => e.id !== equipmentId);
  saveToDisk(sessions);
  return session.universityEquipment.length < before;
}

/** Marca un equipo universitario como devuelto. */
function returnUniversityEquipment(sessionId, equipmentId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const eq = (session.universityEquipment || []).find((e) => e.id === equipmentId);
  if (!eq) return null;
  eq.returnedAt = new Date().toISOString();
  saveToDisk(sessions);
  return eq;
}

/** Obtiene el historial histórico de todos los equipos universitarios pedidos. */
function getUniversityEquipmentHistory() {
  const all = getAllSessions();
  const history = [];
  all.forEach((s) => {
    if (s.universityEquipment && s.universityEquipment.length > 0) {
      s.universityEquipment.forEach(eq => {
        history.push({
          sessionId: s.id,
          date: s.date,
          sessionGame: s.game || 'Sesión libre',
          sessionStartedAt: s.startedAt,
          ...eq
        });
      });
    }
  });
  // Ordenar por fecha de pedido descendente
  history.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  return history;
}

// ─── Préstamos P2P (Estudiante a Estudiante/Club) ─────────────────────────────

/** Agrega un préstamo entre estudiantes o hacia el club. */
function addPeerLoan(sessionId, { equipmentId, borrowerName } = {}) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (session.status !== "active") throw new Error("La sesión ya está finalizada.");
  if (!session.peerLoans) session.peerLoans = [];

  let providerName = "Desconocido";
  let item = "Desconocido";

  if (equipmentId) {
    for (const a of session.attendance) {
      const eq = (a.equipment || []).find((e) => e.id === equipmentId);
      if (eq) {
        providerName = a.playerName;
        item = [eq.type, eq.brand, eq.model].filter(Boolean).join(" ");
        break;
      }
    }
  }

  const loan = {
    id:           randomUUID(),
    providerName,
    borrowerName: borrowerName || "Desconocido",
    item,
    equipmentId:  equipmentId || null,
    status:       "Prestado",
    loanedAt:     new Date().toISOString(),
    returnedAt:   null,
  };
  session.peerLoans.push(loan);
  saveToDisk(sessions);
  return loan;
}

/** Elimina un préstamo (sólo en sesión activa, en caso de error de registro). */
function removePeerLoan(sessionId, loanId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return false;
  const before = (session.peerLoans || []).length;
  session.peerLoans = (session.peerLoans || []).filter((l) => l.id !== loanId);
  saveToDisk(sessions);
  return session.peerLoans.length < before;
}

/** Marca un préstamo como devuelto. */
function returnPeerLoan(sessionId, loanId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const loan = (session.peerLoans || []).find((l) => l.id === loanId);
  if (!loan) return null;
  loan.status = "Devuelto";
  loan.returnedAt = new Date().toISOString();
  saveToDisk(sessions);
  return loan;
}

/** Historial de préstamos entre estudiantes. */
function getPeerLoansHistory() {
  const all = getAllSessions();
  const history = [];
  all.forEach((s) => {
    if (s.peerLoans && s.peerLoans.length > 0) {
      s.peerLoans.forEach((loan) => {
        history.push({
          sessionId: s.id,
          date: s.date,
          sessionGame: s.game || 'Sesión libre',
          ...loan
        });
      });
    }
  });
  history.sort((a, b) => new Date(b.loanedAt) - new Date(a.loanedAt));
  return history;
}

// ─── Fin Sesión ───────────────────────────────────────────────────────────────

function endSession(sessionId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (session.status === "ended") throw new Error("La sesión ya está finalizada.");

  const now = new Date().toISOString();
  session.attendance.forEach((a) => {
    a.equipment.forEach((e) => {
      if (!e.returnedAt) e.returnedAt = now;
    });
  });
  // También cierra equipos universitarios pendientes
  (session.universityEquipment || []).forEach((e) => {
    if (!e.returnedAt) e.returnedAt = now;
  });
  // Cierra préstamos P2P pendientes
  (session.peerLoans || []).forEach((l) => {
    if (!l.returnedAt) {
      l.returnedAt = now;
      l.status = "Devuelto";
    }
  });
  session.status  = "ended";
  session.endedAt = now;
  saveToDisk(sessions);
  return session;
}

/**
 * Reportes: resumen por rango.
 * @param {'day'|'week'|'month'} range
 * @param {string} [refDate] — fecha de referencia ISO (default: hoy)
 */
function getReport(range = "week", refDate) {
  const ref   = refDate ? new Date(refDate) : new Date();
  let from, to;

  if (range === "day") {
    from = to = ref.toISOString().slice(0, 10);
  } else if (range === "week") {
    const day  = ref.getDay();
    const mon  = new Date(ref); mon.setDate(ref.getDate() - ((day + 6) % 7));
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
    from = mon.toISOString().slice(0, 10);
    to   = sun.toISOString().slice(0, 10);
  } else {
    from = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    to   = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  }

  const inRange = sessions.filter((s) => s.date >= from && s.date <= to);

  // Métricas
  const totalSessions    = inRange.length;
  const totalPresent     = inRange.reduce((a, s) => a + s.attendance.filter((x) => x.present).length, 0);
  const avgAttendance    = totalSessions ? (totalPresent / totalSessions).toFixed(1) : 0;

  // Alumno más frecuente
  const playerFreq = {};
  inRange.forEach((s) => s.attendance.filter((a) => a.present).forEach((a) => {
    playerFreq[a.playerName] = (playerFreq[a.playerName] || 0) + 1;
  }));
  const topPlayer = Object.entries(playerFreq).sort((a, b) => b[1] - a[1])[0] || null;

  // Equipo más traído
  const eqFreq = {};
  inRange.forEach((s) => s.attendance.forEach((a) => a.equipment.forEach((e) => {
    const key = [e.type, e.brand].filter(Boolean).join(" · ") || "Sin info";
    eqFreq[key] = (eqFreq[key] || 0) + 1;
  })));
  const topEquipment = Object.entries(eqFreq).sort((a, b) => b[1] - a[1])[0] || null;

  const totalEquipment = inRange.reduce((a, s) =>
    a + s.attendance.reduce((b, at) => b + at.equipment.length, 0), 0
  );

  return {
    range,
    from,
    to,
    totalSessions,
    totalPresent,
    avgAttendance: Number(avgAttendance),
    topPlayer:     topPlayer ? { name: topPlayer[0], sessions: topPlayer[1] } : null,
    topEquipment:  topEquipment ? { label: topEquipment[0], count: topEquipment[1] } : null,
    totalEquipment,
    sessions:      inRange,
  };
}

module.exports = {
  getAllSessions,
  getActiveSession,
  getSessionById,
  startSession,
  updateSession,
  toggleAttendance,
  addEquipment,
  removeEquipment,
  returnEquipment,
  addUniversityEquipment,
  removeUniversityEquipment,
  returnUniversityEquipment,
  getUniversityEquipmentHistory,
  addPeerLoan,
  removePeerLoan,
  returnPeerLoan,
  getPeerLoansHistory,
  endSession,
  getReport,
};
