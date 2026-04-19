/**
 * WRScore.js — Modelo de Scores para la Sala de Espera
 * =====================================================
 * Persiste los high scores de:
 *  - dino:   puntaje del Dino Run
 *  - simon:  nivel máximo alcanzado en Simón Dice
 *  - clicker: total de clicks acumulados
 */

"use strict";
const mongoose = require("mongoose");

const wrScoreSchema = new mongoose.Schema({
  playerName: { type: String, required: true, trim: true },
  rut:        { type: String, trim: true, default: null },
  game:       { type: String, required: true, enum: ["dino", "simon", "clicker"] },
  score:      { type: Number, required: true, default: 0 },
  timestamp:  { type: Date, default: Date.now },
});

// Índice para buscar el top score por juego rápidamente
wrScoreSchema.index({ game: 1, score: -1 });
wrScoreSchema.index({ rut: 1, game: 1 }); // score personal por jugador

module.exports = mongoose.model("WRScore", wrScoreSchema);
