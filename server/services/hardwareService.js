/**
 * hardwareService.js — Servicio de Inventario de Hardware
 * =========================================================
 * Gestión CRUD en memoria con persistencia en archivo JSON.
 * Cada equipo puede vincularse a uno o más jugadores.
 *
 * Campos de un equipo:
 *  - id          : string UUID
 *  - name        : string (ej. "TV Samsung 55"")
 *  - type        : string (ej. "Televisión", "Consola", "Periférico", "PC", "Otro")
 *  - brand       : string
 *  - model       : string
 *  - serial      : string (número de serie)
 *  - location    : string (ej. "Sala A - Mesa 2")
 *  - status      : "disponible" | "en_uso" | "mantenimiento" | "baja"
 *  - assignedTo  : string[] (nombres de jugadores vinculados)
 *  - notes       : string (notas de seguridad / descripción)
 *  - addedAt     : ISO date string
 *  - updatedAt   : ISO date string
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const DATA_FILE = path.join(__dirname, "../data/hardware.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFromDisk() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveToDisk(items) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

// ─── Estado en memoria ────────────────────────────────────────────────────────

let hardware = loadFromDisk();

// ─── API Pública ──────────────────────────────────────────────────────────────

/** Devuelve todos los equipos */
function getAllHardware() {
  return hardware;
}

/** Devuelve un equipo por ID o null */
function getHardwareById(id) {
  return hardware.find((h) => h.id === id) || null;
}

/**
 * Crea un nuevo equipo.
 * @param {Object} data — campos del equipo (sin id ni timestamps)
 * @returns {Object} el equipo creado
 */
function createHardware(data) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    name: data.name || "Sin nombre",
    type: data.type || "Otro",
    brand: data.brand || "",
    model: data.model || "",
    serial: data.serial || "",
    location: data.location || "",
    status: data.status || "disponible",
    assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : [],
    notes: data.notes || "",
    addedAt: now,
    updatedAt: now,
  };
  hardware.push(item);
  saveToDisk(hardware);
  return item;
}

/**
 * Actualiza un equipo existente.
 * @param {string} id
 * @param {Object} updates
 * @returns {Object|null} el equipo actualizado o null si no existe
 */
function updateHardware(id, updates) {
  const idx = hardware.findIndex((h) => h.id === id);
  if (idx === -1) return null;

  hardware[idx] = {
    ...hardware[idx],
    ...updates,
    id, // proteger el id
    addedAt: hardware[idx].addedAt, // proteger fecha de creación
    updatedAt: new Date().toISOString(),
  };
  saveToDisk(hardware);
  return hardware[idx];
}

/**
 * Elimina un equipo.
 * @param {string} id
 * @returns {boolean} true si fue eliminado
 */
function deleteHardware(id) {
  const before = hardware.length;
  hardware = hardware.filter((h) => h.id !== id);
  if (hardware.length < before) {
    saveToDisk(hardware);
    return true;
  }
  return false;
}

/**
 * Estadísticas rápidas del inventario.
 */
function getHardwareStats() {
  const total = hardware.length;
  const byStatus = hardware.reduce((acc, h) => {
    acc[h.status] = (acc[h.status] || 0) + 1;
    return acc;
  }, {});
  const byType = hardware.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + 1;
    return acc;
  }, {});
  return { total, byStatus, byType };
}

module.exports = {
  getAllHardware,
  getHardwareById,
  createHardware,
  updateHardware,
  deleteHardware,
  getHardwareStats,
};
