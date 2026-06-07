import React, { useState, useEffect } from 'react';

const MILESTONES = [
  {
    id: 1,
    date: '10 de Abril 2026',
    title: 'Primera Sesión y Arena Trivia 🧠',
    subtitle: 'Inicio de Temporada 2026',
    type: 'hito',
    icon: '💡',
    color: '#f43f5e', // Rosa/Rojo suave
    bg: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.3)',
    desc: 'Iniciamos la temporada con la presentación oficial del club, la votación democrática de los juegos del torneo y una gran Arena de Trivia gamer estilo Kahoot.',
    quote: '"Pillamos a un tramposín en vivo durante la trivia de videojuegos, pero en el espíritu de comunidad decidimos perdonarlo entre todos. ¡Un gran comienzo!"',
    highlight: 'Trivia en vivo · Elección de Juegos',
    stats: { Hype: '90%', Trivia: '45 Players', Impacto: 'Lanzamiento' }
  },
  {
    id: 2,
    date: '17 de Abril 2026',
    title: 'La Rebelión de la Pantalla Negra 📺',
    subtitle: 'Segunda Sesión (Minecraft)',
    type: 'hito',
    icon: '🔌',
    color: '#f59e0b', // Ámbar
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    desc: 'Nuestra segunda sesión prometía ser legendaria con Minecraft, pero la TV de la sala se declaró en huelga de imagen. Como líder, me preocupé muchísimo pensando que todos se iban a aburrir por el retraso y que sería un fracaso. Lejos de rendirnos, decidimos dejar la TV botada e improvisar con nuestras laptops y pantallas portátiles. Jugamos apenas 30 gloriosos minutos, pero las risas y el ingenio colectivo lo superaron todo.',
    quote: '"Me moría de nervios de que la gente se aburriera, pero dejamos de lado la tele, improvisamos con nuestros notebooks y terminamos riéndonos más que nunca."',
    highlight: 'Improvisación Gamer · 30m de Intensidad',
    stats: { Hype: '80%', Nervios: '100%', Impacto: 'Resiliencia' }
  },
  {
    id: 3,
    date: '24 de Abril 2026',
    title: 'El Milagro de la TV y Sangre Kombat 🐉',
    subtitle: 'Tercera Sesión (Mortal Kombat XL)',
    type: 'hito',
    icon: '🎮',
    color: '#ef4444', // Rojo
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.3)',
    desc: '¡Por fin conseguimos una televisión dispuesta a trabajar y dar imagen! Jugamos Mortal Kombat XL toda la tarde y aproveché la alta convocatoria para evaluar el nivel de juego de los participantes. Detrás de cámaras, ya estaba diagramando de forma maquiavélica el sistema de brackets, hándicaps y las complejas reglas de tiers que harían épica y justa esta temporada.',
    quote: '"Conseguimos una tele de verdad y la sala era un manicomio de combos. Aproveché de evaluar a los luchadores mientras mi mente de líder calculaba cómo equilibrar las fuerzas del torneo."',
    highlight: 'TV Funcional · Evaluación de Habilidad',
    stats: { Hype: '95%', Combos: '1000+', Impacto: 'Evaluación' }
  },
  {
    id: 4,
    date: '28 de Abril y Mayo 2026',
    title: 'La Prueba de Fuego: La Resistencia de los Martes 🛡️',
    subtitle: 'Baja Asistencia y el Plan Maestro',
    type: 'hito',
    icon: '🛡️',
    color: '#6b7280', // Gris/Acero
    bg: 'rgba(107, 114, 128, 0.08)',
    border: 'rgba(107, 114, 128, 0.3)',
    desc: 'El cambio al día martes y la sobrecarga académica por pruebas semestrales afectaron la asistencia por dos sesiones consecutivas. Aunque no fue por la organización, para muchos se hizo difícil venir. Lejos de desanimarme, aproveché este ambiente más reducido para evaluar minuciosamente y con calma a los jugadores presentes. Además, tracé el plan maestro y el Dashboard para reventar la asistencia en las finales.',
    quote: '"Ver la sala con baja asistencia fue difícil, pero aproveché el tiempo a solas con los leales para evaluarlos uno a uno y terminar de calibrar los hándicaps que harían al torneo 100% justo."',
    highlight: 'Calibración de Tiers · Creación del Plan Maestro',
    stats: { Hype: '70%', Leales: '10 Héroes', Impacto: 'Superación' }
  },
  {
    id: 5,
    date: '12 de Mayo 2026',
    title: 'La Gran Convivencia Gamer: El Retorno 🍕',
    subtitle: 'Comunidad Reunida & Impostor Arena',
    type: 'logro',
    icon: '🍕',
    color: '#10b981', // Verde esmeralda
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
    desc: '¡El plan maestro dio frutos! Organizamos una gran convivencia comunitaria para recargar energías y vaya que se llenó. Compartimos bebidas, papas fritas y risas. Aprovechamos para coordinar los preparativos del gran torneo y coronamos la tarde jugando al Infiltrado (Impostor Arena) todos juntos. El espíritu del club volvió más fuerte que nunca.',
    quote: '"La sala estaba repleta, comimos papitas, tomamos bebida y nos reímos de lo lindo. Ver a todos reunidos conversando sobre el torneo y descubriendo al impostor en el juego me confirmó que el club estaba de vuelta y más vivo que nunca."',
    highlight: 'Alta Asistencia · Convivencia & Infiltrado',
    stats: { Hype: '100%', Comida: '10 Kilos', Impacto: 'Reunión' }
  },
  {
    id: 6,
    date: '19, 26 de Mayo y 2 de Junio 2026',
    title: 'Torneos de Práctica y Fiebre Competitiva ⚔️',
    subtitle: 'Preparando las Grandes Finales',
    type: 'torneo',
    icon: '⚔️',
    color: '#06b6d4', // Cian
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.3)',
    desc: 'Con la motivación por las nubes, la asistencia volvió a dispararse durante tres semanas seguidas. Aprovechamos estas sesiones para realizar torneos de práctica en formato real, testeando el balance de los hándicaps y las reglas de tiers. Todo salió hermoso e impecable, encendiendo el hype para las finales.',
    quote: '"Ver la sala llena de nuevo disputando los torneos de práctica fue una recompensa hermosa. Los brackets funcionaron de maravilla, los hándicaps se sintieron justos y la competitividad sana se tomó el club."',
    highlight: 'Asistencia Récord · Testeo de Brackets',
    stats: { Hype: '95%', Prácticas: '3 Fechas', Impacto: 'Testeo' }
  },
  {
    id: 7,
    date: 'Junio 2026',
    title: 'Gran Cierre y Diplomas (Hoy) 🏆',
    subtitle: 'La Consagración del Club',
    type: 'logro',
    icon: '👑',
    color: '#fbbf24', // Dorado
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.5)',
    desc: 'Llegan las finales presenciales de los torneos de la temporada y la entrega oficial de los diplomas y reconocimientos de honor.',
    quote: '"¡La temporada más exitosa del club! Más de 50 estudiantes involucrados activamente y un sistema tecnológico único."',
    highlight: 'Diplomas oficiales · Final de Temporada',
    stats: { Hype: '100%++', Premios: '8 Categorías', Impacto: 'Consagración' }
  }
];

const FILTERS = [
  { id: 'todos', label: 'Todos', emoji: '✨' },
  { id: 'hito', label: 'Hitos', emoji: '🚀' },
  { id: 'torneo', label: 'Torneos', emoji: '⚔️' },
  { id: 'logro', label: 'Logros', emoji: '👑' },
];

export default function TimelineModule() {
  const [filter, setFilter] = useState('todos');
  const [layout, setLayout] = useState('horizontal'); // 'horizontal' (proyector) o 'vertical' (completo)
  const [activeId, setActiveId] = useState(1);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  const filteredData = filter === 'todos'
    ? MILESTONES
    : MILESTONES.filter(m => m.type === filter);

  // Asegura que el ID activo esté dentro de los datos filtrados
  useEffect(() => {
    if (filteredData.length > 0 && !filteredData.some(m => m.id === activeId)) {
      setActiveId(filteredData[0].id);
    }
  }, [filter, filteredData, activeId]);

  const activeMilestone = MILESTONES.find(m => m.id === activeId) || MILESTONES[0];

  const handleNext = () => {
    const currentIndex = filteredData.findIndex(m => m.id === activeId);
    if (currentIndex < filteredData.length - 1) {
      setActiveId(filteredData[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    const currentIndex = filteredData.findIndex(m => m.id === activeId);
    if (currentIndex > 0) {
      setActiveId(filteredData[currentIndex - 1].id);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-1">
      {/* --- Encabezado Premium --- */}
      <div
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #090514 100%)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-end pr-8 select-none pointer-events-none text-[12rem] opacity-[0.03] font-black">
          TIMELINE
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Memoria Histórica
              </span>
            </div>
            <h2 className="text-3xl font-black text-white mt-1.5 tracking-tight">Línea de Tiempo del Club</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Revive el camino de esfuerzo, comunidad, pantallas rotas e improvisación que nos trajo a este gran día presencial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider hidden sm:inline">Visualización:</span>
            <div className="inline-flex rounded-xl bg-black/50 border border-white/5 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setLayout('horizontal')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${layout === 'horizontal'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                📺 Presentación Interactiva
              </button>
              <button
                type="button"
                onClick={() => setLayout('vertical')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${layout === 'vertical'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                📜 Lista Histórica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Filtros de Misiones --- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border shrink-0 ${filter === f.id
              ? 'bg-white/10 text-white border-white/20 shadow-md shadow-black/40'
              : 'bg-surface-card text-gray-400 border-white/5 hover:text-white hover:bg-white/5'
              }`}
          >
            <span>{f.emoji}</span>
            <span className="uppercase tracking-wider text-[10px]">{f.label}</span>
          </button>
        ))}
      </div>

      {/* --- Contenedor Principal (Horizontal / Vertical) --- */}
      {layout === 'horizontal' ? (
        /* ================= PRESENTACIÓN INTERACTIVA (PREMIUM) ================= */
        <div className="flex flex-col gap-6">
          {/* Panel Superior: Showcase del Hito Activo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Quest Log: Lista Lateral Rápida (Lg: 4/12) */}
            <div className="lg:col-span-4 rounded-2xl border border-white/5 bg-surface-card p-5 flex flex-col gap-3 max-h-[440px] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Registro de Misiones</p>
              <div className="flex flex-col gap-2">
                {filteredData.map((m) => {
                  const isActive = m.id === activeId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 ${isActive
                        ? 'bg-white/[0.03] text-white border-indigo-500/40 shadow-inner'
                        : 'bg-transparent text-gray-400 border-transparent hover:bg-white/[0.01] hover:text-gray-200'
                        }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border"
                        style={{
                          background: isActive ? m.bg : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? m.color : 'rgba(255,255,255,0.05)',
                          boxShadow: isActive ? `0 0 10px ${m.color}30` : 'none'
                        }}
                      >
                        {m.icon}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">{m.date}</p>
                        <p className="text-xs font-black truncate mt-0.5">{m.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Principal: Tarjeta Gigante Interactiva (Lg: 8/12) */}
            <div
              className="lg:col-span-8 rounded-3xl border p-7 flex flex-col justify-between gap-6 relative overflow-hidden transition-all duration-500"
              style={{
                borderColor: `${activeMilestone.color}35`,
                background: `linear-gradient(145deg, rgba(20, 16, 35, 0.9) 0%, rgba(9, 6, 16, 0.95) 100%)`,
                boxShadow: `0 12px 40px ${activeMilestone.color}08`,
              }}
            >
              {/* Marca de Agua decorativa */}
              <div
                className="absolute top-4 right-6 text-7xl select-none pointer-events-none opacity-[0.08] animate-pulse"
                style={{ color: activeMilestone.color }}
              >
                {activeMilestone.icon}
              </div>

              {/* Contenido Principal */}
              <div className="flex flex-col gap-4">
                {/* Meta de Hito */}
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"
                    style={{ color: activeMilestone.color, background: `${activeMilestone.color}15` }}
                  >
                    {activeMilestone.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-500">{activeMilestone.date}</span>
                </div>

                {/* Título & Subtítulo */}
                <div>
                  <h3 className="text-2xl font-black text-white leading-tight tracking-tight mt-1">
                    {activeMilestone.title}
                  </h3>
                  <p className="text-xs font-bold text-indigo-400 mt-0.5">{activeMilestone.subtitle}</p>
                </div>

                {/* Descripción extendida */}
                <p className="text-sm text-gray-300 leading-relaxed max-w-2xl font-medium">
                  {activeMilestone.desc}
                </p>

                {/* Diario del Líder (Exagerado / Cita) */}
                <div
                  className="rounded-2xl border p-4 flex flex-col gap-2 relative mt-2"
                  style={{
                    background: activeMilestone.bg,
                    borderColor: `${activeMilestone.color}25`
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">📔</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                      El Diario del Líder (Detrás de Cámaras)
                    </span>
                  </div>
                  <p className="text-xs text-white italic font-medium leading-relaxed">
                    {activeMilestone.quote}
                  </p>
                </div>
              </div>

              {/* Fila de Estadísticas y Navegación */}
              <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                {/* Métricas / Stats de Aventura */}
                <div className="grid grid-cols-3 gap-6 w-full sm:w-auto shrink-0">
                  {Object.entries(activeMilestone.stats).map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                      <span className="text-xs font-black text-white mt-0.5 font-mono">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Navegación y Acciones */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      setSelectedMilestone(activeMilestone);
                      setIsCinemaMode(true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center gap-1.5"
                  >
                    📽️ Proyección Inmersiva
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={filteredData.findIndex(m => m.id === activeId) === 0}
                      className="w-10 h-10 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center font-bold text-sm"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={filteredData.findIndex(m => m.id === activeId) === filteredData.length - 1}
                      className="w-10 h-10 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center font-bold text-sm"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carrusel / Track de Miniaturas inferior */}
          <div className="rounded-2xl border border-white/5 bg-surface-card p-4 flex flex-col gap-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">Línea de Progreso Temporal</p>
            <div className="flex gap-4 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar snap-x">
              {filteredData.map((m, index) => {
                const isActive = m.id === activeId;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveId(m.id)}
                    className={`min-w-[160px] max-w-[200px] flex-1 snap-center cursor-pointer p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-3 ${isActive
                      ? 'bg-white/[0.03] border-indigo-500/40 shadow-md'
                      : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold text-gray-500">{m.date}</span>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs border"
                        style={{
                          background: isActive ? m.bg : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? m.color : 'rgba(255,255,255,0.05)'
                        }}
                      >
                        {m.icon}
                      </span>
                    </div>
                    <div>
                      <p className={`text-[10px] font-black truncate ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {m.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-[8px] font-black uppercase tracking-wider text-gray-500">{m.type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ================= VISTA VERTICAL (LISTA HISTÓRICA COMPLETA) ================= */
        <div className="relative rounded-2xl border border-white/5 bg-surface-card p-6 overflow-hidden flex flex-col">
          {/* Línea vertical conectora centralizada */}
          <div className="absolute top-8 bottom-8 left-[39px] w-0.5 bg-gradient-to-b from-blue-500 via-indigo-600 via-pink-500 to-yellow-500 opacity-20 rounded-full" />

          <div className="flex flex-col gap-6">
            {filteredData.map((m) => {
              const isActive = m.id === activeId;
              return (
                <div
                  key={m.id}
                  className="flex gap-5 items-start group"
                >
                  {/* Nodo de la línea temporal */}
                  <div className="relative flex flex-col items-center gap-1 shrink-0 pt-1.5">
                    <button
                      onClick={() => setActiveId(m.id)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 border transition-all duration-300 hover:scale-110"
                      style={{
                        background: m.bg,
                        borderColor: m.color,
                        boxShadow: `0 0 12px ${m.color}20`,
                      }}
                    >
                      {m.icon}
                    </button>
                  </div>

                  {/* Tarjeta de hito */}
                  <div
                    onClick={() => setSelectedMilestone(m)}
                    className="flex-1 rounded-2xl border p-5 flex flex-col lg:flex-row gap-5 items-start justify-between cursor-pointer transition-all duration-300 hover:bg-white/[0.02]"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      background: 'rgba(255, 255, 255, 0.005)',
                      boxShadow: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${m.color}60`;
                      e.currentTarget.style.boxShadow = `0 6px 20px ${m.color}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest font-mono">
                          {m.date}
                        </span>
                        <span
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{ color: m.color, background: `${m.color}15` }}
                        >
                          {m.type}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-2 leading-tight tracking-tight">{m.title}</h3>
                      <p className="text-xs text-indigo-400 font-bold mt-0.5">{m.subtitle}</p>
                      <p className="text-xs text-gray-300 mt-2.5 leading-relaxed max-w-3xl font-medium">
                        {m.desc}
                      </p>
                    </div>

                    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/5 pt-3.5 lg:pt-0 lg:pl-5 shrink-0 flex flex-col justify-between h-full min-h-[100px]">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                          📔 Bitácora del Líder
                        </span>
                        <p className="text-xs text-white/90 italic leading-relaxed font-medium">
                          {m.quote}
                        </p>
                      </div>
                      <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-2.5">
                        <span className="text-[9px] text-gray-400 font-bold">{m.highlight}</span>
                        <span className="text-[9px] font-black text-indigo-400 group-hover:underline flex items-center gap-0.5">
                          MODO CINE ➔
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="w-full flex items-center justify-center py-16 text-gray-500 italic text-sm">
                No hay hitos que coincidan con este filtro.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Modal Detalle Expandido (Modo Inmersivo de Proyección) --- */}
      {selectedMilestone && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
          <div
            className="bg-black/90 border rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative"
            style={{
              borderColor: `${selectedMilestone.color}50`,
              boxShadow: `0 0 50px ${selectedMilestone.color}15`
            }}
          >
            {/* Fondo de agua difuminado gigante */}
            <div
              className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-[0.06] select-none pointer-events-none"
              style={{ backgroundColor: selectedMilestone.color }}
            />

            {/* Header del Modal */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <span className="text-3xl p-2.5 rounded-2xl bg-white/5 border border-white/10">{selectedMilestone.icon}</span>
                <div>
                  <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest font-mono">
                    {selectedMilestone.date}
                  </span>
                  <h2 className="text-xl font-black text-white mt-1.5">{selectedMilestone.title}</h2>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setIsCinemaMode(false);
                }}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all border border-white/5"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 relative z-10 custom-scrollbar">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Resumen Histórico</p>
                <p className="text-sm text-gray-200 mt-1.5 leading-relaxed font-semibold">{selectedMilestone.desc}</p>
              </div>

              {/* Caja de Anécdota Inmersiva */}
              <div
                className="rounded-2xl border p-5 flex flex-col gap-2.5"
                style={{
                  background: `linear-gradient(135deg, ${selectedMilestone.color}10 0%, transparent 100%)`,
                  borderColor: `${selectedMilestone.color}25`
                }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: selectedMilestone.color }}>
                  💬 Bitácora Detallada
                </p>
                <p className="text-sm font-black text-white italic leading-relaxed">
                  {selectedMilestone.quote}
                </p>
              </div>

              {/* Estadísticas / Ficha de Aventura */}
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2.5">Métricas de la Misión</p>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(selectedMilestone.stats).map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/5 border border-white/5 p-4 flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                      <span className="text-sm font-black text-white mt-0.5 font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="rounded-2xl bg-white/2 border border-white/5 p-4">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Hito de la Fecha</p>
                  <p className="text-xs font-black text-white mt-1">{selectedMilestone.highlight}</p>
                </div>
                <div className="rounded-2xl bg-white/2 border border-white/5 p-4">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Categoría de Hito</p>
                  <p className="text-xs font-black text-white mt-1 uppercase tracking-wide capitalize">{selectedMilestone.type}</p>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-5 border-t border-white/5 bg-black/40 flex justify-end relative z-10">
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setIsCinemaMode(false);
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all border border-indigo-500/50"
              >
                Cerrar Pantalla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
