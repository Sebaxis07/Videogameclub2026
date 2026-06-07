"use strict";

/**
 * playoffBracket.js — Genera el bracket de Doble Eliminación de 8.
 * =====================================================================
 * Clasificación:
 *   - Top 2 de cada tier (A1, A2, B1, B2, C1, C2)  → 6 cupos.
 *   - 2 wildcards: mayores puntos_liga no clasificados (cualquier tier).
 *
 * Estructura (8 jugadores):
 *   Upper Bracket:
 *     UB-R1: 4 matches (1v8, 4v5, 2v7, 3v6)
 *     UB-R2: 2 matches
 *     UB-Final: 1 match
 *   Lower Bracket:
 *     LB-R1: 2 matches (losers UB-R1 a..d emparejados)
 *     LB-R2: 2 matches (winners LB-R1 vs losers UB-R2)
 *     LB-Semi: 1 match
 *     LB-Final: 1 match (vs loser UB-Final)
 *   Grand Final: 1 match (UB-Final winner vs LB-Final winner)
 */

const GauntletPlayer = require("../../models/GauntletPlayer");
const Duelo          = require("../../models/Duelo");
const { DuelPhase, PlayerState } = require("../gauntlet/playerStates");
const { getRandomKit } = require("../gauntlet/kits");
const { buildHandicap } = require("./handicap");

const TIER_INDEX = { C: 0, B: 1, A: 2 };

/**
 * Identifica a los 8 clasificados.
 */
async function _seleccionarClasificados(torneoId) {
  const jugadores = await GauntletPlayer.find({
    torneo_id: torneoId,
    estado: { $ne: PlayerState.ELIMINADO },
  }).lean();

  // Para cada tier, ordenar por puntos_liga y tomar top 2
  const porTier = { A: [], B: [], C: [] };
  jugadores.forEach(j => { if (porTier[j.grupo]) porTier[j.grupo].push(j); });
  for (const t of Object.keys(porTier)) {
    porTier[t].sort((a, b) => (b.puntos_liga || 0) - (a.puntos_liga || 0)
      || (b.wins_liga || 0) - (a.wins_liga || 0));
  }
  const tierTop2 = [];
  for (const t of ['A', 'B', 'C']) {
    porTier[t].slice(0, 2).forEach(j => tierTop2.push({ ...j, clasificacion_tipo: 'tier_top2' }));
  }

  // Wildcards: los 2 jugadores con más puntos que no estén ya clasificados
  const idsClasif = new Set(tierTop2.map(j => j._id.toString()));
  const resto = jugadores
    .filter(j => !idsClasif.has(j._id.toString()))
    .sort((a, b) => (b.puntos_liga || 0) - (a.puntos_liga || 0)
      || (b.wins_liga || 0) - (a.wins_liga || 0));
  const wildcards = resto.slice(0, 2).map(j => ({ ...j, clasificacion_tipo: 'wildcard' }));

  const todos = [...tierTop2, ...wildcards];
  if (todos.length < 8) {
    // Si no hay 8 jugadores, completar con los mejores restantes (sin importar tipo)
    const faltan = 8 - todos.length;
    const yaIds = new Set(todos.map(j => j._id.toString()));
    const extra = resto.filter(j => !yaIds.has(j._id.toString())).slice(0, faltan)
      .map(j => ({ ...j, clasificacion_tipo: 'wildcard' }));
    todos.push(...extra);
  }

  // Ordenar los 8 finalistas por puntaje global para asignar seeds 1..N
  todos.sort((a, b) => (b.puntos_liga || 0) - (a.puntos_liga || 0)
    || (b.wins_liga || 0) - (a.wins_liga || 0));
  return todos.slice(0, 8);
}

/**
 * Empareja seeds para UB-R1 estándar: 1v8, 4v5, 2v7, 3v6
 */
function _seedPairs(seedsArray) {
  const s = seedsArray; // s[0] = seed 1, s[7] = seed 8
  return [
    [s[0], s[7]], // match 1: 1v8
    [s[3], s[4]], // match 2: 4v5
    [s[1], s[6]], // match 3: 2v7
    [s[2], s[5]], // match 4: 3v6
  ];
}

/**
 * Crea un duelo de playoff (placeholder o con jugadores definidos).
 */
async function _createDuel(torneoId, side, round, slot, j1, j2) {
  const fase = side === 'GF' ? DuelPhase.PLAYOFF_GRAND_FINAL
             : side === 'LB' ? DuelPhase.PLAYOFF_LB
             : DuelPhase.PLAYOFF_UB;

  const kit = getRandomKit();

  // Para placeholders sin jugadores aún, dejamos los IDs vacíos (null)
  const doc = {
    torneo_id:     torneoId,
    fase,
    jugador1_id:   j1?._id || null,
    jugador2_id:   j2?._id || null,
    estado:        "pendiente",
    bracket_side:  side,
    bracket_round: round,
    bracket_slot:  slot,
    kit: {
      id:          kit.id,
      nombre:      kit.nombre,
      icon:        kit.icon,
      descripcion: kit.descripcion
    }
  };

  if (j1 && j2) {
    doc.handicap = buildHandicap(j1, j2, kit.id);
  }

  return Duelo.create(doc);
}

/**
 * Genera el bracket completo de 8 con doble eliminación.
 * Crea TODOS los duelos del bracket up-front. UB-R1 con jugadores ya asignados;
 * los demás como placeholders que se rellenan al resolver duelos previos.
 */
async function generarPlayoffs(torneoId) {
  // Asegurarse que no exista bracket previo
  const yaHay = await Duelo.findOne({
    torneo_id: torneoId,
    bracket_side: { $ne: null },
  });
  if (yaHay) throw new Error("Ya existe un bracket de playoffs para este torneo.");

  // Validar que no queden duelos de Liga pendientes
  const pendiente = await Duelo.findOne({
    torneo_id: torneoId,
    fase: DuelPhase.LIGA,
    estado: "pendiente",
  });
  if (pendiente) throw new Error("Hay duelos de Liga pendientes. Resuélvelos antes de cerrar.");

  const clasificados = await _seleccionarClasificados(torneoId);
  if (clasificados.length < 4) {
    throw new Error("Se necesitan al menos 4 jugadores con actividad para playoffs.");
  }

  // Si hay menos de 8, rellenar con seeds "fantasma" no es lo ideal; mejor adaptar.
  // Por ahora aceptamos hasta 4 (mini bracket simplificado) si <8.
  // Para 8 exactos, usamos la estructura completa.
  if (clasificados.length < 8) {
    return _miniBracket(torneoId, clasificados);
  }

  // Asignar bracket_seed y clasificacion_tipo
  for (let i = 0; i < 8; i++) {
    await GauntletPlayer.findByIdAndUpdate(clasificados[i]._id, {
      $set: {
        bracket_seed: i + 1,
        bracket_status: 'upper',
        clasificacion_tipo: clasificados[i].clasificacion_tipo,
      },
    });
  }

  // Refrescar para tener los _id reales como objetos (clasificados ya tiene _id)
  const seeds = clasificados;

  // ─── Crear bracket placeholders ─────────────────────────────────────────
  // UB-R1: 4 matches con jugadores definidos
  const ubR1Pairs = _seedPairs(seeds);
  const ubR1 = [];
  for (let i = 0; i < 4; i++) {
    ubR1.push(await _createDuel(torneoId, 'UB', 1, i + 1, ubR1Pairs[i][0], ubR1Pairs[i][1]));
  }

  // UB-R2: 2 matches (placeholder)
  const ubR2 = [];
  for (let i = 0; i < 2; i++) {
    ubR2.push(await _createDuel(torneoId, 'UB', 2, i + 1, null, null));
  }

  // UB-Final: 1 match
  const ubFinal = await _createDuel(torneoId, 'UB', 3, 1, null, null);

  // LB-R1: 2 matches (placeholders, reciben perdedores UB-R1)
  const lbR1 = [];
  for (let i = 0; i < 2; i++) {
    lbR1.push(await _createDuel(torneoId, 'LB', 1, i + 1, null, null));
  }

  // LB-R2: 2 matches (winners LB-R1 vs losers UB-R2)
  const lbR2 = [];
  for (let i = 0; i < 2; i++) {
    lbR2.push(await _createDuel(torneoId, 'LB', 2, i + 1, null, null));
  }

  // LB-Semi: 1 match (winners LB-R2)
  const lbSemi = await _createDuel(torneoId, 'LB', 3, 1, null, null);

  // LB-Final: 1 match (LB-Semi winner vs UB-Final loser)
  const lbFinal = await _createDuel(torneoId, 'LB', 4, 1, null, null);

  // Grand Final: 1 match
  const grandFinal = await _createDuel(torneoId, 'GF', 1, 1, null, null);

  // ─── Wirear next_winner_duelo / next_loser_duelo ─────────────────────────
  // UB-R1[0] (1v8) → winner a UB-R2[0] slot 1, loser a LB-R1[0] slot 1
  // UB-R1[1] (4v5) → winner a UB-R2[0] slot 2, loser a LB-R1[0] slot 2
  // UB-R1[2] (2v7) → winner a UB-R2[1] slot 1, loser a LB-R1[1] slot 1
  // UB-R1[3] (3v6) → winner a UB-R2[1] slot 2, loser a LB-R1[1] slot 2
  await Duelo.findByIdAndUpdate(ubR1[0]._id, { $set: { next_winner_duelo: ubR2[0]._id, next_winner_slot: 1, next_loser_duelo: lbR1[0]._id, next_loser_slot: 1 } });
  await Duelo.findByIdAndUpdate(ubR1[1]._id, { $set: { next_winner_duelo: ubR2[0]._id, next_winner_slot: 2, next_loser_duelo: lbR1[0]._id, next_loser_slot: 2 } });
  await Duelo.findByIdAndUpdate(ubR1[2]._id, { $set: { next_winner_duelo: ubR2[1]._id, next_winner_slot: 1, next_loser_duelo: lbR1[1]._id, next_loser_slot: 1 } });
  await Duelo.findByIdAndUpdate(ubR1[3]._id, { $set: { next_winner_duelo: ubR2[1]._id, next_winner_slot: 2, next_loser_duelo: lbR1[1]._id, next_loser_slot: 2 } });

  // UB-R2[0] → winner UB-Final slot 1, loser LB-R2[0] slot 2 (cross-feed)
  // UB-R2[1] → winner UB-Final slot 2, loser LB-R2[1] slot 2
  await Duelo.findByIdAndUpdate(ubR2[0]._id, { $set: { next_winner_duelo: ubFinal._id, next_winner_slot: 1, next_loser_duelo: lbR2[0]._id, next_loser_slot: 2 } });
  await Duelo.findByIdAndUpdate(ubR2[1]._id, { $set: { next_winner_duelo: ubFinal._id, next_winner_slot: 2, next_loser_duelo: lbR2[1]._id, next_loser_slot: 2 } });

  // UB-Final → winner GF slot 1, loser LB-Final slot 2
  await Duelo.findByIdAndUpdate(ubFinal._id, { $set: { next_winner_duelo: grandFinal._id, next_winner_slot: 1, next_loser_duelo: lbFinal._id, next_loser_slot: 2 } });

  // LB-R1[0] → winner LB-R2[0] slot 1
  // LB-R1[1] → winner LB-R2[1] slot 1
  await Duelo.findByIdAndUpdate(lbR1[0]._id, { $set: { next_winner_duelo: lbR2[0]._id, next_winner_slot: 1 } });
  await Duelo.findByIdAndUpdate(lbR1[1]._id, { $set: { next_winner_duelo: lbR2[1]._id, next_winner_slot: 1 } });

  // LB-R2[0] → winner LB-Semi slot 1
  // LB-R2[1] → winner LB-Semi slot 2
  await Duelo.findByIdAndUpdate(lbR2[0]._id, { $set: { next_winner_duelo: lbSemi._id, next_winner_slot: 1 } });
  await Duelo.findByIdAndUpdate(lbR2[1]._id, { $set: { next_winner_duelo: lbSemi._id, next_winner_slot: 2 } });

  // LB-Semi → winner LB-Final slot 1
  await Duelo.findByIdAndUpdate(lbSemi._id, { $set: { next_winner_duelo: lbFinal._id, next_winner_slot: 1 } });

  // LB-Final → winner GF slot 2
  await Duelo.findByIdAndUpdate(lbFinal._id, { $set: { next_winner_duelo: grandFinal._id, next_winner_slot: 2 } });

  return {
    clasificados: clasificados.map((j, i) => ({
      seed: i + 1,
      nombre: j.nombre,
      grupo: j.grupo,
      puntos: j.puntos_liga || 0,
      tipo: j.clasificacion_tipo,
    })),
    duelosCreados: 4 + 2 + 1 + 2 + 2 + 1 + 1 + 1, // = 14
  };
}

/**
 * Mini-bracket fallback para 4 jugadores.
 */
async function _miniBracket(torneoId, clasificados) {
  const seeds = clasificados.slice(0, 4);
  for (let i = 0; i < seeds.length; i++) {
    await GauntletPlayer.findByIdAndUpdate(seeds[i]._id, {
      $set: { bracket_seed: i + 1, bracket_status: 'upper', clasificacion_tipo: seeds[i].clasificacion_tipo || 'tier_top2' },
    });
  }
  const sf1 = await _createDuel(torneoId, 'UB', 1, 1, seeds[0], seeds[3]);
  const sf2 = await _createDuel(torneoId, 'UB', 1, 2, seeds[1], seeds[2]);
  const lbFinal = await _createDuel(torneoId, 'LB', 1, 1, null, null);
  const grandFinal = await _createDuel(torneoId, 'GF', 1, 1, null, null);

  await Duelo.findByIdAndUpdate(sf1._id, { $set: { next_winner_duelo: grandFinal._id, next_winner_slot: 1, next_loser_duelo: lbFinal._id, next_loser_slot: 1 } });
  await Duelo.findByIdAndUpdate(sf2._id, { $set: { next_winner_duelo: grandFinal._id, next_winner_slot: 2, next_loser_duelo: lbFinal._id, next_loser_slot: 2 } });
  await Duelo.findByIdAndUpdate(lbFinal._id, { $set: { next_winner_duelo: null, next_winner_slot: null } }); // 3er puesto, sin avance

  return { clasificados: seeds.map((j, i) => ({ seed: i+1, nombre: j.nombre, grupo: j.grupo, puntos: j.puntos_liga||0, tipo: j.clasificacion_tipo })), duelosCreados: 4 };
}

module.exports = { generarPlayoffs };
