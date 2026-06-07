import React, { useState, useEffect, useMemo } from 'react';

/**
 * TournamentPlanner.jsx - Logistics Command Center (PDF Edition)
 * =============================================================
 * Herramienta premium de planificación logística para el Videogame Club.
 * Incluye simulación de hardware, cronograma dinámico, presets y exportador PDF oficial.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

// --- Funciones de Utilidad para Tiempos ---
function formatTime(minutesSinceMidnight) {
  const hrs = Math.floor(minutesSinceMidnight / 60) % 24;
  const mins = Math.round(minutesSinceMidnight % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function parseTime(timeStr) {
  if (!timeStr) return 1080; // 18:00 por defecto
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
}

// --- Iconos SVG Incorporados ---
const Icons = {
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Pickaxe: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.25a2.25 2.25 0 01-.66 1.59l-11.5 11.5a2.25 2.25 0 01-1.59.66H4.5v-3.5a2.25 2.25 0 01.66-1.59l11.5-11.5a2.25 2.25 0 013.18 0l1.25 1.25a2.25 2.25 0 01.66 1.59z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l-6 6M16 8l-3.5-3.5M14.5 13.5L10 9M7.5 16.5L6 18" />
    </svg>
  ),
  Dragon: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  ),
  Pc: ({ className = "w-8 h-8" }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  ),
  Console: ({ className = "w-8 h-8" }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9M12 12H3.75" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
      <circle cx="14" cy="13" r="1" fill="currentColor" />
    </svg>
  ),
  Report: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Math: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
};

// --- Presets de Tiempos ---
const TIME_PRESETS = {
  express: {
    label: "Express",
    desc: "Torneo ultrarrápido con tiempos mínimos de espera.",
    mcMatch: 1.5,
    mkMatch: 3.5,
    buffer: 5,
    setup: 5,
    awards: 10
  },
  standard: {
    label: "Estándar",
    desc: "El formato tradicional del club. Ritmo equilibrado.",
    mcMatch: 2.5,
    mkMatch: 5.0,
    buffer: 15,
    setup: 10,
    awards: 20
  },
  chill: {
    label: "Relajado / Chill",
    desc: "Partidas pausadas con tiempo para comida y comentarios.",
    mcMatch: 4.0,
    mkMatch: 7.0,
    buffer: 25,
    setup: 15,
    awards: 30
  }
};

// --- Presets de Población para Simulación ---
const POPULATION_PRESETS = {
  mini: {
    label: "Express (14 Jugadores)",
    mc: { alto: 2, medio: 3, bajo: 3 },
    mk: { oro: 2, plata: 2, bronce: 2 }
  },
  medium: {
    label: "Estándar (33 Jugadores)",
    mc: { alto: 4, medio: 7, bajo: 7 },
    mk: { oro: 3, plata: 6, bronce: 6 }
  },
  massive: {
    label: "Masivo (59 Jugadores)",
    mc: { alto: 8, medio: 12, bajo: 12 },
    mk: { oro: 6, plata: 11, bronce: 10 }
  }
};

export default function TournamentPlanner() {
  const [dbCounts, setDbCounts] = useState({
    mc: { alto: 0, medio: 0, bajo: 0, total: 0 },
    mk: { oro: 0, plata: 0, bronce: 0, total: 0 }
  });
  const [manualCounts, setManualCounts] = useState({
    mc: { alto: 4, medio: 7, bajo: 7 },
    mk: { oro: 3, plata: 6, bronce: 6 }
  });
  const [useManual, setUseManual] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Estados de Logística ---
  const [startTime, setStartTime] = useState("18:00");
  const [setupTime, setSetupTime] = useState(10);
  const [timePerMatchMC, setTimePerMatchMC] = useState(2.5);
  const [timePerMatchMK, setTimePerMatchMK] = useState(5.0);
  const [bufferPercent, setBufferPercent] = useState(15);
  const [awardsTime, setAwardsTime] = useState(20);
  const [isParallel, setIsParallel] = useState(false);

  // --- Estados de Estaciones ---
  const [mcStations, setMcStations] = useState([true, true, false, false, false]); // Máximo 5 PC
  const [mkStations, setMkStations] = useState([true, true, false, false]);       // Máximo 4 Consolas

  // --- Estados Adicionales ---
  const [showMath, setShowMath] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("standard");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportSections, setReportSections] = useState({
    general: true,
    stations: true,
    minecraft: true,
    mk: true,
    timeline: true
  });

  // --- Opciones de Personalización del PDF ---
  const [pdfOptions, setPdfOptions] = useState({
    showInacapLogo: true,
    showClubLogo: true,
    showSignatures: true,
    showSeal: true,
    showSpecs: true
  });

  // --- Carga de Datos desde la DB ---
  useEffect(() => {
    async function loadStats() {
      try {
        const [mcRes, mkRes] = await Promise.all([
          fetch(`${BASE}/minecraft-eval`).then(r => r.json()),
          fetch(`${BASE}/mk-eval`).then(r => r.json())
        ]);

        const mc = { alto: 0, medio: 0, bajo: 0, total: mcRes.length };
        mcRes.forEach(p => {
          const level = p.nivelName?.toLowerCase() || 'bajo';
          if (mc[level] !== undefined) mc[level]++;
        });

        const mk = { oro: 0, plata: 0, bronce: 0, total: mkRes.length };
        mkRes.forEach(p => {
          const pts = (p.movilidad === 'Sí' ? 3 : p.movilidad === 'Más o menos' ? 1 : 0) +
                      (p.peligrosidad === 'Sí' ? 3 : p.peligrosidad === 'Más o menos' ? 1 : 0) +
                      (p.energia === 'Sí' ? 3 : p.energia === 'Más o menos' ? 1 : 0) +
                      (p.defensa === 'Sí' ? 3 : p.defensa === 'Más o menos' ? 1 : 0);
          if (pts >= 10) mk.oro++;
          else if (pts >= 5) mk.plata++;
          else mk.bronce++;
        });

        setDbCounts({ mc, mk });
        // Sincronizar recuentos de simulación iniciales con la base de datos
        setManualCounts({
          mc: { alto: mc.alto, medio: mc.medio, bajo: mc.bajo },
          mk: { oro: mk.oro, plata: mk.plata, bronce: mk.bronce }
        });
      } catch (err) {
        console.error("Error loading stats for planner:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const currentCounts = useMemo(() => {
    if (useManual) {
      return {
        mc: {
          alto: manualCounts.mc.alto,
          medio: manualCounts.mc.medio,
          bajo: manualCounts.mc.bajo,
          total: manualCounts.mc.alto + manualCounts.mc.medio + manualCounts.mc.bajo
        },
        mk: {
          oro: manualCounts.mk.oro,
          plata: manualCounts.mk.plata,
          bronce: manualCounts.mk.bronce,
          total: manualCounts.mk.oro + manualCounts.mk.plata + manualCounts.mk.bronce
        }
      };
    }
    return dbCounts;
  }, [useManual, manualCounts, dbCounts]);

  // Cantidad de estaciones activas
  const activeMC = useMemo(() => {
    const active = mcStations.filter(Boolean).length;
    return active > 0 ? active : 1; // Previene división por cero
  }, [mcStations]);

  const activeMK = useMemo(() => {
    const active = mkStations.filter(Boolean).length;
    return active > 0 ? active : 1; // Previene división por cero
  }, [mkStations]);

  // --- Cálculos de Minecraft ---
  const mcStats = useMemo(() => {
    const { alto, medio, bajo } = currentCounts.mc;
    // Duelos Round Robin por niveles
    const duelsA = (alto * (alto - 1)) / 2;
    const duelsB = (medio * (medio - 1)) / 2;
    const duelsC = (bajo * (bajo - 1)) / 2;
    const totalRR = Math.max(0, duelsA) + Math.max(0, duelsB) + Math.max(0, duelsC);

    const gauntlet = 7; // Duelos de escalada fijos

    const slotsRR = Math.ceil(totalRR / activeMC);
    const timeRR = slotsRR * timePerMatchMC;
    const timeGauntlet = gauntlet * (timePerMatchMC + 1); // Gauntlet añade 1 min extra de configuración por match

    const rawTime = timeRR + timeGauntlet;
    return { totalRR, gauntlet, rawTime, timeRR, timeGauntlet };
  }, [currentCounts.mc, activeMC, timePerMatchMC]);

  // --- Cálculos de Mortal Kombat ---
  const mkStats = useMemo(() => {
    const { oro, plata, bronce } = currentCounts.mk;
    // Eliminación directa de las fases previas (Plata y Bronce)
    const duelsQualy = Math.max(0, bronce - 1) + Math.max(0, plata - 1);
    const finalBosses = 4; // Final Boss 1, 2, 3, y Gran Final

    const slotsQualy = Math.ceil(duelsQualy / activeMK);
    const timeQualy = slotsQualy * timePerMatchMK;
    const timeFinals = finalBosses * (timePerMatchMK + 2); // Fase de Jefes tiene 2 min extra por match (BO3)

    const rawTime = timeQualy + timeFinals;
    return { duelsQualy, finalBosses, rawTime, timeQualy, timeFinals };
  }, [currentCounts.mk, activeMK, timePerMatchMK]);

  // --- Tiempos Totales ---
  const rawTotal = isParallel ? Math.max(mcStats.rawTime, mkStats.rawTime) : (mcStats.rawTime + mkStats.rawTime);
  const bufferTime = rawTotal * (bufferPercent / 100);
  const totalWithBuffer = setupTime + rawTotal + bufferTime + awardsTime;

  // --- Lógica del Cronograma (Horas Reales) ---
  const timelineEvents = useMemo(() => {
    const baseMins = parseTime(startTime);
    const events = [];

    // 1. Apertura
    events.push({
      id: 'setup',
      title: "Apertura y Registro",
      desc: "Instalación de periféricos, control de asistencia y bienvenida.",
      duration: setupTime,
      start: baseMins,
      end: baseMins + setupTime,
      color: "border-brand-light bg-brand/5 text-brand-light",
      icon: "⚙️"
    });

    const startLogistics = baseMins + setupTime;

    if (!isParallel) {
      // Secuencial
      // 2. Minecraft Grupos
      const startMCG = startLogistics;
      const endMCG = startMCG + mcStats.timeRR;
      events.push({
        id: 'mc_groups',
        title: "Minecraft PvP: Fase de Grupos",
        desc: `Duelos Round Robin en ${activeMC} arenas (${mcStats.totalRR} duelos).`,
        duration: mcStats.timeRR,
        start: startMCG,
        end: endMCG,
        color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
        icon: "⛏️"
      });

      // 3. Minecraft Gauntlet
      const startMCF = endMCG;
      const endMCF = startMCF + mcStats.timeGauntlet;
      events.push({
        id: 'mc_gauntlet',
        title: "Minecraft PvP: Escalada Gauntlet",
        desc: "Fase final de eliminación directa ascendente.",
        duration: mcStats.timeGauntlet,
        start: startMCF,
        end: endMCF,
        color: "border-emerald-400/40 bg-emerald-400/5 text-emerald-300",
        icon: "👑"
      });

      // 4. MK Clasificatorias
      const startMKQ = endMCF;
      const endMKQ = startMKQ + mkStats.timeQualy;
      events.push({
        id: 'mk_qualy',
        title: "Mortal Kombat XL: Clasificatorias",
        desc: `Filtro eliminatorio Bronce/Plata en ${activeMK} estaciones (${mkStats.duelsQualy} duelos).`,
        duration: mkStats.timeQualy,
        start: startMKQ,
        end: endMKQ,
        color: "border-rose-600/40 bg-rose-600/5 text-rose-400",
        icon: "🐉"
      });

      // 5. MK Jefes
      const startMKB = endMKQ;
      const endMKB = startMKB + mkStats.timeFinals;
      events.push({
        id: 'mk_bosses',
        title: "Mortal Kombat: Desafío de Jefes",
        desc: "Boss Fights contra tier Oro y Gran Final.",
        duration: mkStats.timeFinals,
        start: startMKB,
        end: endMKB,
        color: "border-rose-400/40 bg-rose-400/5 text-rose-300",
        icon: "🔥"
      });
    } else {
      // Paralelo
      const endMC = startLogistics + mcStats.rawTime;
      const endMK = startLogistics + mkStats.rawTime;

      events.push({
        id: 'parallel_mc',
        title: "Minecraft PvP (Fase Completa)",
        desc: `Grupos (${mcStats.totalRR} duelos) + Gauntlet en ${activeMC} arenas.`,
        duration: mcStats.rawTime,
        start: startLogistics,
        end: endMC,
        color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
        icon: "⛏️",
        track: "A"
      });

      events.push({
        id: 'parallel_mk',
        title: "Mortal Kombat XL (Fase Completa)",
        desc: `Eliminatorias (${mkStats.duelsQualy} duelos) + Jefes en ${activeMK} consolas.`,
        duration: mkStats.rawTime,
        start: startLogistics,
        end: endMK,
        color: "border-rose-500/40 bg-rose-500/5 text-rose-400",
        icon: "🐉",
        track: "B"
      });
    }

    const endLogisticsTime = startLogistics + rawTotal;

    // Buffer de seguridad
    events.push({
      id: 'buffer',
      title: "Margen Operativo (Buffer)",
      desc: "Colchón de seguridad para retrasos técnicos y pausas.",
      duration: bufferTime,
      start: endLogisticsTime,
      end: endLogisticsTime + bufferTime,
      color: "border-amber-500/30 bg-amber-500/5 text-amber-300",
      icon: "🛡️"
    });

    // Ceremonia de Premiación
    const startAwards = endLogisticsTime + bufferTime;
    events.push({
      id: 'awards',
      title: "Ceremonia de Premiación",
      desc: "Entrega de diplomas a ganadores, fotos y cierre del evento.",
      duration: awardsTime,
      start: startAwards,
      end: startAwards + awardsTime,
      color: "border-cyan-400/40 bg-cyan-400/5 text-cyan-300",
      icon: "🏆"
    });

    return events;
  }, [isParallel, startTime, setupTime, mcStats, mkStats, activeMC, activeMK, bufferTime, awardsTime, rawTotal]);

  // --- Aplicar Presets de Configuración ---
  const applyTimePreset = (key) => {
    setSelectedPreset(key);
    const preset = TIME_PRESETS[key];
    if (preset) {
      setTimePerMatchMC(preset.mcMatch);
      setTimePerMatchMK(preset.mkMatch);
      setBufferPercent(preset.buffer);
      setSetupTime(preset.setup);
      setAwardsTime(preset.awards);
    }
  };

  // --- Aplicar Presets de Población ---
  const applyPopPreset = (key) => {
    const preset = POPULATION_PRESETS[key];
    if (preset) {
      setManualCounts({
        mc: { ...preset.mc },
        mk: { ...preset.mk }
      });
    }
  };

  // --- Lógica de Estaciones Activas (Clic) ---
  const toggleMcStation = (index) => {
    const next = [...mcStations];
    next[index] = !next[index];
    if (next.filter(Boolean).length === 0) {
      next[index] = true;
    }
    setMcStations(next);
  };

  const toggleMkStation = (index) => {
    const next = [...mkStations];
    next[index] = !next[index];
    if (next.filter(Boolean).length === 0) {
      next[index] = true;
    }
    setMkStations(next);
  };

  // --- Generar Reporte de Exportación en Texto ---
  const generatedReportText = useMemo(() => {
    let text = `📊 *REPORTE LOGÍSTICO DE TORNEOS*
----------------------------------------\n`;

    if (reportSections.general) {
      text += `⚙️ *CONFIGURACIÓN GENERAL:*
  • Modo de Ejecución: ${isParallel ? 'Paralelo (Ambos simultáneos)' : 'Secuencial (Uno tras otro)'}
  • Hora de Inicio: ${startTime}
  • Duración Estimada: ${Math.floor(totalWithBuffer / 60)}h ${Math.round(totalWithBuffer % 60)}min
  • Margen de Holgura (Buffer): +${Math.round(bufferTime)} min (${bufferPercent}%)
  • Premiación Asignada: ${awardsTime} min\n\n`;
    }

    if (reportSections.stations) {
      text += `🖥️ *ESTACIONES DE HARDWARE ACTIVAS:*
  • Minecraft PvP: ${activeMC} Arenas configuradas
  • Mortal Kombat XL: ${activeMK} Consolas configuradas\n\n`;
    }

    if (reportSections.minecraft) {
      const { alto, medio, bajo } = currentCounts.mc;
      text += `⛏️ *MINECRAFT PVP ANALYTICS:*
  • Población: ${alto} Expertos | ${medio} Intermedios | ${bajo} Principiantes (Total: ${alto+medio+bajo})
  • Duelos en Grupos (Round Robin): ${mcStats.totalRR} duelos
  • Duelos de Escalada (Gauntlet): ${mcStats.gauntlet}
  • Tiempo Neto de Juego: ${Math.round(mcStats.rawTime)} min (a ${timePerMatchMC} min/match)\n\n`;
    }

    if (reportSections.mk) {
      const { oro, plata, bronce } = currentCounts.mk;
      text += `🐉 *MORTAL KOMBAT XL ANALYTICS:*
  • Población: ${oro} Oro | ${plata} Plata | ${bronce} Bronce (Total: ${oro+plata+bronce})
  • Duelos de Clasificatorias: ${mkStats.duelsQualy}
  • Duelos de Jefes (Boss Fight): ${mkStats.finalBosses}
  • Tiempo Neto de Juego: ${Math.round(mkStats.rawTime)} min (a ${timePerMatchMK} min/match)\n\n`;
    }

    if (reportSections.timeline) {
      text += `📅 *CRONOGRAMA DE ACTIVIDADES:*
  • ${formatTime(timelineEvents[0].start)} - ${formatTime(timelineEvents[0].end)} | Apertura y Registro (${setupTime} min)`;
      
      if (!isParallel) {
        text += `
  • ${formatTime(timelineEvents[1].start)} - ${formatTime(timelineEvents[1].end)} | Minecraft PvP: Grupos (${mcStats.timeRR} min)
  • ${formatTime(timelineEvents[2].start)} - ${formatTime(timelineEvents[2].end)} | Minecraft PvP: Gauntlet (${mcStats.timeGauntlet} min)
  • ${formatTime(timelineEvents[3].start)} - ${formatTime(timelineEvents[3].end)} | MK XL: Clasificatorias (${mkStats.timeQualy} min)
  • ${formatTime(timelineEvents[4].start)} - ${formatTime(timelineEvents[4].end)} | MK XL: Desafío de Jefes (${mkStats.timeFinals} min)`;
      } else {
        text += `
  • ${formatTime(timelineEvents[1].start)} - ${formatTime(timelineEvents[1].end)} | Minecraft PvP en Paralelo (${Math.round(mcStats.rawTime)} min)
  • ${formatTime(timelineEvents[2].start)} - ${formatTime(timelineEvents[2].end)} | Mortal Kombat XL en Paralelo (${Math.round(mkStats.rawTime)} min)`;
      }

      const bufferEv = timelineEvents[timelineEvents.length - 2];
      const awardsEv = timelineEvents[timelineEvents.length - 1];
      text += `
  • ${formatTime(bufferEv.start)} - ${formatTime(bufferEv.end)} | Colchón Técnico / Buffer (+${Math.round(bufferTime)} min)
  • ${formatTime(awardsEv.start)} - ${formatTime(awardsEv.end)} | Ceremonia de Premiación y Cierre (${awardsTime} min)
  • Hora Final Estimada: ${formatTime(awardsEv.end)}\n`;
    }

    text += `\n----------------------------------------\n_Generado por Videogame Club Logistics Dashboard_`;
    return text;
  }, [reportSections, isParallel, startTime, totalWithBuffer, bufferTime, bufferPercent, awardsTime, activeMC, activeMK, currentCounts, mcStats, timePerMatchMC, mkStats, timePerMatchMK, timelineEvents, setupTime]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-brand/20 rounded-full" />
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin absolute top-0" />
      </div>
      <div className="text-center">
        <p className="text-white font-black uppercase tracking-[0.3em] text-sm mb-1">Centro de Mando</p>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Sincronizando modelos de datos...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-fade-in text-gray-300">
      
      {/* ================= HEADER GENERAL (COMMAND CENTER) ================= */}
      <div className="relative overflow-hidden rounded-[36px] border border-surface-border/50 bg-gradient-to-br from-brand/10 via-surface-card to-surface/20 p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-dark/20 via-transparent to-transparent opacity-50 z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-brand/20 text-brand-light text-[10px] font-black tracking-widest rounded-xl border border-brand/30 uppercase">
                Logistics Console v2.1
              </span>
              <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-xl border border-white/5">
                <span className={`w-2 h-2 rounded-full ${useManual ? 'bg-amber-400 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  {useManual ? 'Modo Simulación (Sandbox)' : 'Modo Real (Base de Datos)'}
                </span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-3">
              Centro de <span className="text-gradient">Control Logístico</span>
            </h1>
            <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
              Predicción, modelado matemático y asignación de tiempos al minuto para los torneos presenciales del club. Optimiza la rotación de hardware y holguras operativas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
            <button
              onClick={() => setUseManual(!useManual)}
              className={`flex-1 xl:flex-none px-6 py-3.5 rounded-2xl font-black text-xs tracking-widest transition-all duration-300 border flex items-center justify-center gap-2 active:scale-95 ${
                useManual
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                : "bg-surface-hover/80 text-gray-300 border-white/10 hover:bg-surface-hover hover:text-white"
              }`}
            >
              {useManual ? "📊 USAR DATOS REALES (DB)" : "🧪 ACTIVAR SIMULADOR (SANDBOX)"}
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex-1 xl:flex-none px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl font-black text-xs tracking-widest transition-all duration-200 text-center shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 active:scale-95"
            >
              📄 EXPORTAR PDF OFICIAL
            </button>
          </div>
        </div>
      </div>

      {/* ================= DATOS CLAVE EN TIEMPO REAL ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Widget 1: Cronómetro General */}
        <div className="relative group overflow-hidden bg-surface-card/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest block">Duración Estimada</span>
            <div className="text-3xl font-black text-white leading-none tracking-tight flex items-baseline gap-1">
              {Math.floor(totalWithBuffer / 60)}<span className="text-xs text-brand-light font-bold">h</span>
              {Math.round(totalWithBuffer % 60)}<span className="text-xs text-brand-light font-bold">min</span>
            </div>
            <span className="text-[10px] text-gray-400 block font-medium">Con buffer técnico incluido</span>
          </div>
          <div className="p-3 bg-brand/10 text-brand-light rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Widget 2: Hora de Finalización */}
        <div className="relative group overflow-hidden bg-surface-card/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest block">Hora de Cierre</span>
            <div className="text-3xl font-black text-accent-cyan leading-none tracking-tight">
              {formatTime(timelineEvents[timelineEvents.length - 1].end)}
            </div>
            <span className="text-[10px] text-gray-400 block font-medium">Inicia a las {startTime}</span>
          </div>
          <div className="p-3 bg-accent-cyan/10 text-accent-cyan rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Widget 3: Total Duelos */}
        <div className="relative group overflow-hidden bg-surface-card/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest block">Duelos Totales</span>
            <div className="text-3xl font-black text-accent-green leading-none tracking-tight">
              {mcStats.totalRR + mcStats.gauntlet + (isParallel ? 0 : mkStats.duelsQualy + mkStats.finalBosses)}
            </div>
            <span className="text-[10px] text-gray-400 block font-medium">MC: {mcStats.totalRR + mcStats.gauntlet} | MK: {mkStats.duelsQualy + mkStats.finalBosses}</span>
          </div>
          <div className="p-3 bg-accent-green/10 text-accent-green rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        {/* Widget 4: Estaciones en Uso */}
        <div className="relative group overflow-hidden bg-surface-card/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest block">Estaciones en Uso</span>
            <div className="text-3xl font-black text-rose-400 leading-none tracking-tight">
              {activeMC + activeMK} <span className="text-xs font-bold text-gray-500">/ 9</span>
            </div>
            <span className="text-[10px] text-gray-400 block font-medium">PC: {activeMC} | Consolas: {activeMK}</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ================= CONTROLES GLOBALES Y PRESETS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL: Configuración Técnica */}
        <div className="lg:col-span-2 bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="p-2.5 rounded-xl bg-white/5 text-white">{Icons.Settings()}</span>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase">Configuración de Logística</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hora de Inicio */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Hora de Inicio del Evento</label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-black outline-none focus:border-brand transition-colors text-sm"
                />
              </div>
            </div>

            {/* Apertura & Setup */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Apertura y Registro</label>
                <span className="text-brand-light font-black text-xs">{setupTime} min</span>
              </div>
              <input
                type="range" min="0" max="30" step="5"
                value={setupTime}
                onChange={e => setSetupTime(parseInt(e.target.value))}
                className="w-full accent-brand cursor-pointer bg-black/40 h-2 rounded-lg"
              />
            </div>

            {/* Buffer de Margen de Error */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Margen de Error (Buffer)</label>
                <span className="text-brand-light font-black text-xs">+{bufferPercent}%</span>
              </div>
              <input
                type="range" min="0" max="50" step="5"
                value={bufferPercent}
                onChange={e => setBufferPercent(parseInt(e.target.value))}
                className="w-full accent-brand cursor-pointer bg-black/40 h-2 rounded-lg"
              />
            </div>

            {/* Tiempo de Premiación */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ceremonia de Premiación</label>
                <span className="text-brand-light font-black text-xs">{awardsTime} min</span>
              </div>
              <input
                type="range" min="5" max="45" step="5"
                value={awardsTime}
                onChange={e => setAwardsTime(parseInt(e.target.value))}
                className="w-full accent-brand cursor-pointer bg-black/40 h-2 rounded-lg"
              />
            </div>
          </div>

          {/* Toggle de Ejecución Paralela */}
          <div 
            onClick={() => setIsParallel(!isParallel)}
            className={`p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer ${
              isParallel
              ? "bg-brand/10 border-brand/30 text-white"
              : "bg-black/30 border-white/5 hover:border-white/10 text-gray-400"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors ${isParallel ? 'bg-brand/20 text-brand-light' : 'bg-white/5 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight leading-tight">Ejecución Paralela</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Permite correr Minecraft y MK XL de forma simultánea reduciendo el tiempo total.</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isParallel ? 'bg-brand' : 'bg-gray-700'}`}>
              <span className={`absolute w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${isParallel ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </div>
        </div>

        {/* PANEL: Presets rápidos */}
        <div className="bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="p-2.5 rounded-xl bg-white/5 text-white">{Icons.Calendar()}</span>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase">Presets Rápidos</h2>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Cambia instantáneamente la configuración temporal y buffer adaptándote al ritmo deseado:
          </p>

          <div className="space-y-3">
            {Object.entries(TIME_PRESETS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => applyTimePreset(key)}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 ${
                  selectedPreset === key
                  ? "bg-brand/10 border-brand/40 shadow-lg shadow-brand/5"
                  : "bg-black/20 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase tracking-wider">{item.label}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-lg border border-white/5 text-brand-light font-bold">
                    Buffer: {item.buffer}%
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= SANDBOX INTERACTIVO DE HARDWARE (ESTACIONES) ================= */}
      <div className="bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-white/5 text-white">🖥️</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight uppercase">Disponibilidad de Estaciones</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Haz clic sobre las pantallas para desactivar o reactivar hardware</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Esquema:</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-brand border border-brand-light/30" /> Activo</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-white/5 border border-white/10" /> Inactivo</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Estaciones Minecraft */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">Arenas Minecraft PvP</h3>
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-500/20 uppercase">
                {activeMC} Activas
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {mcStations.map((active, index) => (
                <button
                  key={index}
                  onClick={() => toggleMcStation(index)}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 ${
                    active
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/5 hover:scale-105"
                    : "bg-black/40 border-white/5 text-gray-600 hover:border-white/10"
                  }`}
                >
                  {Icons.Pc({ className: "w-8 h-8 filter drop-shadow-glow" })}
                  <div className="text-[9px] font-black uppercase tracking-wider text-center">
                    Arena {index + 1}
                  </div>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 italic">Cada arena de Minecraft permite duelos simultáneos 1v1v1v1 (4 Notebooks en red local).</p>
          </div>

          {/* Estaciones Mortal Kombat */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-rose-400 tracking-wider">Estaciones Mortal Kombat XL</h3>
              <span className="text-[10px] font-black bg-rose-500/10 text-rose-300 px-2.5 py-1 rounded-xl border border-rose-500/20 uppercase">
                {activeMK} Activas
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {mkStations.map((active, index) => (
                <button
                  key={index}
                  onClick={() => toggleMkStation(index)}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 ${
                    active
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-md shadow-rose-500/5 hover:scale-105"
                    : "bg-black/40 border-white/5 text-gray-600 hover:border-white/10"
                  }`}
                >
                  {Icons.Console({ className: "w-8 h-8 filter drop-shadow-glow" })}
                  <div className="text-[9px] font-black uppercase tracking-wider text-center">
                    Estación {index + 1}
                  </div>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 italic">Cada estación corresponde a una consola de sobremesa (PlayStation/Xbox/PC) para peleas 1v1.</p>
          </div>

        </div>
      </div>

      {/* ================= ANALÍTICAS Y CONTROL DE JUGADORES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL: Minecraft PvP Analytics */}
        <div className="relative overflow-hidden rounded-[32px] border border-emerald-500/10 bg-gradient-to-b from-emerald-950/10 to-transparent p-6 space-y-6">
          <div className="absolute top-0 right-0 p-6 text-emerald-500/5 pointer-events-none scale-150">{Icons.Pickaxe()}</div>
          
          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">{Icons.Pickaxe()}</span>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Minecraft PvP Analytics</h3>
                <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-widest mt-0.5">Round Robin & Gauntlet</span>
              </div>
            </div>
          </div>

          {/* Ajuste de tiempos por Match */}
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Minutos por Match</span>
              <div className="flex items-center gap-3">
                <input
                  type="number" step="0.5" min="1" max="10"
                  value={timePerMatchMC}
                  onChange={e => setTimePerMatchMC(parseFloat(e.target.value) || 1)}
                  className="bg-transparent text-xl font-black text-white w-20 outline-none border-b border-white/10 pb-0.5"
                />
                <span className="text-xs text-gray-500 font-bold">Min</span>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Arenas Asignadas</span>
              <span className="text-xl font-black text-emerald-400">{activeMC} Arenas</span>
            </div>
          </div>

          {/* Sandbox de Jugadores MC */}
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Población por Tier {useManual && "(Manual)"}</label>
              {useManual && (
                <div className="flex gap-2">
                  <button onClick={() => applyPopPreset('mini')} className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 font-bold uppercase text-gray-400 hover:text-white">Mini</button>
                  <button onClick={() => applyPopPreset('medium')} className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 font-bold uppercase text-gray-400 hover:text-white">Med</button>
                  <button onClick={() => applyPopPreset('massive')} className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 font-bold uppercase text-gray-400 hover:text-white">Max</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[['alto', 'Expertos', 'text-rose-400'], ['medio', 'Intermedios', 'text-yellow-400'], ['bajo', 'Novatos', 'text-emerald-400']].map(([level, label, color]) => (
                <div key={level} className="bg-black/20 rounded-2xl border border-white/5 p-3.5 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{label}</span>
                  {useManual ? (
                    <div className="flex items-center justify-between w-full mt-3">
                      <button
                        onClick={() => setManualCounts(p => ({ ...p, mc: { ...p.mc, [level]: Math.max(0, p.mc[level] - 1) } }))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center font-bold text-white transition-colors"
                      >
                        -
                      </button>
                      <span className={`text-base font-black ${color}`}>{manualCounts.mc[level]}</span>
                      <button
                        onClick={() => setManualCounts(p => ({ ...p, mc: { ...p.mc, [level]: p.mc[level] + 1 } }))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center font-bold text-white transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xl font-black mt-2 ${color}`}>{dbCounts.mc[level]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas de Duelos Estimados */}
          <div className="bg-black/40 rounded-3xl border border-white/5 p-5 grid grid-cols-3 gap-4 relative z-10">
            <div className="text-center">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Duelos RR</span>
              <span className="text-lg font-black text-white mt-1 block">{mcStats.totalRR}</span>
            </div>
            <div className="text-center border-x border-white/5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Escalada</span>
              <span className="text-lg font-black text-white mt-1 block">{mcStats.gauntlet}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Tiempo Neto</span>
              <span className="text-lg font-black text-emerald-400 mt-1 block">{Math.round(mcStats.rawTime)} min</span>
            </div>
          </div>
        </div>

        {/* PANEL: Mortal Kombat XL Analytics */}
        <div className="relative overflow-hidden rounded-[32px] border border-rose-500/10 bg-gradient-to-b from-rose-950/10 to-transparent p-6 space-y-6">
          <div className="absolute top-0 right-0 p-6 text-rose-500/5 pointer-events-none scale-150">{Icons.Dragon()}</div>
          
          <div className="flex items-center justify-between border-b border-rose-500/10 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400">{Icons.Dragon()}</span>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Mortal Kombat XL Analytics</h3>
                <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-widest mt-0.5">Clasificatorias & Jefes</span>
              </div>
            </div>
          </div>

          {/* Ajuste de tiempos por Match */}
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Minutos por Match</span>
              <div className="flex items-center gap-3">
                <input
                  type="number" step="0.5" min="1" max="15"
                  value={timePerMatchMK}
                  onChange={e => setTimePerMatchMK(parseFloat(e.target.value) || 1)}
                  className="bg-transparent text-xl font-black text-white w-20 outline-none border-b border-white/10 pb-0.5"
                />
                <span className="text-xs text-gray-500 font-bold">Min</span>
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Estaciones Asignadas</span>
              <span className="text-xl font-black text-rose-400">{activeMK} Consolas</span>
            </div>
          </div>

          {/* Sandbox de Jugadores MK */}
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Población por Tier {useManual && "(Manual)"}</label>
              {useManual && (
                <div className="flex gap-2">
                  <button onClick={() => applyPopPreset('mini')} className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 font-bold uppercase text-gray-400 hover:text-white">Mini</button>
                  <button onClick={() => applyPopPreset('medium')} className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 font-bold uppercase text-gray-400 hover:text-white">Med</button>
                  <button onClick={() => applyPopPreset('massive')} className="text-[8px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 font-bold uppercase text-gray-400 hover:text-white">Max</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[['oro', 'Expertos (Oro)', 'text-yellow-400'], ['plata', 'Peleadores', 'text-slate-300'], ['bronce', 'Casuales', 'text-orange-500']].map(([level, label, color]) => (
                <div key={level} className="bg-black/20 rounded-2xl border border-white/5 p-3.5 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{label}</span>
                  {useManual ? (
                    <div className="flex items-center justify-between w-full mt-3">
                      <button
                        onClick={() => setManualCounts(p => ({ ...p, mk: { ...p.mk, [level]: Math.max(0, p.mk[level] - 1) } }))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center font-bold text-white transition-colors"
                      >
                        -
                      </button>
                      <span className={`text-base font-black ${color}`}>{manualCounts.mk[level]}</span>
                      <button
                        onClick={() => setManualCounts(p => ({ ...p, mk: { ...p.mk, [level]: p.mk[level] + 1 } }))}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center font-bold text-white transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xl font-black mt-2 ${color}`}>{dbCounts.mk[level]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas de Duelos Estimados */}
          <div className="bg-black/40 rounded-3xl border border-white/5 p-5 grid grid-cols-3 gap-4 relative z-10">
            <div className="text-center">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Clasificatorias</span>
              <span className="text-lg font-black text-white mt-1 block">{mkStats.duelsQualy}</span>
            </div>
            <div className="text-center border-x border-white/5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Boss Fights</span>
              <span className="text-lg font-black text-white mt-1 block">{mkStats.finalBosses}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Tiempo Neto</span>
              <span className="text-lg font-black text-rose-400 mt-1 block">{Math.round(mkStats.rawTime)} min</span>
            </div>
          </div>
        </div>

      </div>

      {/* ================= CRONOGRAMA DINÁMICO GANTT ================= */}
      <div className="bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 md:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-white/5 text-white">📅</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight uppercase">Cronograma Detallado del Evento</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Planificación de bloques de juego, configuración y premiación</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-2 rounded-2xl">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ejecución Paralela:</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border font-mono ${isParallel ? 'bg-brand/20 border-brand/40 text-brand-light' : 'bg-white/5 border-white/5 text-gray-400'}`}>
              {isParallel ? 'ACTIVADA' : 'DESACTIVADA'}
            </span>
          </div>
        </div>

        {/* Cronograma en Paralelo (Visualización Track A / Track B) */}
        {isParallel ? (
          <div className="space-y-6">
            {/* Cabecera / Apertura */}
            <div className="flex items-start gap-4 p-4 bg-black/20 border border-brand/20 rounded-2xl relative">
              <span className="text-2xl mt-1">{timelineEvents[0].icon}</span>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-black text-brand-light">
                    {formatTime(timelineEvents[0].start)} - {formatTime(timelineEvents[0].end)}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-brand/10 border border-brand/20 rounded-lg text-brand-light font-black uppercase">
                    Setup ({timelineEvents[0].duration}m)
                  </span>
                </div>
                <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">{timelineEvents[0].title}</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{timelineEvents[0].desc}</p>
              </div>
            </div>

            {/* Dos tracks paralelos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Track A: Minecraft */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest">Track A: Minecraft Arena</h3>
                </div>

                <div className="p-5 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {formatTime(timelineEvents[1].start)} - {formatTime(timelineEvents[1].end)}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 font-black uppercase">
                      {Math.round(timelineEvents[1].duration)} min
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{timelineEvents[1].title}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{timelineEvents[1].desc}</p>
                </div>
              </div>

              {/* Track B: Mortal Kombat */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h3 className="text-xs font-black uppercase text-rose-400 tracking-widest">Track B: Mortal Kombat XL</h3>
                </div>

                <div className="p-5 bg-rose-950/10 border border-rose-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-rose-400">
                      {formatTime(timelineEvents[2].start)} - {formatTime(timelineEvents[2].end)}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 font-black uppercase">
                      {Math.round(timelineEvents[2].duration)} min
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{timelineEvents[2].title}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{timelineEvents[2].desc}</p>
                </div>
              </div>

            </div>

            {/* Fases Finales (Buffer y Premiación) */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              
              {/* Buffer */}
              <div className="flex items-start gap-4 p-4 bg-black/20 border border-amber-500/20 rounded-2xl">
                <span className="text-2xl mt-1">{timelineEvents[3].icon}</span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black text-amber-400">
                      {formatTime(timelineEvents[3].start)} - {formatTime(timelineEvents[3].end)}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 font-black uppercase">
                      Buffer (+{Math.round(timelineEvents[3].duration)}m)
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">{timelineEvents[3].title}</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{timelineEvents[3].desc}</p>
                </div>
              </div>

              {/* Premiación */}
              <div className="flex items-start gap-4 p-4 bg-black/20 border border-cyan-500/20 rounded-2xl">
                <span className="text-2xl mt-1">{timelineEvents[4].icon}</span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black text-accent-cyan">
                      {formatTime(timelineEvents[4].start)} - {formatTime(timelineEvents[4].end)}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-accent-cyan font-black uppercase">
                      Cierre ({timelineEvents[4].duration}m)
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">{timelineEvents[4].title}</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{timelineEvents[4].desc}</p>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Cronograma Secuencial (Lista Vertical Continua) */
          <div className="relative border-l border-white/10 pl-6 ml-4 space-y-6">
            {timelineEvents.map((item) => (
              <div key={item.id} className="relative group">
                <span className="absolute -left-[37px] top-1 w-6 h-6 rounded-full bg-surface border border-white/20 flex items-center justify-center text-[10px] group-hover:border-brand transition-colors">
                  {item.icon}
                </span>

                <div className={`p-5 rounded-2xl border ${item.color} shadow-lg transition-transform duration-300 hover:scale-[1.005] space-y-2`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-black tracking-wider">
                      {formatTime(item.start)} - {formatTime(item.end)}
                    </span>
                    <span className="text-[9px] px-2.5 py-0.5 rounded-lg bg-black/30 border border-white/5 font-black uppercase">
                      {Math.round(item.duration)} min
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.title}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= PANEL DE FORMULAS Y DESGLOSE MATEMATICO ================= */}
      <div className="bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[32px] overflow-hidden transition-all duration-300">
        <button
          onClick={() => setShowMath(!showMath)}
          className="w-full px-8 py-5 flex items-center justify-between bg-white/5 border-b border-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-white/5 text-white">{Icons.Math()}</span>
            <div className="text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Desglose Técnico y Fórmulas</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Conoce la matemática detrás de la predicción de tiempos</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 font-black">
            {showMath ? "OCULTAR FORMULAS [▲]" : "MOSTRAR FORMULAS [▼]"}
          </span>
        </button>

        {showMath && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in text-xs leading-relaxed text-gray-400">
            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="font-black text-emerald-400 uppercase tracking-wider">Fórmula Minecraft (Grupos)</h4>
              <p>
                Asigna a los jugadores de cada grupo en duelos todos contra todos por nivel de habilidad (Round Robin).
              </p>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-center text-white">
                Duelos = N(N-1) / 2
              </div>
              <p>
                Donde <strong>N</strong> es la cantidad de jugadores por nivel. El total de duelos RR es la suma de los tres niveles.
              </p>
            </div>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="font-black text-rose-400 uppercase tracking-wider">Fórmula Mortal Kombat</h4>
              <p>
                Utiliza un formato híbrido. Para niveles Bronce y Plata, se realiza un filtro rápido tipo eliminación directa.
              </p>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-center text-white">
                Duelos = (N_Bronce - 1) + (N_Plata - 1)
              </div>
              <p>
                Los clasificados avanzan al tier de Jefes (Boss Fight), donde se realizan 4 duelos predeterminados (incluyendo la Gran Final).
              </p>
            </div>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3">
              <h4 className="font-black text-brand-light uppercase tracking-wider">Algoritmo de Rotación</h4>
              <p>
                El tiempo necesario se calcula en función de la capacidad instalada y activa.
              </p>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-center text-white">
                Slots = ⌈Duelos / Estaciones⌉
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-center text-white">
                Tiempo = Slots × Minutos
              </div>
              <p>
                Cada estación en Minecraft soporta 1 juego, mientras que Mortal Kombat corre en consolas individuales.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================= PANEL DE EXPORTACIÓN (REPORT BUILDER) ================= */}
      <div id="export-report" className="relative group overflow-hidden bg-surface-card/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 md:p-8 space-y-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <span className="p-2.5 rounded-xl bg-white/5 text-white">{Icons.Report()}</span>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase">Exportador de Reportes (Texto)</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Construye y copia el reporte a Discord o WhatsApp en formato de texto plano</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Opciones de Reporte */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Secciones a Incluir</h3>
            <div className="space-y-3">
              {Object.entries({
                general: "Ajustes Generales y Tiempos",
                stations: "Detalle de Estaciones Activas",
                minecraft: "Analíticas Minecraft PvP",
                mk: "Analíticas Mortal Kombat XL",
                timeline: "Cronograma de Agenda Detallado"
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={reportSections[key]}
                    onChange={() => setReportSections(p => ({ ...p, [key]: !p[key] }))}
                    className="w-4 h-4 rounded text-brand bg-black/40 border-white/10 outline-none focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Previsualización del Reporte */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Vista Previa</h3>
              {copied && (
                <span className="text-[9px] font-black text-accent-cyan uppercase tracking-widest animate-pulse">
                  ✓ Copiado al portapapeles
                </span>
              )}
            </div>
            <textarea
              readOnly
              value={generatedReportText}
              className="w-full h-60 bg-black/50 border border-white/10 rounded-2xl p-5 text-xs font-mono text-gray-300 outline-none focus:border-brand transition-colors resize-none"
            />
            <button
              onClick={copyToClipboard}
              className="w-full py-4 bg-brand hover:bg-brand-dark text-white rounded-2xl font-black text-xs tracking-widest transition-all duration-200 shadow-xl shadow-brand/20 active:scale-95 flex items-center justify-center gap-2"
            >
              📋 COPIAR REPORTE LISTO
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL GENERADOR Y PREVISUALIZADOR PDF ================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 print:p-0 print:bg-white">
          <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-6xl flex flex-col max-h-[95vh] print:border-none print:shadow-none print:max-w-none print:h-screen print:w-screen print:rounded-none">
            
            {/* Header Modal (No visible en impresión) */}
            <div className="p-4 border-b border-surface-border flex justify-between items-center print:hidden">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  📄 Generar Reporte de Logística Oficial (PDF)
                </h3>
                <p className="text-xs text-gray-400">Documento exportable en formato A4 horizontal listo para imprimir o guardar.</p>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)} 
                className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-xl transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8 print:block print:p-0 print:overflow-visible">
              
              {/* Panel de Controles Izquierdo (No visible en impresión) */}
              <div className="w-full lg:w-1/4 space-y-6 print:hidden">
                <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">
                    Personalizar Documento
                  </h4>
                  
                  <div className="space-y-3">
                    {Object.entries({
                      showInacapLogo: "Logotipo de INACAP",
                      showClubLogo: "Logotipo de Video Game Club",
                      showSignatures: "Firmas de Coordinadores",
                      showSeal: "Sello de Seguridad DAE",
                      showSpecs: "Detalle Técnico de Brackets"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={pdfOptions[key]}
                          onChange={() => setPdfOptions(p => ({ ...p, [key]: !p[key] }))}
                          className="w-4 h-4 rounded text-brand bg-black/40 border-white/10 outline-none focus:ring-0 cursor-pointer"
                        />
                        <span className="text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed space-y-2">
                  <h5 className="font-bold uppercase tracking-wider">💡 CONFIGURACIÓN RECOMENDADA:</h5>
                  <p>Al imprimir o guardar como PDF en tu navegador:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Orientación: <strong>Horizontal (Landscape)</strong></li>
                    <li>Tamaño papel: <strong>A4</strong> o <strong>Carta</strong></li>
                    <li>Márgenes: <strong>Ninguno</strong> o <strong>Mínimo</strong></li>
                    <li>Habilitar: <strong>Gráficos de fondo</strong> (para conservar fondos y marcos).</li>
                  </ul>
                </div>

                <button 
                  onClick={handlePrintReport}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Imprimir / Exportar PDF
                </button>
              </div>

              {/* Previsualización del Reporte A4 Landscape (Visible en impresión) */}
              <div className="w-full lg:w-3/4 overflow-x-auto flex items-start justify-center print:w-full print:h-full print:p-0 pb-4">
                
                {/* Contenedor del PDF (A4 Landscape) */}
                <div 
                  className="print-report-container min-w-[842px] max-w-[842px] relative aspect-[297/210] bg-[#FAF8F5] text-gray-900 rounded-sm shadow-2xl flex flex-col justify-between p-10 overflow-hidden shrink-0 border border-gray-200"
                  style={{ 
                    backgroundImage: 'radial-gradient(circle, #ffffff 0%, #FAF8F5 100%)',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  
                  {/* Marco Técnico SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none p-4" viewBox="0 0 842 595" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="15" width="812" height="565" rx="2" stroke="#2D2D4E" strokeWidth="2.5" />
                    <rect x="21" y="21" width="800" height="553" rx="1" stroke="#2D2D4E" strokeWidth="0.5" strokeDasharray="3 3" />
                  </svg>

                  {/* Cabecera del Reporte */}
                  <div className="flex justify-between items-center z-10 px-4">
                    {/* Logo INACAP */}
                    {pdfOptions.showInacapLogo ? (
                      <div className="flex items-center gap-2 select-none">
                        <svg className="w-8 h-8 shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="100" height="100" rx="8" fill="#C20012" />
                          <path d="M 28 75 L 28 42 L 40 42 L 40 75 Z" fill="white" />
                          <circle cx="34" cy="27" r="6" fill="white" />
                          <path d="M 46 75 L 46 54 C 46 47, 52 44, 57 47 C 62 49, 63 54, 63 59 L 63 75 L 73 75 L 73 56 C 73 45, 66 39, 56 41 C 51 42, 47 45, 46 49 L 46 42 L 36 42 L 36 75 Z" fill="white" />
                        </svg>
                        <div className="flex flex-col text-left">
                          <span className="font-extrabold text-[12px] tracking-[0.1em] text-gray-800 uppercase font-sans leading-none">INACAP</span>
                          <span className="text-[6.5px] font-bold tracking-[0.15em] text-gray-400 uppercase font-sans mt-0.5">Sede Santiago Sur</span>
                        </div>
                      </div>
                    ) : <div />}

                    {/* Logo VGC */}
                    {pdfOptions.showClubLogo ? (
                      <div className="flex items-center gap-2 text-right justify-end select-none">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[12px] tracking-[0.08em] text-gray-800 uppercase font-sans leading-none">VIDEO GAME CLUB</span>
                          <span className="text-[6.5px] font-bold tracking-[0.15em] text-gray-400 uppercase font-sans mt-0.5">LIGA LOGÍSTICA OFICIAL</span>
                        </div>
                        <svg className="w-8 h-8 shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="vgc-gold-grad-pdf" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#ffe4a3" />
                              <stop offset="50%" stopColor="#b48608" />
                              <stop offset="100%" stopColor="#805d02" />
                            </linearGradient>
                          </defs>
                          <path d="M 50 10 Q 75 12 80 40 Q 80 70 50 90 Q 20 70 20 40 Q 25 12 50 10 Z" fill="url(#vgc-gold-grad-pdf)" />
                          <path d="M 50 14 Q 72 16 76 40 Q 76 66 50 84 Q 24 66 24 40 Q 28 16 50 14 Z" fill="#1C1C1F" />
                          <path d="M 40 46 C 40 43, 44 40, 50 40 C 56 40, 60 43, 60 46 C 60 51, 56 54, 50 54 C 44 54, 40 51, 40 46 Z" fill="url(#vgc-gold-grad-pdf)" />
                        </svg>
                      </div>
                    ) : <div />}
                  </div>

                  {/* Título e Info General */}
                  <div className="z-10 text-center px-4 mt-1">
                    <span className="text-[7.5px] font-extrabold tracking-[0.3em] text-gray-500 uppercase font-sans block mb-1">
                      DOCUMENTO OFICIAL DE PLANIFICACIÓN DE TORNEO Y LOGÍSTICA
                    </span>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase font-serif" style={{ fontFamily: "'Cinzel', serif" }}>
                      Plan de Tiempos y Operatividad
                    </h2>
                    
                    {/* Línea Divisoria */}
                    <div className="w-16 h-[1.5px] bg-[#d4af37] mx-auto my-2 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#b48608] to-transparent"></div>
                    </div>

                    {/* Metadata del Documento */}
                    <div className="grid grid-cols-5 gap-2 max-w-3xl mx-auto bg-gray-100/80 border border-gray-200/80 rounded-xl p-2.5 text-[9px] text-gray-600 font-sans mt-2">
                      <div>
                        <span className="text-gray-400 font-bold block uppercase text-[7.5px]">Fecha de Emisión</span>
                        <strong className="text-gray-800">{new Date().toLocaleDateString('es-CL')}</strong>
                      </div>
                      <div className="border-l border-gray-200">
                        <span className="text-gray-400 font-bold block uppercase text-[7.5px]">Hora de Inicio</span>
                        <strong className="text-gray-800">{startTime} Hrs</strong>
                      </div>
                      <div className="border-l border-gray-200">
                        <span className="text-gray-400 font-bold block uppercase text-[7.5px]">Fin Estimado</span>
                        <strong className="text-gray-800">{formatTime(timelineEvents[timelineEvents.length - 1].end)} Hrs</strong>
                      </div>
                      <div className="border-l border-gray-200">
                        <span className="text-gray-400 font-bold block uppercase text-[7.5px]">Modo de Carga</span>
                        <strong className="text-gray-800">{useManual ? "SIMULACIÓN" : "SINC. DB"}</strong>
                      </div>
                      <div className="border-l border-gray-200">
                        <span className="text-gray-400 font-bold block uppercase text-[7.5px]">Ejecución</span>
                        <strong className="text-gray-800">{isParallel ? "PARALELA" : "SECUENCIAL"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo Principal (Grilla Dividida en 2 Columnas) */}
                  <div className="grid grid-cols-12 gap-5 z-10 px-4 mt-3 flex-1">
                    
                    {/* Columna Izquierda: Datos de Brackets y Hardware (5 de 12 columnas) */}
                    <div className="col-span-5 space-y-4">
                      
                      {/* Sub-Bloque: Minecraft */}
                      <div className="bg-white border border-gray-200/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                          <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                            ⛏️ MINECRAFT PVP
                          </h4>
                          <span className="text-[8px] font-bold px-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md uppercase">
                            {activeMC} Arenas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-600">
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Población por Tier</span>
                            <strong>
                              {currentCounts.mc.alto} Exp | {currentCounts.mc.medio} Int | {currentCounts.mc.bajo} Nov
                            </strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Duelos (RR + Esc.)</span>
                            <strong>{mcStats.totalRR} RR + {mcStats.gauntlet} Gauntlet</strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Minutos por Match</span>
                            <strong>{timePerMatchMC} Min</strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Tiempo Neto</span>
                            <strong className="text-emerald-700">{Math.round(mcStats.rawTime)} Minutos</strong>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Bloque: Mortal Kombat */}
                      <div className="bg-white border border-gray-200/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                          <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-wide flex items-center gap-1.5">
                            🐉 MORTAL KOMBAT XL
                          </h4>
                          <span className="text-[8px] font-bold px-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-md uppercase">
                            {activeMK} Consolas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-600">
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Población por Tier</span>
                            <strong>
                              {currentCounts.mk.oro} Oro | {currentCounts.mk.plata} Plata | {currentCounts.mk.bronce} Bronce
                            </strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Duelos (Clasif + Jefes)</span>
                            <strong>{mkStats.duelsQualy} Clas. + {mkStats.finalBosses} Jefes</strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Minutos por Match</span>
                            <strong>{timePerMatchMK} Min</strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[7.5px]">Tiempo Neto</span>
                            <strong className="text-rose-700">{Math.round(mkStats.rawTime)} Minutos</strong>
                          </div>
                        </div>
                      </div>

                      {/* Resumen del algoritmo técnico */}
                      {pdfOptions.showSpecs && (
                        <div className="bg-gray-50 border border-gray-200/40 rounded-xl p-3 text-[8.5px] leading-relaxed text-gray-500">
                          <strong>Especificación de Bracket:</strong> Minecraft utiliza sistema Round Robin por grupos independientes con escalada Gauntlet lineal. Mortal Kombat clasifica en eliminación directa simple con batallas de Jefes finales (BO3) para factor de escala.
                        </div>
                      )}
                    </div>

                    {/* Columna Derecha: Cronograma e Hitos (7 de 12 columnas) */}
                    <div className="col-span-7 bg-white border border-gray-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                        <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-wide">
                          Cronograma Operativo Detallado
                        </h4>
                        <span className="text-[8.5px] font-mono text-gray-400">
                          Margen Técnico: {bufferPercent}% (+{Math.round(bufferTime)}m)
                        </span>
                      </div>

                      {/* Lista de Hitos de Cronograma */}
                      <div className="space-y-1.5 flex-1 justify-center flex flex-col">
                        {timelineEvents.map((event) => (
                          <div key={event.id} className="flex justify-between items-center text-[9px] py-1 border-b border-gray-50 last:border-b-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">{event.icon}</span>
                              <div>
                                <span className="font-bold text-gray-800">{event.title}</span>
                                <span className="text-gray-400 block text-[7.5px] max-w-[340px] truncate">{event.desc}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-gray-800">
                                {formatTime(event.start)} - {formatTime(event.end)}
                              </span>
                              <span className="text-[7.5px] text-gray-400 block uppercase font-mono">
                                ({Math.round(event.duration)} min)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Nota de Duración Total */}
                      <div className="bg-gray-100 border border-gray-200/50 rounded-lg p-2 flex justify-between items-center mt-3 text-[10px] font-sans">
                        <span className="text-gray-500 uppercase font-black text-[7.5px]">DURACIÓN TOTAL ESTIMADA DEL EVENTO</span>
                        <strong className="text-brand-dark text-base tracking-tight font-serif">
                          {Math.floor(totalWithBuffer / 60)} Hora(s) {Math.round(totalWithBuffer % 60)} Minutos
                        </strong>
                      </div>

                    </div>
                  </div>

                  {/* Sección de Firmas y Sello de Validez */}
                  <div className="z-10 px-4 flex justify-between items-end mt-2 relative border-t border-gray-200/60 pt-3">
                    
                    {/* QR e Identificador de Reporte */}
                    {pdfOptions.showSeal ? (
                      <div className="flex items-center gap-3 select-none">
                        <svg className="w-8 h-8 text-gray-700 shrink-0" viewBox="0 0 100 100" fill="currentColor">
                          <rect x="10" y="10" width="30" height="30" />
                          <rect x="15" y="15" width="20" height="20" fill="#FAF8F5" />
                          <rect x="18" y="18" width="14" height="14" />
                          <rect x="60" y="10" width="30" height="30" />
                          <rect x="65" y="15" width="20" height="20" fill="#FAF8F5" />
                          <rect x="68" y="18" width="14" height="14" />
                          <rect x="10" y="60" width="30" height="30" />
                          <rect x="15" y="65" width="20" height="20" fill="#FAF8F5" />
                          <rect x="18" y="68" width="14" height="14" />
                          <rect x="50" y="50" width="8" height="8" />
                          <rect x="60" y="60" width="8" height="8" />
                          <rect x="70" y="70" width="8" height="8" />
                          <rect x="50" y="70" width="8" height="8" />
                        </svg>
                        <div className="flex flex-col text-[7px] text-gray-400 font-mono tracking-wider">
                          <span>REGISTRO OFICIAL DE PLANIFICACIÓN</span>
                          <span className="font-bold text-gray-700">VGC-LOG-2026-{startTime.replace(':', '')}-{isParallel ? 'P' : 'S'}</span>
                          <span>VALIDACIÓN DAE INACAP SANTIAGO SUR</span>
                        </div>
                      </div>
                    ) : <div />}

                    {/* Firmas de Autorización */}
                    {pdfOptions.showSignatures ? (
                      <div className="flex gap-12">
                        {/* Coordinador VGC */}
                        <div className="text-center w-[140px] flex flex-col items-center">
                          <span 
                            className="text-[26px] text-blue-900/80 font-normal mb-[-8px] h-8 select-none pointer-events-none transform -rotate-1" 
                            style={{ fontFamily: "'Great Vibes', cursive" }}
                          >
                            Ignacio Silva M.
                          </span>
                          <div className="w-full border-t border-gray-400 my-0.5"></div>
                          <p className="text-[7.5px] font-bold text-gray-800 uppercase tracking-wider leading-none">Coordinador General</p>
                          <p className="text-[6.5px] text-gray-400 uppercase tracking-wide">Video Game Club INACAP</p>
                        </div>
                        
                        {/* Director DAE */}
                        <div className="text-center w-[140px] flex flex-col items-center">
                          <span 
                            className="text-[26px] text-blue-900/80 font-normal mb-[-8px] h-8 select-none pointer-events-none transform rotate-1" 
                            style={{ fontFamily: "'Great Vibes', cursive" }}
                          >
                            Paulina O. Gómez
                          </span>
                          <div className="w-full border-t border-gray-400 my-0.5"></div>
                          <p className="text-[7.5px] font-bold text-gray-800 uppercase tracking-wider leading-none">Directora DAE</p>
                          <p className="text-[6.5px] text-gray-400 uppercase tracking-wide">INACAP Sede Santiago Sur</p>
                        </div>
                      </div>
                    ) : <div />}

                  </div>

                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
