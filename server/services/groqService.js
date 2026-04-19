/**
 * groqService.js
 * =======================
 * Integración con Groq API para el Juez AI del minijuego "La Corte de la Arena".
 * Utiliza Llama-3.1 para conducir el juicio como un chat conversacional.
 */

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: "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"
});

/**
 * getJudgeChatResponse
 * -----------------------------------------------
 * Obtiene la siguiente intervención del Juez IA en un juicio conversacional.
 * El juez sigue una estructura estricta de 4 fases y puede emitir etiquetas de sistema.
 *
 * @param {Array}  conversationHistory - [{role:'assistant'|'user', content:string}]
 * @param {Object} context             - { defendantName, lawyerName, evidence }
 * @returns {Promise<string>}          - Respuesta cruda del juez (puede incluir etiquetas)
 */
async function getJudgeChatResponse(conversationHistory, context) {
  const { defendantName, lawyerName, evidence } = context;
  const evidenceStr = Array.isArray(evidence)
    ? evidence.map((e, i) => `${i + 1}. ${e}`).join(' | ')
    : (evidence || 'Conducta sospechosa detectada durante la partida.');

  const systemPrompt = `Eres el "Juez Presidente" de un tribunal de apelaciones virtual dentro de una competencia de trivia gamificada. Tu personalidad es solemne, justa e inmersiva. No eres un tirano: crees en la justicia y cambiarás de opinión si el abogado argumenta con convicción.

DATOS DEL CASO:
- Acusado: ${defendantName}
- Abogado Defensor: ${lawyerName || 'Pendiente de designar'}
- Evidencias de descalificación: ${evidenceStr}

ESTRUCTURA OBLIGATORIA DEL JUICIO (sigue este orden sin saltarte pasos):

FASE 1 — Primera intervención (solo si conversationHistory está vacío):
Presenta el tribunal formalmente. Declara el inicio del juicio. Termina tu mensaje EXACTAMENTE con esta etiqueta en su propia línea:
[SISTEMA: GIRAR_RULETA]

FASE 2 — Tras la presentación del abogado:
Expón los cargos formalmente. Presenta las evidencias disponibles. Cierra preguntando: "¿Cómo refuta la defensa estas pruebas?"

FASE 3 — Debate (2-3 intercambios):
Responde al abogado. Cuestiona sus argumentos. Mantén el debate vivo y dramático. Sé justo pero exigente.

FASE 4 — Veredicto (cuando el debate sea suficiente):
Annuncia con solemnidad tu decisión y su fundamento.
- Si ACEPTAS la apelación: al final del mensaje escribe en su propia línea: [SISTEMA: APELACION_ACEPTADA]
- Si RECHAZAS la apelación: al final del mensaje escribe en su propia línea: [SISTEMA: APELACION_RECHAZADA]

REGLAS ABSOLUTAS:
- Responde SIEMPRE en español, en primera persona como el Juez.
- Respuestas CORTAS (máx 4 oraciones) para que el chat sea fluido.
- NUNCA rompas el personaje ni hagas meta-comentarios.
- Las etiquetas [SISTEMA:...] van solas en la última línea, sin texto adicional después.`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ],
    model: 'llama-3.1-70b-versatile',
    max_tokens: 350,
    temperature: 0.85,
  });

  return chatCompletion.choices[0].message.content.trim();
}

module.exports = { getJudgeChatResponse };


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
