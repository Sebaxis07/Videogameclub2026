/**
 * TriviaRulesModal.jsx
 * =====================================
 * Pantalla de Reglas Completas y Consentimiento.
 * Explica detalladamente el funcionamiento del juego antes de entrar.
 */

import React, { useState } from 'react';

export default function TriviaRulesModal({ onAccept }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartCapture = async () => {
    setLoading(true);
    setError(null);

    // Fallback si no hay soporte de captura (insecure context)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.warn("Captura de pantalla no disponible en este navegador/conexión. Usando Modo Espejo.");
      onAccept(null);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 640, height: 360, frameRate: 5 },
        audio: false
      });
      onAccept(stream);
    } catch (err) {
      console.error("Error al capturar pantalla:", err);
      // Permitimos entrar igual para no bloquear la experiencia, pero avisamos
      onAccept(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#05050a]/98 backdrop-blur-2xl animate-fade-in shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      <div className="max-w-3xl w-full bg-[#0a0a14] border border-brand/30 rounded-[3rem] shadow-2xl shadow-brand/20 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header de Impacto Visual */}
        <div className="h-36 bg-gradient-to-r from-brand via-brand-light to-cyan-500 p-8 flex flex-col justify-end relative overflow-hidden shrink-0 border-b border-white/10">
          <div className="absolute -top-10 -right-10 text-white/5 text-9xl font-black italic select-none">GUIA</div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white leading-none tracking-tighter uppercase">Manual de Supervivencia</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.3em]">Lectura Obligatoria • 100% Digital</p>
            </div>
          </div>
        </div>

        {/* Cuerpo de Reglas (Scrollable) */}
        <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar flex-1">
          
          {/* ── 1. SISTEMA DE PUNTOS DINÁMICOS ─────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light shadow-lg">01</div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-wider">Sistema de Puntuación</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <ScoreCard label="Base por Acierto" value="+1000 pts" desc="Garantizados si respondes bien" icon="🟢" />
              <ScoreCard label="Bono de Velocidad" value="Hasta +500 pts" desc="Mientras más rápido, mejor" icon="⚡" />
              <ScoreCard label="Especial" value="Multiplicador x1.5" desc="Preguntas Pro o Matemáticas" icon="🔥" />
              <ScoreCard label="Puntaje Oculto" value="Secreto 🤫" desc="Solo visible en el ranking final" icon="🙈" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 flex gap-4 items-start col-span-1 md:col-span-2">
                <div className="text-2xl mt-1 text-cyan-400">🛡️</div>
                <div>
                  <h4 className="text-white font-black text-[11px] uppercase tracking-widest">Bono de Remontada</h4>
                  <p className="text-gray-400 text-[11px] mt-1.5 leading-relaxed">
                    Si eres novato y fallas varias preguntas seguidas, activarás un <strong>Multiplicador Oculto de hasta x2.0</strong> en tu siguiente acierto. ¡Nunca te rindas!
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── 2. GUÍA DE COMODINES ────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light shadow-lg">02</div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-wider">Guía de Comodines</h3>
            </div>

            <div className="space-y-3">
              <WildcardRule 
                icon="✂️" 
                title="50 / 50" 
                desc="Elimina automáticamente 2 opciones incorrectas de tu pantalla. Solo 1 uso por partida." 
                risk="Bajo"
              />
              <WildcardRule 
                icon="💥" 
                title="Flashbang (Cegadora)" 
                desc="Ciega las pantallas de todos tus oponentes por 1.5 segundos. ¡Úsalo para distraerlos!" 
                risk="Estratégico"
              />
              <WildcardRule 
                icon="🎲" 
                title="Doble o Nada" 
                desc="Ganas el doble de puntos si aciertas la pregunta actual. Pero ten cuidado: si fallas, perderás -500 pts." 
                risk="EXTREMO"
                danger
              />
            </div>
          </section>

          {/* ── 3. REGLAS DE LA ARENA (MONITOREO) ───────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-400/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-lg">03</div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-wider underline decoration-red-500/50 underline-offset-8">Reglas y Anti-Trampa</h3>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-4">
              <RuleBullet icon="🔒" title="Bloqueo de Ventana" desc="Si minimizas el navegador o cambias de pestaña, el juego se detendrá para todos los alumnos de inmediato." />
              <RuleBullet icon="👁️" title="Monitor de Cursor" desc="El administrador ve tu cursor en vivo. Todo movimiento fuera de la zona de respuestas será monitoreado." />
              <RuleBullet icon="📸" title="Captura de Pantalla" desc="Se toman fotos de tu pestaña cada 3 segundos y se muestran directamente al administrador." />
              <RuleBullet icon="🚫" title="Finalización" desc="Intentar hacer trampa puede resultar en la descalificación inmediata de tu facción." />
            </div>
          </section>

          {/* ── 4. EL FLUJO DEL JUEGO ────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-400/10 border border-green-500/20 flex items-center justify-center text-green-400 shadow-lg">04</div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-wider">El Suspenso</h3>
            </div>
            
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex gap-4 items-center">
              <div className="text-3xl">🤫</div>
              <div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Para mantener la tensión, <strong className="text-white font-black">NUNCA SABRÁS CUÁNTOS PUNTOS LLEVAS DURANTE LA PARTIDA</strong>. Durante las rondas sabrás si acertaste o fallaste, pero el cálculo matemático y tu posición real solo se revelarán en la pantalla de <strong>Ranking Final</strong>.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer de Aceptación */}
        <div className="p-8 border-t border-surface-border bg-[#05050a] flex flex-col items-center gap-5 shrink-0">
          <div className="flex items-center gap-3 px-4 py-2 bg-brand/10 border border-brand/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <p className="text-[9px] text-white/50 uppercase font-bold tracking-widest">Al entrar, aceptas compartir tu pantalla para el monitoreo</p>
          </div>
          
          <button
            onClick={handleStartCapture}
            disabled={loading}
            className={`w-full max-w-sm py-4 rounded-3xl text-lg font-black uppercase tracking-widest shadow-2xl transition-all relative overflow-hidden group
              ${loading ? 'bg-gray-800 text-gray-500 cursor-progress' : 'bg-brand hover:brightness-125 text-white shadow-brand/20 active:scale-95'}
            `}
          >
            {loading ? "Sincronizando..." : "ACEPTAR Y ENTRAR A LA ARENA"}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, desc, icon }) {
  return (
    <div className="p-4 rounded-2xl bg-surface border border-surface-border flex flex-col items-center text-center gap-1">
      <span className="text-xl mb-1">{icon}</span>
      <p className="text-[9px] text-gray-500 uppercase font-black">{label}</p>
      <p className="text-white font-black text-lg leading-tight">{value}</p>
      <p className="text-[8px] text-gray-600 font-bold uppercase">{desc}</p>
    </div>
  );
}

function WildcardRule({ icon, title, desc, risk, danger }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface/40 border border-surface-border/40 hover:border-brand/40 transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-[#0a0a14] border border-surface-border flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform shadow-xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-black text-white italic uppercase">{title}</h4>
          <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black ${danger ? 'bg-red-500/20 text-red-400' : 'bg-brand/20 text-brand-light'}`}>Riesgo: {risk}</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function RuleBullet({ icon, title, desc }) {
  return (
    <div className="flex gap-3">
      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-black text-gray-200 uppercase tracking-tighter">{title}</p>
        <p className="text-[11px] text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
