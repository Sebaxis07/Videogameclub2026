/**
 * auth.js — Rutas REST de Autenticación
 * ========================================
 */

"use strict";

const express = require("express");
const router = express.Router();
const { login, changePassword } = require("../services/authService");

// Utilidad para envolver errores
function wrap(fn) {
  return async (req, res) => {
    try { fn(req, res); }
    catch (err) { res.status(400).json({ error: err.message }); }
  };
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Falta username o password" });
  }

  try {
    const user = login(username, password);
    
    if (user) {
      res.json({ user });
    } else {
      res.status(401).json({ error: "Credenciales incorrectas o RUT no registrado" });
    }
  } catch (err) {
    if (err.message === "LOGIN_NOT_AVAILABLE") {
      res.status(403).json({ error: "LOGIN_NOT_AVAILABLE" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /api/auth/change-password
router.post("/change-password", wrap((req, res) => {
  const { rut, oldPassword, newPassword } = req.body;
  
  const success = changePassword(rut, oldPassword, newPassword);
  
  if (success) {
    res.json({ message: "Contraseña actualizada exitosamente" });
  } else {
    res.status(500).json({ error: "No se pudo actualizar la contraseña" });
  }
}));

// POST /api/auth/role
router.post("/role", wrap((req, res) => {
  const { rut, role } = req.body;
  if (!rut || !role) {
    return res.status(400).json({ error: "Faltan datos rut o role" });
  }
  
  const { setRole } = require("../services/authService");
  const success = setRole(rut, role);
  
  if (success) {
    res.json({ message: "Rol actualizado exitosamente" });
  } else {
    res.status(500).json({ error: "No se pudo actualizar el rol" });
  }
}));

module.exports = router;
