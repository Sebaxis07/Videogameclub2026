"use strict";

/**
 * mortalKombatTournament.js
 * =========================
 * Torneo Mortal Kombat XL "Desafío a los Jefes"
 *
 *   Bloque A (Novatos / Bronce)   → 1 ganador
 *   Bloque B (Intermedios / Plata + ganadorA) → 2 Aspirantes
 *   Boss Fight (2 Aspirantes vs 2 Expertos / Oro, con nerf de personaje aleatorio)
 *   Gran Final (modo según supervivientes)
 *
 * GET    /api/mk-tournament             → estado actual
 * POST   /api/mk-tournament/seed        → siembra desde /api/mk-eval
 * POST   /api/mk-tournament/match       → actualiza resultado (avanza fase si corresponde)
 * POST   /api/mk-tournament/reset       → borra el torneo
 */

const express = require("express");
const router  = express.Router();

const MortalKombatTournament = require("../models/MortalKombatTournament");
const MortalKombatEval       = require("../models/MortalKombatEval");

const POINTS_MAP = { "Sí": 3, "Más o menos": 1, "No": 0 };

function calcEval(ev) {
  const pts = (POINTS_MAP[ev.movilidad] || 0)
            + (POINTS_MAP[ev.peligrosidad] || 0)
            + (POINTS_MAP[ev.energia] || 0)
            + (POINTS_MAP[ev.defensa] || 0);
  let rango = "Bronce";
  if (pts >= 10) rango = "Oro";
  else if (pts >= 5) rango = "Plata";
  return { score: pts, rango };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Genera una eliminatoria simple (single elimination) round 1 con BYE si hace falta
function buildEliminatoria(jugadores, prefix) {
  // Ordenar por score descendente para sembrar
  const seeded = [...jugadores].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // siguiente potencia de 2
  let size = 1;
  while (size < seeded.length) size *= 2;
  
  const withByes = [...seeded];
  while (withByes.length < size) withByes.push(null);

  // Genera orden estándar de bracket
  function getSeeding(numPlayers) {
    if (numPlayers === 1) return [1];
    let rounds = Math.log(numPlayers) / Math.log(2);
    let matches = [1, 2];
    for (let r = 1; r < rounds; r++) {
      let newMatches = [];
      let sum = Math.pow(2, r + 1) + 1;
      for (let i = 0; i < matches.length; i++) {
        let seed = matches[i];
        if (i % 2 === 0) newMatches.push(seed, sum - seed);
        else newMatches.push(sum - seed, seed);
      }
      matches = newMatches;
    }
    return matches;
  }

  const order = getSeeding(size);
  const round1 = [];
  let idx = 0;

  for (let i = 0; i < order.length; i += 2) {
    let idx1 = order[i] - 1;
    let idx2 = order[i + 1] - 1;
    let j1 = withByes[idx1];
    let j2 = withByes[idx2];
    
    round1.push({
      id:        `${prefix}-r1-m${idx++}`,
      ronda:     1,
      jugador1:  j1 || null,
      jugador2:  j2 || null,
      ganador:   (j1 && !j2) ? j1.rut : (!j1 && j2 ? j2.rut : null),
      estado:    (j1 && !j2) || (!j1 && j2) ? "wo" : "pendiente",
    });
  }
  return round1;
}

function emitUpdate(req) {
  try {
    const io = req.app.get("io");
    if (io) io.emit("mk_tournament_updated", { ts: Date.now() });
  } catch (err) { /* noop */ }
}

function autoProjectNextMatch(t) {
  // Limpiar proyecciones previas (solo un duelo a la vez en MK)
  if (t.bloqueA) t.bloqueA.forEach(m => m.projected = false);
  if (t.bloqueB) t.bloqueB.forEach(m => m.projected = false);
  if (t.bossFight) t.bossFight.forEach(m => m.projected = false);
  if (t.finalMatch) t.finalMatch.projected = false;

  // Proyectar el primer match pendiente de la fase actual
  if (t.estado === "bloque_a" && t.bloqueA) {
    const next = t.bloqueA.find(m => m.estado === "pendiente" && m.jugador1 && m.jugador2);
    if (next) next.projected = true;
  } else if (t.estado === "bloque_b" && t.bloqueB) {
    const next = t.bloqueB.find(m => m.estado === "pendiente" && m.jugador1 && m.jugador2);
    if (next) next.projected = true;
  } else if (t.estado === "boss_fight" && t.bossFight) {
    const next = t.bossFight.find(m => m.estado === "pendiente" && m.jugador1 && m.jugador2);
    if (next) next.projected = true;
  } else if (t.estado === "final") {
    if (t.finalMatch && t.finalMatch.estado === "pendiente") {
      t.finalMatch.projected = true;
    }
  }
}

async function getOrCreate() {
  let t = await MortalKombatTournament.findOne({ singleton: "main" });
  if (!t) t = await MortalKombatTournament.create({ singleton: "main" });
  return t;
}

// ─── GET /api/mk-tournament ───────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const t = await getOrCreate();
    res.json(t);
  } catch (err) {
    console.error("[mk-tournament] GET error:", err);
    res.status(500).json({ error: "Error obteniendo torneo" });
  }
});

// ─── POST /api/mk-tournament/seed ─────────────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    const { ruts } = req.body;
    const evals = await MortalKombatEval.find();
    let clasificados = evals.map(ev => {
      const raw = ev.toObject();
      const { score, rango } = calcEval(raw);
      return {
        rut:    raw.jugador.rut,
        nombre: raw.jugador.nombre,
        score,
        rango,
      };
    });

    if (ruts && Array.isArray(ruts)) {
      clasificados = clasificados.filter(j => ruts.includes(j.rut));
    }

    const novatos     = clasificados.filter(j => j.rango === "Bronce");
    const intermedios = clasificados.filter(j => j.rango === "Plata");
    const expertosAll = clasificados.filter(j => j.rango === "Oro");

    if (expertosAll.length < 2) {
      return res.status(400).json({ error: `Se requieren al menos 2 Expertos (Oro). Hay ${expertosAll.length}.` });
    }
    const poolEstimate = intermedios.length + (novatos.length >= 1 ? 1 : 0);
    if (poolEstimate < 2) {
      return res.status(400).json({ error: "No hay suficientes jugadores para el Bloque B (se requieren al menos 2 aspirantes potenciales)." });
    }

    // Los 2 expertos con mayor score son "Los Jefes"
    const expertos = [...expertosAll].sort((a, b) => b.score - a.score).slice(0, 2);

    // Sembrar bloques
    let bloqueA = [];
    let ganadorA = null;
    let estado = "bloque_a";

    if (novatos.length >= 2) {
      bloqueA = buildEliminatoria(novatos, "A");
    } else if (novatos.length === 1) {
      ganadorA = novatos[0];
      estado = "bloque_b";
    } else {
      estado = "bloque_b";
    }

    // El Bloque B se construye al cerrar A (o de inmediato si A vacío)
    let bloqueB = [];
    let aspirantes = [];
    let bossFight = [];
    if (estado === "bloque_b") {
      const pool = [...intermedios];
      if (ganadorA) pool.push(ganadorA);
      
      if (pool.length === 2) {
        aspirantes = pool;
        const jefes = expertos.slice(0, 2);
        bossFight = [
          { id: "BF-m0", ronda: 1, jugador1: aspirantes[0], jugador2: jefes[0], ganador: null, estado: "pendiente", nerfRandom: true },
          { id: "BF-m1", ronda: 1, jugador1: aspirantes[1], jugador2: jefes[1], ganador: null, estado: "pendiente", nerfRandom: true },
        ];
        estado = "boss_fight";
      } else {
        bloqueB = buildEliminatoria(pool, "B");
      }
    }

    await MortalKombatTournament.deleteMany({});
    const t = await MortalKombatTournament.create({
      singleton: "main",
      estado,
      novatos, intermedios, expertos: expertosAll,
      bloqueA, ganadorA,
      bloqueB,
      aspirantes,
      bossFight,
      finalMatch: {},
      campeon: null,
    });

    // guardamos también los 2 Jefes ya elegidos por score, pero como subset visible
    t.expertos = expertos.concat(expertosAll.filter(e => !expertos.find(x => x.rut === e.rut)));
    autoProjectNextMatch(t);
    await t.save();
    emitUpdate(req);

    res.json({ success: true, tournament: t });
  } catch (err) {
    console.error("[mk-tournament] seed error:", err);
    res.status(500).json({ error: "No se pudo sembrar el torneo: " + err.message });
  }
});

// Devuelve referencia al match dentro del torneo según fase + id
function findMatch(t, fase, matchId) {
  if (fase === "bloque_a") return t.bloqueA.find(m => m.id === matchId);
  if (fase === "bloque_b") return t.bloqueB.find(m => m.id === matchId);
  if (fase === "boss_fight") return t.bossFight.find(m => m.id === matchId);
  if (fase === "final") return t.finalMatch;
  return null;
}

// Comprueba si todos los matches de una ronda están completados
function rondaCompleta(matches, ronda) {
  const r = matches.filter(m => m.ronda === ronda);
  return r.length > 0 && r.every(m => m.estado === "completado" || m.estado === "wo");
}

// Construye la siguiente ronda emparejando ganadores
function buildSiguienteRonda(matches, ronda, prefix) {
  const ganadores = matches.filter(m => m.ronda === ronda).map(m => {
    if (!m.ganador) return null;
    if (m.jugador1?.rut === m.ganador) return m.jugador1;
    if (m.jugador2?.rut === m.ganador) return m.jugador2;
    return null;
  }).filter(Boolean);

  if (ganadores.length < 2) return [];
  const next = [];
  for (let i = 0; i < ganadores.length; i += 2) {
    next.push({
      id:       `${prefix}-r${ronda + 1}-m${i / 2}`,
      ronda:    ronda + 1,
      jugador1: ganadores[i] || null,
      jugador2: ganadores[i + 1] || null,
      ganador:  null,
      estado:   "pendiente",
    });
  }
  return next;
}

// ─── POST /api/mk-tournament/match ────────────────────────────────────────────
// body: { fase, matchId, ganadorRut, estado?, modo? }
router.post("/match", async (req, res) => {
  try {
    const { fase, matchId, ganadorRut, estado, modo } = req.body;
    const t = await getOrCreate();

    const match = findMatch(t, fase, matchId);
    if (!match) return res.status(404).json({ error: "Match no encontrado" });

    if (ganadorRut !== undefined) match.ganador = ganadorRut;
    if (estado) match.estado = estado;
    else if (ganadorRut) match.estado = "completado";

    // ── Avance de fases ─────────────────────────────────────────────────────
    if (fase === "bloque_a") {
      if (rondaCompleta(t.bloqueA, match.ronda)) {
        const next = buildSiguienteRonda(t.bloqueA, match.ronda, "A");
        if (next.length === 0) {
          // Final de Bloque A: 1 solo ganador
          const ganadores = t.bloqueA.filter(m => m.ronda === match.ronda).map(m => {
            if (!m.ganador) return null;
            return m.jugador1?.rut === m.ganador ? m.jugador1 : m.jugador2;
          }).filter(Boolean);
          if (ganadores.length === 1) {
            t.ganadorA = ganadores[0];
            // Construir Bloque B si todavía no existe
            if (!t.bloqueB || t.bloqueB.length === 0) {
              const pool = [...t.intermedios, t.ganadorA];
              if (pool.length === 2) {
                t.aspirantes = pool;
                const jefes = (t.expertos || []).slice(0, 2);
                t.bossFight = [
                  { id: "BF-m0", ronda: 1, jugador1: t.aspirantes[0], jugador2: jefes[0], ganador: null, estado: "pendiente", nerfRandom: true },
                  { id: "BF-m1", ronda: 1, jugador1: t.aspirantes[1], jugador2: jefes[1], ganador: null, estado: "pendiente", nerfRandom: true },
                ];
                t.estado = "boss_fight";
                t.bloqueB = [];
              } else {
                t.bloqueB = buildEliminatoria(pool, "B");
                t.estado = "bloque_b";
              }
            } else {
              // Insertar al ganadorA como cabeza de serie en el siguiente slot vacío
              const slotLibre = t.bloqueB.find(m => !m.jugador2 && m.estado === "wo");
              if (slotLibre) {
                slotLibre.jugador2 = t.ganadorA;
                slotLibre.estado = "pendiente";
                slotLibre.ganador = null;
              }
              t.estado = "bloque_b";
            }
          }
        } else {
          t.bloqueA.push(...next);
        }
      }
    }

    if (fase === "bloque_b") {
      if (rondaCompleta(t.bloqueB, match.ronda)) {
        const next = buildSiguienteRonda(t.bloqueB, match.ronda, "B");
        const ganadores = t.bloqueB.filter(m => m.ronda === match.ronda).map(m => {
          if (!m.ganador) return null;
          return m.jugador1?.rut === m.ganador ? m.jugador1 : m.jugador2;
        }).filter(Boolean);

        if (ganadores.length === 2) {
          // Son los 2 Aspirantes
          t.aspirantes = ganadores;
          const jefes = (t.expertos || []).slice(0, 2);
          t.bossFight = [
            { id: "BF-m0", ronda: 1, jugador1: t.aspirantes[0], jugador2: jefes[0], ganador: null, estado: "pendiente", nerfRandom: true },
            { id: "BF-m1", ronda: 1, jugador1: t.aspirantes[1], jugador2: jefes[1], ganador: null, estado: "pendiente", nerfRandom: true },
          ];
          t.estado = "boss_fight";
        } else if (next.length > 0) {
          t.bloqueB.push(...next);
        }
      }
    }

    if (fase === "boss_fight") {
      if (t.bossFight.every(m => m.estado === "completado" || m.estado === "wo")) {
        const finalistas = t.bossFight.map(m => {
          if (!m.ganador) return null;
          return m.jugador1?.rut === m.ganador ? { ...m.jugador1.toObject?.() || m.jugador1, rolBF: "aspirante_o_experto" } : { ...m.jugador2.toObject?.() || m.jugador2 };
        }).filter(Boolean);

        if (finalistas.length === 2) {
          const aspirantesRuts = (t.aspirantes || []).map(a => a.rut);
          const ganaronAspirantes = finalistas.map(f => aspirantesRuts.includes(f.rut));
          const numAspirantes = ganaronAspirantes.filter(Boolean).length;

          let finalMode = "titanes";
          let nerfRandom = false;
          if (numAspirantes === 2)      { finalMode = "sorpresa";     nerfRandom = false; }
          else if (numAspirantes === 0) { finalMode = "titanes";      nerfRandom = false; }
          else                          { finalMode = "david_goliat"; nerfRandom = true;  }

          t.finalMatch = {
            modo: finalMode,
            jugador1: finalistas[0],
            jugador2: finalistas[1],
            ganador: null,
            nerfRandom,
            estado: "pendiente",
          };
          t.estado = "final";
        }
      }
    }

    if (fase === "final") {
      if (modo) t.finalMatch.modo = modo;
      if (t.finalMatch.estado === "completado" && t.finalMatch.ganador) {
        const g = [t.finalMatch.jugador1, t.finalMatch.jugador2].find(p => p?.rut === t.finalMatch.ganador);
        if (g) {
          t.campeon = g;
          t.estado = "finalizado";
        }
      }
    }

    t.updatedAt = new Date();
    autoProjectNextMatch(t);
    await t.save();
    emitUpdate(req);
    res.json({ success: true, tournament: t });
  } catch (err) {
    console.error("[mk-tournament] match error:", err);
    res.status(500).json({ error: "Error actualizando match: " + err.message });
  }
});

// ─── POST /api/mk-tournament/project ──────────────────────────────────────────
// body: { fase, matchId, projected }
router.post("/project", async (req, res) => {
  try {
    const { fase, matchId, projected } = req.body;
    const t = await getOrCreate();

    // Limpiar proyecciones previas (solo un duelo a la vez en MK)
    if (t.bloqueA) t.bloqueA.forEach(m => m.projected = false);
    if (t.bloqueB) t.bloqueB.forEach(m => m.projected = false);
    if (t.bossFight) t.bossFight.forEach(m => m.projected = false);
    if (t.finalMatch) t.finalMatch.projected = false;

    if (projected) {
      const match = findMatch(t, fase, matchId);
      if (match) {
        match.projected = true;
      } else {
        return res.status(404).json({ error: "Match no encontrado" });
      }
    }

    t.updatedAt = new Date();
    await t.save();
    emitUpdate(req);
    res.json({ success: true, tournament: t });
  } catch (err) {
    console.error("[mk-tournament] project error:", err);
    res.status(500).json({ error: "Error al actualizar proyección: " + err.message });
  }
});

// ─── POST /api/mk-tournament/reset ────────────────────────────────────────────
router.post("/reset", async (req, res) => {
  try {
    await MortalKombatTournament.deleteMany({});
    const t = await MortalKombatTournament.create({ singleton: "main" });
    emitUpdate(req);
    res.json({ success: true, tournament: t });
  } catch (err) {
    console.error("[mk-tournament] reset error:", err);
    res.status(500).json({ error: "Error reseteando torneo" });
  }
});

module.exports = router;
