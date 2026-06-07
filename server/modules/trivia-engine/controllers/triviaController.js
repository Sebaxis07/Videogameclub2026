"use strict";

/**
 * triviaController.js — Orquestador del Game Loop
 * =================================================
 * Aquí vive TODO lo que tiene efectos secundarios:
 *   - setTimeout del cronómetro de 15s
 *   - emisión de eventos por Socket.io
 *   - persistencia en Mongo vía matchService
 *
 * El estado vive en stateMachine.js. Este archivo es la "máquina de eventos"
 * que aplica transiciones y notifica.
 *
 * Flujo (TODO bajo control manual del admin):
 *   QUEUE → admin "start"  → SELECTION (sortea participantes + categoría)
 *   SELECTION → admin "reveal" → QUESTION_PHASE (timer arranca)
 *   QUESTION → respuesta correcta / timeout / doble fallo → RESOLUTION
 *   RESOLUTION → admin "next" (o coronación) → QUEUE
 *
 * Anti-cheat:
 *   - El reloj SIEMPRE se mide desde Date.now() del server.
 *   - El cliente NO envía timestamps.
 *   - Una respuesta incorrecta bloquea al jugador para ese match.
 */

const Jugador          = require("../../../models/Jugador");
const stateMachine     = require("../services/stateMachine");
const questionService  = require("../services/questionService");
const matchService     = require("../services/matchService");
const votingHandler    = require("../../../sockets/votingHandler");
const {
  QUESTION_TIMER_MS,
  RESOLUTION_LINGER_MS,
  MIN_PLAYERS_TO_START,
  PHASES,
  SOCKET_ROOM,
  EVENT_PREFIX,
} = require("../config");

let io = null;
let questionTimeoutHandle  = null;
let resolutionLingerHandle = null;
let tickIntervalHandle     = null;
const usedQuestionIds = new Set();

const ev = (name) => `${EVENT_PREFIX}:${name}`;

// ─── Setup ───────────────────────────────────────────────────────────────────

function bind(ioInstance) {
  io = ioInstance;
}

// ─── Helpers de emisión ──────────────────────────────────────────────────────

function emitState() {
  if (!io) return;
  io.to(SOCKET_ROOM).emit(ev("state"), stateMachine.getPublicSnapshot());
}

function emitTick(remainingMs) {
  if (!io) return;
  io.to(SOCKET_ROOM).emit(ev("tick"), { remainingMs });
}

function clearAllMatchTimers() {
  if (questionTimeoutHandle) { clearTimeout(questionTimeoutHandle); questionTimeoutHandle = null; }
  if (tickIntervalHandle)    { clearInterval(tickIntervalHandle);   tickIntervalHandle = null; }
}

// ─── Game Loop ───────────────────────────────────────────────────────────────

/**
 * SELECTION manual: el admin la dispara. Sortea participantes + categoría +
 * pregunta y deja el match en estado pendiente esperando "reveal".
 */
async function prepareNextMatch() {
  const s = stateMachine.getState();
  if (s.currentMatch || s.pendingMatch) {
    return { ok: false, reason: "MATCH_ALREADY_PREPARING" };
  }

  const queueSize = s.queue.length + (s.hill ? 1 : 0);
  if (queueSize < MIN_PLAYERS_TO_START) {
    emitState();
    return { ok: false, reason: "NOT_ENOUGH_PLAYERS" };
  }

  const participants = stateMachine.transitionToSelection();
  if (!participants) {
    emitState();
    return { ok: false, reason: "NOT_ENOUGH_PLAYERS" };
  }

  // Categoría: si hay votación con top3, la priorizamos; si no, aleatoria.
  let categoria = questionService.pickRandomCategory();
  try {
    const votingState = votingHandler.getState();
    const top3 = (votingState && votingState.top3) || [];
    if (top3.length > 0) {
      const cats = questionService.getBankSummary().categoriasDisponibles;
      const validTop3 = top3.filter(g => cats.some(c => c.toLowerCase() === String(g).toLowerCase()));
      if (validTop3.length > 0) {
        categoria = validTop3[Math.floor(Math.random() * validTop3.length)];
      }
    }
  } catch {/* ignore */}

  const question = questionService.pickQuestion(categoria, usedQuestionIds);
  if (!question) {
    console.warn(`[PixelQuiz] Banco vacío para "${categoria}". Reset de usados.`);
    usedQuestionIds.clear();
    stateMachine.clearCurrentMatch();
    emitState();
    return { ok: false, reason: "EMPTY_BANK" };
  }
  usedQuestionIds.add(question.id);

  stateMachine.attachQuestionToPending({ categoria, question });

  io.to(SOCKET_ROOM).emit(ev("selection"), {
    matchId:      stateMachine.getState().pendingMatch.matchId,
    participants: participants.map(p => ({ rut: p.rut, nombre: p.nombre })),
    categoria,
    awaitingReveal: true,
  });
  emitState();
  return { ok: true };
}

/**
 * El admin pulsa "Activar pregunta": promovemos pendingMatch → currentMatch
 * y arrancamos el timer.
 */
function revealQuestion() {
  const s = stateMachine.getState();
  if (s.phase !== PHASES.SELECTION || !s.pendingMatch) {
    return { ok: false, reason: "NOT_IN_SELECTION" };
  }
  if (!s.pendingMatch.question) {
    return { ok: false, reason: "NO_QUESTION_LOADED" };
  }

  const match = stateMachine.commitQuestion();
  if (!match) return { ok: false, reason: "COMMIT_FAILED" };

  io.to(SOCKET_ROOM).emit(ev("question"), {
    matchId:      match.matchId,
    categoria:    match.categoria,
    participants: match.participants,
    question: {
      id:        match.question.id,
      pregunta:  match.question.pregunta,
      opciones:  match.question.opciones,
      categoria: match.question.categoria,
    },
    durationMs: QUESTION_TIMER_MS,
    startedAt:  match.startedAt,
  });
  emitState();

  scheduleTimeout(match.matchId);
  scheduleTickLoop(match.matchId);
  scheduleBotResponses(match);

  return { ok: true };
}

/**
 * Los bots "piensan" y responden con un retraso humanoide.
 */
function scheduleBotResponses(match) {
  const bots = match.participants.filter(rut => String(rut).startsWith("BOT-"));
  bots.forEach(botRut => {
    const delay = Math.floor(Math.random() * 9500) + 3500;
    setTimeout(async () => {
      const s = stateMachine.getState();
      if (!s.currentMatch || s.currentMatch.matchId !== match.matchId) return;
      if (s.phase !== PHASES.QUESTION) return;

      const isCorrect = Math.random() < 0.75;
      let answerIndex;
      if (isCorrect) {
        answerIndex = match.question.respuesta_correcta;
      } else {
        const incorrects = match.question.opciones
          .map((_, i) => i)
          .filter(i => i !== match.question.respuesta_correcta);
        answerIndex = incorrects.length > 0
          ? incorrects[Math.floor(Math.random() * incorrects.length)]
          : match.question.respuesta_correcta;
      }
      await submitAnswer({ rut: botRut, matchId: match.matchId, answerIndex });
    }, delay);
  });
}

function scheduleTimeout(matchId) {
  clearTimeout(questionTimeoutHandle);
  questionTimeoutHandle = setTimeout(() => handleTimeout(matchId), QUESTION_TIMER_MS);
}

function scheduleTickLoop(matchId) {
  clearInterval(tickIntervalHandle);
  tickIntervalHandle = setInterval(() => {
    const s = stateMachine.getState();
    if (!s.currentMatch || s.currentMatch.matchId !== matchId || s.phase !== PHASES.QUESTION) {
      clearInterval(tickIntervalHandle);
      tickIntervalHandle = null;
      return;
    }
    const remaining = Math.max(0, QUESTION_TIMER_MS - (Date.now() - s.currentMatch.startedAt));
    emitTick(remaining);
    if (remaining <= 0) {
      clearInterval(tickIntervalHandle);
      tickIntervalHandle = null;
    }
  }, 1000);
}

// ─── Resolución ──────────────────────────────────────────────────────────────

async function submitAnswer({ rut, matchId, answerIndex }) {
  const s = stateMachine.getState();
  if (!s.currentMatch || s.phase !== PHASES.QUESTION) {
    return { ok: false, reason: "NO_ACTIVE_MATCH" };
  }
  if (s.currentMatch.matchId !== matchId) {
    return { ok: false, reason: "STALE_MATCH" };
  }
  if (!s.currentMatch.participants.includes(rut)) {
    return { ok: false, reason: "NOT_A_PARTICIPANT" };
  }
  if (stateMachine.hasAlreadyAnswered(rut)) {
    return { ok: false, reason: "ALREADY_ANSWERED" };
  }

  const responseTimeMs = Date.now() - s.currentMatch.startedAt;
  if (responseTimeMs > QUESTION_TIMER_MS) {
    return { ok: false, reason: "TIMEOUT" };
  }

  const correctIndex = s.currentMatch.question.respuesta_correcta;
  const isCorrect    = Number(answerIndex) === Number(correctIndex);

  if (!isCorrect) {
    const { allWrong } = stateMachine.recordWrongAnswer(rut);
    io.to(SOCKET_ROOM).emit(ev("wrongAnswer"), { rut, responseTimeMs });

    if (allWrong) {
      // Todos fallaron → cerramos el match como doble KO inmediato.
      const acquired = stateMachine.tryAcquireSystemLock();
      if (acquired) {
        clearAllMatchTimers();
        await finalizeMatch({ winnerRut: null, responseTimeMs: null, resultado: "TIMEOUT_DOUBLE_KO" });
      }
    }
    return { ok: true, correct: false, responseTimeMs, locked: true };
  }

  // Correcta → adquirir lock atómicamente.
  const acquired = stateMachine.tryAcquireResponseLock(rut);
  if (!acquired) {
    return { ok: false, reason: "LOCK_TAKEN" };
  }

  clearAllMatchTimers();
  await finalizeMatch({ winnerRut: rut, responseTimeMs, resultado: "WINNER" });
  return { ok: true, correct: true, responseTimeMs };
}

function handleTimeout(matchId) {
  const s = stateMachine.getState();
  if (!s.currentMatch || s.currentMatch.matchId !== matchId) return;

  const acquired = stateMachine.tryAcquireSystemLock();
  if (!acquired) return;

  clearAllMatchTimers();
  finalizeMatch({ winnerRut: null, responseTimeMs: null, resultado: "TIMEOUT_DOUBLE_KO" });
}

/**
 * Forfeit: un participante se desconectó / abandonó. El otro gana
 * automáticamente (si existe y no había fallado ya).
 */
function forfeitParticipant(rut) {
  const s = stateMachine.getState();
  if (!s.currentMatch) return;
  if (!s.currentMatch.participants.includes(rut)) return;

  const acquired = stateMachine.tryAcquireSystemLock();
  if (!acquired) return;
  clearAllMatchTimers();

  const opponent = s.currentMatch.participantsFull.find(p => p.rut !== rut);
  // Si el oponente ya había fallado, no puede ganar por forfeit → doble KO.
  const opponentAlreadyWrong = opponent && s.currentMatch.wrongAnswerers.has(opponent.rut);
  if (opponent && !opponentAlreadyWrong) {
    finalizeMatch({ winnerRut: opponent.rut, responseTimeMs: null, resultado: "WINNER" });
  } else {
    finalizeMatch({ winnerRut: null, responseTimeMs: null, resultado: "TIMEOUT_DOUBLE_KO" });
  }
}

async function finalizeMatch({ winnerRut, responseTimeMs, resultado }) {
  const result = stateMachine.resolveCurrentMatch({ winnerRut, responseTimeMs, resultado });
  if (!result) return;

  matchService.saveMatch({
    matchId:   result.matchId,
    participantes: result.participants.map(p => ({ rut: p.rut, nombre: p.nombre })),
    categoria: result.categoria,
    pregunta: {
      id:                 result.question.id,
      texto:              result.question.pregunta,
      opciones:           result.question.opciones,
      respuesta_correcta: result.question.respuesta_correcta,
    },
    ganador_rut:       result.winner ? result.winner.rut : null,
    tiempoRespuestaMs: result.responseTimeMs,
    resultado:         result.resultado,
  });

  io.to(SOCKET_ROOM).emit(ev("resolution"), {
    matchId:        result.matchId,
    categoria:      result.categoria,
    resultado:      result.resultado,
    winner:         result.winner,
    loser:          result.loser,
    correctIndex:   result.question.respuesta_correcta,
    responseTimeMs: result.responseTimeMs,
    kingCrowned:    result.kingCrowned,
    question: {
      id:       result.question.id,
      pregunta: result.question.pregunta,
      opciones: result.question.opciones,
    },
  });
  emitState();

  if (result.kingCrowned) {
    io.to(SOCKET_ROOM).emit(ev("kingCrowned"), result.kingCrowned);
  }

  // Pausa breve para que la UI muestre la resolución; LUEGO volvemos a QUEUE
  // y esperamos al admin (no auto-arrancamos el siguiente match).
  clearTimeout(resolutionLingerHandle);
  resolutionLingerHandle = setTimeout(() => {
    if (result.kingCrowned) stateMachine.dethroneKing();
    else                    stateMachine.clearCurrentMatch();
    emitState();
  }, RESOLUTION_LINGER_MS);
}

// ─── Operaciones de cola (llamadas desde sockets/REST) ──────────────────────

async function joinQueue({ rut, nombre }) {
  if (!rut) return { ok: false, reason: "MISSING_RUT" };

  let canonicalName = nombre || rut;
  try {
    const jugador = await Jugador.findOne({ rut }).lean();
    if (jugador && jugador.nombre) canonicalName = jugador.nombre;
  } catch {
    // BD no disponible: no bloqueamos al jugador.
  }

  const result = stateMachine.enqueuePlayer({ rut, nombre: canonicalName });
  if (!result.ok) return result;

  emitState();
  // YA NO se auto-arranca el match. El admin debe iniciarlo.
  return { ok: true };
}

function leaveQueue({ rut }) {
  if (!rut) return { ok: false, reason: "MISSING_RUT" };
  const result = stateMachine.removePlayer(rut);
  if (result.wasInActiveMatch) {
    return { ok: false, reason: "IN_ACTIVE_MATCH" };
  }
  emitState();
  return { ok: true };
}

function resetArena() {
  clearAllMatchTimers();
  clearTimeout(resolutionLingerHandle);
  resolutionLingerHandle = null;
  usedQuestionIds.clear();
  stateMachine.reset();
  emitState();
}

function clearEliminated() {
  stateMachine.clearEliminated();
  emitState();
}

async function addBot() {
  const botNum = Math.floor(Math.random() * 900) + 100;
  const botRut = `BOT-${botNum}`;
  const botNames = ["Mario", "Link", "Zelda", "Samus", "Kirby", "Cloud", "Sora", "Master Chief"];
  const botName = `${botNames[Math.floor(Math.random() * botNames.length)]} (Bot)`;

  const r = await joinQueue({ rut: botRut, nombre: botName });
  return { ok: r.ok, reason: r.reason || null, botName };
}

function skipMatch() {
  const s = stateMachine.getState();
  if (s.currentMatch) {
    handleTimeout(s.currentMatch.matchId);
    return { ok: true };
  }
  if (s.pendingMatch) {
    // Cancelar selección sin pregunta revelada
    clearAllMatchTimers();
    stateMachine.clearCurrentMatch();
    emitState();
    return { ok: true };
  }
  return { ok: false, reason: "NOTHING_TO_SKIP" };
}

module.exports = {
  bind,
  prepareNextMatch,
  revealQuestion,
  submitAnswer,
  forfeitParticipant,
  joinQueue,
  leaveQueue,
  resetArena,
  clearEliminated,
  addBot,
  skipMatch,
};
