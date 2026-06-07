"use strict";

/**
 * playerStates.js — Definición de la Máquina de Estados del Jugador
 * =====================================================================
 * Define todos los estados posibles y las reglas de transición válidas.
 * El ERP nunca puede saltar etapas porque cada transición es validada aquí.
 */

// ─── Enum de Estados ─────────────────────────────────────────────────────────

const PlayerState = {
  ESPERANDO_INICIO: 'esperando_inicio',  // Inscrito, aún no juega
  JUGANDO_GRUPOS:   'jugando_grupos',    // En pleno Round Robin interno
  ELIMINADO:        'eliminado',         // Cayó en cualquier fase
  PROMOVIDO:        'promovido',         // C1 venció a B2 (1ra barrera cruzada)
  EN_CAMINO:        'en_camino',         // Venció a B1, rumbo al Gauntlet
  EN_GAUNTLET:      'en_gauntlet',       // Enfrentando al Grupo A secuencialmente
  FINALISTA:        'finalista',         // Venció a A2, va a la Gran Final
  CAMPEON:          'campeon',           // Venció al Boss (A1)
};

// ─── Enum de Fases de Duelo ───────────────────────────────────────────────────

const DuelPhase = {
  GRUPOS:      'grupos',          // Round Robin interno (todos los grupos)
  PROMOCION:   'promocion',       // C1 vs B2
  CAMINO:      'camino',          // Ganador Promoción vs B1
  GAUNTLET_1:  'gauntlet_1',      // vs A4
  GAUNTLET_2:  'gauntlet_2',      // vs A3
  GAUNTLET_3:  'gauntlet_3',      // vs A2
  GRAN_FINAL:  'gran_final',      // vs A1 (Boss)

  // ─── Sistema v2: Liga Suiza + Doble Eliminación ─────────────────────────
  LIGA:                 'liga',                  // Ronda de Liga Suiza
  PLAYOFF_UB:           'playoff_ub',            // Upper bracket (cualquier ronda)
  PLAYOFF_LB:           'playoff_lb',            // Lower bracket (cualquier ronda)
  PLAYOFF_GRAND_FINAL:  'playoff_grand_final',   // Gran Final (UB winner vs LB winner)
};

// ─── Tabla de Transiciones ────────────────────────────────────────────────────
// Para cada fase, define:
//   ganadorEstado: nuevo estado del ganador
//   perdedorEstado: nuevo estado del perdedor
//   siguienteFase: próxima fase que se genera automáticamente (null = fin)
//   siguienteOponenteQuery: criterio para buscar el próximo rival en MongoDB

const TRANSITION_TABLE = {
  [DuelPhase.GRUPOS]: {
    ganadorEstado:  PlayerState.JUGANDO_GRUPOS,  // Sigue en grupos (acumula Ws)
    perdedorEstado: PlayerState.JUGANDO_GRUPOS,  // Sigue en grupos también (es Round Robin)
    siguienteFase:  null,                        // El Round Robin se resuelve globalmente
  },
  [DuelPhase.PROMOCION]: {
    ganadorEstado:  PlayerState.PROMOVIDO,
    perdedorEstado: PlayerState.ELIMINADO,
    siguienteFase:  DuelPhase.CAMINO,
    siguienteOponenteQuery: { grupo: 'B', posicion_grupo: 1 }, // B1
  },
  [DuelPhase.CAMINO]: {
    ganadorEstado:  PlayerState.EN_CAMINO,
    perdedorEstado: PlayerState.ELIMINADO,
    siguienteFase:  DuelPhase.GAUNTLET_3,            // Salta directo a A2 (diseño: 3 peldaños)
    siguienteOponenteQuery: { grupo: 'A', posicion_grupo: 2 }, // A2
  },
  [DuelPhase.GAUNTLET_1]: {
    ganadorEstado:  PlayerState.EN_GAUNTLET,
    perdedorEstado: PlayerState.ELIMINADO,
    siguienteFase:  DuelPhase.GAUNTLET_2,
    siguienteOponenteQuery: { grupo: 'A', posicion_grupo: 3 }, // A3
  },
  [DuelPhase.GAUNTLET_2]: {
    ganadorEstado:  PlayerState.EN_GAUNTLET,
    perdedorEstado: PlayerState.ELIMINADO,
    siguienteFase:  DuelPhase.GAUNTLET_3,
    siguienteOponenteQuery: { grupo: 'A', posicion_grupo: 2 }, // A2
  },
  [DuelPhase.GAUNTLET_3]: {
    ganadorEstado:  PlayerState.FINALISTA,
    perdedorEstado: PlayerState.ELIMINADO,
    siguienteFase:  DuelPhase.GRAN_FINAL,
    siguienteOponenteQuery: { grupo: 'A', posicion_grupo: 1 }, // A1 — El Boss
  },
  [DuelPhase.GRAN_FINAL]: {
    ganadorEstado:  PlayerState.CAMPEON,
    perdedorEstado: PlayerState.ELIMINADO,
    siguienteFase:  null, // Torneo terminado
    siguienteOponenteQuery: null,
  },
};

// ─── Validadores ─────────────────────────────────────────────────────────────

/**
 * Verifica si una transición de estado es válida.
 * Protege contra saltos de etapa o estados imposibles.
 */
function isValidTransition(estadoActual, fase) {
  const STATE_PREREQS = {
    [DuelPhase.GRUPOS]:     [PlayerState.ESPERANDO_INICIO, PlayerState.JUGANDO_GRUPOS],
    [DuelPhase.PROMOCION]:  [PlayerState.JUGANDO_GRUPOS], // Solo el C1 puede llegar aquí
    [DuelPhase.CAMINO]:     [PlayerState.PROMOVIDO],
    [DuelPhase.GAUNTLET_1]: [PlayerState.EN_CAMINO],
    [DuelPhase.GAUNTLET_2]: [PlayerState.EN_GAUNTLET],
    [DuelPhase.GAUNTLET_3]: [PlayerState.EN_GAUNTLET],
    [DuelPhase.GRAN_FINAL]: [PlayerState.FINALISTA],
  };

  const prereqs = STATE_PREREQS[fase];
  if (!prereqs) return false;
  return prereqs.includes(estadoActual);
}

module.exports = { PlayerState, DuelPhase, TRANSITION_TABLE, isValidTransition };
