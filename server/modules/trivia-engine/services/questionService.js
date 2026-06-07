"use strict";

/**
 * questionService.js — Selección de preguntas
 * ============================================
 * El banco se carga UNA vez en memoria al arranque. Si cambian los archivos en
 * caliente, basta con reiniciar el server (ningún flujo en vivo del módulo PvP
 * depende de este archivo).
 */

const fs   = require("fs");
const path = require("path");

// Apuntamos al banco real de la trivia (subiendo 3 niveles desde modules/trivia-engine/services)
const BANK_PATH = path.join(__dirname, "..", "..", "..", "data", "trivia_questions.json");

let bank = [];
try {
  const raw = JSON.parse(fs.readFileSync(BANK_PATH, "utf-8"));
  // Filtramos solo las que tienen opciones y son de tipo alternativa (compatibilidad UI PixelQuiz)
  bank = raw.filter(q => q.opciones && q.opciones.length > 0 && q.tipo_pregunta === "alternativas");
  console.log(`[PixelQuiz] Banco cargado con ${bank.length} preguntas (filtradas de ${raw.length}).`);
} catch (err) {
  console.error("[PixelQuiz] No se pudo cargar el banco de preguntas:", err.message);
  bank = [];
}

// Indexamos por categoría para sortear en O(1) por intento.
const byCategory = bank.reduce((acc, q) => {
  if (!acc[q.categoria]) acc[q.categoria] = [];
  acc[q.categoria].push(q);
  return acc;
}, {});

// Lista dinámica de categorías basadas en lo que realmente hay en el JSON
const DYNAMIC_CATEGORIES = Object.keys(byCategory);

/** Sortea uniformemente una de las categorías disponibles. */
function pickRandomCategory() {
  if (DYNAMIC_CATEGORIES.length === 0) return null;
  return DYNAMIC_CATEGORIES[Math.floor(Math.random() * DYNAMIC_CATEGORIES.length)];
}

/**
 * Sortea una pregunta de la categoría dada. Si la categoría no tiene preguntas,
 * cae al banco completo (failsafe — nunca debería pasar en producción).
 *
 * `usedIds` es un Set de ids ya usados en la sesión actual; evita repetir.
 */
function pickQuestion(categoria, usedIds = new Set()) {
  const pool = (byCategory[categoria] || bank).filter(q => !usedIds.has(q.id));
  const source = pool.length > 0 ? pool : (byCategory[categoria] || bank);
  if (source.length === 0) return null;
  return source[Math.floor(Math.random() * source.length)];
}

/** Vista pública del banco (para debugging desde la API). */
function getBankSummary() {
  return {
    total: bank.length,
    categoriasDisponibles: DYNAMIC_CATEGORIES,
    porCategoria: Object.fromEntries(
      Object.entries(byCategory).map(([c, list]) => [c, list.length])
    ),
  };
}

module.exports = {
  pickRandomCategory,
  pickQuestion,
  getBankSummary,
};
