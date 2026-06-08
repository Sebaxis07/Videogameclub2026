"use strict";

const express = require("express");
const router = express.Router();

const MinecraftEval = require("../models/MinecraftEval");
const MortalKombatEval = require("../models/MortalKombatEval");
const GauntletPlayer = require("../models/GauntletPlayer");
const MortalKombatTournament = require("../models/MortalKombatTournament");
const Duelo = require("../models/Duelo");

const { PlayerState, DuelPhase } = require("../services/gauntlet/playerStates");

// Helper to emit updates via WebSockets
function emitUpdate(req, eventName) {
  try {
    const io = req.app.get("io");
    if (io) io.emit(eventName, { ts: Date.now() });
  } catch (err) {
    console.error("Socket emit error:", err);
  }
}

router.post("/", async (req, res) => {
  try {
    const { nombre, rut: inputRut, game, level } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    if (!game || !["minecraft", "mortalkombat"].includes(game)) {
      return res.status(400).json({ error: "Juego no válido (debe ser 'minecraft' o 'mortalkombat')." });
    }
    if (!level) {
      return res.status(400).json({ error: "El nivel del juego es obligatorio." });
    }

    // Auto-generate RUT if not provided to avoid DB uniqueness constraint crashes
    const rut = inputRut && inputRut.trim() 
      ? inputRut.trim() 
      : `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (game === "minecraft") {
      // 1. Map level to technical values
      let grupo = "C"; // Default C (Principiante)
      let controlHotbar = "No";
      let controlCriticos = "No";
      let dominioPvP = "No";
      let dominioClicks = "No";

      if (level === "A" || level === "Experto") {
        grupo = "A";
        controlHotbar = "Sí";
        controlCriticos = "Sí";
        dominioPvP = "Sí";
        dominioClicks = "Sí";
      } else if (level === "B" || level === "Intermedio") {
        grupo = "B";
        controlHotbar = "Más o menos";
        controlCriticos = "Más o menos";
        dominioPvP = "Más o menos";
        dominioClicks = "Más o menos";
      }

      // 2. Create or update MinecraftEval
      await MinecraftEval.findOneAndUpdate(
        { "jugador.rut": rut },
        {
          jugador: { nombre: nombre.trim(), rut },
          controlHotbar,
          controlCriticos,
          dominioPvP,
          dominioClicks,
          fechaEvaluacion: Date.now()
        },
        { upsert: true, new: true }
      );

      // 3. Integrate into current Minecraft Tournament if active
      // Find the latest tournament ID by checking existing players
      const lastPlayer = await GauntletPlayer.findOne().sort({ createdAt: -1 });
      const torneo_id = lastPlayer ? lastPlayer.torneo_id : `mctorneo-${new Date().toISOString().slice(0, 10)}`;

      // Check if player is already in this tournament
      const yaExiste = await GauntletPlayer.findOne({ torneo_id, nombre: nombre.trim() });
      if (yaExiste) {
        return res.status(409).json({ error: "Ya estás registrado en este torneo de Minecraft." });
      }

      // Check if playoffs have already started (cannot join after)
      const hayPlayoff = await Duelo.findOne({ torneo_id, bracket_side: { $ne: null } });
      if (hayPlayoff) {
        return res.status(403).json({ error: "Los playoffs ya han iniciado. No se admiten más incorporaciones." });
      }

      // Check if ronda 4 has been reached
      const ultRonda = await Duelo.findOne({ torneo_id, fase: DuelPhase.LIGA })
        .sort({ ronda_liga: -1 }).select("ronda_liga").lean();
      if ((ultRonda?.ronda_liga || 0) >= 4) {
        return res.status(403).json({ error: "Inscripciones cerradas: ya pasó la ronda 4 del torneo." });
      }

      // Calculate initial points for late joiners (median of same tier)
      const sameTier = await GauntletPlayer.find({ torneo_id, grupo }).lean();
      let puntosIniciales = 0;
      if (sameTier.length > 0) {
        const pts = sameTier.map(j => j.puntos_liga || 0).sort((a, b) => a - b);
        puntosIniciales = pts[Math.floor(pts.length / 2)] || 0;
      }

      const hasSwissStarted = await Duelo.exists({ torneo_id, fase: DuelPhase.LIGA });
      const estadoJugador = hasSwissStarted ? PlayerState.JUGANDO_GRUPOS : PlayerState.ESPERANDO_INICIO;

      const newPlayer = await GauntletPlayer.create({
        torneo_id,
        nombre: nombre.trim(),
        rut,
        grupo,
        estado: estadoJugador,
        puntos_liga: puntosIniciales,
        partidas_liga: 0,
      });

      emitUpdate(req, "mc_tournament_updated");

      return res.status(201).json({
        success: true,
        message: "Te has inscrito correctamente en el Torneo de Minecraft.",
        player: newPlayer
      });

    } else if (game === "mortalkombat") {
      // 1. Map level to technical values
      let rango = "Bronce"; // Default Bronce (Casual)
      let movilidad = "No";
      let peligrosidad = "No";
      let energia = "No";
      let defensa = "No";
      let pts = 0;

      if (level === "Oro" || level === "Experto") {
        rango = "Oro";
        movilidad = "Sí";
        peligrosidad = "Sí";
        energia = "Sí";
        defensa = "Sí";
        pts = 12;
      } else if (level === "Plata" || level === "Intermedio" || level === "Peleador") {
        rango = "Plata";
        movilidad = "Más o menos";
        peligrosidad = "Más o menos";
        energia = "Más o menos";
        defensa = "Más o menos";
        pts = 4;
      }

      // 2. Create or update MortalKombatEval
      await MortalKombatEval.findOneAndUpdate(
        { "jugador.rut": rut },
        {
          jugador: { nombre: nombre.trim(), rut },
          movilidad,
          peligrosidad,
          energia,
          defensa,
          fechaEvaluacion: Date.now()
        },
        { upsert: true, new: true }
      );

      // 3. Integrate into current Mortal Kombat Tournament if exists
      const t = await MortalKombatTournament.findOne({ singleton: "main" });
      let integrated = false;
      let msgDetails = "";

      const jugadorRef = {
        rut,
        nombre: nombre.trim(),
        score: pts,
        rango
      };

      if (t) {
        // Check if already in the tournament
        const alreadyExists = [...t.expertos, ...t.intermedios, ...t.novatos].some(p => p.rut === rut || p.nombre.toLowerCase() === nombre.trim().toLowerCase());
        if (alreadyExists) {
          return res.status(409).json({ error: "Ya estás registrado en este torneo de Mortal Kombat." });
        }

        // Add to appropriate pool
        if (rango === "Oro") {
          t.expertos.push(jugadorRef);
        } else if (rango === "Plata") {
          t.intermedios.push(jugadorRef);
        } else {
          t.novatos.push(jugadorRef);
        }

        // Re-calculate / insert into bracket if tournament has started and there are BYEs (wo)
        if (t.estado === "bloque_a" && rango === "Bronce") {
          const byeMatch = t.bloqueA.find(m => (!m.jugador1 || !m.jugador2) && m.estado === "wo");
          if (byeMatch) {
            if (!byeMatch.jugador1) {
              byeMatch.jugador1 = jugadorRef;
            } else {
              byeMatch.jugador2 = jugadorRef;
            }
            byeMatch.estado = "pendiente";
            byeMatch.ganador = null;
            integrated = true;
            msgDetails = "e integrado a un combate pendiente.";
          }
        } else if (t.estado === "bloque_b" && (rango === "Plata" || rango === "Bronce")) {
          const byeMatch = t.bloqueB.find(m => (!m.jugador1 || !m.jugador2) && m.estado === "wo");
          if (byeMatch) {
            if (!byeMatch.jugador1) {
              byeMatch.jugador1 = jugadorRef;
            } else {
              byeMatch.jugador2 = jugadorRef;
            }
            byeMatch.estado = "pendiente";
            byeMatch.ganador = null;
            integrated = true;
            msgDetails = "e integrado a un combate pendiente.";
          }
        }

        if (!integrated) {
          if (t.estado === "sin_iniciar") {
            msgDetails = "y se sembrará cuando comience el torneo.";
          } else {
            msgDetails = "como participante reserva (el bracket ya no tiene cupos libres).";
          }
        }

        t.updatedAt = new Date();
        t.markModified("expertos");
        t.markModified("intermedios");
        t.markModified("novatos");
        t.markModified("bloqueA");
        t.markModified("bloqueB");
        await t.save();
        
        emitUpdate(req, "mk_tournament_updated");
      }

      return res.status(201).json({
        success: true,
        message: `Te has inscrito correctamente en el Torneo de Mortal Kombat ${msgDetails}`,
        player: jugadorRef
      });
    }

  } catch (error) {
    console.error("Public registration error:", error);
    res.status(500).json({ error: "Ocurrió un error al procesar tu registro: " + error.message });
  }
});

module.exports = router;
