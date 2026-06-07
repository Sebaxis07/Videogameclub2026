const express = require("express");
const router = express.Router();
const MortalKombatEval = require("../models/MortalKombatEval");

/**
 * Scoring:
 *   "Sí"          → 3 pts
 *   "Más o menos" → 1 pt
 *   "No"          → 0 pts
 *
 * Clasificación final (12 pts máx):
 *   >= 10  → Oro    — "Experto"
 *   >= 5   → Plata  — "Peleador"
 *   < 5    → Bronce — "Casual"
 */
function calculateEvals(evals) {
  const pointsMap = { "Sí": 3, "Más o menos": 1, "No": 0 };

  return evals.map(ev => {
    const raw = ev.toObject ? ev.toObject() : ev;
    const pts =
      (pointsMap[raw.movilidad]    || 0) +
      (pointsMap[raw.peligrosidad] || 0) +
      (pointsMap[raw.energia]      || 0) +
      (pointsMap[raw.defensa]      || 0);

    let nivel = "Casual";
    let rango  = "Bronce";
    if (pts >= 10) { nivel = "Experto";   rango = "Oro"; }
    else if (pts >= 5) { nivel = "Peleador"; rango = "Plata"; }

    return { ...raw, score: pts, nivel, rango };
  });
}

// Obtener todas las calificaciones
router.get("/", async (req, res) => {
  try {
    const evals = await MortalKombatEval.find();
    res.json(calculateEvals(evals));
  } catch (error) {
    console.error("Error obteniendo evaluaciones MK:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Guardar / Actualizar evaluaciones
router.post("/", async (req, res) => {
  try {
    const { evaluations } = req.body;

    if (!Array.isArray(evaluations)) {
      return res.status(400).json({ error: "Formato incorrecto, se requiere un array 'evaluations'." });
    }

    const saved = [];
    for (const ev of evaluations) {
      if (!ev.jugador || !ev.jugador.rut) continue;

      const updated = await MortalKombatEval.findOneAndUpdate(
        { "jugador.rut": ev.jugador.rut },
        {
          jugador:      ev.jugador,
          movilidad:    ev.movilidad,
          peligrosidad: ev.peligrosidad,
          energia:      ev.energia,
          defensa:      ev.defensa,
          fechaEvaluacion: Date.now()
        },
        { upsert: true, new: true }
      );
      saved.push(updated);
    }

    res.json({ success: true, message: "Evaluaciones MK guardadas exitosamente.", data: saved });
  } catch (error) {
    console.error("Error guardando evaluaciones MK:", error);
    res.status(500).json({ error: "No se pudieron guardar las calificaciones." });
  }
});

// Eliminar evaluación por _id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await MortalKombatEval.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Calificación no encontrada" });
    }
    res.json({ success: true, message: "Calificación eliminada exitosamente" });
  } catch (error) {
    console.error("Error eliminando evaluación MK:", error);
    res.status(500).json({ error: "Error eliminando calificación" });
  }
});

module.exports = router;
