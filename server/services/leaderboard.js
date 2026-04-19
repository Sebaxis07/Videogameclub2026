/**
 * leaderboard.js
 * =====================================
 * Cálculo del ranking mensual de jugadores.
 *
 * Fórmula:
 *   Puntos Totales = (Partidas_Jugadas × 10) + (Partidas_Ganadas × 50)
 */

"use strict";

/**
 * Calcula los puntos totales de un jugador.
 *
 * @param {{ partidasJugadas: number, partidasGanadas: number }} player
 * @returns {number}
 */
function calcPoints(player) {
  const jugadas = Number(player.partidasJugadas) || 0;
  const ganadas = Number(player.partidasGanadas) || 0;
  return jugadas * 10 + ganadas * 50;
}

/**
 * Devuelve el Top N de jugadores ordenado por puntos (desc).
 *
 * @param {Array} players
 * @param {number} [n=5]
 * @returns {Array<{posicion: number, nombre: string, rut: string, puntos: number, partidasJugadas: number, partidasGanadas: number}>}
 */
function getTopN(players, n = 5) {
  const ranked = players
    .map((p) => ({
      nombre: p.nombre,
      rut: p.rut,
      discord: p.discord,
      plataforma: p.plataforma,
      partidasJugadas: Number(p.partidasJugadas) || 0,
      partidasGanadas: Number(p.partidasGanadas) || 0,
      puntos: calcPoints(p),
    }))
    .sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      // Desempate: más partidas ganadas
      return b.partidasGanadas - a.partidasGanadas;
    })
    .slice(0, n)
    .map((p, idx) => ({ posicion: idx + 1, ...p }));

  return ranked;
}

module.exports = { calcPoints, getTopN };
