"use strict";

/**
 * swissPairing.js — Emparejamiento Suizo para la Liga.
 * =====================================================================
 * Reglas:
 *   1. Ordenar jugadores por puntos (desc).
 *   2. Emparejar al jugador con más puntos con otro de puntaje similar
 *      que NO haya enfrentado todavía.
 *   3. Si todos los oponentes válidos ya fueron enfrentados, permitir
 *      un rematch antes que dejar a alguien sin jugar.
 *   4. Si el total es impar: el jugador con menos puntos que NO haya
 *      tenido BYE recibe un BYE (+3 pts automáticos, cuenta como win).
 */

const GauntletPlayer = require("../../models/GauntletPlayer");
const Duelo          = require("../../models/Duelo");
const { DuelPhase, PlayerState } = require("../gauntlet/playerStates");
const { getRandomKit } = require("../gauntlet/kits");
const { buildHandicap } = require("./handicap");

const TIER_INDEX = { C: 0, B: 1, A: 2 };

/**
 * Obtiene el conjunto de IDs ya enfrentados por un jugador en la liga.
 */
function opponentsSet(player) {
  return new Set((player.opponents_liga || []).map(id => id.toString()));
}

/**
 * Genera una nueva ronda de Liga Suiza.
 * @param {string} torneoId
 * @returns {Promise<{ ronda, kit, duelos, bye }>}
 */
async function generarRondaLiga(torneoId) {
  // 1. Cargar todos los jugadores activos (no eliminados, no en playoff)
  const jugadores = await GauntletPlayer.find({
    torneo_id: torneoId,
    estado: { $nin: [PlayerState.ELIMINADO, PlayerState.CAMPEON] },
  }).lean();

  if (jugadores.length < 2) {
    throw new Error("Se necesitan al menos 2 jugadores para generar una ronda.");
  }

  // 2. Determinar el número de ronda (max(ronda_liga) + 1)
  const maxRondaDoc = await Duelo.findOne({
    torneo_id: torneoId,
    fase: DuelPhase.LIGA,
  }).sort({ ronda_liga: -1 }).select("ronda_liga").lean();
  const ronda = (maxRondaDoc?.ronda_liga || 0) + 1;

  // 3. Verificar que no haya duelos pendientes de la ronda anterior
  const pendientesPrev = await Duelo.countDocuments({
    torneo_id: torneoId,
    fase: DuelPhase.LIGA,
    estado: "pendiente",
  });
  if (pendientesPrev > 0) {
    throw new Error("Hay duelos pendientes de la ronda anterior. Resuelve todos antes de generar la siguiente.");
  }

  // 4. Ordenar por puntos desc, luego por upset_bonus, luego aleatorio
  const ordenados = [...jugadores].sort((a, b) => {
    if ((b.puntos_liga || 0) !== (a.puntos_liga || 0)) return (b.puntos_liga || 0) - (a.puntos_liga || 0);
    if ((b.upset_bonus || 0) !== (a.upset_bonus || 0)) return (b.upset_bonus || 0) - (a.upset_bonus || 0);
    return Math.random() - 0.5;
  });

  // 5. Asignar BYE si es impar (al de menor puntaje que no haya tenido BYE)
  let byePlayer = null;
  let pool = ordenados;
  if (ordenados.length % 2 === 1) {
    for (let i = ordenados.length - 1; i >= 0; i--) {
      if ((ordenados[i].byes_liga || 0) === 0) { byePlayer = ordenados[i]; break; }
    }
    if (!byePlayer) byePlayer = ordenados[ordenados.length - 1];
    pool = ordenados.filter(p => p._id.toString() !== byePlayer._id.toString());
  }

  // 6. Emparejamiento greedy: el top busca al siguiente que no haya enfrentado
  const remaining = [...pool];
  const pairs = [];
  while (remaining.length >= 2) {
    const p1 = remaining.shift();
    const p1Opps = opponentsSet(p1);
    let idx = remaining.findIndex(c => !p1Opps.has(c._id.toString()));
    if (idx === -1) idx = 0; // todos ya enfrentados: permite rematch
    const p2 = remaining.splice(idx, 1)[0];
    pairs.push([p1, p2]);
  }

  // 7. Kit aleatorio para toda la ronda
  const kit = getRandomKit();

  // 8. Crear duelos en MongoDB con handicap calibrado
  const docs = pairs.map(([p1, p2]) => {
    const handicap = buildHandicap(p1, p2, kit.id);
    return {
      torneo_id:   torneoId,
      fase:        DuelPhase.LIGA,
      ronda_liga:  ronda,
      jugador1_id: p1._id,
      jugador2_id: p2._id,
      estado:      "pendiente",
      kit:         { id: kit.id, nombre: kit.nombre, icon: kit.icon, descripcion: kit.descripcion },
      handicap,
    };
  });

  // 9. Crear BYE como duelo especial (jugador2_id repite a jugador1 para satisfacer la validación)
  if (byePlayer) {
    docs.push({
      torneo_id:   torneoId,
      fase:        DuelPhase.LIGA,
      ronda_liga:  ronda,
      jugador1_id: byePlayer._id,
      jugador2_id: byePlayer._id,
      is_bye:      true,
      estado:      "completado",
      resolvedAt:  new Date(),
      kit:         { id: kit.id, nombre: kit.nombre, icon: kit.icon, descripcion: kit.descripcion },
      ganador_id:  byePlayer._id,
    });
  }

  const inserted = await Duelo.insertMany(docs);

  // 10. Aplicar el BYE: +3 pts automáticos
  if (byePlayer) {
    await GauntletPlayer.findByIdAndUpdate(byePlayer._id, {
      $inc: { puntos_liga: 3, wins_liga: 1, partidas_liga: 1, byes_liga: 1 },
      $set: { ultima_ronda_liga: ronda, estado: PlayerState.JUGANDO_GRUPOS },
    });
  }

  // 11. Marcar a todos como JUGANDO_GRUPOS si estaban ESPERANDO_INICIO
  await GauntletPlayer.updateMany(
    { torneo_id: torneoId, estado: PlayerState.ESPERANDO_INICIO },
    { $set: { estado: PlayerState.JUGANDO_GRUPOS } }
  );

  return { ronda, kit, duelos: inserted, bye: byePlayer };
}

module.exports = { generarRondaLiga };
