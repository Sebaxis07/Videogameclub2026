const mongoose = require("mongoose");

const jugadorSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, "El nombre es obligatorio"],
    trim: true
  },
  rut: {
    type: String,
    required: [true, "El RUT es obligatorio"],
    unique: true,
    trim: true
  },
  discord: {
    type: String,
    trim: true,
    default: ""
  },
  correo: {
    type: String,
    lowercase: true,
    trim: true,
    default: ""
  },
  juego_main: {
    type: String,
    trim: true,
    default: "Por definir"
  },
  juegosPropuesto: {
    type: String,
    trim: true,
    default: "Sin definir"
  },
  plataforma: {
    type: String,
    trim: true,
    default: ""
  },
  horasJugadas: {
    type: Number,
    default: 0
  },
  traeEquipo: {
    type: Boolean,
    default: false
  },
  partidasJugadas: {
    type: Number,
    default: 0
  },
  partidasGanadas: {
    type: Number,
    default: 0
  },
  fecha_inscripcion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Jugador", jugadorSchema);
