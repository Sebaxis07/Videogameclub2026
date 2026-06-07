"use strict";

/**
 * matchService.js — Persistencia de TriviaMatch
 * ==============================================
 * Aislamos las escrituras a Mongo aquí para que el controller no necesite
 * conocer Mongoose. Si en el futuro cambiamos a otra BD basta con reescribir
 * este archivo.
 */

const TriviaMatch = require("../models/TriviaMatch");

async function saveMatch(record) {
  try {
    await TriviaMatch.create(record);
  } catch (err) {
    // No queremos tirar el game loop si Mongo está caído. Logueamos y seguimos.
    console.error("[PixelQuiz] Error persistiendo TriviaMatch:", err.message);
  }
}

async function getRecentMatches(limit = 20) {
  return TriviaMatch.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

module.exports = { saveMatch, getRecentMatches };
