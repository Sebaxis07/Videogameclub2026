"use strict";

const mongoose = require("mongoose");
const { DuelPhase } = require("../services/gauntlet/playerStates");

/**
 * Duelo — Registro de cada enfrentamiento del Torneo Gauntlet
 * =============================================================
 * Cada documento representa un solo partido 1v1 con su resultado.
 * La fase indica qué "peldaño de la escalera" es este duelo.
 */
const dueloSchema = new mongoose.Schema({
  torneo_id: {
    type: String,
    required: true,
    index: true,
  },
  fase: {
    type: String,
    enum: Object.values(DuelPhase),
    required: true,
  },
  // Los IDs de los jugadores que participan
  // (null en duelos de playoff que aún esperan a su participante)
  jugador1_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GauntletPlayer",
    default: null,
  },
  jugador2_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GauntletPlayer",
    default: null,
  },
  // null = pendiente, ObjectId = jugador ganador
  ganador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GauntletPlayer",
    default: null,
  },
  perdedor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GauntletPlayer",
    default: null,
  },
  estado: {
    type: String,
    enum: ['pendiente', 'completado'],
    default: 'pendiente',
  },
  // Nerf aplicado al experto (Grupo A) cuando enfrenta a un novato (Grupo C)
  // Ver server/services/gauntlet/nerfs.js
  nerf: {
    id:             { type: String, default: null },
    categoria:      { type: String, default: null },
    categoriaKey:   { type: String, default: null },
    categoriaIcon:  { type: String, default: null },
    color:          { type: String, default: null },
    nombre:         { type: String, default: null },
    descripcion:    { type: String, default: null },
    impacto:        { type: String, default: null },
    severity:       { type: Number, default: null },
  },
  // Kit de la ronda (especialmente para la fase de grupos/arena)
  kit: {
    id:          { type: String, default: null },
    nombre:      { type: String, default: null },
    icon:        { type: String, default: null },
    descripcion: { type: String, default: null },
  },

  // ───────── Sistema Liga Suiza + Playoffs (v2) ─────────
  // Número de ronda de la Liga Suiza (1..N). null para fases de playoff o gauntlet legacy.
  ronda_liga:  { type: Number, default: null, index: true },
  // BYE: si jugador2_id es null, el duelo es un BYE automático para jugador1.
  is_bye:      { type: Boolean, default: false },
  // Bracket position: side ('UB'|'LB'|'GF') y match index (orden lógico)
  bracket_side:  { type: String, enum: ['UB','LB','GF', null], default: null },
  bracket_round: { type: Number, default: null },
  bracket_slot:  { type: Number, default: null },
  // Qué duelo sigue (donde se inserta el ganador / perdedor)
  next_winner_duelo: { type: mongoose.Schema.Types.ObjectId, ref: "Duelo", default: null },
  next_winner_slot:  { type: Number, default: null }, // 1 ó 2
  next_loser_duelo:  { type: mongoose.Schema.Types.ObjectId, ref: "Duelo", default: null },
  next_loser_slot:   { type: Number, default: null },

  // Handicap calibrado (reemplaza la Ruleta aleatoria en el nuevo sistema)
  handicap: {
    tier_gap: { type: Number, default: 0 },              // 0, 1, ó 2
    target:   { type: mongoose.Schema.Types.ObjectId, ref: "GauntletPlayer", default: null }, // jugador castigado
    heavy:    {                                          // obligatorio si gap = 2
      id:          { type: String, default: null },
      nombre:      { type: String, default: null },
      descripcion: { type: String, default: null },
      severity:    { type: Number, default: null },
    },
    light_options: [{                                    // 3 opciones a elegir si gap >= 1
      id:          { type: String, default: null },
      nombre:      { type: String, default: null },
      descripcion: { type: String, default: null },
      severity:    { type: Number, default: null },
    }],
    light_chosen: {                                      // qué eligió el jugador superior
      id:          { type: String, default: null },
      nombre:      { type: String, default: null },
      descripcion: { type: String, default: null },
      severity:    { type: Number, default: null },
    },
  },
  projected: {
    type: Boolean,
    default: false,
  },
  remaining_seconds: { type: Number, default: null },
  speed_bonus:       { type: Number, default: 0 },
  flawless:          { type: Boolean, default: false },
  flawless_bonus:    { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
});

module.exports = mongoose.model("Duelo", dueloSchema);
