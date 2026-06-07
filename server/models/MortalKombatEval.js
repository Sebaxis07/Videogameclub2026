const mongoose = require("mongoose");

const mkEvalSchema = new mongoose.Schema({
  jugador: {
    rut: { type: String, required: true, unique: true },
    nombre: { type: String, required: true }
  },
  movilidad: {
    type: String,
    enum: ["Sí", "No", "Más o menos"],
    default: "Más o menos"
  },
  peligrosidad: {
    type: String,
    enum: ["Sí", "No", "Más o menos"],
    default: "Más o menos"
  },
  energia: {
    type: String,
    enum: ["Sí", "No", "Más o menos"],
    default: "Más o menos"
  },
  defensa: {
    type: String,
    enum: ["Sí", "No", "Más o menos"],
    default: "Más o menos"
  },
  fechaEvaluacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("MortalKombatEval", mkEvalSchema);
