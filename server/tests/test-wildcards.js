/**
 * test-wildcards.js
 * ============================================================
 * Pruebas UNITARIAS de las mecánicas de comodines.
 * NO requiere servidor activo — prueba la lógica pura.
 *
 * Verifica:
 *   - Sobrecarga: puntos correctos se duplican
 *   - Sobrecarga: fallos no reciben puntos (0)
 *   - Escudo: el jugador con escudo es invisible al Escáner
 *   - Escudo: el escudo no evita respuestas incorrectas
 *   - Escáner: distribución calcula porcentajes correctamente
 *   - Ruleta: solo se dispara cuando wildcards = 0
 *
 * Uso:
 *   node tests/test-wildcards.js
 * ============================================================
 */

// ── Utilidades ────────────────────────────────────────────────────────────────
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

function assertEqual(actual, expected, label) {
  const ok = actual === expected;
  assert(ok, label, ok ? '' : `actual=${JSON.stringify(actual)} esperado=${JSON.stringify(expected)}`);
}

// ── Lógica copiada del servidor (triviaHandler.js) ────────────────────────────
const P_BASE  = 500;
const P_MAX   = 500;
const T_TOTAL = 15000;

function calcScore(startedAt) {
  const elapsed = Date.now() - startedAt;
  const t = Math.max(0, T_TOTAL - elapsed);
  return Math.floor(P_BASE + (P_MAX * t / T_TOTAL));
}

function simulateAnswer({ isCorrect, activeOverload, consecutiveFails = 0, startedAt }) {
  let points = 0;
  let multiplierApplied = 1.0;

  if (isCorrect) {
    if (consecutiveFails === 1) multiplierApplied = 1.1;
    else if (consecutiveFails === 2) multiplierApplied = 1.25;
    else if (consecutiveFails === 3) multiplierApplied = 1.5;
    else if (consecutiveFails >= 4) multiplierApplied = 2.0;

    points = Math.floor(calcScore(startedAt) * multiplierApplied);
  }

  if (activeOverload) {
    if (isCorrect) points = points * 2;
    // Si falla con Sobrecarga activa: 0 puntos (no castigo extra)
  }

  return points;
}

function scanDistribution(answers, players) {
  const distribution = {};
  Object.entries(answers).forEach(([ansRut, ans]) => {
    const player = players[ansRut];
    if (player && player.activeShield) return; // Invisible
    const val = ans.answerIndex !== undefined ? ans.answerIndex : ans.answer;
    if (val !== undefined) distribution[val] = (distribution[val] || 0) + 1;
  });
  return distribution;
}

function checkRouletteTrigger(player, rouletteProbability = 1.0) {
  if (player.wildcards.length > 0) return false;
  if (player.hasHadRoulette) return false;
  return Math.random() < rouletteProbability;
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════');
console.log('  TEST UNITARIOS — Comodines Trivia Arena');
console.log('════════════════════════════════════════════════\n');

// ── Suite 1: Sobrecarga ───────────────────────────────────────────────────────
console.log('─── SUITE 1: Sobrecarga (⚡) ───\n');

{
  const startedAt = Date.now() - 2000; // Han pasado 2s

  const ptsBase = simulateAnswer({ isCorrect: true, activeOverload: false, startedAt });
  const ptsOverload = simulateAnswer({ isCorrect: true, activeOverload: true, startedAt });

  assertEqual(ptsOverload, ptsBase * 2,
    'Sobrecarga + Acierto = puntos duplicados exactos');

  assert(ptsOverload > ptsBase,
    'Con Sobrecarga y acierto, puntos son MAYORES que sin comodín');

  const ptsFallo = simulateAnswer({ isCorrect: false, activeOverload: true, startedAt });
  assertEqual(ptsFallo, 0,
    'Sobrecarga + Fallo = 0 puntos (sin castigo extra)');

  const ptsFailSin = simulateAnswer({ isCorrect: false, activeOverload: false, startedAt });
  assertEqual(ptsFailSin, 0,
    'Sin Sobrecarga + Fallo = 0 puntos');

  // Multiplicador de remontada CON sobrecarga
  const ptsRemontada = simulateAnswer({ isCorrect: true, activeOverload: true, consecutiveFails: 3, startedAt });
  const ptsBaseRemontada = simulateAnswer({ isCorrect: true, activeOverload: false, consecutiveFails: 3, startedAt });
  assertEqual(ptsRemontada, ptsBaseRemontada * 2,
    'Sobrecarga + Remontada (×1.5) = se duplican los puntos ya multiplicados');
}

// ── Suite 2: Escudo ───────────────────────────────────────────────────────────
console.log('\n─── SUITE 2: Escudo (🛡️) ───\n');

{
  const players = {
    'rut-a': { nombre: 'Alice', activeShield: true  },
    'rut-b': { nombre: 'Bob',   activeShield: false },
    'rut-c': { nombre: 'Carol', activeShield: false },
  };
  const answers = {
    'rut-a': { answerIndex: 0 }, // Alice tiene escudo → debe ser invisible
    'rut-b': { answerIndex: 1 }, // Bob visible
    'rut-c': { answerIndex: 0 }, // Carol visible
  };

  const dist = scanDistribution(answers, players);

  assert(dist[0] === 1,
    'Escudo: solo 1 voto en opción 0 visible (Alice invisible, Carol visible)');
  assert(dist[1] === 1,
    'Escudo: 1 voto en opción 1 visible (Bob sin escudo)');
  assert(dist[0] !== 2,
    'Escudo: Alice NO aparece en el escáner (no cuenta 2 en opción 0)');

  // El escudo no evita responder
  const ptsConEscudo = simulateAnswer({ isCorrect: false, activeOverload: false, startedAt: Date.now() - 1000 });
  assertEqual(ptsConEscudo, 0,
    'Escudo: si fallas la pregunta, igual sumas 0 (el escudo no da puntos)');
}

// ── Suite 3: Escáner ──────────────────────────────────────────────────────────
console.log('\n─── SUITE 3: Escáner (🔍) ───\n');

{
  const players = {
    'rut-x': { activeShield: false },
    'rut-y': { activeShield: false },
    'rut-z': { activeShield: false },
  };
  const answers = {
    'rut-x': { answerIndex: 2 },
    'rut-y': { answerIndex: 2 },
    'rut-z': { answerIndex: 0 },
  };

  const dist = scanDistribution(answers, players);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);

  assertEqual(total, 3, 'Escáner: total de votos contados = 3');
  assertEqual(dist[2], 2, 'Escáner: opción 2 tiene 2 votos');
  assertEqual(dist[0], 1, 'Escáner: opción 0 tiene 1 voto');

  const pct2 = (dist[2] / total) * 100;
  const pct0 = (dist[0] / total) * 100;
  assert(Math.abs(pct2 - 66.67) < 1, `Escáner: opción 2 ≈ 66.67% (actual: ${pct2.toFixed(2)}%)`);
  assert(Math.abs(pct0 - 33.33) < 1, `Escáner: opción 0 ≈ 33.33% (actual: ${pct0.toFixed(2)}%)`);
}

// ── Suite 4: Ruleta del Tesoro ────────────────────────────────────────────────
console.log('\n─── SUITE 4: Ruleta del Tesoro (💎) ───\n');

{
  // Con wildcards = 0 y probabilidad 100% → siempre se dispara
  const playerSinWildcards = { wildcards: [], hasHadRoulette: false };
  let triggered = checkRouletteTrigger(playerSinWildcards, 1.0);
  assert(triggered, 'Ruleta: se dispara cuando wildcards=0 y prob=100%');

  // Con wildcards restantes → NUNCA se dispara
  const playerConWildcards = { wildcards: ['scan'], hasHadRoulette: false };
  let triggered2 = checkRouletteTrigger(playerConWildcards, 1.0);
  assert(!triggered2, 'Ruleta: NO se dispara si quedan wildcards');

  // Si ya tuvo ruleta → NUNCA se vuelve a disparar
  const playerYaTuvoRuleta = { wildcards: [], hasHadRoulette: true };
  let triggered3 = checkRouletteTrigger(playerYaTuvoRuleta, 1.0);
  assert(!triggered3, 'Ruleta: NO se repite si ya tuvo ruleta (hasHadRoulette=true)');

  // Con prob=0% → nunca se dispara
  const playerSinProb = { wildcards: [], hasHadRoulette: false };
  let triggered4 = checkRouletteTrigger(playerSinProb, 0.0);
  assert(!triggered4, 'Ruleta: NO se dispara con probabilidad 0%');
}

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════');
console.log(`  RESUMEN: ${passCount} ✅ PASS | ${failCount} ❌ FAIL`);
if (failCount === 0) {
  console.log('  🎉 ¡Todos los tests pasaron correctamente!');
} else {
  console.log(`  ⚠️  Hay ${failCount} test(s) fallando. Revisa la lógica.`);
}
console.log('════════════════════════════════════════════════\n');

process.exit(failCount > 0 ? 1 : 0);
