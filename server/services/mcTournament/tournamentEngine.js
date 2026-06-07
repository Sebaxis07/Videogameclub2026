"use strict";

/**
 * tournamentEngine.js — Motor central del torneo v2.
 * =====================================================================
 * - resolverLiga(dueloId, ganadorId): registra resultado de Liga Suiza,
 *   asigna puntos base + bonus por upset, actualiza oponentes_liga.
 * - resolverPlayoff(dueloId, ganadorId): registra resultado de bracket
 *   y propaga al next_winner_duelo / next_loser_duelo correctos.
 * - elegirLightHandicap(dueloId, debuffId): registra qué debuff leve
 *   eligió el jugador de tier superior.
 * - getSnapshot(torneoId): estado completo del torneo.
 */

const mongoose       = require("mongoose");
const GauntletPlayer = require("../../models/GauntletPlayer");
const Duelo          = require("../../models/Duelo");
const { DuelPhase, PlayerState } = require("../gauntlet/playerStates");
const { buildHandicap } = require("./handicap");
const { generarPlayoffs } = require("./playoffBracket");

const TIER_INDEX = { C: 0, B: 1, A: 2 };

/** Número de rondas de Liga después de las cuales se inician playoffs automáticamente. */
const MAX_RONDAS_LIGA = 3;

/**
 * Calcula puntos: 3 por victoria, 1 por derrota. Bonus upset:
 *   C gana a A → +2 al C
 *   C gana a B / B gana a A → +1 al de menor tier
 */
function _calcularPuntosYBonus(ganador, perdedor) {
  const tG = TIER_INDEX[ganador.grupo] ?? 0;
  const tP = TIER_INDEX[perdedor.grupo] ?? 0;
  let bonus = 0;
  if (tG < tP) { // ganador es de menor tier (upset)
    const gap = tP - tG;
    bonus = gap >= 2 ? 2 : 1;
  }
  return { winPoints: 3, lossPoints: 1, upsetBonus: bonus };
}

/**
 * Resuelve un duelo de Liga Suiza.
 */
async function resolverLiga(dueloId, ganadorId, remainingSeconds = null, flawless = false) {
  const duelo = await Duelo.findById(dueloId)
    .populate("jugador1_id")
    .populate("jugador2_id");

  if (!duelo) throw new Error("Duelo no encontrado.");
  if (duelo.fase !== DuelPhase.LIGA) throw new Error("Este duelo no es de Liga.");
  if (duelo.estado === "completado") throw new Error("Ya fue resuelto.");
  if (duelo.is_bye) throw new Error("Un BYE se resuelve automáticamente.");

  const esJ1 = duelo.jugador1_id._id.toString() === ganadorId;
  const esJ2 = duelo.jugador2_id._id.toString() === ganadorId;
  if (!esJ1 && !esJ2) throw new Error("El ganador no es participante.");

  const ganador  = esJ1 ? duelo.jugador1_id : duelo.jugador2_id;
  const perdedor = esJ1 ? duelo.jugador2_id : duelo.jugador1_id;

  // Calcular speed bonus estilo Kahoot (base max de 90 segundos)
  let speedBonus = 0;
  if (remainingSeconds != null) {
    const secs = Math.max(0, Math.min(90, Number(remainingSeconds)));
    // Max 1.0 punto extra si se termina en 0 segundos de combate (90s restantes)
    speedBonus = Number((secs / 90.0).toFixed(4));
  }

  // Calcular victoria impecable (+0.30 pts)
  const flawlessBonus = flawless ? 0.30 : 0;

  // Calcular racha de victorias en liga suiza y su bono incremental (max +0.75 pts)
  const nuevaRacha = (ganador.racha_liga || 0) + 1;
  const streakBonus = nuevaRacha >= 2 ? Number((Math.min(3, nuevaRacha - 1) * 0.25).toFixed(2)) : 0;

  const { winPoints, lossPoints, upsetBonus } = _calcularPuntosYBonus(ganador, perdedor);

  const totalWin = winPoints + upsetBonus + speedBonus + flawlessBonus + streakBonus;
  ganador.puntos_liga      = Number(((ganador.puntos_liga || 0) + totalWin).toFixed(4));
  ganador.wins_liga        = (ganador.wins_liga || 0) + 1;
  ganador.partidas_liga    = (ganador.partidas_liga || 0) + 1;
  ganador.upset_bonus      = (ganador.upset_bonus || 0) + upsetBonus;
  ganador.speed_bonus      = Number(((ganador.speed_bonus || 0) + speedBonus).toFixed(4));
  ganador.racha_liga       = nuevaRacha;
  ganador.racha_bonus_acumulado = Number(((ganador.racha_bonus_acumulado || 0) + streakBonus).toFixed(4));
  ganador.flawless_bonus_acumulado = Number(((ganador.flawless_bonus_acumulado || 0) + flawlessBonus).toFixed(4));
  ganador.ultima_ronda_liga = duelo.ronda_liga;
  if (!ganador.opponents_liga) ganador.opponents_liga = [];
  ganador.opponents_liga.push(perdedor._id);
  ganador.estado = PlayerState.JUGANDO_GRUPOS;

  perdedor.puntos_liga     = Number(((perdedor.puntos_liga || 0) + lossPoints).toFixed(4));
  perdedor.losses_liga     = (perdedor.losses_liga || 0) + 1;
  perdedor.partidas_liga   = (perdedor.partidas_liga || 0) + 1;
  perdedor.racha_liga      = 0; // Se corta la racha al perder
  perdedor.ultima_ronda_liga = duelo.ronda_liga;
  if (!perdedor.opponents_liga) perdedor.opponents_liga = [];
  perdedor.opponents_liga.push(ganador._id);
  perdedor.estado = PlayerState.JUGANDO_GRUPOS;

  await Promise.all([ganador.save(), perdedor.save()]);

  duelo.ganador_id  = ganador._id;
  duelo.perdedor_id = perdedor._id;
  duelo.estado      = "completado";
  duelo.resolvedAt  = new Date();
  if (remainingSeconds != null) {
    duelo.remaining_seconds = Number(remainingSeconds);
    duelo.speed_bonus = speedBonus;
  }
  duelo.flawless = flawless;
  duelo.flawless_bonus = flawlessBonus;
  await duelo.save();

  // ── Auto-playoffs al terminar la ronda MAX_RONDAS_LIGA ───────────────────────
  let playoffsIniciados = null;
  if (duelo.ronda_liga >= MAX_RONDAS_LIGA) {
    const pendientesRestantes = await Duelo.countDocuments({
      torneo_id: duelo.torneo_id,
      fase: DuelPhase.LIGA,
      estado: "pendiente",
    });
    if (pendientesRestantes === 0) {
      // Último duelo de la ronda 3 — iniciar playoffs automáticamente
      try {
        playoffsIniciados = await generarPlayoffs(duelo.torneo_id);
      } catch (e) {
        // Si ya existía bracket o algún error, no interrumpir el flujo
        playoffsIniciados = { error: e.message };
      }
    }
  }

  return {
    duelo,
    ganador,
    perdedor,
    upsetBonus,
    puntos: { ganador: ganador.puntos_liga, perdedor: perdedor.puntos_liga },
    playoffsIniciados,
  };
}

/**
 * Resuelve un duelo de Playoff (UB/LB/GF) y propaga ganador/perdedor.
 */
async function resolverPlayoff(dueloId, ganadorId) {
  const duelo = await Duelo.findById(dueloId)
    .populate("jugador1_id")
    .populate("jugador2_id");

  if (!duelo) throw new Error("Duelo no encontrado.");
  if (!duelo.bracket_side) throw new Error("Este duelo no es de playoff.");
  if (duelo.estado === "completado") throw new Error("Ya fue resuelto.");
  if (!duelo.jugador1_id || !duelo.jugador2_id) {
    throw new Error("El duelo aún no tiene ambos participantes asignados.");
  }

  const esJ1 = duelo.jugador1_id._id.toString() === ganadorId;
  const esJ2 = duelo.jugador2_id._id.toString() === ganadorId;
  if (!esJ1 && !esJ2) throw new Error("El ganador no es participante.");

  const ganador  = esJ1 ? duelo.jugador1_id : duelo.jugador2_id;
  const perdedor = esJ1 ? duelo.jugador2_id : duelo.jugador1_id;

  duelo.ganador_id  = ganador._id;
  duelo.perdedor_id = perdedor._id;
  duelo.estado      = "completado";
  duelo.resolvedAt  = new Date();
  await duelo.save();

  ganador.wins_bracket = (ganador.wins_bracket || 0) + 1;
  await ganador.save();

  // Propagar al siguiente duelo del ganador
  if (duelo.next_winner_duelo && duelo.next_winner_slot) {
    const next = await Duelo.findById(duelo.next_winner_duelo).populate("jugador1_id").populate("jugador2_id");
    if (next) {
      if (duelo.next_winner_slot === 1) next.jugador1_id = ganador._id;
      else                              next.jugador2_id = ganador._id;
      await next.save();

      // Si ambos slots están llenos ahora, calcular handicap
      const fresh = await Duelo.findById(next._id).populate("jugador1_id").populate("jugador2_id");
      if (fresh.jugador1_id && fresh.jugador2_id && (!fresh.handicap || fresh.handicap.tier_gap == null || fresh.handicap.tier_gap === 0)) {
        const h = buildHandicap(fresh.jugador1_id, fresh.jugador2_id, fresh.kit?.id);
        fresh.handicap = h;
        await fresh.save();
      }
    }
  }

  // Propagar al lower bracket o eliminación
  if (duelo.next_loser_duelo && duelo.next_loser_slot) {
    perdedor.bracket_status = 'lower';
    await perdedor.save();
    const next = await Duelo.findById(duelo.next_loser_duelo);
    if (next) {
      if (duelo.next_loser_slot === 1) next.jugador1_id = perdedor._id;
      else                             next.jugador2_id = perdedor._id;
      await next.save();
      const fresh = await Duelo.findById(next._id).populate("jugador1_id").populate("jugador2_id");
      if (fresh.jugador1_id && fresh.jugador2_id && (!fresh.handicap || fresh.handicap.tier_gap == null || fresh.handicap.tier_gap === 0)) {
        const h = buildHandicap(fresh.jugador1_id, fresh.jugador2_id, fresh.kit?.id);
        fresh.handicap = h;
        await fresh.save();
      }
    }
  } else {
    // Sin lower destination = eliminación definitiva
    perdedor.bracket_status = 'eliminado_playoff';
    perdedor.estado = PlayerState.ELIMINADO;
    await perdedor.save();
  }

  // Gran final ganada → campeón
  if (duelo.bracket_side === 'GF') {
    ganador.bracket_status = 'campeon';
    ganador.estado = PlayerState.CAMPEON;
    await ganador.save();
  }

  return { duelo, ganador, perdedor };
}

/**
 * Registra la elección del debuff leve.
 */
async function elegirLightHandicap(dueloId, debuffId) {
  const duelo = await Duelo.findById(dueloId);
  if (!duelo) throw new Error("Duelo no encontrado.");
  const opts = duelo.handicap?.light_options || [];
  const chosen = opts.find(o => o.id === debuffId);
  if (!chosen) throw new Error("Debuff no está dentro de las opciones.");
  duelo.handicap.light_chosen = chosen;
  await duelo.save();
  return duelo;
}

/**
 * Snapshot completo del torneo.
 */
async function getSnapshot(torneoId) {
  const [jugadores, duelos] = await Promise.all([
    GauntletPlayer.find({ torneo_id: torneoId }).lean(),
    Duelo.find({ torneo_id: torneoId })
      .populate("jugador1_id", "nombre grupo puntos_liga wins_liga losses_liga bracket_seed bracket_status estado")
      .populate("jugador2_id", "nombre grupo puntos_liga wins_liga losses_liga bracket_seed bracket_status estado")
      .populate("ganador_id",  "nombre grupo")
      .lean(),
  ]);

  // ─── Liga ─────────────────────────────────────────────────────────────
  const ligaDuelos = duelos.filter(d => d.fase === DuelPhase.LIGA);
  const rondas = {};
  ligaDuelos.forEach(d => {
    const r = d.ronda_liga || 0;
    if (!rondas[r]) rondas[r] = { ronda: r, kit: d.kit, duelos: [] };
    rondas[r].duelos.push(d);
  });
  const rondasArr = Object.values(rondas).sort((a, b) => a.ronda - b.ronda);

  // Crear un mapa de ID de jugador a sus puntos de liga para cálculo de Buchholz
  const puntosMap = {};
  jugadores.forEach(j => {
    puntosMap[j._id.toString()] = j.puntos_liga || 0;
  });

  // Calcular Buchholz score para cada jugador
  jugadores.forEach(j => {
    let score = 0;
    if (j.opponents_liga && j.opponents_liga.length > 0) {
      j.opponents_liga.forEach(oppId => {
        score += puntosMap[oppId.toString()] || 0;
      });
    }
    j.buchholz_score = Number(score.toFixed(4));
  });

  // ─── Tabla unificada ──────────────────────────────────────────────────
  const tabla = [...jugadores].sort((a, b) =>
    (b.puntos_liga || 0) - (a.puntos_liga || 0)
    || (b.buchholz_score || 0) - (a.buchholz_score || 0)
    || (b.wins_liga || 0) - (a.wins_liga || 0)
    || (a.losses_liga || 0) - (b.losses_liga || 0)
  );

  // ─── Por Tier ─────────────────────────────────────────────────────────
  const porTier = { A: [], B: [], C: [] };
  tabla.forEach(j => { if (porTier[j.grupo]) porTier[j.grupo].push(j); });

  // ─── Playoffs ─────────────────────────────────────────────────────────
  const playoffDuelos = duelos.filter(d => d.bracket_side);
  const bracket = {
    UB: playoffDuelos.filter(d => d.bracket_side === 'UB').sort((a, b) => (a.bracket_round - b.bracket_round) || (a.bracket_slot - b.bracket_slot)),
    LB: playoffDuelos.filter(d => d.bracket_side === 'LB').sort((a, b) => (a.bracket_round - b.bracket_round) || (a.bracket_slot - b.bracket_slot)),
    GF: playoffDuelos.filter(d => d.bracket_side === 'GF'),
  };

  const campeon = jugadores.find(j => j.estado === PlayerState.CAMPEON) || null;

  // Rondas recomendadas: ceil(log2(N))+1, capado entre 3 y 5
  const activos = jugadores.filter(j => j.estado !== PlayerState.ELIMINADO).length;
  const rondasRecomendadas = activos < 2 ? 0
    : Math.min(5, Math.max(3, Math.ceil(Math.log2(activos)) + 1));

  return {
    jugadores,
    tabla,
    porTier,
    liga: {
      rondas: rondasArr,
      totalDuelos: ligaDuelos.length,
      pendientes: ligaDuelos.filter(d => d.estado === 'pendiente').length,
      rondasRecomendadas,
      rondaActual: rondasArr.length,
    },
    playoffs: { bracket, activo: playoffDuelos.length > 0 },
    campeon,
  };
}

module.exports = {
  resolverLiga,
  resolverPlayoff,
  elegirLightHandicap,
  getSnapshot,
};
