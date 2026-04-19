"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const ENV_PATH = path.join(__dirname, "../../.env");

/**
 * Helper para parsear un archivo .env en un objeto
 */
function parseEnv(content) {
  const result = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

/**
 * GET /api/config
 * Devuelve el contenido parseado del archivo .env
 */
router.get("/", (req, res) => {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      return res.status(200).json({}); // Devuelve vacío si no existe .env
    }
    const content = fs.readFileSync(ENV_PATH, "utf8");
    const config = parseEnv(content);
    res.json(config);
  } catch (error) {
    console.error("[Config API] Error leyendo .env:", error);
    res.status(500).json({ error: "No se pudo leer la configuración" });
  }
});

/**
 * PUT /api/config
 * Actualiza pares clave-valor en el archivo .env
 */
router.put("/", (req, res) => {
  try {
    const newConfig = req.body;
    let content = "";
    
    // Leer actual
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, "utf8");
    }

    // Actualizar o agregar cada key
    for (const [key, value] of Object.entries(newConfig)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        // Asegurar que haya salto de línea si no termina en uno
        if (content && !content.endsWith('\n')) content += '\n';
        content += `${key}=${value}\n`;
      }
    }

    fs.writeFileSync(ENV_PATH, content, "utf8");
    
    res.json({ message: "Configuración actualizada correctamente. (Reinicia el servidor para aplicar cambios de base)" });
  } catch (error) {
    console.error("[Config API] Error escribiendo .env:", error);
    res.status(500).json({ error: "No se pudo guardar la configuración" });
  }
});

module.exports = router;
