"use strict";

const mongoose = require("mongoose");

const jugadorRefSchema = new mongoose.Schema({
  rut:    { type: String, required: true },
  nombre: { type: String, required: true },
  score:  { type: Number, default: 0 },
  rango:  { type: String, enum: ["Oro", "Plata", "Bronce"], default: "Bronce" },
}, { _id: false });

const matchSchema = new mongoose.Schema({
  id:        { type: String, required: true },
  ronda:     { type: Number, default: 1 },
  jugador1:  { type: jugadorRefSchema, default: null },
  jugador2:  { type: jugadorRefSchema, default: null },
  ganador:   { type: String, default: null },
  estado:    { type: String, enum: ["pendiente", "en_curso", "completado", "wo"], default: "pendiente" },
  nerfRandom:{ type: Boolean, default: false },
  projected: { type: Boolean, default: false },
  notas:     { type: String, default: "" },
}, { _id: false });

const finalMatchSchema = new mongoose.Schema({
  modo:      { type: String, enum: [null, "titanes", "sorpresa", "david_goliat"], default: null },
  jugador1:  { type: jugadorRefSchema, default: null },
  jugador2:  { type: jugadorRefSchema, default: null },
  ganador:   { type: String, default: null },
  nerfRandom:{ type: Boolean, default: false },
  projected: { type: Boolean, default: false },
  estado:    { type: String, enum: ["pendiente", "en_curso", "completado"], default: "pendiente" },
}, { _id: false });

const mkTournamentSchema = new mongoose.Schema({
  singleton:   { type: String, default: "main", unique: true },
  estado:      { type: String, enum: ["sin_iniciar", "bloque_a", "bloque_b", "boss_fight", "final", "finalizado"], default: "sin_iniciar" },

  // Roster congelado al sembrar
  novatos:     [jugadorRefSchema],
  intermedios: [jugadorRefSchema],
  expertos:    [jugadorRefSchema],

  // Bloque A: eliminatoria entre Novatos → 1 ganador
  bloqueA:     [matchSchema],
  ganadorA:    { type: jugadorRefSchema, default: null },

  // Bloque B: Intermedios + ganadorA → top 2 Aspirantes
  bloqueB:     [matchSchema],
  aspirantes:  [jugadorRefSchema], // top 2

  // Boss Fight: 2 semifinales (Aspirante vs Experto, experto nerfeado)
  bossFight:   [matchSchema],

  // Gran Final
  finalMatch:  { type: finalMatchSchema, default: () => ({}) },
  campeon:     { type: jugadorRefSchema, default: null },

  updatedAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model("MortalKombatTournament", mkTournamentSchema);
