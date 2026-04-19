const mongoose = require("mongoose");
const config = require("./env"); // Se utiliza process.env directamente ya que dotenv carga en server.js

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/videogame_club";
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Conectado exitosamente: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error de Conexión: ${error.message}`);
    process.exit(1); // Detiene la ejecución si no hay BD, crítico para backend
  }
};

module.exports = connectDB;
