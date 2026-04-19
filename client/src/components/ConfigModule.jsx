import React, { useState, useEffect } from "react";
import { fetchServerConfig, updateServerConfig } from "../api/configApi";

export default function ConfigModule() {
  const [configVars, setConfigVars] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await fetchServerConfig();
      setConfigVars(data);
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error cargando la configuración.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setConfigVars((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ text: "", type: "" });
      const res = await updateServerConfig(configVars);
      setMessage({ text: res.message || "Guardado exitosamente.", type: "success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: err.message || "Error al guardar.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-400">
        <svg className="animate-spin h-8 w-8 text-brand mr-3" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
        </svg>
        Cargando configuración...
      </div>
    );
  }

  // Predefinimos las keys importantes para mostrarlas en orden
  const KNOWN_KEYS = [
    "PORT",
    "SPREADSHEET_ID",
    "SHEET_RANGE",
    "SHEET_NAME",
    "GOOGLE_SERVICE_ACCOUNT_KEY_FILE",
    "SYNC_INTERVAL_MS"
  ];

  // Las que están en el .env pero no en known keys, las mostramos después
  const otherKeys = Object.keys(configVars).filter(k => !KNOWN_KEYS.includes(k));
  const allKeys = [...KNOWN_KEYS, ...otherKeys];

  return (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Variables de Entorno</h2>
            <p className="text-sm text-gray-400">
              Modifica la configuración de inicio del servidor backend directamente. 
              <strong className="text-yellow-400 ml-1">Nota:</strong> Se requiere reiniciar el proceso del servidor para que tomen efecto absoluto.
            </p>
          </div>
        </div>

        {message.text && (
          <div
            className={`p-4 mb-6 rounded-xl border ${
              message.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allKeys.map((key) => {
              // Si la key no existe en configVars, es porque todavía no se ha establecido en el archivo
              // Aseguramos que el input sea manejado
              const val = configVars[key] || "";
              return (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                    placeholder={`Valor de ${key}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                saving
                  ? "bg-brand/50 text-brand-light cursor-not-allowed"
                  : "bg-brand hover:bg-brand-dark text-white glow-brand"
              }`}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
