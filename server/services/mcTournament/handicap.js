"use strict";

/**
 * handicap.js — Sistema de "Impuesto de Tier" calibrado.
 * =====================================================================
 * Reemplaza la Ruleta aleatoria de nerfs por un sistema predecible:
 *   - gap 0 (mismo tier):      sin handicap
 *   - gap 1 (A-B, B-C):        el superior elige 1 de 3 debuffs leves
 *   - gap 2 (A-C):             el superior recibe 1 debuff fuerte fijo
 *                              + elige 1 de 3 debuffs leves
 */

const { getKitById } = require("../gauntlet/kits");

const TIER_INDEX = { C: 0, B: 1, A: 2 };

function getTierGap(g1, g2) {
  const a = TIER_INDEX[g1] ?? 0;
  const b = TIER_INDEX[g2] ?? 0;
  return Math.abs(a - b);
}

function getHigherTierPlayer(j1, j2) {
  if (!j1 || !j2) return null;
  const a = TIER_INDEX[j1.grupo] ?? 0;
  const b = TIER_INDEX[j2.grupo] ?? 0;
  if (a === b) return null;
  return a > b ? j1 : j2;
}

function pickN(arr, n) {
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/**
 * Construye el handicap para un duelo entre dos jugadores.
 * @param {object} j1 — Jugador 1
 * @param {object} j2 — Jugador 2
 * @param {string} kitId — ID del kit de la ronda
 * @returns {{ tier_gap, target, heavy, light_options, light_chosen }}
 */
function buildHandicap(j1, j2, kitId = 'melee_clasico') {
  const gap = getTierGap(j1.grupo, j2.grupo);
  if (gap === 0) {
    return { tier_gap: 0, target: null, heavy: null, light_options: [], light_chosen: null };
  }
  const higher = getHigherTierPlayer(j1, j2);

  // Obtener los nerfs específicos de este kit
  const kit = getKitById(kitId);
  const kitNerfs = kit.nerfs || [];

  // Dividir los nerfs por severidad
  // Debuffs leves (severity <= 2) y pesados (severity >= 3)
  const lightPool = kitNerfs.filter(n => n.severity <= 2);
  const heavyPool = kitNerfs.filter(n => n.severity >= 3);

  // Si no hay suficientes en los pools específicos, usar la lista completa del kit
  const finalLightPool = lightPool.length >= 3 ? lightPool : kitNerfs;
  const finalHeavyPool = heavyPool.length >= 1 ? heavyPool : kitNerfs;

  const options = pickN(finalLightPool, 3);
  const heavy   = gap >= 2 ? pickN(finalHeavyPool, 1)[0] : null;

  return {
    tier_gap:      gap,
    target:        higher?._id || higher,
    heavy:         heavy,
    light_options: options,
    light_chosen:  null,
  };
}

module.exports = {
  buildHandicap,
  getTierGap,
  getHigherTierPlayer,
};
