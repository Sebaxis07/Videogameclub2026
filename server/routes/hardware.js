/**
 * hardware.js — Rutas REST del Módulo de Hardware
 * =================================================
 * GET    /api/hardware            → lista completa
 * GET    /api/hardware/stats      → estadísticas del inventario
 * GET    /api/hardware/:id        → un equipo por ID
 * POST   /api/hardware            → crear equipo
 * PUT    /api/hardware/:id        → actualizar equipo
 * DELETE /api/hardware/:id        → eliminar equipo
 */

"use strict";

const express = require("express");
const router  = express.Router();
const {
  getAllHardware,
  getHardwareById,
  createHardware,
  updateHardware,
  deleteHardware,
  getHardwareStats,
} = require("../services/hardwareService");

// GET /api/hardware
router.get("/", (req, res) => {
  const { type, status, search } = req.query;
  let items = getAllHardware();

  if (type)   items = items.filter((h) => h.type   === type);
  if (status) items = items.filter((h) => h.status === status);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.brand.toLowerCase().includes(q) ||
        h.model.toLowerCase().includes(q) ||
        h.serial.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q)
    );
  }

  res.json({ total: items.length, hardware: items });
});

// GET /api/hardware/stats
router.get("/stats", (req, res) => {
  res.json(getHardwareStats());
});

// GET /api/hardware/:id
router.get("/:id", (req, res) => {
  const item = getHardwareById(req.params.id);
  if (!item) return res.status(404).json({ error: "Equipo no encontrado" });
  res.json(item);
});

// POST /api/hardware
router.post("/", (req, res) => {
  const { name, type, brand, model, serial, location, status, assignedTo, notes } = req.body;
  if (!name) return res.status(400).json({ error: "El campo 'name' es requerido" });
  const item = createHardware({ name, type, brand, model, serial, location, status, assignedTo, notes });
  res.status(201).json(item);
});

// PUT /api/hardware/:id
router.put("/:id", (req, res) => {
  const updated = updateHardware(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Equipo no encontrado" });
  res.json(updated);
});

// DELETE /api/hardware/:id
router.delete("/:id", (req, res) => {
  const deleted = deleteHardware(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Equipo no encontrado" });
  res.json({ message: "Equipo eliminado correctamente" });
});

module.exports = router;
