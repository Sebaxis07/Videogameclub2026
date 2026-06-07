/**
 * groqService.js
 * =======================
 * Integración con Groq API para el Juez AI del minijuego "La Corte de la Arena".
 * Utiliza Llama-3.1 para dictar veredictos dramáticos y justos.
 */

const Groq = require("groq-sdk");

// Usando la clave proporcionada por el usuario
const groq = new Groq({
  apiKey: "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"
});

/**
 * Genera una respuesta del Juez basada en los cargos y la defensa.
 * 
 * @param {string} defendantName - Nombre del acusado
 * @param {string} lawyerName - Nombre del abogado designado
 * @param {string} evidence - Motivo de la sanción
 * @param {string} argument - La defensa escrita por el abogado
 * @param {string} battleSummary - Resumen del duelo entre las IAs de la sala
 * @returns {Promise<{verdict: 'pardon'|'guilty', reason: string, judgeSpeech: string}>}
 */
async function getJudgeVerdict(defendantName, lawyerName, evidence, argument, battleSummary) {
  try {
    const prompt = `
      Eres el Juez Supremo de la "Arena de Trivia", un juez digital incorruptible, dramático y severo en un entorno cyberpunk/gótico.
      
      CASO ACTUAL:
      - Acusado: ${defendantName}
      - Abogado Defensor: ${lawyerName}
      - Evidencia de Infracción: ${Array.isArray(evidence) ? evidence.join(' | ') : evidence}
      - Defensa Presentada: "${argument}"
      - Duelo de IAs: ${battleSummary || 'No hay duelo definido.'}
      
      TU MISIÓN:
      Analiza todo el caso y decide si la defensa merece el "INDULTO" o si la evidencia obliga al veredicto de "CULPABLE".
      
      REGLAS:
      1. Tu respuesta debe ser un objeto JSON puro.
      2. El campo 'verdict' debe ser 'pardon' (indulto) o 'guilty' (culpable).
      3. 'reason' es una breve explicación técnica.
      4. 'judgeSpeech' es tu discurso dramático para la sala (máximo 280 caracteres). Usa un tono teatral.
      
      JSON example: 
      {
        "verdict": "pardon",
        "reason": "La defensa fue excepcionalmente creativa",
        "judgeSpeech": "¡Silencio en la sala! Aunque tus actos fueron impuros, la elocuencia de tu abogado ha conmovido los circuitos de la justicia. ¡Quedas libre!"
      }
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-70b-versatile",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("Error en Groq Judge Service:", error);
    // Fallback en caso de error de API
    return {
      verdict: "guilty",
      reason: "Error en el sistema judicial digital",
      judgeSpeech: "¡Mi juicio ha sido interrumpido por interferencias! La sentencia de culpabilidad se mantiene por defecto."
    };
  }
}

module.exports = { getJudgeVerdict };
