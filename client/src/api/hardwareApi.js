/**
 * hardwareApi.js — Cliente API para Hardware
 * =============================================
 */

import config from "../config/env";

const BASE = config.API_URL;

export async function fetchHardware(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type)   params.set("type",   filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const res = await fetch(`${BASE}/hardware?${params}`);
  if (!res.ok) throw new Error("Error cargando inventario de hardware");
  return res.json();
}

export async function fetchHardwareStats() {
  const res = await fetch(`${BASE}/hardware/stats`);
  if (!res.ok) throw new Error("Error obteniendo estadísticas");
  return res.json();
}

export async function createHardwareItem(data) {
  const res = await fetch(`${BASE}/hardware`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error creando equipo");
  }
  return res.json();
}

export async function updateHardwareItem(id, data) {
  const res = await fetch(`${BASE}/hardware/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error actualizando equipo");
  }
  return res.json();
}

export async function deleteHardwareItem(id) {
  const res = await fetch(`${BASE}/hardware/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando equipo");
  return res.json();
}
