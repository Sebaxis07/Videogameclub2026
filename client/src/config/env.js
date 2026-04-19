/**
 * env.js — Frontend Configuration Module
 * =====================================
 * Centraliza y valida las variables de entorno del cliente Vite.
 * Única fuente de verdad para la configuración de la app en el cliente.
 */

const envVars = import.meta.env;

const config = {
  // API URL base, por defecto '/api' para aprovechar el proxy de Vite en desarrollo
  API_URL: envVars.VITE_API_URL || '/api',
  
  // Opciones base de la aplicación
  APP_TITLE: envVars.VITE_APP_TITLE || 'Video Game Club Dashboard',
  
  // Entorno de ejecución
  MODE: envVars.MODE || 'development',
  IS_DEV: envVars.DEV,
  IS_PROD: envVars.PROD,
};

// Se puede requerir validación estricta aquí si hay variables críticas
// Por ahora solo provee advertencias no bloqueantes
const missingVars = [];

if (missingVars.length > 0) {
  console.warn(`[Config Frontend] Faltan variables recomendadas en .env: ${missingVars.join(', ')}`);
}

export default Object.freeze(config);
