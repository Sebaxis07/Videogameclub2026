"use strict";

/**
 * matchScheduler.js — Programador de Arena Dinámica
 * ===============================================================
 * Implementa el sistema de Arena por Rondas con Kits dinámicos.
 */

const GauntletPlayer = require("../../models/GauntletPlayer");
const Duelo = require("../../models/Duelo");
const { PlayerState, DuelPhase } = require("./playerStates");
const { pickRandomNerf, debeAplicarNerf } = require("./nerfs");
const { getRandomKit } = require("./kits");

/**
 * Inicializa el torneo (vaciado total o parcial).
 */
async function inicializarJugadores(torneoId, evaluaciones) {
  // Por defecto vaciamos para empezar de cero
  await GauntletPlayer.deleteMany({ torneo_id: torneoId });
  await Duelo.deleteMany({ torneo_id: torneoId });

  const jugadores = await GauntletPlayer.insertMany(
    evaluaciones.map((ev) => ({
      torneo_id: torneoId,
      nombre:    ev.nombre,
      rut:       ev.rut || null,
      grupo:     ev.grupo,
      estado:    PlayerState.ESPERANDO_INICIO,
    }))
  );

  return jugadores;
}

/**
 * Añade un jugador a mitad del torneo.
 */
async function añadirJugadorTardio(torneoId, { nombre, rut, grupo }) {
  // Verificar si ya existe
  const existe = await GauntletPlayer.findOne({ torneo_id: torneoId, nombre });
  if (existe) return existe;

  // Si hay duelos activos, el jugador entra en estado JUGANDO_GRUPOS directamente
  const algunDuelo = await Duelo.findOne({ torneo_id: torneoId, fase: DuelPhase.GRUPOS });
  const estado = algunDuelo ? PlayerState.JUGANDO_GRUPOS : PlayerState.ESPERANDO_INICIO;

  return GauntletPlayer.create({
    torneo_id: torneoId,
    nombre,
    rut,
    grupo,
    estado
  });
}

/**
 * Genera una nueva ronda de la Arena para un grupo.
 * Algoritmo: Pareos dinámicos por menor cantidad de partidas jugadas.
 */
async function generarRondaArena(torneoId, grupo) {
  const jugadores = await GauntletPlayer.find({ 
    torneo_id: torneoId, 
    grupo,
    estado: { $in: [PlayerState.ESPERANDO_INICIO, PlayerState.JUGANDO_GRUPOS] }
  });

  if (jugadores.length < 2) {
    throw new Error(`El Grupo ${grupo} necesita al menos 2 jugadores activos`);
  }

  // Elegir un kit para toda la ronda
  const kit = getRandomKit();

  // Obtener duelos previos para evitar repeticiones inmediatas si es posible
  const duelosPrevios = await Duelo.find({ torneo_id: torneoId, fase: DuelPhase.GRUPOS });

  // Ordenar jugadores por partidas jugadas (asc) para priorizar a los que han jugado menos
  const stats = jugadores.map(j => {
    const jugadas = duelosPrevios.filter(d => 
      d.jugador1_id.toString() === j._id.toString() || 
      d.jugador2_id.toString() === j._id.toString()
    ).length;
    return { player: j, jugadas };
  }).sort((a, b) => a.jugadas - b.jugadas);

  const available = [...stats];
  const newDuels = [];

  while (available.length >= 2) {
    const p1 = available.shift();
    
    // Buscar un oponente que p1 NO haya enfrentado aún
    let p2Index = available.findIndex(cand => {
      const yaPelearon = duelosPrevios.some(d => 
        (d.jugador1_id.toString() === p1.player._id.toString() && d.jugador2_id.toString() === cand.player._id.toString()) ||
        (d.jugador1_id.toString() === cand.player._id.toString() && d.jugador2_id.toString() === p1.player._id.toString())
      );
      return !yaPelearon;
    });

    // Si todos ya pelearon contra p1, simplemente tomamos el siguiente disponible
    if (p2Index === -1) p2Index = 0;

    const p2 = available.splice(p2Index, 1)[0];

    newDuels.push({
      torneo_id: torneoId,
      fase: DuelPhase.GRUPOS,
      jugador1_id: p1.player._id,
      jugador2_id: p2.player._id,
      estado: "pendiente",
      kit: {
        id: kit.id,
        nombre: kit.nombre,
        icon: kit.icon,
        descripcion: kit.descripcion
      }
    });
  }

  // Actualizar estado de los jugadores a "jugando_grupos"
  await GauntletPlayer.updateMany(
    { torneo_id: torneoId, grupo, estado: PlayerState.ESPERANDO_INICIO },
    { $set: { estado: PlayerState.JUGANDO_GRUPOS } }
  );

  return Duelo.insertMany(newDuels);
}

/**
 * Snapshot del torneo con soporte para Arena.
 */
async function getTorneoSnapshot(torneoId) {
  const [todosJugadores, todosLosduelos] = await Promise.all([
    GauntletPlayer.find({ torneo_id: torneoId }).sort({ grupo: 1, puntos_arena: -1, wins_grupos: -1 }),
    Duelo.find({ torneo_id: torneoId })
      .populate("jugador1_id", "nombre grupo points_arena wins_grupos estado")
      .populate("jugador2_id", "nombre grupo points_arena wins_grupos estado")
      .populate("ganador_id", "nombre grupo"),
  ]);

  // Backfill Nerfs (A vs C)
  for (const d of todosLosduelos) {
    if (!d.nerf?.id && debeAplicarNerf(d.jugador1_id, d.jugador2_id, d.fase)) {
      const niveles = { 'C': 0, 'B': 1, 'A': 2 };
      const n1 = niveles[d.jugador1_id?.grupo] ?? 0;
      const n2 = niveles[d.jugador2_id?.grupo] ?? 0;
      const gap = Math.max(1, n2 - n1);

      d.nerf = pickRandomNerf(gap, d.kit?.id);
      await d.save();
    }
  }

  const grupos = { A: [], B: [], C: [] };
  todosJugadores.forEach((j) => { if (grupos[j.grupo]) grupos[j.grupo].push(j); });

  const duelosPendientes  = todosLosduelos.filter((d) => d.estado === "pendiente");
  const duelosCompletados = todosLosduelos.filter((d) => d.estado === "completado");
  const campeon = todosJugadores.find((j) => j.estado === PlayerState.CAMPEON) || null;

  const escalada = [
    { etapa: "Arena / Grupos", fase: "grupos"     },
    { etapa: "Promoción",      fase: "promocion"  },
    { etapa: "Camino Élite",   fase: "camino"     },
    { etapa: "Gauntlet I",     fase: "gauntlet_1" },
    { etapa: "Gauntlet II",    fase: "gauntlet_2" },
    { etapa: "Gauntlet III",   fase: "gauntlet_3" },
    { etapa: "Gran Final",     fase: "gran_final" },
  ].map((etapa) => ({
    ...etapa,
    duelos: todosLosduelos.filter((d) => d.fase === etapa.fase),
  }));

  return { grupos, duelosPendientes, duelosCompletados, campeon, escalada };
}

module.exports = { 
  inicializarJugadores, 
  añadirJugadorTardio,
  generarRondaArena, 
  getTorneoSnapshot 
};
