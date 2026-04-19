const express = require("express");
const router = express.Router();
const MinecraftEval = require("../models/MinecraftEval");

function calculateEvals(evals) {
  const pointsMap = { "Sí": 3, "Más o menos": 1, "No": 0 };
  return evals.map(ev => {
    const raw = ev.toObject ? ev.toObject() : ev;
    const pts = 
      (pointsMap[raw.controlHotbar] || 0) +
      (pointsMap[raw.controlCriticos] || 0) +
      (pointsMap[raw.dominioPvP] || 0) +
      (pointsMap[raw.dominioClicks] || 0);

    let grupo = "C";
    let nivelName = "bajo";
    if (pts >= 10) { grupo = "A"; nivelName = "alto"; }
    else if (pts >= 5) { grupo = "B"; nivelName = "medio"; }

    return { ...raw, score: pts, grupo, nivelName };
  });
}

// Obtener todas las calificaciones
router.get("/", async (req, res) => {
  try {
    const evals = await MinecraftEval.find();
    res.json(calculateEvals(evals));
  } catch (error) {
    console.error("Error obteniendo evaluaciones Minecraft:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Guardar/Actualizar evaluaciones
router.post("/", async (req, res) => {
  try {
    const { evaluations } = req.body;
    
    if (!Array.isArray(evaluations)) {
      return res.status(400).json({ error: "Formato incorrecto, se requiere un array 'evaluations'." });
    }

    const saved = [];
    for (const ev of evaluations) {
      if (!ev.jugador || !ev.jugador.rut) continue;
      
      const updated = await MinecraftEval.findOneAndUpdate(
        { "jugador.rut": ev.jugador.rut },
        {
          jugador: ev.jugador,
          controlHotbar: ev.controlHotbar,
          controlCriticos: ev.controlCriticos,
          dominioPvP: ev.dominioPvP,
          dominioClicks: ev.dominioClicks,
          fechaEvaluacion: Date.now()
        },
        { upsert: true, new: true } // El upsert creará el doc si no existe (actualiza si ya existe)
      );
      saved.push(updated);
    }
    
    res.json({ success: true, message: "Evaluaciones guardadas exitosamente.", data: saved });
  } catch (error) {
    console.error("Error guardando evaluaciones Minecraft:", error);
    res.status(500).json({ error: "No se pudieron guardar las calificaciones." });
  }
});

// Eliminar evaluación por _id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await MinecraftEval.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Calificación no encontrada" });
    }
    res.json({ success: true, message: "Calificación eliminada exitosamente" });
  } catch (error) {
    console.error("Error eliminando evaluación Minecraft:", error);
    res.status(500).json({ error: "Error eliminando calificación" });
  }
});

module.exports = router;
