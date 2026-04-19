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
  correo: {
    type: String,
    required: [true, "El correo electrónico es obligatorio"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/@inacap\.cl$/, "DENEGADO: El correo debe ser institucional (@inacap.cl)"]
  },
  juego_main: {
    type: String,
    trim: true,
    default: "Por definir"
  },
  fecha_inscripcion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Jugador", jugadorSchema);
