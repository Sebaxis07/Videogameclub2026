"use strict";

const mongoose = require("mongoose");
const { PlayerState } = require("../services/gauntlet/playerStates");

/**
 * GauntletPlayer — Jugador en el sistema de Torneo Gauntlet
 * ==========================================================
 * Almacena el estado actual de cada participante del torneo,
 * su grupo de habilidad, posición final en grupos, y estadísticas.
 */
const gauntletPlayerSchema = new mongoose.Schema({
  torneo_id: {
    type: String,
    required: true,
    index: true,
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  rut: {
    type: String,
    default: null,
  },
  // Grupo de habilidad asignado en la Evaluación (A=Experto, B=Intermedio, C=Principiante)
  grupo: {
    type: String,
    enum: ['A', 'B', 'C'],
    required: true,
    index: true,
  },
  // Posición final dentro del grupo tras la Fase 1 (1=Ganador, 2=Subcampeón...)
  posicion_grupo: {
    type: Number,
    default: null, // null = Fase 1 no ha terminado
    index: true,
  },
  // Estado actual en la Máquina de Estados del Gauntlet
  estado: {
    type: String,
    enum: Object.values(PlayerState),
    default: PlayerState.ESPERANDO_INICIO,
    index: true,
  },
  // Victorias acumuladas en la Fase de Grupos / Arena
  wins_grupos: { type: Number, default: 0 },
  derrotas_grupos: { type: Number, default: 0 },
  puntos_arena: { type: Number, default: 0 },
  partidas_jugadas_arena: { type: Number, default: 0 },
  // Racha activa de victorias consecutivas (se resetea al perder)
  // Cuando llega a 3 → bono de +9 pts (en lugar de +3) y se reinicia
  racha_actual: { type: Number, default: 0 },

  // Victorias en la fase de escalada (Post-Grupos)
  wins_bracket: { type: Number, default: 0 },

  // ───────── Sistema Liga Suiza + Playoffs Doble-Eliminación (v2) ─────────
  // Puntos acumulados en la Liga (Swiss). 3 por victoria, 1 por derrota, +bonus por upset.
  puntos_liga:     { type: Number, default: 0 },
  wins_liga:       { type: Number, default: 0 },
  losses_liga:     { type: Number, default: 0 },
  partidas_liga:   { type: Number, default: 0 },
  upset_bonus:     { type: Number, default: 0 },
  speed_bonus:     { type: Number, default: 0 },
  racha_liga:      { type: Number, default: 0 },
  racha_bonus_acumulado:    { type: Number, default: 0 },
  flawless_bonus_acumulado: { type: Number, default: 0 },
  byes_liga:       { type: Number, default: 0 },
  // Oponentes ya enfrentados en la liga (para evitar repeticiones en Swiss pairing)
  opponents_liga:  [{ type: mongoose.Schema.Types.ObjectId, ref: "GauntletPlayer" }],
  // Última ronda de Swiss en la que el jugador apareció
  ultima_ronda_liga: { type: Number, default: 0 },

  // Estado de bracket post-liga
  bracket_seed:    { type: Number, default: null },   // 1..8 si clasificó
  bracket_status:  {
    type: String,
    enum: ['inactivo', 'upper', 'lower', 'eliminado_playoff', 'campeon'],
    default: 'inactivo',
  },
  clasificacion_tipo: {
    type: String,
    enum: ['tier_top2', 'wildcard', null],
    default: null,
  },

  createdAt: { type: Date, default: Date.now },
});

// Índice compuesto para la consulta "siguiente oponente"
gauntletPlayerSchema.index({ torneo_id: 1, grupo: 1, posicion_grupo: 1 });

module.exports = mongoose.model("GauntletPlayer", gauntletPlayerSchema);
