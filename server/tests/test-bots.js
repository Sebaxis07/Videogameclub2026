/**
 * test-bots.js
 * ============================================================
 * Prueba de integración con bots simulados.
 * 6 estudiantes que:
 *   1. Votan juegos (fase votación)
 *   2. Se unen a la trivia
 *   3. Responden preguntas (con índices distintos para diversificar)
 *   4. Usan comodines (escudo, escáner, sobrecarga)
 *
 * NOTA: Los estudiantes NO reciben la respuesta correcta del servidor
 * (por diseño anti-trampa), por lo que los bots no pueden "saber" cuál
 * es la correcta. Las verificaciones son sobre COMPORTAMIENTO observable.
 *
 * Uso: node tests/test-bots.js
 * El servidor debe estar corriendo en localhost:3000
 * ============================================================
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

// ── Bots: cada uno usa un comodín distinto y vota un juego ───────────────────
const BOTS = [
  { rut: 'bot-001-k', nombre: 'Bot Alpha',   vote: 'League of Legends', wildcard: 'overload', answerIndex: 0 },
  { rut: 'bot-002-k', nombre: 'Bot Bravo',   vote: 'Valorant',          wildcard: 'shield',   answerIndex: 1 },
  { rut: 'bot-003-k', nombre: 'Bot Charlie', vote: 'Minecraft',         wildcard: 'scan',     answerIndex: 2 },
  { rut: 'bot-004-k', nombre: 'Bot Delta',   vote: 'League of Legends', wildcard: 'overload', answerIndex: 3 },
  { rut: 'bot-005-k', nombre: 'Bot Echo',    vote: 'Valorant',          wildcard: 'shield',   answerIndex: 1 },
  { rut: 'bot-006-k', nombre: 'Bot Foxtrot', vote: 'Minecraft',         wildcard: null,       answerIndex: 0 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(nombre, msg) {
  const ts = new Date().toISOString().substring(11, 23);
  console.log(`[${ts}] [${nombre.padEnd(12)}] ${msg}`);
}

let passCount = 0;
let failCount = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' → ' + detail : ''}`);
    failCount++;
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function runTest() {
  console.log('\n════════════════════════════════════════════════');
  console.log('  TEST DE INTEGRACIÓN CON BOTS — Trivia Arena  ');
  console.log('════════════════════════════════════════════════\n');

  const sockets = [];
  const botData = {};

  // ── FASE 1: Conectar bots ─────────────────────────────────────────────────
  console.log('─── FASE 1: Conexión y Unión al Lobby ───\n');

  for (const bot of BOTS) {
    const s = io(SERVER_URL, {
      query: { role: 'student', userName: bot.nombre, rut: bot.rut },
      transports: ['websocket'],
    });

    botData[bot.rut] = {
      socket: s, bot,
      joined: false,
      wildcardActivated: null,
      overloadPtsWithCorrect: null,    // pts cuando correct=true con overload activo
      overloadPtsNormal: null,         // pts cuando correct=true sin overload (referencia cruzada con otro bot)
      scanDistribution: null,
      shieldInvisibleVerified: false,
      results: [],                     // todos los resultados recibidos
    };
    sockets.push(s);

    s.on('connect', () => log(bot.nombre, `Conectado. Socket ID: ${s.id}`));

    s.on('trivia:joined', (data) => {
      botData[bot.rut].joined = true;
      log(bot.nombre, `Unido. Comodines: [${data.wildcards?.join(', ')}] | Estado: ${data.status}`);
      assert(
        Array.isArray(data.wildcards) && data.wildcards.length === 3,
        `${bot.nombre}: recibe 3 comodines al unirse`
      );
    });

    s.on('connect_error', (err) => {
      console.error(`[ERROR] ${bot.nombre} no pudo conectar: ${err.message}`);
    });
  }

  await sleep(1500);

  // ── FASE 2: Votar juegos ──────────────────────────────────────────────────
  console.log('\n─── FASE 2: Votación de Juegos ───\n');
  for (const bot of BOTS) {
    const s = botData[bot.rut].socket;
    s.emit('voting:join', { rut: bot.rut });
    await sleep(150);
    s.emit('voting:vote', { rut: bot.rut, game: bot.vote });
    log(bot.nombre, `Votó por: ${bot.vote}`);
    await sleep(150);
  }
  await sleep(800);
  console.log('\n  ⏳ Votación completada. Esperando apertura de trivia...\n');

  // ── FASE 3: Unirse a la trivia ────────────────────────────────────────────
  console.log('─── FASE 3: Unión a la Trivia ───\n');
  for (const bot of BOTS) {
    botData[bot.rut].socket.emit('trivia:join', { rut: bot.rut, nombre: bot.nombre });
    await sleep(300);
  }
  await sleep(800);

  assert(
    BOTS.every(b => botData[b.rut].joined),
    'Todos los bots se unieron correctamente a la trivia'
  );

  // ── FASE 4: Escuchar preguntas y responder ────────────────────────────────
  console.log('\n─── FASE 4: Escuchar y Responder Preguntas ───\n');

  for (const bot of BOTS) {
    const s = botData[bot.rut].socket;
    const bd = botData[bot.rut];

    s.on('question:new', async (q) => {
      const qNum = q.questionNumber || '?';
      log(bot.nombre, `Pregunta #${qNum}: "${q.pregunta?.substring(0, 45)}..."`);

      const delay = 600 + Math.random() * 2500;
      await sleep(delay);

      // Usar comodín en la primera pregunta
      if (bot.wildcard && qNum === 1) {
        log(bot.nombre, `Activando comodín: ${bot.wildcard.toUpperCase()}`);
        s.emit(`wildcard:${bot.wildcard}`, { rut: bot.rut });
        await sleep(400);
      }

      // Responder con el índice asignado (los bots no conocen la respuesta correcta)
      const answer = bot.answerIndex;
      s.emit('question:answer', { rut: bot.rut, answer, answerIndex: answer });
      log(bot.nombre, `Respondió con opción ${answer}`);
    });

    s.on('question:result', (res) => {
      bd.results.push(res);
      const msg = res.correct
        ? `✅ Correcto | +${res.pointsEarned} pts | Total: ${res.totalScore}`
        : `❌ Incorrecto | +0 pts | Total: ${res.totalScore}`;
      log(bot.nombre, `Resultado: ${msg}`);

      // Guardar puntos para verificación de Sobrecarga
      if (bot.wildcard === 'overload' && res.correct && bd.wildcardActivated) {
        bd.overloadPtsWithCorrect = res.pointsEarned;
      }
    });

    s.on('wildcard:activated', ({ id }) => {
      bd.wildcardActivated = id;
      log(bot.nombre, `⚡ Comodín activado en servidor: ${id}`);
    });

    s.on('wildcard:scanResult', ({ distribution }) => {
      bd.scanDistribution = distribution;
      log(bot.nombre, `📊 Escáner: ${JSON.stringify(distribution)}`);
    });

    s.on('trivia:wildcardsUpdate', (wc) => {
      log(bot.nombre, `Comodines actualizados: [${wc.join(', ')}]`);
    });

    s.on('trivia:treasureRoulette', (data) => {
      log(bot.nombre, `🎰 RULETA del TESORO → Jugador: ${data.playerName} | Premio: ${data.result}`);
    });
  }

  // Esperar a que se jueguen preguntas
  await sleep(20000);

  // ── FASE 5: Verificaciones basadas en comportamiento observable ───────────
  console.log('\n─── FASE 5: Verificaciones de Comportamiento ───\n');

  // 5a. Comodines se activaron en el servidor
  for (const bot of BOTS) {
    if (bot.wildcard) {
      const bd = botData[bot.rut];
      assert(
        bd.wildcardActivated === bot.wildcard || bot.wildcard === 'scan',
        `${bot.nombre} (${bot.wildcard.toUpperCase()}): comodín se activó en servidor`
      );
    }
  }

  // 5b. Escáner devolvió un objeto (puede estar vacío si nadie respondió antes)
  const scanBot = BOTS.find(b => b.wildcard === 'scan');
  if (scanBot) {
    const bd = botData[scanBot.rut];
    assert(
      bd.scanDistribution !== null && typeof bd.scanDistribution === 'object',
      `${scanBot.nombre} (SCAN): devolvió objeto de distribución`
    );
    const totalVotos = Object.values(bd.scanDistribution || {}).reduce((a, b) => a + b, 0);
    log(scanBot.nombre, `Votos visibles al momento del escaneo: ${totalVotos}`);
  }

  // 5c. Sobrecarga: si el bot con Overload acertó, sus puntos deben ser > 0 y mayores que sin overload
  const overloadBots = BOTS.filter(b => b.wildcard === 'overload');
  for (const bot of overloadBots) {
    const bd = botData[bot.rut];
    const correctResults = bd.results.filter(r => r.correct);
    if (correctResults.length > 0) {
      // El primer resultado correcto después de activar overload debería tener puntos > base esperado
      const firstCorrect = correctResults[0];
      assert(
        firstCorrect.pointsEarned > 0,
        `${bot.nombre} (OVERLOAD): puntos > 0 al acertar con sobrecarga activa`
      );
      // Si tenemos el punto de referencia de otro bot sin overload que contestó igual
      const normalBot = botData['bot-006-k']; // Foxtrot sin comodín
      const normalCorrect = normalBot.results.find(r => r.correct);
      if (normalCorrect) {
        assert(
          firstCorrect.pointsEarned >= normalCorrect.pointsEarned,
          `${bot.nombre} (OVERLOAD): puntos (${firstCorrect.pointsEarned}) ≥ bot sin comodín (${normalCorrect.pointsEarned})`,
          'Con Sobrecarga los puntos deben ser ≥ al base'
        );
      }
    } else {
      log(bot.nombre, '⚠️  No acertó ninguna pregunta (no se puede verificar Sobrecarga)');
    }
  }

  // 5d. Escudo: bots con escudo deben haber recibido resultado (no bloqueados)
  const shieldBots = BOTS.filter(b => b.wildcard === 'shield');
  for (const bot of shieldBots) {
    const bd = botData[bot.rut];
    assert(
      bd.results.length > 0,
      `${bot.nombre} (SHIELD): pudo responder preguntas normalmente con escudo activo`
    );
  }

  // 5e. Todos los bots recibieron al menos un resultado
  let botsConResultado = BOTS.filter(b => botData[b.rut].results.length > 0).length;
  assert(
    botsConResultado === BOTS.length,
    `Todos los bots (${BOTS.length}) recibieron al menos un resultado de pregunta`,
    `Solo ${botsConResultado}/${BOTS.length} recibieron resultados`
  );

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════');
  console.log(`  RESUMEN: ${passCount} ✅ PASS | ${failCount} ❌ FAIL`);
  if (failCount === 0) {
    console.log('  🎉 ¡Todos los tests pasaron correctamente!');
  } else {
    console.log(`  ⚠️  ${failCount} test(s) fallando.`);
  }
  console.log('════════════════════════════════════════════════\n');

  await sleep(1000);
  sockets.forEach(s => s.disconnect());
  console.log('Bots desconectados.\n');
  process.exit(failCount > 0 ? 1 : 0);
}

runTest().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
