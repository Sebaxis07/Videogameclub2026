/**
 * matchmaking.js
 * =====================================
 * Lógica pura de emparejamiento para torneos.
 *
 * SEEDING: jugadores ordenados por Horas_Jugadas desc.
 * BRACKET: seed i vs seed (N - i + 1) en la primera ronda.
 *
 * Ejemplo N=8:
 *   1 vs 8 | 2 vs 7 | 3 vs 6 | 4 vs 5
 *
 * Si N no es potencia de 2, se añaden BYEs (pases directos)
 * a los seeds más altos hasta completar la siguiente potencia de 2.
 */

"use strict";

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Calcula la siguiente potencia de 2 >= n.
 * @param {number} n
 * @returns {number}
 */
function nextPowerOfTwo(n) {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) power <<= 1;
  return power;
}

/**
 * Verifica si n es potencia de 2.
 * @param {number} n
 * @returns {boolean}
 */
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

// ─── Seeding ──────────────────────────────────────────────────────────────────

/**
 * Ordena los jugadores de mayor a menor según Horas_Jugadas.
 * Devuelve un nuevo array (no muta el original).
 *
 * @param {Array<{nombre: string, horasJugadas: number, [key: string]: any}>} players
 * @returns {Array} Jugadores ordenados (seed 1 = mayor Horas_Jugadas)
 */
function seedPlayers(players) {
  return [...players].sort((a, b) => b.horasJugadas - a.horasJugadas);
}

// ─── Byes ─────────────────────────────────────────────────────────────────────

/**
 * Rellena el array de seeds con objetos BYE hasta alcanzar `targetSize`.
 * Los BYEs se insertan AL FINAL para que los seeds más altos (1, 2, …)
 * reciban el pase directo al cruzarse contra un BYE.
 *
 * @param {Array} seededPlayers
 * @param {number} targetSize  Siguiente potencia de 2 >= seededPlayers.length
 * @returns {Array} Array de longitud targetSize
 */
function padWithByes(seededPlayers, targetSize) {
  const padded = [...seededPlayers];
  while (padded.length < targetSize) {
    padded.push({ nombre: "BYE", rut: null, isBye: true, horasJugadas: 0 });
  }
  return padded;
}

// ─── Primera Ronda ────────────────────────────────────────────────────────────

function buildFirstRound(paddedSeeds) {
  const N = paddedSeeds.length;
  const numRounds = Math.log2(N);
  
  // Recursively build correct tournament seeding order
  let matchups = [1, 2];
  for (let i = 1; i < numRounds; i++) {
    const nextMatchups = [];
    const sum = matchups.length * 2 + 1;
    matchups.forEach(seed => {
      nextMatchups.push(seed);
      nextMatchups.push(sum - seed);
    });
    matchups = nextMatchups;
  }

  const matches = [];
  for (let i = 0; i < matchups.length; i += 2) {
    const s1 = matchups[i];
    const s2 = matchups[i + 1];
    
    const player1 = { ...paddedSeeds[s1 - 1], seed: s1 };
    const player2 = { ...paddedSeeds[s2 - 1], seed: s2 };

    matches.push({
      id: `r1-m${matches.length + 1}`,
      player1,
      player2,
      winner: null,
      ...(player1.isBye && { winner: player2, autoAdvance: true }),
      ...(player2.isBye && { winner: player1, autoAdvance: true }),
    });
  }

  return matches;
}

// ─── Rondas Subsiguientes ─────────────────────────────────────────────────────

/**
 * Construye el esqueleto de rondas vacías posteriores a la primera.
 * Cada ronda tiene N/2 partidos vacíos (winner: null) listos para llenarse.
 *
 * @param {number} firstRoundSize  Cantidad de partidos en la primera ronda
 * @returns {Array<Array>} Array de rondas (cada una es array de matches vacíos)
 */
function buildEmptySubsequentRounds(firstRoundSize) {
  const rounds = [];
  let matchesInRound = firstRoundSize / 2;

  while (matchesInRound >= 1) {
    const round = [];
    for (let i = 0; i < matchesInRound; i++) {
      round.push({
        id: `r${rounds.length + 2}-m${i + 1}`,
        player1: null,
        player2: null,
        winner: null,
        autoAdvance: false,
      });
    }
    rounds.push(round);
    matchesInRound = Math.floor(matchesInRound / 2);
  }

  return rounds;
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Función principal. Recibe jugadores crudos y devuelve el bracket completo.
 *
 * @param {Array} players  Lista de jugadores con al menos { nombre, horasJugadas }
 * @returns {{
 *   bracketSize: number,
 *   totalPlayers: number,
 *   totalByes: number,
 *   rounds: Array<Array>
 * }}
 */
function buildBracket(players) {
  if (!players || players.length === 0) {
    return { bracketSize: 0, totalPlayers: 0, totalByes: 0, rounds: [] };
  }

  const seeded = seedPlayers(players);
  const bracketSize = nextPowerOfTwo(seeded.length);
  const totalByes = bracketSize - seeded.length;
  const padded = padWithByes(seeded, bracketSize);

  const firstRound = buildFirstRound(padded);
  const subsequentRounds = buildEmptySubsequentRounds(firstRound.length);

  return {
    bracketSize,
    totalPlayers: seeded.length,
    totalByes,
    rounds: [firstRound, ...subsequentRounds],
  };
}

// ─── Phase 2: Grupos Round Robin ─────────────────────────────────────────────

function buildRoundRobinGroups(players) {
  // 1. Separar por niveles
  const niveles = { alto: [], medio: [], bajo: [] };
  players.forEach(p => {
    if (niveles[p.nivel]) niveles[p.nivel].push(p);
    else niveles.bajo.push(p); // fallback
  });

  const allGroups = [];
  
  const createSubgroups = (nivelPlayers, nivelName) => {
    // Si hay muy pocos, 1 solo grupo
    const n = nivelPlayers.length;
    if (n === 0) return [];
    
    let sizes = [];
    if (n <= 5) sizes = [n]; // grupos pequeños (hasta 5) no se dividen
    else if (n === 6) sizes = [3, 3];
    else if (n === 7) sizes = [4, 3];
    else if (n === 8) sizes = [4, 4];
    else if (n === 9) sizes = [3, 3, 3];
    else if (n === 10) sizes = [4, 3, 3];
    else {
      // Chunk default size 4
      let count = n;
      while (count > 0) {
        if (count >= 4) { sizes.push(4); count -= 4; }
        else { sizes.push(count); count = 0; }
      }
    }

    let ptr = 0;
    const groups = sizes.map((size, idx) => {
      const groupPlayers = nivelPlayers.slice(ptr, ptr + size);
      ptr += size;
      const groupId = `${nivelName.toUpperCase()}-${idx + 1}`;
      
      // Round Robin circle algorithm
      let roundRobinPlayers = [...groupPlayers];
      if (roundRobinPlayers.length % 2 !== 0) {
        roundRobinPlayers.push({ nombre: "BYE", isBye: true });
      }
      
      const numPlayers = roundRobinPlayers.length;
      const numRounds = numPlayers - 1;
      const matchesPerRound = numPlayers / 2;
      
      const rounds = [];
      let matchCounter = 1;

      for (let round = 0; round < numRounds; round++) {
        for (let i = 0; i < matchesPerRound; i++) {
          const p1 = roundRobinPlayers[i];
          const p2 = roundRobinPlayers[numPlayers - 1 - i];
          
          if (!p1.isBye && !p2.isBye) {
            rounds.push({
              id: `${groupId}-m${matchCounter++}`,
              player1: p1,
              player2: p2,
              winner: null
            });
          }
        }
        // Rotate: keep first item fixed, shift the rest right
        roundRobinPlayers = [
          roundRobinPlayers[0],
          roundRobinPlayers[numPlayers - 1],
          ...roundRobinPlayers.slice(1, numPlayers - 1)
        ];
      }

      return {
        id: groupId,
        nivel: nivelName,
        players: groupPlayers,
        matches: rounds
      };
    });
    return groups;
  };

  allGroups.push(...createSubgroups(niveles.alto, 'A'));
  allGroups.push(...createSubgroups(niveles.medio, 'B'));
  allGroups.push(...createSubgroups(niveles.bajo, 'C'));

  return allGroups;
}

// ─── Phase 3: Gauntlet Stepped Elimination ──────────────────────────────────
// Toma como entrada las "siguientes posiciones" despues de fase de grupos.
// standings = { A: [p1, p2], B: [p1, p2, p3], C: [p1, p2] } o similar pre-ordenado.

function buildGauntletBracket(standings) {
  const players = [];
  ['A', 'B', 'C'].forEach(level => {
    if (standings[level]) {
      standings[level].forEach(p => players.push(p));
    }
  });

  const N = players.length;
  if (N < 2) return { rounds: [], isGauntlet: true };

  const bracketSize = nextPowerOfTwo(N);
  const padded = padWithByes(players, bracketSize);

  // Use standard tournament bracket logic! It perfectly mimics a Gauntlet
  // because top seeds (A1, A2...) get BYEs against empty spots and automatically
  // land in Semifinals/Cuartos against the surviving lower seeds!
  
  const firstRound = buildFirstRound(padded);
  const subsequentRounds = buildEmptySubsequentRounds(firstRound.length);

  return { 
    bracketSize,
    totalPlayers: N,
    totalByes: bracketSize - N,
    rounds: [firstRound, ...subsequentRounds] 
  };
}

module.exports = {
  buildBracket,
  seedPlayers,
  nextPowerOfTwo,
  isPowerOfTwo,
  padWithByes,
  buildFirstRound,
  buildRoundRobinGroups,
  buildGauntletBracket
};
