const mongoose = require("mongoose");

const evalSchema = new mongoose.Schema({
  jugador: {
    rut: { type: String, required: true, unique: true },
    nombre: { type: String, required: true }
  },
  controlHotbar: { 
    type: String, 
    enum: ["Sí", "No", "Más o menos"], 
    default: "Más o menos" 
  },
  controlCriticos: { 
    type: String, 
    enum: ["Sí", "No", "Más o menos"], 
    default: "Más o menos" 
  },
  dominioPvP: { 
    type: String, 
    enum: ["Sí", "No", "Más o menos"], 
    default: "Más o menos" 
  },
  dominioClicks: { 
    type: String, 
    enum: ["Sí", "No", "Más o menos"], 
    default: "Más o menos" 
  },
  fechaEvaluacion: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("MinecraftEval", evalSchema);
