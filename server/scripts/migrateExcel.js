// server/scripts/migrateExcel.js
require("dotenv").config({ path: `${__dirname}/../.env` });
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");
const Jugador = require("../models/Jugador");

const migrateData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/videogame_club";
    console.log(`[Migración] Conectando a MongoDB en: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log("[Migración] Conexión establecida.");

    // Resolución de la ruta del archivo de Excel
    const filePath = path.join(__dirname, "inscritos_antiguos.xlsx");
    console.log(`[Migración] Leyendo archivo Excel: ${filePath}`);
    
    // Leer el archivo local
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Tomas la primera hoja
    const sheet = workbook.Sheets[sheetName];
    
    // Convertir el excel a array de objetos JSON
    // Se espera que las cabeceras sean exactamente o se mapeen a: Nombre, RUT, Correo, Juego_Main
    const rawData = xlsx.utils.sheet_to_json(sheet);
    console.log(`[Migración] Obtenidos ${rawData.length} registros del Excel. Procesando...`);

    const recordsToInsert = rawData.map(row => {
      return {
        nombre: row.Nombre || row.nombre,
        rut: row.RUT || row.rut,
        correo: row.Correo || row.correo,
        juego_main: row.Juego_Main || row.juego_main || "Por definir"
      };
    });

    // Vaciar la colección antes (Opcional, pero util para migraciones en limpio)
    console.log("[Migración] Limpiando colección previa de Jugadores...");
    await Jugador.deleteMany({});

    console.log("[Migración] Insertando documentos en la base de datos...");
    const result = await Jugador.insertMany(recordsToInsert, { ordered: false });
    console.log(`[Migración] ¡Éxito! Se insertaron ${result.length} jugadores.`);

  } catch (error) {
    console.error(`[Migración] Error crítico durante la migración:`, error);
  } finally {
    // Es vital cerrar la conexión siempre
    console.log("[Migración] Cerrando conexión a MongoDB...");
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrateData();
