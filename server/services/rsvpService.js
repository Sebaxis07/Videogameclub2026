/**
 * rsvpService.js — Servicio de Intención de Asistencia (RSVP)
 * ============================================================
 */

"use strict";

const fs = require("fs");
const path = require("path");

const RSVP_FILE = path.join(__dirname, "../data/rsvp.json");

function ensureDataDir() {
  const dir = path.dirname(RSVP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadRsvp() {
  ensureDataDir();
  if (!fs.existsSync(RSVP_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RSVP_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveRsvp(data) {
  ensureDataDir();
  fs.writeFileSync(RSVP_FILE, JSON.stringify(data, null, 2), "utf8");
}

let rsvpCache = loadRsvp();

/**
 * Registra una intención de asistencia
 * @param {string} rut - RUT normalizado
 * @param {string} nombre - Nombre del estudiante
 * @param {boolean} willAttend - Si asistirá o no
 */
function recordRsvp(rut, nombre, willAttend) {
  // Update if exists or push
  const index = rsvpCache.findIndex(r => r.rut === rut);
  const record = {
    rut,
    nombre,
    willAttend,
    timestamp: new Date().toISOString()
  };

  if (index !== -1) {
    rsvpCache[index] = record;
  } else {
    rsvpCache.push(record);
  }
  
  saveRsvp(rsvpCache);
  return record;
}

/**
 * Obtiene todos los registros RSVP
 */
function getRsvps() {
  return rsvpCache;
}

/**
 * Limpia todos los registros RSVP
 */
function clearRsvps() {
  rsvpCache = [];
  saveRsvp(rsvpCache);
  return rsvpCache;
}

module.exports = {
  recordRsvp,
  getRsvps,
  clearRsvps
};
