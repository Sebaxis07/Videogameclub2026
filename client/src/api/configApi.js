/**
 * configApi.js — Cliente API para Configuración (.env)
 */

import config from "../config/env";

const BASE = config.API_URL + "/config";

export async function fetchServerConfig() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error obteniendo configuración del servidor");
  return res.json();
}

export async function updateServerConfig(data) {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || "Error actualizando configuración");
  }
  return result;
}
