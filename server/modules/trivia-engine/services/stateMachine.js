"use strict";

/**
 * stateMachine.js — Estado puro de la Pixel Quiz Arena
 * ======================================================
 * Esta capa NO hace I/O (no toca sockets, ni Mongo, ni timers). Solo expone
 * funciones que mutan/consultan el estado en memoria.
 *
 * Modelo de estado:
 *   {
 *     phase:           QUEUE | SELECTION | QUESTION_PHASE | RESOLUTION | KING_OF_THE_HILL
 *     queue:           [{ rut, nombre }]
 *     hill:            { rut, nombre, streak } | null
 *     king:            { rut, nombre } | null
 *     eliminated:      Map<rut, { rut, nombre, at }>   // bloqueados hasta reset/coronación
 *     pendingMatch:    { matchId, participants, participantsFull, categoria, question } | null
 *                       // Existe durante SELECTION mientras esperamos al admin para revelar.
 *     currentMatch: {
 *       matchId, categoria, question,
 *       startedAt,                                     // Date.now() server-side al revelar
 *       participants: [rut, rut],
 *       participantsFull,
 *       responseLock: false,                           // mutex anti-doble-respuesta
 *       resolvedBy: null,                              // rut del primer correcto
 *       wrongAnswerers: Set<rut>                       // ya fallaron y quedaron bloqueados
 *     }
 *   }
 */

const { randomUUID } = require("crypto");
const { PHASES, KING_THRESHOLD } = require("../config");

const uuid = () => randomUUID();

function createInitialState() {
  return {
    phase:        PHASES.QUEUE,
    queue:        [],
    hill:         null,
    king:         null,
    eliminated:   new Map(),
    pendingMatch: null,
    currentMatch: null,
    history:      [],
  };
}

let state = createInitialState();

// ─── Lecturas ────────────────────────────────────────────────────────────────

function getState() {
  return state;
}

function isCurrentParticipant(rut) {
  if (!rut) return false;
  if (state.currentMatch && state.currentMatch.participants.includes(rut)) return true;
  if (state.pendingMatch && state.pendingMatch.participants.includes(rut)) return true;
  return false;
}

function isPlayerActive(rut) {
  return state.queue.some(p => p.rut === rut) ||
         (state.hill && state.hill.rut === rut) ||
         isCurrentParticipant(rut);
}

function isEliminated(rut) {
  return state.eliminated.has(rut);
}

/** Vista resumida segura para enviar al cliente (sin respuesta_correcta). */
function getPublicSnapshot() {
  // Durante SELECTION exponemos pendingMatch (sin pregunta) para que el cliente
  // pueda renderizar el VS-splash. La pregunta se revela solo en QUESTION.
  const selectionView = state.pendingMatch ? {
    matchId:      state.pendingMatch.matchId,
    categoria:    state.pendingMatch.categoria,
    participants: state.pendingMatch.participants,
    participantsFull: (state.pendingMatch.participantsFull || [])
      .map(p => ({ rut: p.rut, nombre: p.nombre })),
    awaitingReveal: true,
    question:     null,
  } : null;

  const questionView = state.currentMatch ? {
    matchId:      state.currentMatch.matchId,
    categoria:    state.currentMatch.categoria,
    participants: state.currentMatch.participants,
    participantsFull: (state.currentMatch.participantsFull || [])
      .map(p => ({ rut: p.rut, nombre: p.nombre })),
    startedAt:    state.currentMatch.startedAt,
    awaitingReveal: false,
    question: state.currentMatch.question ? {
      id:       state.currentMatch.question.id,
      pregunta: state.currentMatch.question.pregunta,
      opciones: state.currentMatch.question.opciones,
      categoria: state.currentMatch.question.categoria,
    } : null,
  } : null;

  return {
    phase: state.phase,
    kingThreshold: KING_THRESHOLD,
    queue: state.queue.map(p => ({ rut: p.rut, nombre: p.nombre })),
    hill:  state.hill,
    king:  state.king,
    eliminated: Array.from(state.eliminated.values()).map(p => ({ rut: p.rut, nombre: p.nombre })),
    currentMatch: questionView || selectionView,
  };
}

// ─── Mutaciones de la cola ───────────────────────────────────────────────────

const ENQUEUE_REASONS = {
  ELIMINATED:        "ELIMINATED",
  ALREADY_IN_QUEUE:  "ALREADY_IN_QUEUE",
  ON_HILL:           "ON_HILL",
  IN_ACTIVE_MATCH:   "IN_ACTIVE_MATCH",
};

function enqueuePlayer({ rut, nombre }) {
  if (!rut) return { ok: false, reason: "MISSING_RUT" };
  if (state.eliminated.has(rut))                 return { ok: false, reason: ENQUEUE_REASONS.ELIMINATED };
  if (state.queue.some(p => p.rut === rut))      return { ok: false, reason: ENQUEUE_REASONS.ALREADY_IN_QUEUE };
  if (state.hill && state.hill.rut === rut)      return { ok: false, reason: ENQUEUE_REASONS.ON_HILL };
  if (isCurrentParticipant(rut))                 return { ok: false, reason: ENQUEUE_REASONS.IN_ACTIVE_MATCH };

  state.queue.push({ rut, nombre: nombre || rut });
  return { ok: true };
}

/**
 * Saca al jugador de la cola/hill. Devuelve `false` si está jugando ahora mismo
 * (el caller decide si lo trata como forfeit o lo ignora).
 */
function removePlayer(rut) {
  if (!rut) return { removed: false, wasInActiveMatch: false };
  const wasInActiveMatch = isCurrentParticipant(rut);
  if (wasInActiveMatch) {
    return { removed: false, wasInActiveMatch: true };
  }
  const before = state.queue.length;
  state.queue = state.queue.filter(p => p.rut !== rut);
  let removed = state.queue.length !== before;
  if (state.hill && state.hill.rut === rut) {
    state.hill = null;
    removed = true;
  }
  return { removed, wasInActiveMatch: false };
}

function clearEliminated() {
  state.eliminated.clear();
}

function reset() {
  state = createInitialState();
}

// ─── Transiciones de fase ───────────────────────────────────────────────────

/**
 * Sortea retador(es) y crea un `pendingMatch` (sin pregunta aún). El admin
 * decidirá cuándo revelar la pregunta llamando a `commitQuestion`.
 * Devuelve los participantes elegidos o null si no hay suficientes jugadores.
 */
function transitionToSelection() {
  if (state.currentMatch || state.pendingMatch) return null; // ya hay match preparándose

  const { queue, hill } = state;
  let participants = null;

  if (hill && queue.length >= 1) {
    const idx = Math.floor(Math.random() * queue.length);
    const challenger = queue.splice(idx, 1)[0];
    participants = [hill, challenger];
  } else if (!hill && queue.length >= 2) {
    const i1 = Math.floor(Math.random() * queue.length);
    const p1 = queue.splice(i1, 1)[0];
    const i2 = Math.floor(Math.random() * queue.length);
    const p2 = queue.splice(i2, 1)[0];
    participants = [p1, p2];
  }

  if (!participants) {
    state.phase = PHASES.QUEUE;
    return null;
  }

  state.pendingMatch = {
    matchId:          uuid(),
    participants:     participants.map(p => p.rut),
    participantsFull: participants,
    categoria:        null,
    question:         null,
  };
  state.phase = PHASES.SELECTION;
  return participants;
}

/** Adjunta categoría + pregunta al pendingMatch tras seleccionar participantes. */
function attachQuestionToPending({ categoria, question }) {
  if (!state.pendingMatch) return false;
  state.pendingMatch.categoria = categoria;
  state.pendingMatch.question  = question;
  return true;
}

/**
 * Promueve `pendingMatch` → `currentMatch` y arranca QUESTION_PHASE con timer.
 * Solo válido en fase SELECTION con pregunta ya adjunta.
 */
function commitQuestion() {
  if (state.phase !== PHASES.SELECTION)        return null;
  if (!state.pendingMatch)                     return null;
  if (!state.pendingMatch.question)            return null;
  if (state.currentMatch)                      return null; // sanity

  const pm = state.pendingMatch;
  state.currentMatch = {
    matchId:          pm.matchId,
    categoria:        pm.categoria,
    question:         pm.question,
    startedAt:        Date.now(),
    participants:     pm.participants.slice(),
    participantsFull: pm.participantsFull,
    responseLock:     false,
    resolvedBy:       null,
    wrongAnswerers:   new Set(),
  };
  state.pendingMatch = null;
  state.phase = PHASES.QUESTION;
  return state.currentMatch;
}

/**
 * Registra una respuesta INCORRECTA. El jugador queda bloqueado hasta el final
 * del match. Devuelve `{ allWrong }` para que el caller resuelva el match si
 * todos fallaron.
 */
function recordWrongAnswer(rut) {
  const m = state.currentMatch;
  if (!m) return { ok: false, allWrong: false };
  if (!m.participants.includes(rut)) return { ok: false, allWrong: false };
  if (m.wrongAnswerers.has(rut)) return { ok: false, alreadyWrong: true, allWrong: m.wrongAnswerers.size >= m.participants.length };
  m.wrongAnswerers.add(rut);
  const allWrong = m.wrongAnswerers.size >= m.participants.length;
  return { ok: true, allWrong };
}

function hasAlreadyAnswered(rut) {
  const m = state.currentMatch;
  if (!m) return false;
  return m.wrongAnswerers.has(rut);
}

/**
 * Intenta adquirir el lock de respuesta. Retorna `true` si lo adquirió.
 * Node.js es single-threaded en su event loop: este check-and-set es
 * efectivamente atómico mientras viva dentro de un mismo tick.
 */
function tryAcquireResponseLock(rut) {
  const m = state.currentMatch;
  if (!m) return false;
  if (m.responseLock) return false;
  if (!m.participants.includes(rut)) return false;
  if (m.wrongAnswerers.has(rut))     return false; // ya falló previamente
  m.responseLock = true;
  m.resolvedBy   = rut;
  return true;
}

/**
 * Lock por timeout/forfeit/doble fallo. Lo adquiere el "sistema" (no un jugador).
 * Si ya estaba tomado por una respuesta válida, retorna false.
 */
function tryAcquireSystemLock() {
  const m = state.currentMatch;
  if (!m) return false;
  if (m.responseLock) return false;
  m.responseLock = true;
  m.resolvedBy   = null;
  return true;
}

/**
 * Ejecuta la resolución después de adquirir el lock.
 *   - winnerRut: rut del ganador, o null si no hubo (timeout / doble KO / forfeit sin sobreviviente).
 *   - resultado: "WINNER" | "TIMEOUT_DOUBLE_KO"
 */
function resolveCurrentMatch({ winnerRut, responseTimeMs, resultado }) {
  const m = state.currentMatch;
  if (!m) return null;

  const [a, b] = m.participantsFull;
  let winner = null;
  let loser  = null;

  if (winnerRut) {
    winner = a.rut === winnerRut ? a : b;
    loser  = a.rut === winnerRut ? b : a;
  }

  // Aplicar al estado de la "Hill"
  if (winner) {
    if (state.hill && state.hill.rut === winner.rut) {
      state.hill.streak += 1;
    } else {
      state.hill = { rut: winner.rut, nombre: winner.nombre, streak: 1 };
    }
    // Eliminar al perdedor: queda fuera hasta reset / coronación.
    if (loser) {
      state.eliminated.set(loser.rut, { rut: loser.rut, nombre: loser.nombre, at: Date.now() });
    }
  } else {
    // Sin ganador → ambos eliminados, colina vacía.
    state.hill = null;
    if (a) state.eliminated.set(a.rut, { rut: a.rut, nombre: a.nombre, at: Date.now() });
    if (b) state.eliminated.set(b.rut, { rut: b.rut, nombre: b.nombre, at: Date.now() });
  }

  const wasKingCrowned = state.hill && state.hill.streak >= KING_THRESHOLD;
  if (wasKingCrowned) {
    state.king = { rut: state.hill.rut, nombre: state.hill.nombre };
    // Coronación: limpiamos eliminados para que la próxima sesión empiece fresca.
    state.eliminated.clear();
  }

  const finalResultado = resultado || (winner ? "WINNER" : "TIMEOUT_DOUBLE_KO");

  const resultDescriptor = {
    matchId:        m.matchId,
    categoria:      m.categoria,
    question:       m.question,
    participants:   m.participantsFull,
    winner,
    loser,
    responseTimeMs: winner ? responseTimeMs : null,
    resultado:      finalResultado,
    kingCrowned:    wasKingCrowned ? state.king : null,
  };

  state.phase = wasKingCrowned ? PHASES.KING_CROWNED : PHASES.RESOLUTION;
  state.history.unshift({
    matchId:    m.matchId,
    categoria:  m.categoria,
    ganador:    winner ? winner.nombre : null,
    resultado:  finalResultado,
    at:         Date.now(),
  });
  state.history = state.history.slice(0, 20);

  return resultDescriptor;
}

function clearCurrentMatch() {
  state.currentMatch = null;
  state.pendingMatch = null;
  state.phase = PHASES.QUEUE;
}

/** Limpia un coronamiento y vuelve a queue (la colina se vacía con el rey). */
function dethroneKing() {
  state.hill = null;
  state.currentMatch = null;
  state.pendingMatch = null;
  state.phase = PHASES.QUEUE;
}

module.exports = {
  // lecturas
  getState,
  getPublicSnapshot,
  isPlayerActive,
  isCurrentParticipant,
  isEliminated,
  hasAlreadyAnswered,
  // queue
  enqueuePlayer,
  removePlayer,
  clearEliminated,
  // transiciones
  transitionToSelection,
  attachQuestionToPending,
  commitQuestion,
  recordWrongAnswer,
  tryAcquireResponseLock,
  tryAcquireSystemLock,
  resolveCurrentMatch,
  clearCurrentMatch,
  dethroneKing,
  reset,
  // constantes
  ENQUEUE_REASONS,
};
