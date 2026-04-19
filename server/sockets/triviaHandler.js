/**
 * triviaHandler.js
 * =================
 * Arena de Trivia en Tiempo Real
 *
 * Gestiona el estado de la partida, scoring server-side, matchmaking de facciones
 * y los 3 comodines: 50/50, Flashbang, Doble o Nada.
 *
 * Fórmula de puntos:
 *   Puntos = floor( (P_base + (P_max * T_restante / T_total)) * M_categoria )
 *   P_base = 500, P_max = 500, T_total = 15000 ms
 *   M = 1.5 si (Competitiva || Matematicas), else 1.0
 *
 * Matchmaking:
 *   Dúos (2 jugadores por facción) → puntaje = suma individual
 *   Lobo Solitario (1 jugador impar) → puntaje = individual × 2
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { getJudgeChatResponse } = require("../services/groqService");

// ─── Constantes de Scoring ────────────────────────────────────────────────────
const P_BASE   = 500;
const P_MAX    = 500;
const T_TOTAL  = 15000; // ms

// ─── Banco de Preguntas ───────────────────────────────────────────────────────
function loadQuestions() {
  const filePath = path.join(__dirname, "../data/trivia_questions.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ─── Estado Global de la Partida ──────────────────────────────────────────────
function createInitialState() {
  return {
    status: "idle",          // idle | lobby | question | reviewing | finished
    deck: [],                // preguntas barajadas
    currentQuestionIndex: -1,
    currentQuestion: null,   // { ...question, startedAt: timestamp }
    answers: {},             // { rut: { correct, pointsEarned, timestamp, wildcardUsed } }
    players: {},             // { rut: { nombre, socketId, score, wildcards, factionId } }
    factions: {},            // { factionId: { members: [rut], score, isLoner } }
    nextFactionId: 1,
    isInterrupted: false,    // Estado de pausa anti-trampa
    isPaused: false,         // Estado de pausa técnica (profesor)
    pausedAt: null,
    disqualifiedPlayers: new Set(), // Set of RUTs
  };
}

let state = createInitialState();
let ioInstance = null;
let gameLoopTimer = null;

function stopGameLoop() {
  if (gameLoopTimer) {
    clearInterval(gameLoopTimer);
    gameLoopTimer = null;
  }
}

function processGameLoop() {
  if (!ioInstance) return;
  if (state.isInterrupted || state.isPaused) return;

  if (state.status === "question") {
    if (!state.currentQuestion || !state.currentQuestion.startedAt) return;
    const elapsed = Date.now() - state.currentQuestion.startedAt;
    const t_remaining = Math.max(0, T_TOTAL - elapsed);

    if (t_remaining <= 0) {
      state.status = "reviewing";
      state.reviewStartedAt = Date.now();
      
      const q = state.deck[state.currentQuestionIndex];
      const tipo = q.tipo_pregunta || "alternativas";
      const correctAnswerPayload = {
        tipo_pregunta:      tipo,
        respuesta_correcta: q.respuesta_correcta,
        respuesta_texto:    q.respuesta_texto   || null,
        orden_correcto:     q.orden_correcto    || null,
        respuesta_numero:   q.respuesta_numero  || null,
        opciones:           q.opciones          || [],
      };

      ioInstance.to("triviaRoom").emit("question:timeout", {
        correctAnswer: correctAnswerPayload,
        correctIndex: q.respuesta_correcta
      });
      broadcastAdminSnapshot();
      console.log(`[Trivia] Tiempo activo finalizado. Fase de Descanso (5s).`);
    }
  } else if (state.status === "reviewing") {
    if (!state.reviewStartedAt) return;
    const elapsed = Date.now() - state.reviewStartedAt;
    if (elapsed >= 5000) { 
      startNextQuestion();
    }
  }
}

function startGameLoop() {
  stopGameLoop();
  gameLoopTimer = setInterval(processGameLoop, 1000);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Baraja un array (Fisher-Yates) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Valida la respuesta del estudiante según el tipo de pregunta.
 * 
 * @param {object} question  - Pregunta actual (con campo tipo_pregunta)
 * @param {any}    answer    - Respuesta enviada por el estudiante
 * @returns {boolean}
 */
function checkAnswer(question, answer) {
  const tipo = question.tipo_pregunta || "alternativas";

  switch (tipo) {
    case "alternativas":
    case "verdadero_falso":
      // answer debe ser el índice numérico de la opción
      return Number(answer) === Number(question.respuesta_correcta);

    case "texto_libre": {
      // Comparación insensible a mayúsculas y espacios extra
      if (!question.respuesta_texto || answer == null) return false;
      const normalize = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
      return normalize(answer) === normalize(question.respuesta_texto);
    }

    case "ordenamiento": {
      // answer debe ser un array de índices representando el orden elegido
      if (!Array.isArray(answer) || !Array.isArray(question.orden_correcto)) return false;
      if (answer.length !== question.orden_correcto.length) return false;
      return answer.every((v, i) => Number(v) === Number(question.orden_correcto[i]));
    }

    case "rango_numerico": {
      // answer debe ser un número; se acepta dentro del tolerancia del ±10% del rango
      const num = Number(answer);
      const correct = Number(question.respuesta_numero);
      const rango = Number(question.rango_max) - Number(question.rango_min);
      const tolerancia = rango * 0.10; // 10% del rango total
      return Math.abs(num - correct) <= tolerancia;
    }

    default:
      return Number(answer) === Number(question.respuesta_correcta);
  }
}



/** Calcula M_categoria */
function getMultiplier(question) {
  return question.tipo_dificultad === "Competitiva" ||
         question.categoria === "Matematicas"
    ? 1.5
    : 1.0;
}

/** Calcula puntaje con la fórmula exacta */
function calcScore(question, receivedAt) {
  const startedAt    = state.currentQuestion?.startedAt || receivedAt;
  const elapsed      = receivedAt - startedAt;
  const t_remaining  = Math.max(0, T_TOTAL - elapsed);
  const M            = getMultiplier(question);
  return Math.floor((P_BASE + P_MAX * (t_remaining / T_TOTAL)) * M);
}

/** Emite el ranking de facciones (estado de puntajes) */
function broadcastFactionRanking() {
  const ranking = Object.entries(state.factions)
    .map(([id, f]) => ({
      factionId: id,
      isLoner:   f.isLoner,
      members:   f.members.map(rut => ({
        rut,
        nombre: state.players[rut]?.nombre || rut,
        score:  state.players[rut]?.score  || 0,
      })),
      factionScore: f.score,
    }))
    .sort((a, b) => b.factionScore - a.factionScore);

  ioInstance.to("triviaRoom").emit("trivia:ranking", ranking);
}

/** Asigna una facción al jugador que acaba de unirse */
function assignFaction(rut) {
  // Juego individual (Todos contra Todos)
  const factionId = `F${state.nextFactionId++}`;
  state.factions[factionId] = { members: [rut], score: 0, isLoner: false };
  state.players[rut].factionId = factionId;
}

/** Suma puntos al jugador y su facción */
function addPointsToPlayer(rut, basePoints) {
  const player  = state.players[rut];
  if (!player) return;

  player.score += basePoints;

  const faction = state.factions[player.factionId];
  if (!faction) return;

  faction.score = Math.max(0, faction.score + basePoints);
}

/** Resta puntos a una facción (Doble o Nada fallido) */
function subtractFromFaction(rut, amount) {
  const player  = state.players[rut];
  if (!player) return;
  const faction = state.factions[player.factionId];
  if (!faction) return;
  faction.score = Math.max(0, faction.score - amount);
}

/** Construye el snapshot de estado resumido para el admin */
function buildAdminSnapshot() {
  const deckLength = state.deck ? state.deck.length : 0;
  return {
    status:               state.status,
    isPaused:             state.isPaused,
    currentQuestionIndex: state.currentQuestionIndex,
    totalQuestions:       deckLength,
    currentQuestion:      state.currentQuestion
      ? {
          id:              state.currentQuestion.id,
          pregunta:        state.currentQuestion.pregunta,
          opciones:        state.currentQuestion.opciones,
          respuesta_correcta: state.currentQuestion.respuesta_correcta,
          categoria:       state.currentQuestion.categoria,
          tipo_dificultad: state.currentQuestion.tipo_dificultad,
        }
      : null,
    answeredCount: Object.keys(state.answers).length,
    playerCount:   Object.keys(state.players).length,
    players:       state.players,
  };
}

// ─── Handler Principal ────────────────────────────────────────────────────────

/** Ayudante: Emitir snapshot a todos los admins */
function broadcastAdminSnapshot() {
  if (!ioInstance) return;
  const snapshot = buildAdminSnapshot();
  const adminSockets = [...ioInstance.sockets.sockets.values()].filter(
    s => s.handshake.query.role === "admin"
  );
  adminSockets.forEach(s => s.emit("admin:trivia:snapshot", snapshot));
}

/** Ejecuta el paso a la siguiente pregunta */
function startNextQuestion() {
  state.currentQuestionIndex++;

  if (state.currentQuestionIndex >= state.deck.length) {
    // ── Fin de la ronda ───────────────────────────────────────────
    state.status = "finished";
    stopGameLoop();
    const finalRanking = Object.entries(state.factions)
      .map(([id, f]) => ({
        factionId: id,
        isLoner:   f.isLoner,
        members:   f.members.map(rut => ({
          rut,
          nombre: state.players[rut]?.nombre || rut,
          score:  state.players[rut]?.score  || 0,
        })),
        factionScore: f.score,
      }))
      .sort((a, b) => b.factionScore - a.factionScore);

    ioInstance.to("triviaRoom").emit("trivia:finished", finalRanking);
    broadcastAdminSnapshot();
    console.log("[Trivia] Partida finalizada.");
    return;
  }

  // ── Preparar pregunta ────────────────────────────────────────────
  state.answers = {};
  state.status  = "question";
  const q = state.deck[state.currentQuestionIndex];
  state.currentQuestion = { ...q, startedAt: Date.now() };

  // Solo enviamos al estudiante sin la respuesta correcta
  const studentPayload = {
    id:              q.id,
    pregunta:        q.pregunta,
    tipo_pregunta:   q.tipo_pregunta   || "alternativas",
    opciones:        q.opciones        || [],
    // Para rango numérico enviamos el rango (pero no la respuesta)
    rango_min:       q.rango_min       !== undefined ? q.rango_min : null,
    rango_max:       q.rango_max       !== undefined ? q.rango_max : null,
    // Para texto libre enviamos las pistas si existen
    pistas:          q.pistas          || null,
    categoria:       q.categoria,
    tipo_dificultad: q.tipo_dificultad,
    questionNumber:  state.currentQuestionIndex + 1,
    totalQuestions:  state.deck.length,
  };

  ioInstance.to("triviaRoom").emit("question:new", studentPayload);
  broadcastAdminSnapshot();
  console.log(`[Trivia] Pregunta ${state.currentQuestionIndex + 1} (${q.tipo_pregunta || "alternativas"}) enviada: "${q.pregunta.slice(0, 50)}..."`);
}

module.exports = function (io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    const role = socket.handshake.query.role || "student";

    // ══════════════════════════════════════════════════════════════════

    /** Iniciar partida desde lobby */
    socket.on("admin:trivia:start", () => {
      if (role !== "admin") return;
      
      const allQuestions = loadQuestions();
      state.deck = shuffle(allQuestions);
      state.currentQuestionIndex = -1;
      state.answers = {};
      state.status  = "lobby";
      // Resetear puntajes de jugadores existentes
      Object.values(state.players).forEach(p => { p.score = 0; });
      Object.values(state.factions).forEach(f => { f.score = 0; });

      io.to("triviaRoom").emit("trivia:gameStarted");
      socket.emit("admin:trivia:snapshot", buildAdminSnapshot());
      console.log("[Trivia] Partida iniciada. Mazo de " + state.deck.length + " preguntas.");
    });

    /** Admin avanza a la siguiente pregunta */
    socket.on("question:start", () => {
      if (role !== "admin") return;
      if (state.status === "lobby") startGameLoop();
      startNextQuestion();
    });
    /** Admin resetea la partida completa */
    socket.on("admin:trivia:reset", () => {
      if (role !== "admin") return;
      stopGameLoop();
      state = createInitialState();
      io.to("triviaRoom").emit("trivia:reset");
      io.to("triviaRoom").emit("admin:trivia:disqualifiedList", []);
      socket.emit("admin:trivia:snapshot", buildAdminSnapshot());
      console.log("[Trivia] Estado reseteado por el admin.");
    });

    /** Admin reanuda la partida tras una interrupción */
    socket.on("admin:trivia:resume", () => {
      if (role !== "admin") return;
      state.isInterrupted = false;
      io.to("triviaRoom").emit("trivia:resumed");
      broadcastAdminSnapshot();
      console.log("[Trivia] Partida reanudada por el admin.");
    });

    /** Admin pausa o reanuda un congelamiento de tiempo técnico */
    socket.on("admin:trivia:togglePause", () => {
      if (role !== "admin") return;
      if (state.status !== "question") return;

      if (!state.isPaused) {
        state.isPaused = true;
        state.pausedAt = Date.now();
        io.to("triviaRoom").emit("trivia:gamePaused");
        console.log("[Trivia] Tiempo CONGELADO por el admin.");
      } else {
        const timePausedMs = Date.now() - state.pausedAt;
        state.isPaused = false;
        state.pausedAt = null;
        if (state.currentQuestion && state.status === "question") {
          state.currentQuestion.startedAt += timePausedMs;
        } else if (state.status === "reviewing") {
          state.reviewStartedAt += timePausedMs;
        }
        
        let timeRemainingMs = 0;
        if (state.status === "question" && state.currentQuestion) {
          const elapsed = Date.now() - state.currentQuestion.startedAt;
          timeRemainingMs = Math.max(0, T_TOTAL - elapsed);
        } else if (state.status === "reviewing") {
          const elapsed = Date.now() - state.reviewStartedAt;
          timeRemainingMs = Math.max(0, 5000 - elapsed);
        }
        
        io.to("triviaRoom").emit("trivia:timeResumed", { timeRemainingMs });
        console.log(`[Trivia] Tiempo REANUDADO. Compensado ${timePausedMs}ms.`);
      }
      broadcastAdminSnapshot();
    });

    /** Admin solicita snapshot actualizado */
    socket.on("admin:trivia:getSnapshot", () => {
      if (role !== "admin") return;
      socket.emit("admin:trivia:snapshot", buildAdminSnapshot());
    });

    // ══════════════════════════════════════════════════════════════════
    // STUDENT EVENTS
    // ══════════════════════════════════════════════════════════════════

    /** Estudiante entra a la sala de trivia */
    socket.on("trivia:join", ({ rut, nombre }) => {
      if (!rut) return;

      socket.join("triviaRoom");

      if (!state.players[rut]) {
        // Late Joiner Catch-Up: Iguala al jugador con el menor score
        let startingScore = 0;
        if (state.status !== "idle" && state.status !== "lobby") {
          const scores = Object.values(state.players).map(p => p.score);
          if (scores.length > 0) startingScore = Math.min(...scores);
        }

        state.players[rut] = {
          nombre:    nombre || rut,
          socketId:  socket.id,
          score:     startingScore,
          consecutiveFails: 0,
          wildcards: ["5050", "flashbang", "doublenada"],
          factionId: null,
        };
        assignFaction(rut);
        const faction = state.factions[state.players[rut].factionId];
        if (faction) faction.score = startingScore;
      } else {
        // Reconexión: actualizar socketId
        state.players[rut].socketId = socket.id;
      }

      // Enviar estado inicial al jugador
      socket.emit("trivia:joined", {
        rut,
        wildcards:  state.players[rut].wildcards,
        factionId:  state.players[rut].factionId,
        isLoner:    state.factions[state.players[rut].factionId]?.isLoner || false,
        playerCount: Object.keys(state.players).length,
        status:     state.status,
      });

      // Avisar a la sala cuántos jugadores hay y su lista
      io.to("triviaRoom").emit("trivia:playerCount", Object.keys(state.players).length);
      
      const lobbyPlayers = Object.values(state.players).map(p => ({ rut: Object.keys(state.players).find(key => state.players[key] === p), nombre: p.nombre }));
      io.to("triviaRoom").emit("trivia:lobbyPlayers", lobbyPlayers);

      broadcastFactionRanking();
      broadcastAdminSnapshot();
      console.log(`[Trivia] Jugador "${nombre}" (${rut}) unido. Total: ${Object.keys(state.players).length}`);
    });

    /**
     * Estudiante envía su respuesta.
     * El campo `answer` es genérico:
     *   - alternativas / verdadero_falso : índice numérico
     *   - texto_libre                    : string con la respuesta
     *   - ordenamiento                   : array de índices
     *   - rango_numerico                 : número
     */
    socket.on("question:answer", ({ rut, answer, answerIndex, wildcardFlag }) => {
      // Bloquear si está descalificado
      if (state.disqualifiedPlayers.has(rut)) {
        return socket.emit("trivia:error", "Tu participación ha sido revocada por el administrador.");
      }

      if (state.status !== "question") return;
      if (state.isInterrupted) return; // No permitir respuestas si está interrumpido
      if (!state.players[rut]) return;
      if (state.answers[rut]) return; // ya respondió

      const receivedAt = Date.now();
      const question   = state.currentQuestion;
      if (!question) return;

      // Soporte hacia atrás: si viene answerIndex (clientes viejos) úsalo como answer
      const resolvedAnswer = answer !== undefined ? answer : answerIndex;

      const isCorrect = checkAnswer(question, resolvedAnswer);
      const player = state.players[rut];
      let points = 0;
      let multiplierApplied = 1.0;

      if (isCorrect) {
        if (player.consecutiveFails === 1) multiplierApplied = 1.1;
        else if (player.consecutiveFails === 2) multiplierApplied = 1.25;
        else if (player.consecutiveFails === 3) multiplierApplied = 1.5;
        else if (player.consecutiveFails >= 4) multiplierApplied = 2.0;

        points = Math.floor(calcScore(question, receivedAt) * multiplierApplied);
        player.consecutiveFails = 0;
      } else {
        player.consecutiveFails = (player.consecutiveFails || 0) + 1;
      }

      // ── Doble o Nada ──────────────────────────────────────────────────
      const isDoubleOrNothing = wildcardFlag === "doublenada";
      if (isDoubleOrNothing) {
        if (isCorrect) {
          points = points * 2;
        } else {
          subtractFromFaction(rut, P_BASE);
          broadcastFactionRanking();
        }
      }

      // Registrar respuesta
      state.answers[rut] = {
        correct:      isCorrect,
        pointsEarned: points,
        timestamp:    receivedAt,
        wildcardUsed: wildcardFlag || null,
      };

      // Acumular puntos si acertó
      if (isCorrect && points > 0) {
        addPointsToPlayer(rut, points);
        broadcastFactionRanking();
      }

      // Construir la respuesta correcta para mostrársela al estudiante
      const tipo = question.tipo_pregunta || "alternativas";
      const correctAnswerPayload = {
        tipo_pregunta:      tipo,
        respuesta_correcta: question.respuesta_correcta,
        respuesta_texto:    question.respuesta_texto   || null,
        orden_correcto:     question.orden_correcto    || null,
        respuesta_numero:   question.respuesta_numero  || null,
        opciones:           question.opciones          || [],
      };

      // Confirmar al jugador
      socket.emit("question:result", {
        correct:           isCorrect,
        correctAnswer:     correctAnswerPayload,
        // Backward-compat:
        correctIndex:      question.respuesta_correcta,
        pointsEarned:      points,
        totalScore:        state.players[rut].score,
        factionScore:      state.factions[state.players[rut].factionId]?.score || 0,
        isDoubleOrNothing,
      });

      // Avisar al admin cuántos ya respondieron
      const adminSockets = [...io.sockets.sockets.values()].filter(
        s => s.handshake.query.role === "admin"
      );
      adminSockets.forEach(s => {
        s.emit("admin:trivia:answerUpdate", {
          answeredCount: Object.keys(state.answers).length,
          playerCount:   Object.keys(state.players).length,
        });
      });

      console.log(`[Trivia] Respuesta de ${rut} (${tipo}): ${isCorrect ? "CORRECTA" : "INCORRECTA"} | +${points} pts`);
    });

    // ─── COMODINES ────────────────────────────────────────────────────────────

    /** 50/50 — Local: elige 2 índices incorrectos para ocultar */
    socket.on("wildcard:5050", ({ rut }) => {
      if (!state.players[rut]) return;
      const player = state.players[rut];

      if (!player.wildcards.includes("5050")) {
        return socket.emit("wildcard:error", "Ya usaste el comodín 50/50.");
      }
      if (state.status !== "question" || !state.currentQuestion) {
        return socket.emit("wildcard:error", "No hay pregunta activa.");
      }
      if (state.currentQuestion.tipo_pregunta !== "alternativas") {
        return socket.emit("wildcard:error", "El comodín 50/50 solo se puede usar en preguntas de alternativas.");
      }

      // Quitar de la lista de disponibles
      player.wildcards = player.wildcards.filter(w => w !== "5050");

      // Elegir 2 índices incorrectos aleatorios
      const correctIdx = state.currentQuestion.respuesta_correcta;
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
      const toHide = shuffle(wrongIndices).slice(0, 2);

      socket.emit("wildcard:5050:result", { hideIndices: toHide });
      socket.emit("trivia:wildcardsUpdate", player.wildcards);
      console.log(`[Trivia] 50/50 usado por ${rut}. Ocultar: [${toHide}]`);
    });

    /** Flashbang — Broadcast a todos excepto el emisor */
    socket.on("wildcard:flashbang", ({ rut }) => {
      if (!state.players[rut]) return;
      const player = state.players[rut];

      if (!player.wildcards.includes("flashbang")) {
        return socket.emit("wildcard:error", "Ya usaste el Flashbang.");
      }
      if (state.status !== "question") {
        return socket.emit("wildcard:error", "No hay pregunta activa.");
      }

      player.wildcards = player.wildcards.filter(w => w !== "flashbang");

      // Retransmitir a toda la sala EXCEPTO el emisor
      socket.to("triviaRoom").emit("wildcard:flashbang:effect");
      socket.emit("wildcard:flashbang:ack");         // confirmación al lanzador
      socket.emit("trivia:wildcardsUpdate", player.wildcards);
      console.log(`[Trivia] Flashbang lanzado por ${rut}.`);
    });

    /** Doble o Nada — Solo lo marca como activo; la lógica real está en question:answer */
    socket.on("wildcard:doublenada", ({ rut }) => {
      if (!state.players[rut]) return;
      const player = state.players[rut];

      if (!player.wildcards.includes("doublenada")) {
        return socket.emit("wildcard:error", "Ya usaste el Doble o Nada.");
      }
      if (state.status !== "question") {
        return socket.emit("wildcard:error", "No hay pregunta activa.");
      }

      player.wildcards = player.wildcards.filter(w => w !== "doublenada");
      socket.emit("wildcard:doublenada:activated");
      socket.emit("trivia:wildcardsUpdate", player.wildcards);
      console.log(`[Trivia] Doble o Nada activado por ${rut}.`);
    });

    /** Detección de trampa: un alumno salió de la pestaña */
    socket.on("trivia:cheatAttempt", ({ rut, nombre }) => {
      if (state.status !== "question" || state.isInterrupted) return;
      
      const player = state.players[rut];
      const cheaterName = player ? player.nombre : (nombre || rut);

      state.isInterrupted = true;

      // 1. Avisar a TODOS que el juego se detuvo (sin nombre)
      io.to("triviaRoom").emit("trivia:gameInterrupted");

      // 2. Avisar a los ADMINS quién fue
      const adminSockets = [...io.sockets.sockets.values()].filter(
        s => s.handshake.query.role === "admin"
      );
      adminSockets.forEach(s => {
        s.emit("admin:trivia:cheatAlert", { 
          rut, 
          nombre: cheaterName,
          timestamp: Date.now()
        });
      });

      broadcastAdminSnapshot();
      console.log(`[Trivia] Trampa detectada: ${cheaterName} (${rut}) salió de la pestaña.`);
    });

    /** Recibir datos de monitoreo en vivo de los alumnos */
    socket.on("trivia:liveUpdate", (data) => {
      // Solo retransmitir si hay una partida en curso o lobby
      if (state.status === "idle") return;

      // Retransmitir solo a los admins
      const adminSockets = [...io.sockets.sockets.values()].filter(
        s => s.handshake.query.role === "admin"
      );
      
      adminSockets.forEach(s => {
        s.emit("admin:trivia:liveDataFeed", {
          ...data,
          socketId: socket.id,
          timestamp: Date.now()
        });
      });
    });

    /** Recibir capturas de pantalla de los alumnos */
    socket.on("trivia:screenFrame", (data) => {
      // Retransmitir solo a los admins
      const adminSockets = [...io.sockets.sockets.values()].filter(
        s => s.handshake.query.role === "admin"
      );
      
      adminSockets.forEach(s => {
        s.emit("admin:trivia:screenFrameFeed", {
          ...data,
          timestamp: Date.now()
        });
      });
    });

    /** Sancionar Alumno (Descalificar) */
    socket.on("admin:trivia:disqualify", ({ rut, nombre }) => {
      state.disqualifiedPlayers.add(rut);
      
      // Notificar a todos los admins del cambio
      io.emit("admin:trivia:disqualifiedList", Array.from(state.disqualifiedPlayers));
      
      // Notificar al alumno afectado
      const studentSocket = [...io.sockets.sockets.values()].find(s => s.handshake.query.rut === rut);
      if (studentSocket) {
        studentSocket.emit("trivia:playerStatus", { disqualified: true });
      }

      console.log(`[Trivia] Alumno descalificado: ${nombre} (${rut})`);
    });

    /** Levantar Sanción (Re-habilitar) */
    socket.on("admin:trivia:undisqualify", ({ rut }) => {
      state.disqualifiedPlayers.delete(rut);
      
      io.emit("admin:trivia:disqualifiedList", Array.from(state.disqualifiedPlayers));
      
      const studentSocket = [...io.sockets.sockets.values()].find(s => s.handshake.query.rut === rut);
      if (studentSocket) {
        studentSocket.emit("trivia:playerStatus", { disqualified: false });
      }
    });



    // DISCONNECT
    // ══════════════════════════════════════════════════════════════════
    socket.on("disconnect", () => {
      // Opcionalmente podemos limpiar o notar que se desconectó
      // Emitir lobbyPlayers actualizado si queremos remover los que se van,
      // pero el código actual permite reconexiones guardando el estado.
      // Así que emitiremos los que están conectados actualmente.
      console.log(`[Trivia] Socket desconectado: ${socket.id}`);
    });
  });
};
