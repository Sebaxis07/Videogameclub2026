"use strict";

const mongoose = require("mongoose");

/**
 * TriviaMatch — Persistencia histórica de cada duelo de Pixel Quiz Arena
 * =======================================================================
 * Un documento por pregunta lanzada. Sirve para:
 *   - Auditar la "Hill" a posteriori (quién entró, cuántas rachas).
 *   - Calcular estadísticas (% de aciertos por categoría, tiempos medios).
 *   - Reconstruir un torneo si el server cae.
 */
const triviaMatchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  participantes: [{
    rut:    { type: String, required: true },
    nombre: { type: String, required: true },
  }],
  categoria: {
    type: String,
    required: true,
  },
  pregunta: {
    id:                 { type: String, required: true },
    texto:              { type: String, required: true },
    opciones:           [String],
    respuesta_correcta: { type: Number, required: true },
  },
  // null si nadie respondió (timeout)
  ganador_rut: {
    type: String,
    default: null,
    index: true,
  },
  // Tiempo de respuesta del ganador en ms desde el inicio de QUESTION_PHASE.
  // null si fue timeout.
  tiempoRespuestaMs: {
    type: Number,
    default: null,
  },
  resultado: {
    type: String,
    enum: ["WINNER", "TIMEOUT_DOUBLE_KO"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("TriviaMatch", triviaMatchSchema);
