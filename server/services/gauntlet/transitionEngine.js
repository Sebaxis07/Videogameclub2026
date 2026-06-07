"use strict";

/**
 * transitionEngine.js — Motor de Transición de Estado del Gauntlet
 * ====================================================================
 * Contiene la lógica central del torneo:
 *   - resolverDuelo(): actualiza estados, crea el siguiente duelo
 *   - getNextOpponent(): consulta MongoDB para el próximo rival
 *   - finalizarFaseGrupos(): calcula posiciones y elimina perdedores
 */

const GauntletPlayer = require("../../models/GauntletPlayer");
const Duelo = require("../../models/Duelo");
const {
  PlayerState,
  DuelPhase,
  TRANSITION_TABLE,
  isValidTransition,
} = require("./playerStates");
const { pickRandomNerf, debeAplicarNerf } = require("./nerfs");
const { getRandomKit } = require("./kits");

// ─── Resolver un Duelo ───────────────────────────────────────────────────────

/**
 * Resuelve un duelo existente, actualiza los estados de ambos jugadores
 * y crea automáticamente el siguiente duelo si corresponde.
 *
 * @param {string} dueloId    ID del Duelo a resolver
 * @param {string} ganadorId  ID del jugador que ganó
 * @returns {Promise<{ duelo, ganador, perdedor, siguienteDuelo }>}
 */
async function resolverDuelo(dueloId, ganadorId) {
  // 1. Cargar el duelo
  const duelo = await Duelo.findById(dueloId)
    .populate("jugador1_id")
    .populate("jugador2_id");

  if (!duelo) throw new Error(`Duelo ${dueloId} no encontrado`);
  if (duelo.estado === "completado") throw new Error("Este duelo ya fue resuelto");

  // 2. Identificar ganador y perdedor
  const esJ1 = duelo.jugador1_id._id.toString() === ganadorId;
  const esJ2 = duelo.jugador2_id._id.toString() === ganadorId;
  if (!esJ1 && !esJ2) throw new Error("El ganador no es participante de este duelo");

  const ganador = esJ1 ? duelo.jugador1_id : duelo.jugador2_id;
  const perdedor = esJ1 ? duelo.jugador2_id : duelo.jugador1_id;

  // 3. Validar que la transición sea legal (J1 es siempre el ascendente)
  if (!isValidTransition(duelo.jugador1_id.estado, duelo.fase)) {
    throw new Error(
      `Transición inválida: el ascendente está en estado '${duelo.jugador1_id.estado}' y no puede participar en fase '${duelo.fase}'`
    );
  }

  // 4. Obtener la regla de transición
  const regla = TRANSITION_TABLE[duelo.fase];

  // 5. Actualizar el duelo
  duelo.ganador_id  = ganador._id;
  duelo.perdedor_id = perdedor._id;
  duelo.estado      = "completado";
  duelo.resolvedAt  = new Date();
  await duelo.save();

  // 6. Actualizar estado del GANADOR
  ganador.estado       = regla.ganadorEstado;
  ganador.wins_bracket += 1;
  await ganador.save();

  // 7. Actualizar estado del PERDEDOR
  perdedor.estado = regla.perdedorEstado;
  await perdedor.save();

  // 8. Si hay una siguiente fase, crear el siguiente duelo automáticamente
  let siguienteDuelo = null;
  if (regla.siguienteFase && regla.siguienteOponenteQuery) {
    const siguienteOponente = await getNextOpponent(
      duelo.torneo_id,
      regla.siguienteOponenteQuery
    );

    if (siguienteOponente) {
      // Calcular la diferencia de nivel para la severidad del nerf
      const niveles = { 'C': 0, 'B': 1, 'A': 2 };
      const n1 = niveles[ganador.grupo] ?? 0;
      const n2 = niveles[siguienteOponente.grupo] ?? 0;
      const gap = Math.max(1, n2 - n1);
      const kit = getRandomKit();
      const nerf = debeAplicarNerf(ganador, siguienteOponente, regla.siguienteFase)
        ? pickRandomNerf(gap, kit.id)
        : null;

      siguienteDuelo = await Duelo.create({
        torneo_id:    duelo.torneo_id,
        fase:         regla.siguienteFase,
        jugador1_id:  ganador._id,  // El ascendente siempre va como J1
        jugador2_id:  siguienteOponente._id,
        estado:       "pendiente",
        nerf:         nerf,
        kit: {
          id:          kit.id,
          nombre:      kit.nombre,
          icon:        kit.icon,
          descripcion: kit.descripcion
        }
      });
    }
  }

  return { duelo, ganador, perdedor, siguienteDuelo };
}

// ─── Obtener el Siguiente Oponente ────────────────────────────────────────────

/**
 * Consulta MongoDB para encontrar el próximo rival basándose en el grupo
 * y la posición dentro de ese grupo.
 * Esta es la consulta DETERMINISTA que garantiza el orden del Gauntlet.
 *
 * @param {string} torneoId
 * @param {{ grupo: string, posicion_grupo: number }} query
 * @returns {Promise<GauntletPlayer | null>}
 */
async function getNextOpponent(torneoId, query) {
  return GauntletPlayer.findOne({
    torneo_id:      torneoId,
    grupo:          query.grupo,
    posicion_grupo: query.posicion_grupo,
    estado: {
      $in: [
        PlayerState.ESPERANDO_INICIO,
        PlayerState.JUGANDO_GRUPOS,
        // Los jugadores del Grupo A esperan en "jugando_grupos"
        // hasta ser llamados para el Gauntlet.
      ],
    },
  });
}

// ─── Finalizar Fase de Grupos ─────────────────────────────────────────────────

/**
 * Después de que todos los duelos del Round Robin de un grupo han sido resueltos,
 * calcula las posiciones finales y actualiza `posicion_grupo` de cada jugador.
 * También elimina a todos los C2, C3, C4... automáticamente.
 *
 * @param {string} torneoId
 * @param {'A'|'B'|'C'} grupo
 * @returns {Promise<{ tabla: Array, siguienteDuelo: Duelo | null }>}
 */
async function _asignarPosiciones(torneoId, grupo) {
  const jugadores = await GauntletPlayer.find({
    torneo_id: torneoId, grupo,
  }).sort({ puntos_arena: -1, wins_grupos: -1, derrotas_grupos: 1 });

  for (let i = 0; i < jugadores.length; i++) {
    jugadores[i].posicion_grupo = i + 1;
    jugadores[i].estado = PlayerState.JUGANDO_GRUPOS;
    await jugadores[i].save();
  }
  return jugadores;
}

async function _grupoTieneDuelosPendientes(torneoId, grupo) {
  const jugadores = await GauntletPlayer.find({ torneo_id: torneoId, grupo });
  if (jugadores.length === 0) return false;
  const ids = jugadores.map(j => j._id);
  const pendientes = await Duelo.countDocuments({
    torneo_id: torneoId,
    fase: DuelPhase.GRUPOS,
    estado: 'pendiente',
    jugador1_id: { $in: ids },
  });
  return pendientes > 0;
}

async function finalizarFaseGrupos(torneoId, grupo) {
  // Si finalizamos C, asegurar que B y A estén finalizados (auto si sus duelos están completos)
  if (grupo === 'C') {
    const bYaFinalizado = await GauntletPlayer.findOne({
      torneo_id: torneoId, grupo: 'B', posicion_grupo: { $gt: 0 },
    });
    if (!bYaFinalizado) {
      const bPlayers = await GauntletPlayer.find({ torneo_id: torneoId, grupo: 'B' });
      if (bPlayers.length < 2) {
        throw new Error('El Grupo B necesita al menos 2 jugadores para que C1 pueda enfrentar a B2.');
      }
      if (await _grupoTieneDuelosPendientes(torneoId, 'B')) {
        throw new Error('El Grupo B aún tiene duelos de Round Robin pendientes. Complétalos antes de finalizar el Grupo C.');
      }
      await _asignarPosiciones(torneoId, 'B');
    }

    // Auto-finalizar A si sus duelos están completos (necesario para el Gauntlet)
    const aYaFinalizado = await GauntletPlayer.findOne({
      torneo_id: torneoId, grupo: 'A', posicion_grupo: { $gt: 0 },
    });
    if (!aYaFinalizado) {
      const aPlayers = await GauntletPlayer.find({ torneo_id: torneoId, grupo: 'A' });
      if (aPlayers.length > 0 && !(await _grupoTieneDuelosPendientes(torneoId, 'A'))) {
        await _asignarPosiciones(torneoId, 'A');
      }
    }
  }

  const jugadores = await _asignarPosiciones(torneoId, grupo);

  let siguienteDuelo = null;
  if (grupo === 'C') {
    for (let i = 1; i < jugadores.length; i++) {
      jugadores[i].estado = PlayerState.ELIMINADO;
      await jugadores[i].save();
    }
    const c1 = jugadores[0];
    const b2 = await GauntletPlayer.findOne({
      torneo_id: torneoId, grupo: 'B', posicion_grupo: 2,
    });

    if (!b2) {
      throw new Error('No se pudo encontrar B2. ¿El Grupo B tiene al menos 2 jugadores?');
    }

    const gap = 1; // C vs B es gap 1
    const kit = getRandomKit();
    const nerf = debeAplicarNerf(c1, b2, DuelPhase.PROMOCION)
      ? pickRandomNerf(gap, kit.id)
      : null;

    siguienteDuelo = await Duelo.create({
      torneo_id:    torneoId,
      fase:         DuelPhase.PROMOCION,
      jugador1_id:  c1._id,
      jugador2_id:  b2._id,
      estado:       "pendiente",
      nerf:         nerf,
      kit: {
        id:          kit.id,
        nombre:      kit.nombre,
        icon:        kit.icon,
        descripcion: kit.descripcion
      }
    });
  }

  return {
    tabla: jugadores.map((j, i) => ({
      posicion: i + 1,
      nombre:   j.nombre,
      grupo:    j.grupo,
      puntos:   j.puntos_arena || 0,
      wins:     j.wins_grupos,
      derrotas: j.derrotas_grupos,
      estado:   j.estado,
    })),
    siguienteDuelo,
  };
}

// ─── Registrar resultado de duelo de Grupos (Round Robin) ─────────────────────

/**
 * Registra el resultado de un encuentro del Round Robin.
 * NO hace transición de estado (ambos siguen "jugando_grupos"), solo acumula stats.
 *
 * @param {string} dueloId
 * @param {string} ganadorId
 */
async function resolverDueloGrupos(dueloId, ganadorId) {
  const duelo = await Duelo.findById(dueloId)
    .populate("jugador1_id")
    .populate("jugador2_id");

  if (!duelo) throw new Error(`Duelo ${dueloId} no encontrado`);
  if (duelo.estado === "completado") throw new Error("Ya resuelto");
  if (duelo.fase !== DuelPhase.GRUPOS) throw new Error("Usa resolverDuelo() para fases fuera de grupos");

  const esJ1 = duelo.jugador1_id._id.toString() === ganadorId;
  const ganador  = esJ1 ? duelo.jugador1_id : duelo.jugador2_id;
  const perdedor = esJ1 ? duelo.jugador2_id : duelo.jugador1_id;

  // ── Calcular puntos con mécanica de racha ───────────────────────────────────
  // Racha: 3 victorias consecutivas → la 3a victoria vale 9 pts (en lugar de 3).
  ganador.racha_actual = (ganador.racha_actual || 0) + 1;
  const esRacha = ganador.racha_actual >= 3;
  const puntosGanados = esRacha ? 9 : 3;
  if (esRacha) ganador.racha_actual = 0; // reiniciar tras el bono

  ganador.wins_grupos     += 1;
  ganador.puntos_arena    += puntosGanados;
  ganador.partidas_jugadas_arena += 1;

  perdedor.racha_actual    = 0; // perder rompe la racha
  perdedor.derrotas_grupos += 1;
  perdedor.partidas_jugadas_arena += 1;

  ganador.estado  = PlayerState.JUGANDO_GRUPOS;
  perdedor.estado = PlayerState.JUGANDO_GRUPOS;

  await Promise.all([ganador.save(), perdedor.save()]);

  duelo.ganador_id  = ganador._id;
  duelo.perdedor_id = perdedor._id;
  duelo.estado      = "completado";
  duelo.resolvedAt  = new Date();
  await duelo.save();

  return { duelo, ganador, perdedor };
}

module.exports = {
  resolverDuelo,
  resolverDueloGrupos,
  getNextOpponent,
  finalizarFaseGrupos,
};
