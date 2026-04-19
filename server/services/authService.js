/**
 * authService.js — Servicio de Autenticación
 * ============================================
 * Maneja el login de Admin y Estudiantes.
 * Las contraseñas de los estudiantes se guardan en data/users.json
 */

"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../config/env");
const { getPlayers } = require("./sheetsService");
const settingsService = require("./settingsService");

const USERS_FILE = path.join(__dirname, "../data/users.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
  catch { return []; }
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

let usersCache = loadUsers();

// ─── API Pública ──────────────────────────────────────────────────────────────

function normalizeRut(str) {
  if (!str) return "";
  return String(str).replace(/[^0-9Kk]/g, '').toUpperCase();
}

/**
 * Autentica a un usuario.
 * @param {string} username - 'admin' o el RUT del estudiante
 * @param {string} password - Contraseña
 * @returns {object|null} Objeto con rol y datos, o null si falla
 */
function login(username, password) {
  if (!username || !password) return null;

  // 1. Admin Login
  if (username.toLowerCase() === "admin") {
    if (password === config.ADMIN_PASSWORD) {
      return { role: "admin", nombre: "Administrador" };
    }
    return null; // Contraseña incorrecta
  }

  // 2. Student Login (username = RUT)
  const rutNorm = normalizeRut(username);
  
  // Login restrictions
  const isTestAccount = rutNorm === "000000000";
  const settings = settingsService.getSettings();
  const isLoginActive = settings.loginActive === true;
  
  // Check if current time is Friday 16:30 to 19:30
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() + (now.getMinutes() / 60);
  const isAllowedTime = day === 5 && time >= 16.5 && time <= 19.5;

  if (!isTestAccount && !isLoginActive && !isAllowedTime) {
    throw new Error("LOGIN_NOT_AVAILABLE");
  }

  const players = getPlayers();
  
  console.log(`[AuthService] Buscando login para RUT normalizado: "${rutNorm}"`);
  
  // Buscar en el padrón (Google Sheets)
  const student = players.find(p => normalizeRut(p.rut) === rutNorm);
  if (!student) {
    console.log(`[AuthService] Falla: RUT no está en la base de datos de Google Sheets (Padron tiene ${players.length} alumnos).`);
    return null; // El RUT no está registrado en el Club
  }

  // Buscar si el estudiante tiene contraseña personalizada
  // Importante: usamos el RUT normalizado para buscarlo en users.json por si lo guardaron distinto
  const user = usersCache.find(u => normalizeRut(u.rut) === rutNorm);
  const actualPassword = user ? user.password : "ClubJuegos26";

  if (password === actualPassword) {
    console.log(`[AuthService] Exito: Login correcto para ${student.nombre}`);
    return {
      role: user && user.role === 'asistente' ? 'asistente' : 'student',
      rut: student.rut,
      nombre: student.nombre,
    };
  }

  console.log(`[AuthService] Falla: Contraseña incorrecta. Se esperaba: "${actualPassword}"`);
  return null; // Contraseña incorrecta
}

/**
 * Cambia la contraseña de un estudiante.
 */
function changePassword(rut, oldPassword, newPassword) {
  if (!rut || !oldPassword || !newPassword) {
    throw new Error("Faltan datos");
  }

  // Verificar credenciales actuales
  const authRecord = login(rut, oldPassword);
  if (!authRecord || authRecord.role !== "student") {
    throw new Error("Contraseña actual incorrecta");
  }

  // Actualizar guardado
  const rutNorm = normalizeRut(rut);
  let user = usersCache.find(u => normalizeRut(u.rut) === rutNorm);
  
  if (!user) {
    user = { rut: rut, password: newPassword }; // Guardamos el original
    usersCache.push(user);
  } else {
    user.password = newPassword;
  }

  saveUsers(usersCache);
  return true;
}

/**
 * Cambia el rol de un usuario en el sistema.
 */
function setRole(rut, role) {
  const rutNorm = normalizeRut(rut);
  let user = usersCache.find(u => normalizeRut(u.rut) === rutNorm);
  
  if (!user) {
    user = { rut: rut, password: "ClubJuegos26", role: role };
    usersCache.push(user);
  } else {
    user.role = role;
  }
  saveUsers(usersCache);
  return true;
}

function getUsersCache() {
  return usersCache;
}

module.exports = {
  login,
  changePassword,
  setRole,
  getUsersCache
};
