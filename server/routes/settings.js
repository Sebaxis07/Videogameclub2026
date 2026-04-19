/**
 * settings.js — Rutas REST de Configuración General
 * ==================================================
 */

"use strict";

const express = require("express");
const router = express.Router();
const { getSettings, toggleModuleVisibility } = require("../services/settingsService");

// Utilidad para envolver errores
function wrap(fn) {
  return async (req, res) => {
    try { fn(req, res); }
    catch (err) { res.status(400).json({ error: err.message }); }
  };
}

// GET /api/settings
router.get("/", (req, res) => {
  res.json(getSettings());
});

// POST /api/settings/modules/:id/toggle
router.post("/modules/:id/toggle", wrap((req, res) => {
  const { id } = req.params;
  const { getSettings } = require("../services/settingsService");
  const visibleModules = toggleModuleVisibility(id);
  
  const io = req.app.get("io");
  if (io) {
    io.emit("settings:updated", getSettings());
  }

  res.json({ success: true, visibleModules });
}));

// POST /api/settings/login/toggle
router.post("/login/toggle", wrap((req, res) => {
  const settingsService = require("../services/settingsService");
  const loginActive = settingsService.toggleLoginActive();
  
  const io = req.app.get("io");
  if (io) {
    io.emit("settings:updated", settingsService.getSettings());
  }

  res.json({ success: true, loginActive });
}));

module.exports = router;
