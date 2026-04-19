/**
 * settingsService.js — Servicio de Configuración General
 * =======================================================
 * Almacena opciones globales del dashboard, como los módulos
 * que están visibles para los estudiantes.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "../data/settings.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadSettings() {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { visibleModules: [], loginActive: false };
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return { visibleModules: [], loginActive: false };
  }
}

function saveSettings(settings) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

let settingsCache = loadSettings();

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Obtiene todas las configuraciones actuales.
 */
function getSettings() {
  return settingsCache;
}

/**
 * Alterna la visibilidad de un módulo específico.
 * @param {string} moduleId - El id del módulo (ej: "debate", "hardware")
 */
function toggleModuleVisibility(moduleId) {
  if (!settingsCache.visibleModules) {
    settingsCache.visibleModules = [];
  }

  const index = settingsCache.visibleModules.indexOf(moduleId);
  if (index === -1) {
    // Si no está visible, lo añadimos
    settingsCache.visibleModules.push(moduleId);
  } else {
    // Si está visible, lo removemos
    settingsCache.visibleModules.splice(index, 1);
  }

  saveSettings(settingsCache);
  return settingsCache.visibleModules;
}

/**
 * Alterna el estado del login
 */
function toggleLoginActive() {
  if (settingsCache.loginActive === undefined) {
    settingsCache.loginActive = false;
  }
  settingsCache.loginActive = !settingsCache.loginActive;
  saveSettings(settingsCache);
  return settingsCache.loginActive;
}

module.exports = {
  getSettings,
  toggleModuleVisibility,
  toggleLoginActive,
};
