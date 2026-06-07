"use strict";

/**
 * nerfs.js — Ruleta Rusa de nerfs para duelos A vs C
 * ======================================================
 * Cuando un jugador del Grupo C (principiante) asciende y se enfrenta a
 * un Grupo A (experto) en el Gauntlet, la ruleta asigna un nerf aleatorio
 * al experto para equilibrar la pelea.
 * 
 * En esta versión, los nerfeos se seleccionan de forma dinámica a partir
 * del kit de la ronda para que tengan sentido de acuerdo al equipamiento.
 */

const { getKitById } = require("./kits");

/**
 * Elige un nerf aleatorio basado en la disparidad de nivel (gap) y el kit activo.
 * @param {number} gap — Diferencia de niveles (1 o 2).
 * @param {string} kitId — ID del kit de la ronda.
 */
function pickRandomNerf(gap = 1, kitId = 'melee_clasico') {
  const kit = getKitById(kitId);
  const pool = kit.nerfs.filter(n => {
    if (gap >= 2) return n.severity >= 3;
    return n.severity >= 2; // Queremos que los nerfs sean significativos en cualquier gap
  });
  
  const finalPool = pool.length > 0 ? pool : kit.nerfs;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

/**
 * Determina si un duelo debería recibir un nerf basándose en la disparidad de nivel.
 * Regla: Si el oponente (J2) es de un nivel superior al ascendente (J1), J2 recibe un nerf.
 */
function debeAplicarNerf(jugador1, jugador2, fase) {
  const FASES_GAUNTLET = ['promocion', 'camino', 'gauntlet_1', 'gauntlet_2', 'gauntlet_3', 'gran_final'];
  if (!FASES_GAUNTLET.includes(fase)) return false;
  if (!jugador1 || !jugador2) return false;

  const niveles = { 'C': 0, 'B': 1, 'A': 2 };
  const n1 = niveles[jugador1.grupo] ?? 0;
  const n2 = niveles[jugador2.grupo] ?? 0;

  // Si el oponente es de nivel superior, aplicar nerf al pro
  return n2 > n1;
}

module.exports = { pickRandomNerf, debeAplicarNerf };
