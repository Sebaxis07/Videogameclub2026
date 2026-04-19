/**
 * rsvp.js — Rutas REST para RSVP
 * ================================
 */

"use strict";

const express = require("express");
const router = express.Router();
const { recordRsvp, getRsvps, clearRsvps } = require("../services/rsvpService");
const { getPlayers } = require("../services/sheetsService");
const fs = require("fs");
const path = require("path");

function normalizeRut(str) {
  if (!str) return "";
  return String(str).replace(/[^0-9Kk]/g, '').toUpperCase();
}

const USERS_FILE = path.join(__dirname, "../data/users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
  catch { return []; }
}

// Utilidad para envolver errores
function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (err) { res.status(400).json({ error: err.message }); }
  };
}

// POST /api/rsvp -> Register an RSVP explicitly verifying credentials independently of time block.
router.post("/", wrap(async (req, res) => {
  const { username, password, willAttend } = req.body;
  if (!username || !password || willAttend === undefined) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const rutNorm = normalizeRut(username);
  
  // Verify user exists in google sheets
  const players = getPlayers();
  const student = players.find(p => normalizeRut(p.rut) === rutNorm);
  
  if (!student) {
    return res.status(401).json({ error: "RUT no registrado" });
  }

  // Verify password
  const usersCache = loadUsers();
  const user = usersCache.find(u => normalizeRut(u.rut) === rutNorm);
  const actualPassword = user ? user.password : "ClubJuegos26";

  if (password !== actualPassword) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const record = recordRsvp(rutNorm, student.nombre, Boolean(willAttend));
  
  // Emit to admins that RSVP was updated
  const io = req.app.get("io");
  if (io) {
    io.emit("rsvp:updated", getRsvps());
  }

  res.json({ success: true, record });
}));

// GET /api/rsvp -> Get all RSVPs
router.get("/", (req, res) => {
  res.json(getRsvps());
});

// POST /api/rsvp/clear -> Clear all RSVPs
router.post("/clear", (req, res) => {
  const newRsvps = clearRsvps();
  
  const io = req.app.get("io");
  if (io) {
    io.emit("rsvp:updated", newRsvps);
  }

  res.json({ success: true, rsvps: newRsvps });
});

module.exports = router;
