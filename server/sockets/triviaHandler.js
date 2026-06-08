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
const { getJudgeVerdict } = require("../services/groqService");

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
    disqualifiedPlayers: new Set(), // Set of RUTs
    courtSession: {          // Estado del minijuego de juicio
      active: false,
      stage: 0,
      defendant: null,       // { rut, nombre }
      lawyer: null,          // { rut, nombre }
      phase: 'none',         // none | roulette | opening | statements | defendant_speech | evidence | ai_duel | closing | deliberation | verdict
      evidence: [],
      aiBattle: [],
      judgeMessage: '',
      defendantStatement: '',
      argument: '',
      verdict: null,         // 'pardon' | 'guilty'
      verdictReason: ''
    }
  };
}

let state = createInitialState();
let ioInstance = null;

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

function buildEvidenceReport(defendantName) {
  return [
    `Salida de foco detectada mientras ${defendantName} respondía.`, 
    'Cambio de visibilidad de la pestaña durante pregunta activa.',
    'Captura de pantalla periódica enviada para auditoría de integridad.'
  ];
}

function buildAIDuel(evidenceList, defendantName, lawyerName) {
  const evidenceSummary = evidenceList.map((item, idx) => `${idx + 1}. ${item}`).join(' ');
  return [
    {
      role: 'prosecutor',
      label: 'Fiscal IA',
      message: `El Ministerio Digital presenta la evidencia en bloque: ${evidenceSummary}`
    },
    {
      role: 'defense',
      label: 'Defensa IA',
      message: `La defensa sintetiza un contraataque: ${lawyerName} cuestiona la validez del registro y exige juicio justo para ${defendantName}.`
    },
    {
      role: 'prosecutor',
      label: 'Fiscal IA',
      message: 'La secuencia de eventos y la coincidencia de los datos obligan a considerar la falta como plausible.'
    },
    {
      role: 'defense',
      label: 'Defensa IA',
      message: 'Sin contexto completo, la Corte no puede castigar. Exijo la presunción de inocencia y la revisión de las pruebas.'
    }
  ];
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
  // Busca facción abierta (que tenga 1 miembro)
  const open = Object.entries(state.factions).find(
    ([, f]) => f.members.length === 1 && !f.isLoner
  );

  if (open) {
    const [factionId, faction] = open;
    faction.members.push(rut);
    state.players[rut].factionId = factionId;
  } else {
    // Crear nueva facción (provisionalmente solitaria)
    const factionId = `F${state.nextFactionId++}`;
    state.factions[factionId] = { members: [rut], score: 0, isLoner: true };
    state.players[rut].factionId = factionId;
  }

  // Actualizar isLoner de todas las facciones
  Object.values(state.factions).forEach(f => {
    f.isLoner = f.members.length === 1;
  });
}

/** Suma puntos al jugador y su facción (aplica ×2 si es Lobo Solitario) */
function addPointsToPlayer(rut, basePoints) {
  const player  = state.players[rut];
  if (!player) return;

  player.score += basePoints;

  const faction = state.factions[player.factionId];
  if (!faction) return;

  const contribution = faction.isLoner ? basePoints * 2 : basePoints;
  faction.score = Math.max(0, faction.score + contribution);
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
    courtSession:  state.courtSession, // Sync court state
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

module.exports = function (io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    const role = socket.handshake.query.role || "student";

    // ══════════════════════════════════════════════════════════════════

    /** Iniciar partida desde lobby */
    socket.on("admin:trivia:start", () => {
      if (role !== "admin") return;
      
      const votingHandler = require("./votingHandler");
      const votingState = votingHandler.getState ? votingHandler.getState() : {};
      const top3 = votingState.top3 || [];
      
      let allQuestions = loadQuestions();
      allQuestions = allQuestions.filter(q => q.desactivada !== true);

      if (top3 && top3.length > 0) {
        console.log(`[Trivia] Filtrando preguntas para el Top 3 de votación: ${top3.join(", ")}`);
        allQuestions = allQuestions.filter(q => top3.includes(q.categoria));
      }
      
      const shuffled = shuffle(allQuestions);
      state.deck = shuffled.slice(0, 20);
      
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
      state.currentQuestionIndex++;

      if (state.currentQuestionIndex >= state.deck.length) {
        // ── Fin de la ronda ───────────────────────────────────────────
        state.status = "finished";
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

        io.to("triviaRoom").emit("trivia:finished", finalRanking);
        socket.emit("admin:trivia:snapshot", buildAdminSnapshot());
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

      io.to("triviaRoom").emit("question:new", studentPayload);
      socket.emit("admin:trivia:snapshot", buildAdminSnapshot());
      console.log(`[Trivia] Pregunta ${state.currentQuestionIndex + 1} (${q.tipo_pregunta || "alternativas"}) enviada: "${q.pregunta.slice(0, 50)}..."`);
    });

    /** Admin resetea la partida completa */
    socket.on("admin:trivia:reset", () => {
      if (role !== "admin") return;
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
        state.players[rut] = {
          nombre:    nombre || rut,
          socketId:  socket.id,
          score:     0,
          wildcards: ["5050", "flashbang", "doublenada"],
          factionId: null,
        };
        assignFaction(rut);
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
      let   points    = isCorrect ? calcScore(question, receivedAt) : 0;

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

    // ══════════════════════════════════════════════════════════════════
    // LA CORTE DE LA ARENA (AI JUDGE SYSTEM)
    // ══════════════════════════════════════════════════════════════════

    /** Estudiante apela su castigo */
    socket.on("trivia:appeal", ({ rut, nombre }) => {
      if (!state.disqualifiedPlayers.has(rut)) return;
      if (state.courtSession.active) return;

      const defendant = state.players[rut] || { rut, nombre: nombre || 'Estudiante' };
      const candidates = Object.keys(state.players).filter(r => 
        r !== rut && !state.disqualifiedPlayers.has(r)
      );

      let candidatesForSession = [];
      let lawyerDesignated = null;

      if (candidates.length === 0) {
        lawyerDesignated = { rut: 'AI_LAWYER', nombre: 'Defensor de Oficio (IA)' };
        candidatesForSession = [lawyerDesignated];
      } else {
        candidatesForSession = candidates.map(r => ({ rut: r, nombre: state.players[r].nombre }));
      }

      // Etapa 1: Ruleta
      const evidenceRecords = buildEvidenceReport(defendant.nombre);
      state.courtSession = {
        active: true,
        stage: 1,
        defendant: { rut, nombre: defendant.nombre },
        lawyer: null,
        phase: 'roulette',
        evidence: evidenceRecords,
        aiBattle: [],
        candidates: candidatesForSession,
        judgeMessage: '¡SILENCIO EN LA ARENA! Una apelación ha sido presentada.',
        argument: '',
        defendantStatement: '',
        verdict: null,
        verdictReason: '',
        timer: 7
      };

      state.isInterrupted = true;
      io.to("triviaRoom").emit("court:start", state.courtSession);
      broadcastAdminSnapshot();

      setTimeout(() => {
        if (candidates.length === 0) {
          state.courtSession.lawyer = lawyerDesignated;
        } else {
          const WINNER_RUT = candidates[Math.floor(Math.random() * candidates.length)];
          state.courtSession.lawyer = { rut: WINNER_RUT, nombre: state.players[WINNER_RUT].nombre };
        }
        advanceCourtPhase('opening');
      }, 7000);
    });

    function advanceCourtPhase(nextPhase) {
      if (!state.courtSession.active) return;
      state.courtSession.phase = nextPhase;

      switch (nextPhase) {
        case 'opening':
          state.courtSession.stage = 2;
          state.courtSession.judgeMessage = `Audiencia Abierta. Se verifica al acusado ${state.courtSession.defendant.nombre} y su defensa ${state.courtSession.lawyer.nombre}.`;
          state.courtSession.timer = 6;
          io.to("triviaRoom").emit("court:update", state.courtSession);
          setTimeout(() => advanceCourtPhase('statements'), 6000);
          break;

        case 'statements':
          state.courtSession.stage = 3;
          state.courtSession.judgeMessage = `Alegatos de Apertura. Fiscalía presenta cargos. Abogado ${state.courtSession.lawyer.nombre}, ¿cómo se declara su cliente?`;
          state.courtSession.timer = 15;
          io.to("triviaRoom").emit("court:update", state.courtSession);
          
          if (state.courtSession.lawyer.rut === 'AI_LAWYER') {
            setTimeout(() => advanceCourtPhase('defendant_speech'), 5000);
          } else {
            const currentPhase = state.courtSession.phase;
            setTimeout(() => { if (state.courtSession.phase === currentPhase) advanceCourtPhase('defendant_speech'); }, 15000);
          }
          break;

        case 'defendant_speech':
          state.courtSession.stage = 4;
          state.courtSession.judgeMessage = `Declaración del Imputado. ${state.courtSession.defendant.nombre}, tiene la palabra.`;
          state.courtSession.timer = 15;
          io.to("triviaRoom").emit("court:update", state.courtSession);
          
          const currentPhaseDS = state.courtSession.phase;
          setTimeout(() => { if (state.courtSession.phase === currentPhaseDS) advanceCourtPhase('evidence'); }, 15000);
          break;

        case 'evidence':
          state.courtSession.stage = 5;
          state.courtSession.judgeMessage = `Producción de la Prueba. Analizando registros de actividad...`;
          state.courtSession.timer = 10;
          io.to("triviaRoom").emit("court:update", state.courtSession);
          setTimeout(() => advanceCourtPhase('ai_duel'), 10000);
          break;

        case 'ai_duel':
          state.courtSession.stage = 6;
          state.courtSession.judgeMessage = `Duelo de IAs en curso: Fiscal sintético contra Defensa sintética.`;
          state.courtSession.timer = 12;
          state.courtSession.aiBattle = buildAIDuel(
            state.courtSession.evidence,
            state.courtSession.defendant.nombre,
            state.courtSession.lawyer.nombre
          );
          io.to("triviaRoom").emit("court:update", state.courtSession);
          setTimeout(() => advanceCourtPhase('closing'), 12000);
          break;

        case 'closing':
          state.courtSession.stage = 7;
          state.courtSession.judgeMessage = `Alegatos de Clausura. Abogado, su última oportunidad para convencer a la Corte.`;
          state.courtSession.timer = 15;
          io.to("triviaRoom").emit("court:update", state.courtSession);
          
          if (state.courtSession.lawyer.rut === 'AI_LAWYER') {
            setTimeout(() => {
              state.courtSession.argument = "¡Es inocente!";
              advanceCourtPhase('deliberation');
            }, 5000);
          } else {
            const currentPhaseCL = state.courtSession.phase;
            setTimeout(() => { if (state.courtSession.phase === currentPhaseCL) advanceCourtPhase('deliberation'); }, 15000);
          }
          break;

        case 'deliberation':
          state.courtSession.stage = 8;
          state.courtSession.judgeMessage = `Cerrado el debate. El tribunal inicia la deliberación...`;
          state.courtSession.timer = 5;
          io.to("triviaRoom").emit("court:update", state.courtSession);
          
          processVerdict();
          break;
      }
      broadcastAdminSnapshot();
    }

    async function processVerdict() {
      try {
        const battleSummary = state.courtSession.aiBattle
          .map((item) => `${item.label}: ${item.message}`)
          .join(' ');

        const result = await getJudgeVerdict(
          state.courtSession.defendant.nombre,
          state.courtSession.lawyer.nombre,
          state.courtSession.evidence,
          `Declaración: ${state.courtSession.defendantStatement}. Argumento: ${state.courtSession.argument}`,
          battleSummary
        );

        state.courtSession.phase = 'verdict';
        state.courtSession.verdict = result.verdict;
        state.courtSession.verdictReason = result.reason || '';
        state.courtSession.judgeMessage = result.judgeSpeech;
        state.courtSession.rewardPoints = (result.verdict === 'pardon' ? 3000 : 0);
        
        io.to("triviaRoom").emit("court:update", state.courtSession);

        if (result.verdict === 'pardon') {
          state.disqualifiedPlayers.delete(state.courtSession.defendant.rut);
          const studentSocket = [...io.sockets.sockets.values()].find(s => s.handshake.query.rut === state.courtSession.defendant.rut);
          if (studentSocket) studentSocket.emit("trivia:playerStatus", { disqualified: false });
          
          if (state.courtSession.lawyer.rut !== 'AI_LAWYER') {
            addPointsToPlayer(state.courtSession.lawyer.rut, 3000);
            broadcastFactionRanking();
          }
        }

        setTimeout(() => {
          state.courtSession.active = false;
          state.isInterrupted = false;
          io.to("triviaRoom").emit("court:closed");
          io.to("triviaRoom").emit("trivia:resumed");
          broadcastAdminSnapshot();
        }, 12000);
      } catch (err) {
        state.courtSession.active = false;
        state.isInterrupted = false;
        io.to("triviaRoom").emit("court:closed");
      }
    }

    socket.on("court:submitDefendantStatement", ({ argument }) => {
      if (state.courtSession.phase !== 'defendant_speech') return;
      if (socket.handshake.query.rut !== state.courtSession.defendant.rut) return;
      state.courtSession.defendantStatement = argument;
      advanceCourtPhase('evidence');
    });

    socket.on("court:submitOpeningStatement", ({ argument }) => {
      if (state.courtSession.phase !== 'statements') return;
      if (socket.handshake.query.rut !== state.courtSession.lawyer.rut) return;
      advanceCourtPhase('defendant_speech');
    });

    socket.on("court:submitClosingArgument", ({ argument }) => {
      if (state.courtSession.phase !== 'closing') return;
      if (socket.handshake.query.rut !== state.courtSession.lawyer.rut) return;
      state.courtSession.argument = argument;
      advanceCourtPhase('deliberation');
    });

    socket.on("court:submitArgument", ({ argument }) => {
       if (state.courtSession.phase === 'closing') {
         state.courtSession.argument = argument;
         advanceCourtPhase('deliberation');
       }
    });

    // ══════════════════════════════════════════════════════════════════
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
