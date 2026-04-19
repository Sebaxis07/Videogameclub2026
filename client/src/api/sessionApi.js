/**
 * sessionApi.js — Cliente API para Sesiones
 * ===========================================
 */

import config from "../config/env";

const BASE = config.API_URL;

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}/sessions${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

export const fetchSessions       = (params = {}) => req(`?${new URLSearchParams(params)}`);
export const fetchActiveSession  = ()             => req("/active");
export const fetchSessionById    = (id)           => req(`/${id}`);
export const fetchReport         = (range, date)  => req(`/reports/summary?range=${range}${date ? `&date=${date}` : ""}`);

export const startSession        = (data)               => req("",             { method: "POST", body: JSON.stringify(data) });
export const updateSession       = (id, data)           => req(`/${id}`,       { method: "PUT",  body: JSON.stringify(data) });
export const endSession          = (id)                 => req(`/${id}/end`,   { method: "POST" });

export const toggleAttendance    = (id, playerName, present) =>
  req(`/${id}/attendance`, { method: "POST", body: JSON.stringify({ playerName, present }) });

export const addEquipment        = (id, playerName, data) =>
  req(`/${id}/equipment`, { method: "POST", body: JSON.stringify({ playerName, ...data }) });

export const removeEquipment     = (id, playerName, eqId) =>
  req(`/${id}/equipment/${eqId}`, { method: "DELETE", body: JSON.stringify({ playerName }) });

export const returnEquipment     = (id, playerName, eqId) =>
  req(`/${id}/equipment/${eqId}/return`, { method: "PUT", body: JSON.stringify({ playerName }) });

export const fetchPlayerHistory  = (playerName) => req(`/player/${encodeURIComponent(playerName)}`);

// ─── Equipos de la Universidad ────────────────────────────────────────────────
export const fetchUniversityEquipmentHistory = () => req(`/university-equipment/history`);
export const addUniversityEquipment    = (id, data)  => req(`/${id}/university-equipment`,          { method: 'POST',   body: JSON.stringify(data) });
export const removeUniversityEquipment = (id, eqId)  => req(`/${id}/university-equipment/${eqId}`,  { method: 'DELETE' });
export const returnUniversityEquipment = (id, eqId)  => req(`/${id}/university-equipment/${eqId}/return`, { method: 'PUT' });

// ─── Préstamos entre Estudiantes (P2P Loans) ─────────────────────────────────
export const fetchPeerLoansHistory = () => req(`/peer-loans/history`);
export const addPeerLoan = (id, data) => req(`/${id}/peer-loans`, { method: 'POST', body: JSON.stringify(data) });
export const removePeerLoan = (id, loanId) => req(`/${id}/peer-loans/${loanId}`, { method: 'DELETE' });
export const returnPeerLoan = (id, loanId) => req(`/${id}/peer-loans/${loanId}/return`, { method: 'PUT' });

