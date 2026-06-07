import React, { useState } from 'react'
import useStore from '../store/useStore'

// Premiados oficiales para hoy
const OFFICIAL_AWARDS = [
  {
    id: 'constancia',
    title: 'Constancia de Hierro',
    icon: '⏱️',
    desc: 'Por su asistencia impecable, puntualidad y compromiso inquebrantable en cada sesión a las 15:40 hrs.',
    category: { id: 'presencia', title: 'Presencia y Espíritu' },
    gradient: 'from-amber-500/10 to-yellow-600/10 hover:from-amber-500/20 hover:to-yellow-600/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    winners: [
      { nombre: 'Angel Torres', alias: '' },
      { nombre: 'Miguel Aguillera', alias: '' }
    ]
  },
  {
    id: 'fairplay',
    title: 'Premio Fair Play',
    icon: '🤝',
    desc: 'Por demostrar un comportamiento ejemplar, saludando siempre al rival, jugando con máximo respeto y encarnando la sana competencia.',
    category: { id: 'comunidad', title: 'Comunidad y Valores' },
    gradient: 'from-green-500/10 to-emerald-600/10 hover:from-green-500/20 hover:to-emerald-600/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    winners: [
      { nombre: 'Rodrigo', alias: '' }
    ]
  },
  {
    id: 'hardware',
    title: 'Héroe del Hardware',
    icon: '🔧',
    desc: 'Por su desinteresada y valiosa ayuda al equipar el club facilitando sus consolas, controles y accesorios para que todos pudieran jugar.',
    category: { id: 'comunidad', title: 'Comunidad y Valores' },
    gradient: 'from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    winners: [
      { nombre: 'Francisco Ribeiro', alias: '' }
    ]
  },
  {
    id: 'organizacion',
    title: 'Apoyo a la Organización',
    icon: '📋',
    desc: 'Por su valiosa colaboración, excelente disposición y ayuda activa en la logística, orden y arbitraje de las jornadas del club.',
    category: { id: 'comunidad', title: 'Comunidad y Valores' },
    gradient: 'from-blue-500/10 to-indigo-600/10 hover:from-blue-500/20 hover:to-indigo-600/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    winners: [
      { nombre: 'Francisco Ribeiro', alias: '' }
    ]
  }
]

// Diplomas que se entregarán después
const FUTURE_AWARDS = [
  {
    id: 'ejemplar',
    title: 'Miembro Ejemplar del Club',
    icon: '🏆',
    desc: 'Para el alumno que mejor representa los valores de compañerismo, respeto y pasión del club.',
    categoryName: 'Presencia y Espíritu',
    gradient: 'from-purple-500/5 to-fuchsia-600/5',
    border: 'border-purple-500/10',
    text: 'text-purple-400/50'
  },
  {
    id: 'alma',
    title: 'Alma de la Sala',
    icon: '✨',
    desc: 'Para quien siempre alegra las tardes, integra a los nuevos y mantiene un ambiente divertido.',
    categoryName: 'Presencia y Espíritu',
    gradient: 'from-pink-500/5 to-rose-600/5',
    border: 'border-pink-500/10',
    text: 'text-pink-400/50'
  },
  {
    id: 'mentor',
    title: 'El Mentor del Club',
    icon: '🎓',
    desc: 'Para quien tiene la paciencia de enseñar mecánicas y guiar amigablemente a otros jugadores.',
    categoryName: 'Comunidad y Valores',
    gradient: 'from-teal-500/5 to-emerald-600/5',
    border: 'border-teal-500/10',
    text: 'text-teal-400/50'
  }
]

// Generador de Confeti en React para animaciones en diapositivas
function Confetti({ slideKey }) {
  return (
    <div key={slideKey} className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(25)].map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 2
        const duration = 3 + Math.random() * 3
        const size = 5 + Math.random() * 8
        const colors = ['#d4af37', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']
        const color = colors[Math.floor(Math.random() * colors.length)]
        return (
          <div
            key={i}
            className="absolute top-0 rounded-sm animate-confetti-drop"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              opacity: 0.6,
            }}
          />
        )
      })}
    </div>
  )
}

// Helper modal para Generar e Imprimir el Diploma
function DiplomaGeneratorModal({ award, category, winner, onClose }) {
  const handlePrint = () => {
    window.print()
  }

  const selectedPlayer = winner || { nombre: 'NOMBRE DEL ALUMNO', alias: '' }

  // Hash estético para el código de registro del diploma
  const certHash = selectedPlayer.nombre
    ? selectedPlayer.nombre.substring(0, 5).toUpperCase().replace(/\s/g, '')
    : 'DEMO1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 print:p-0 print:bg-white">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-5xl flex flex-col max-h-[95vh] print:border-none print:shadow-none print:max-w-none print:h-screen print:w-screen print:rounded-none">
        
        {/* Header (No visible en impresión) */}
        <div className="p-4 border-b border-surface-border flex justify-between items-center print:hidden">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">{award.icon}</span> Generar Diploma Oficial
            </h3>
            <p className="text-sm text-gray-400">{category.title || category} &bull; {award.title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-xl transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8 print:block print:p-0 print:overflow-visible">
          
          {/* Panel de Controles (No visible en impresión) */}
          <div className="w-full md:w-1/4 space-y-6 print:hidden">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Alumno Galardonado</label>
              <div className="w-full bg-surface-card border border-amber-500/20 rounded-xl px-4 py-3 text-white font-bold text-base flex items-center gap-2">
                <span className="text-amber-400 text-lg">👤</span>
                {selectedPlayer.nombre}
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
              <h4 className="text-sm font-semibold text-white mb-2">Detalles de la Distinción</h4>
              <ul className="text-sm text-gray-400 space-y-2.5">
                <li><span className="text-gray-500 block text-xs">Categoría</span> {category.title || category}</li>
                <li><span className="text-gray-500 block text-xs">Reconocimiento</span> {award.title}</li>
                <li><span className="text-gray-500 block text-xs">Motivo Oficial</span> {award.desc}</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400/90 leading-relaxed">
              <strong>Tip para Imprimir:</strong> Al abrir el diálogo de impresión, asegúrate de activar la opción <strong>"Gráficos de fondo"</strong> (Background graphics) y configurar los márgenes como <strong>"Ninguno"</strong> para que los marcos y fondos dorados se impriman correctamente.
            </div>

            <button 
              onClick={handlePrint}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Imprimir Diploma
            </button>
          </div>

          {/* Previsualización del Diploma (Visible en impresión) */}
          <div className="w-full md:w-3/4 overflow-x-auto flex items-start md:items-center justify-start md:justify-center print:w-full print:h-full pb-4 md:pb-0">
            
            {/* Contenedor del Diploma A4 */}
            <div 
              className="print-cert-container min-w-[842px] relative w-full aspect-[297/210] bg-[#FAF8F5] text-gray-900 rounded-sm shadow-2xl flex flex-col justify-between p-14 overflow-hidden shrink-0 border border-gray-200"
              style={{ 
                backgroundImage: 'radial-gradient(circle, #ffffff 0%, #FAF8F5 100%)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              
              {/* Marco Dorado Ornamental SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none p-4" viewBox="0 0 842 595" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer gold border */}
                <rect x="20" y="20" width="802" height="555" rx="4" stroke="#d4af37" strokeWidth="3.5" />
                <rect x="26" y="26" width="790" height="543" rx="2" stroke="#AA7C11" strokeWidth="1" />
                
                {/* Inner dark thin border with spacing */}
                <rect x="36" y="36" width="770" height="523" stroke="#2C2C2C" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="42" y="42" width="758" height="511" stroke="#2C2C2C" strokeWidth="1.5" />
                
                {/* Corner Ornaments */}
                {/* Top-Left */}
                <path d="M 42 72 L 72 42 M 42 82 L 82 42 M 42 92 C 62 92, 92 62, 92 42" stroke="#d4af37" strokeWidth="1.5" />
                <path d="M 42 42 L 54 42 L 42 54 Z" fill="#2C2C2C" />
                <circle cx="58" cy="58" r="4" fill="#d4af37" />
                <path d="M 58 54 C 62 50, 70 50, 74 54" stroke="#d4af37" strokeWidth="1" fill="none" />
                <path d="M 54 58 C 50 62, 50 70, 54 74" stroke="#d4af37" strokeWidth="1" fill="none" />
                
                {/* Top-Right */}
                <path d="M 800 72 L 770 42 M 800 82 L 760 42 M 800 92 C 780 92, 750 62, 750 42" stroke="#d4af37" strokeWidth="1.5" />
                <path d="M 800 42 L 788 42 L 800 54 Z" fill="#2C2C2C" />
                <circle cx="784" cy="58" r="4" fill="#d4af37" />
                <path d="M 784 54 C 780 50, 772 50, 768 54" stroke="#d4af37" strokeWidth="1" fill="none" />
                <path d="M 788 58 C 792 62, 792 70, 788 74" stroke="#d4af37" strokeWidth="1" fill="none" />
                
                {/* Bottom-Left */}
                <path d="M 42 523 L 72 553 M 42 513 L 82 553 M 42 503 C 62 503, 92 533, 92 553" stroke="#d4af37" strokeWidth="1.5" />
                <path d="M 42 553 L 54 553 L 42 541 Z" fill="#2C2C2C" />
                <circle cx="58" cy="537" r="4" fill="#d4af37" />
                <path d="M 58 541 C 62 545, 70 545, 74 541" stroke="#d4af37" strokeWidth="1" fill="none" />
                <path d="M 54 537 C 50 533, 50 525, 54 521" stroke="#d4af37" strokeWidth="1" fill="none" />
                
                {/* Bottom-Right */}
                <path d="M 800 523 L 770 553 M 800 513 L 760 553 M 800 503 C 780 503, 750 533, 750 553" stroke="#d4af37" strokeWidth="1.5" />
                <path d="M 800 553 L 788 553 L 800 541 Z" fill="#2C2C2C" />
                <circle cx="784" cy="537" r="4" fill="#d4af37" />
                <path d="M 784 541 C 780 545, 772 545, 768 541" stroke="#d4af37" strokeWidth="1" fill="none" />
                <path d="M 788 537 C 792 533, 792 525, 788 521" stroke="#d4af37" strokeWidth="1" fill="none" />
              </svg>

              {/* Marca de agua central en el fondo (Escudo Laurel con Joystick) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none select-none">
                <svg className="w-[320px] h-[320px]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M 50 15 C 40 15, 20 25, 20 55 C 20 75, 40 85, 50 85 C 60 85, 80 75, 80 55 C 80 25, 60 15, 50 15 Z M 50 20 C 58 20, 75 28, 75 55 C 75 72, 58 80, 50 80 C 42 80, 25 72, 25 55 C 25 28, 42 20, 50 20 Z" />
                  <path d="M 35 48 C 35 44, 40 40, 50 40 C 60 40, 65 44, 65 48 C 65 54, 60 58, 50 58 C 40 58, 35 54, 35 48 Z" />
                  <path d="M 45 48 L 47 48 L 47 46 L 49 46 L 49 48 L 51 48 L 51 50 L 49 50 L 49 52 L 47 52 L 47 50 L 45 50 Z" />
                  <circle cx="55" cy="48" r="1.5" />
                  <circle cx="58" cy="51" r="1.5" />
                </svg>
              </div>

              {/* Cabecera del Diploma (Logotipos de Entidades) */}
              <div className="flex justify-between items-center z-10 px-8">
                {/* Logo INACAP */}
                <div className="flex items-center gap-3 select-none">
                  <svg className="w-9 h-9 shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="8" fill="#C20012" />
                    <path d="M 28 75 L 28 42 L 40 42 L 40 75 Z" fill="white" />
                    <circle cx="34" cy="27" r="6" fill="white" />
                    <path d="M 46 75 L 46 54 C 46 47, 52 44, 57 47 C 62 49, 63 54, 63 59 L 63 75 L 73 75 L 73 56 C 73 45, 66 39, 56 41 C 51 42, 47 45, 46 49 L 46 42 L 36 42 L 36 75 Z" fill="white" />
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-[14px] tracking-[0.15em] text-gray-800 uppercase font-sans leading-none">INACAP</span>
                    <span className="text-[7.5px] font-bold tracking-[0.2em] text-gray-400 uppercase font-sans mt-1">Sede Santiago Sur</span>
                  </div>
                </div>

                {/* Logo VGC */}
                <div className="flex items-center gap-3 text-right justify-end select-none">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-[14px] tracking-[0.12em] text-gray-800 uppercase font-sans leading-none">VIDEO GAME CLUB</span>
                    <span className="text-[7.5px] font-bold tracking-[0.2em] text-gray-400 uppercase font-sans mt-1 font-mono">EST. 2026 &bull; LIGA INTERNA</span>
                  </div>
                  <svg className="w-9 h-9 shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="vgc-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffe4a3" />
                        <stop offset="50%" stopColor="#b48608" />
                        <stop offset="100%" stopColor="#805d02" />
                      </linearGradient>
                    </defs>
                    <path d="M 50 10 Q 75 12 80 40 Q 80 70 50 90 Q 20 70 20 40 Q 25 12 50 10 Z" fill="url(#vgc-gold-grad)" />
                    <path d="M 50 14 Q 72 16 76 40 Q 76 66 50 84 Q 24 66 24 40 Q 28 16 50 14 Z" fill="#1C1C1F" />
                    <path d="M 40 46 C 40 43, 44 40, 50 40 C 56 40, 60 43, 60 46 C 60 51, 56 54, 50 54 C 44 54, 40 51, 40 46 Z" fill="url(#vgc-gold-grad)" />
                    <circle cx="50" cy="24" r="3" fill="url(#vgc-gold-grad)" />
                    <circle cx="39" cy="27" r="2" fill="url(#vgc-gold-grad)" />
                    <circle cx="61" cy="27" r="2" fill="url(#vgc-gold-grad)" />
                  </svg>
                </div>
              </div>

              {/* Contenido Central */}
              <div className="text-center z-10 px-10 flex flex-col items-center flex-1 justify-center mt-3">
                <span className="text-[10px] font-extrabold tracking-[0.35em] text-gray-500 uppercase font-sans mb-1 select-none">
                  REPÚBLICA DE CHILE &bull; CLUB DE VIDEOJUEGOS INACAP
                </span>
                
                <h1 className="text-4xl font-extrabold tracking-[0.08em] text-gray-800 uppercase font-serif mb-4 select-none" style={{ fontFamily: "'Cinzel', serif" }}>
                  Diploma de Honor
                </h1>

                <div className="w-16 h-[1.5px] bg-[#d4af37] mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#b48608] to-transparent"></div>
                </div>
                
                <p className="text-gray-500 italic text-[13px] font-serif mb-1.5 select-none">
                  Por cuanto su compromiso y excelencia deportiva le distinguen, se concede a:
                </p>
                
                <div className="relative inline-block mb-3.5 mt-1.5">
                  <h2 
                    className="text-4xl font-black text-gray-900 px-8 pb-1.5 font-serif border-b-[2px] border-double border-gray-300 select-all tracking-wide" 
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {selectedPlayer.nombre.toUpperCase()}
                  </h2>
                  {selectedPlayer.alias && (
                    <div className="absolute -bottom-2.5 left-0 right-0 text-center">
                      <span className="text-[10.5px] font-extrabold text-red-600 bg-[#FAF8F5] px-2 font-mono rounded border border-red-500/10">
                        "{selectedPlayer.alias.toUpperCase()}"
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-500 text-[13px] font-serif mt-2 mb-1.5 select-none">
                  El distinguido reconocimiento como:
                </p>
                
                <h3 
                  className="text-[25px] font-extrabold tracking-wide text-amber-800 font-serif mb-3 select-none" 
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  &laquo; {award.title} &raquo;
                </h3>
                
                <p className="text-gray-600 max-w-xl mx-auto italic text-[11px] leading-relaxed font-serif select-none">
                  "{award.desc}"
                </p>
              </div>

              {/* Sección de Firmas, Sellos y Emisión */}
              <div className="z-10 px-10 flex justify-between items-end mb-6 relative">
                
                {/* Firma Coordinador VGC */}
                <div className="text-center w-[180px] flex flex-col items-center relative">
                  <span 
                    className="text-[34px] text-blue-900/80 font-normal mb-[-10px] h-10 select-none pointer-events-none transform -rotate-1" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}
                  >
                    Ignacio Silva M.
                  </span>
                  <div className="w-full border-t border-gray-400 my-1"></div>
                  <p className="text-[9.5px] font-bold text-gray-800 uppercase font-sans tracking-wider leading-none select-none">Coordinador General</p>
                  <p className="text-[7.5px] text-gray-400 uppercase font-sans tracking-wide mt-1 select-none">Video Game Club INACAP</p>
                </div>
                
                {/* Sello de Oro Central */}
                <div className="relative w-24 h-24 flex items-center justify-center select-none scale-105 pointer-events-none">
                  <svg className="absolute top-[48%] left-[50%] -translate-x-[50%] w-14 h-16 pointer-events-none overflow-visible" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 38 25 L 22 95 L 42 85 L 50 25 Z" fill="#B22222" />
                    <path d="M 38 25 L 22 95 L 32 95 L 42 85 Z" fill="#800000" />
                    <path d="M 62 25 L 78 95 L 58 85 L 50 25 Z" fill="#B22222" />
                    <path d="M 62 25 L 78 95 L 68 95 L 58 85 Z" fill="#800000" />
                  </svg>
                  
                  <svg className="w-18 h-18 drop-shadow-md overflow-visible" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gold-seal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff2cc" />
                        <stop offset="30%" stopColor="#ffd966" />
                        <stop offset="70%" stopColor="#bf9000" />
                        <stop offset="100%" stopColor="#7f6000" />
                      </linearGradient>
                      <filter id="seal-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
                      </filter>
                    </defs>
                    
                    <path d="
                      M 50 5 Q 52 9 55 7 Q 58 10 61 8 Q 63 12 66 10 Q 68 14 71 12 Q 73 16 76 15 Q 78 19 81 18 Q 82 22 85 22 Q 86 26 88 27 Q 89 31 91 32 Q 91 36 93 38 Q 93 42 94 44 Q 94 48 95 50 Q 94 52 94 56 Q 93 58 93 62 Q 91 64 91 68 Q 89 69 88 73 Q 86 74 85 78 Q 82 78 81 82 Q 78 81 76 85 Q 73 84 71 88 Q 68 86 66 90 Q 63 88 61 92 Q 58 90 55 93 Q 52 91 50 95 Q 48 91 45 93 Q 42 90 39 92 Q 37 88 34 90 Q 32 86 29 88 Q 27 84 24 85 Q 22 81 19 82 Q 18 78 15 78 Q 14 74 12 73 Q 11 69 9 68 Q 9 64 7 62 Q 7 58 6 56 Q 6 52 5 50 Q 6 48 6 44 Q 7 42 7 38 Q 9 36 9 32 Q 11 31 12 27 Q 14 26 15 22 Q 18 22 19 18 Q 22 19 24 15 Q 27 16 29 12 Q 32 14 34 10 Q 37 12 39 8 Q 42 10 45 7 Q 48 9 50 5 Z
                    " fill="url(#gold-seal-grad)" filter="url(#seal-shadow)" />
                    
                    <circle cx="50" cy="50" r="36" stroke="#fff" strokeWidth="1" strokeOpacity="0.4" fill="none" />
                    <circle cx="50" cy="50" r="33" stroke="#bf9000" strokeWidth="1.5" fill="none" />
                    <circle cx="50" cy="50" r="30" stroke="#7f6000" strokeWidth="1" strokeDasharray="3 2" fill="none" />
                    
                    <path d="M 40 50 C 40 45, 45 40, 50 40 C 55 40, 60 45, 60 50 C 60 55, 55 60, 50 60 C 45 60, 40 55, 40 50 Z" fill="#bf9000" opacity="0.25" />
                    <path d="M 50 39 L 52.5 45.5 L 59 45.5 L 54 49.5 L 56 56 L 50 52 L 44 56 L 46 49.5 L 41 45.5 L 47.5 45.5 Z" fill="#806000" />
                    
                    <circle cx="50" cy="50" r="23" stroke="#bf9000" strokeWidth="0.5" fill="none" />
                  </svg>
                </div>
                
                {/* Firma Directora DAE */}
                <div className="text-center w-[180px] flex flex-col items-center relative">
                  <span 
                    className="text-[34px] text-blue-900/80 font-normal mb-[-10px] h-10 select-none pointer-events-none transform rotate-1" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}
                  >
                    Paulina O. Gómez
                  </span>
                  <div className="w-full border-t border-gray-400 my-1"></div>
                  <p className="text-[9.5px] font-bold text-gray-800 uppercase font-sans tracking-wider leading-none select-none">Directora DAE</p>
                  <p className="text-[7.5px] text-gray-400 uppercase font-sans tracking-wide mt-1 select-none">INACAP Sede Santiago Sur</p>
                </div>
              </div>

              {/* Registro Oficial y Validador (Pie de Página) */}
              <div className="absolute bottom-6 left-12 right-12 flex justify-between items-center text-[7px] text-gray-400 font-mono tracking-widest select-none uppercase border-t border-gray-200/50 pt-2">
                <div className="flex items-center gap-1">
                  <span>REGISTRO GENERAL DE DIPLOMAS: </span>
                  <span className="font-bold text-gray-600">VGC-2026-{certHash}-{award.id.toUpperCase()}</span>
                </div>
                <div>
                  FECHA EMISIÓN: {new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric'}).toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-300" viewBox="0 0 100 100" fill="currentColor">
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
                    <rect x="70" y="50" width="8" height="8" />
                    <rect x="80" y="70" width="8" height="8" />
                    <rect x="50" y="70" width="8" height="8" />
                    <rect x="70" y="80" width="8" height="8" />
                    <rect x="80" y="60" width="8" height="8" />
                    <rect x="50" y="80" width="8" height="8" />
                    <rect x="80" y="50" width="8" height="8" />
                  </svg>
                  <span>DOCUMENTO OFICIAL VALIDADOR</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DiplomasModule() {
  const [selectedAward, setSelectedAward] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedWinner, setSelectedWinner] = useState(null)

  // Estados para el Modo Presentación (Diapositivas)
  const [isPresenting, setIsPresenting] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Lista aplanada de diapositivas
  // Slide 0: Portada
  // Slide 1: Presentación: Constancia de Hierro
  // Slide 2: Ganador 1 (Angel Torres)
  // Slide 3: Ganador 2 (Miguel Aguillera)
  // Slide 4: Presentación: Premio Fair Play
  // Slide 5: Ganador 1 (Rodrigo)
  // Slide 6: Presentación: Héroe del Hardware
  // Slide 7: Ganador 1 (Francisco Ribeiro)
  // Slide 8: Presentación: Apoyo a la Organización
  // Slide 9: Ganador 1 (Francisco Ribeiro)
  // Slide 10: Próximas Premiaciones (Locked/Future)
  const slides = [
    {
      type: 'intro',
      title: 'Ceremonia de Entrega de Diplomas',
      subtitle: 'Reconocimientos Especiales de la Temporada',
      club: 'Video Game Club INACAP',
      session: 'Est. 2026 · Sede Santiago Sur'
    },
    // Constancia de Hierro
    {
      type: 'award-info',
      award: OFFICIAL_AWARDS[0],
      numberLabel: 'Primer Reconocimiento'
    },
    {
      type: 'winner-reveal',
      award: OFFICIAL_AWARDS[0],
      winner: OFFICIAL_AWARDS[0].winners[0], // Angel Torres
      numberLabel: 'Galardonado(a)'
    },
    {
      type: 'winner-reveal',
      award: OFFICIAL_AWARDS[0],
      winner: OFFICIAL_AWARDS[0].winners[1], // Miguel Aguillera
      numberLabel: 'Galardonado(a)'
    },
    // Premio Fair Play
    {
      type: 'award-info',
      award: OFFICIAL_AWARDS[1],
      numberLabel: 'Segundo Reconocimiento'
    },
    {
      type: 'winner-reveal',
      award: OFFICIAL_AWARDS[1],
      winner: OFFICIAL_AWARDS[1].winners[0], // Rodrigo
      numberLabel: 'Galardonado(a)'
    },
    // Héroe del Hardware
    {
      type: 'award-info',
      award: OFFICIAL_AWARDS[2],
      numberLabel: 'Tercer Reconocimiento'
    },
    {
      type: 'winner-reveal',
      award: OFFICIAL_AWARDS[2],
      winner: OFFICIAL_AWARDS[2].winners[0], // Francisco Ribeiro
      numberLabel: 'Galardonado(a)'
    },
    // Apoyo a la Organización
    {
      type: 'award-info',
      award: OFFICIAL_AWARDS[3],
      numberLabel: 'Cuarto Reconocimiento'
    },
    {
      type: 'winner-reveal',
      award: OFFICIAL_AWARDS[3],
      winner: OFFICIAL_AWARDS[3].winners[0], // Francisco Ribeiro
      numberLabel: 'Galardonado(a)'
    },
    // Outro
    {
      type: 'outro',
      title: '🔒 Próximos Reconocimientos',
      desc: 'Los siguientes diplomas y distinciones especiales se presentarán en las próximas sesiones del club.',
      cheer: '¡Felicitaciones a todos los galardonados de hoy!'
    }
  ]

  const handleOpenWinnerDiploma = (award, winner) => {
    setSelectedAward(award)
    setSelectedCategory(award.category)
    setSelectedWinner(winner)
  }

  const handleClose = () => {
    setSelectedAward(null)
    setSelectedCategory(null)
    setSelectedWinner(null)
  }

  const startPresentation = () => {
    setCurrentSlide(0)
    setIsPresenting(true)
  }

  const exitPresentation = () => {
    setIsPresenting(false)
  }

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  // Renderizador de la Presentación
  if (isPresenting) {
    const slide = slides[currentSlide]

    return (
      <div className="relative bg-[#0A0A10] border border-yellow-500/10 rounded-2xl p-8 min-h-[580px] flex flex-col justify-between overflow-hidden shadow-2xl animate-fade-in">
        
        {/* Confeti solo en diapositivas de revelación del ganador */}
        {slide.type === 'winner-reveal' && <Confetti slideKey={currentSlide} />}

        {/* Decoración Dorada de Fondo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand/[0.02] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

        {/* Top Control Bar */}
        <div className="flex justify-between items-center z-10 border-b border-surface-border pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest font-bold text-yellow-500/80">Ceremonia en Vivo</span>
          </div>
          <button 
            onClick={exitPresentation}
            className="px-3 py-1.5 bg-surface-hover hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-surface-border hover:border-red-500/20 rounded-xl text-xs font-bold transition-all"
          >
            Salir de la Presentación
          </button>
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center z-10">
          
          {/* Slide 0: Portada de la Ceremonia */}
          {slide.type === 'intro' && (
            <div className="space-y-6 max-w-xl animate-court-entrance">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-4xl shadow-xl shadow-yellow-500/10">
                📜
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400/80">{slide.club}</span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>
                  {slide.title}
                </h1>
                <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                  {slide.subtitle}
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={nextSlide}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2 mx-auto active:scale-95"
                >
                  Comenzar Ceremonia
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-gray-500 tracking-wider font-mono">{slide.session}</p>
            </div>
          )}

          {/* Slide tipo 'award-info': Presentación de qué es el diploma */}
          {slide.type === 'award-info' && (
            <div className="space-y-6 max-w-2xl animate-court-entrance">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-yellow-500/80 bg-yellow-500/5 px-3 py-1.5 rounded-full border border-yellow-500/10 inline-block mb-2">
                  {slide.numberLabel}
                </span>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                  Categoría: {slide.award.category.title}
                </p>
              </div>

              <div className="space-y-4">
                {/* Gran Icono del Premio */}
                <div className="mx-auto w-24 h-24 rounded-full bg-surface-card border border-surface-border flex items-center justify-center text-4xl shadow-xl glow-gold">
                  {slide.award.icon}
                </div>
                
                {/* Título de la Distinción */}
                <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>
                  {slide.award.title}
                </h2>
              </div>

              {/* Qué premia este diploma */}
              <div className="p-5 rounded-2xl bg-surface-card/50 border border-surface-border max-w-xl mx-auto space-y-2.5">
                <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">¿De qué trata este Diploma?</span>
                <p className="text-gray-300 text-sm italic font-serif leading-relaxed px-4">
                  "{slide.award.desc}"
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={nextSlide}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-md text-xs inline-flex items-center gap-2 active:scale-95"
                >
                  Revelar Galardonados
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Slide tipo 'winner-reveal': Revelar al ganador del diploma */}
          {slide.type === 'winner-reveal' && (
            <div className="space-y-6 max-w-2xl animate-court-entrance">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-400 bg-emerald-400/5 px-3 py-1 rounded-full border border-emerald-500/10 inline-block">
                  {slide.numberLabel}
                </span>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                  Reconocimiento: {slide.award.title}
                </p>
              </div>

              {/* Revelación con Confeti */}
              <div className="py-4 space-y-3">
                <p className="text-gray-400 italic text-sm font-serif mb-1">Se concede este Diploma de Honor a:</p>
                <h3 className="text-4xl md:text-5xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 uppercase py-1 drop-shadow-md" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {slide.winner.nombre}
                </h3>
                {slide.winner.alias && (
                  <span className="inline-block text-xs font-extrabold text-red-400 bg-red-400/5 px-2.5 py-0.5 rounded border border-red-500/10 font-mono">
                    "{slide.winner.alias}"
                  </span>
                )}
              </div>

              <p className="text-gray-400 text-xs max-w-md mx-auto leading-relaxed border-t border-surface-border/50 pt-4">
                Distinción oficial del Club en mérito a su colaboración, compañerismo y espíritu deportivo.
              </p>

              {/* Botón Imprimir */}
              <div className="pt-2">
                <button
                  onClick={() => handleOpenWinnerDiploma(slide.award, slide.winner)}
                  className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/25 hover:border-transparent rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Ver y Generar Diploma Completo
                </button>
              </div>
            </div>
          )}

          {/* Slide final: Cierre / Próximas premiaciones */}
          {slide.type === 'outro' && (
            <div className="space-y-6 max-w-xl animate-court-entrance">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center text-4xl shadow-xl">
                🔒
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                  {slide.title}
                </h2>
                <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                  {slide.desc}
                </p>
              </div>
              <div className="py-2">
                <span className="text-sm font-bold text-amber-400">{slide.cheer}</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={exitPresentation}
                  className="px-6 py-2.5 bg-surface-hover hover:bg-surface-border text-white border border-surface-border rounded-xl text-xs font-bold transition-all"
                >
                  Finalizar y Volver a la Galería
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation Bar */}
        <div className="flex justify-between items-center z-10 border-t border-surface-border pt-4">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-4 py-2 bg-surface-card hover:bg-surface-hover text-gray-300 disabled:opacity-30 disabled:hover:bg-surface-card rounded-xl text-xs font-bold border border-surface-border transition-all flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Atrás
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-1.5 md:gap-2">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-amber-500 scale-125 w-3 md:w-4' : 'bg-gray-600'
                }`}
              ></span>
            ))}
          </div>

          {currentSlide < slides.length - 1 ? (
            <button
              onClick={nextSlide}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              Siguiente
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={exitPresentation}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              Terminar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
          )}
        </div>

        {/* Modal Generador que se abre dentro de las diapositivas */}
        {selectedAward && (
          <DiplomaGeneratorModal
            award={selectedAward}
            category={selectedCategory}
            winner={selectedWinner}
            onClose={handleClose}
          />
        )}
      </div>
    )
  }

  // Renderizador de la Vista Normal (Galería)
  return (
    <div className="space-y-8 pb-12">
      
      {/* Intro Ceremonial */}
      <div className="bg-gradient-to-r from-surface-card to-surface/80 border border-yellow-500/20 rounded-2xl p-6 relative overflow-hidden group flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-2xl shadow-lg shadow-yellow-500/20 shrink-0">
            📜
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Ceremonia de Entrega de Reconocimientos Oficiales</h2>
            <p className="text-gray-400 text-sm max-w-xl">
              Bienvenidos a la premiación del Club de Videojuegos INACAP. A continuación se presentan las distinciones especiales correspondientes a las actividades y compañerismo de la comunidad.
            </p>
          </div>
        </div>

        {/* Botón para iniciar Presentación en Vivo */}
        <button
          onClick={startPresentation}
          className="relative z-10 shrink-0 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-95"
        >
          <span className="text-lg">📺</span>
          Iniciar Presentación en Vivo
        </button>
      </div>

      {/* Cuadro de Honor de Hoy */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-surface-border">
          <span className="text-xl">🏆</span>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Cuadro de Honor (Entregas de Hoy)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {OFFICIAL_AWARDS.map(award => (
            <div 
              key={award.id} 
              className={`rounded-xl border ${award.border} bg-surface-card overflow-hidden flex flex-col justify-between p-5 hover:scale-[1.01] transition-transform duration-200`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${award.text}`}>
                    {award.category.title}
                  </span>
                  <span className="text-2xl">{award.icon}</span>
                </div>
                
                {/* Titulo y Desc */}
                <h4 className="text-base font-bold text-white mb-2">{award.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">{award.desc}</p>
              </div>

              {/* Lista de Ganadores */}
              <div className="space-y-2.5">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Galardonado(s)</span>
                {award.winners.map(winner => (
                  <div 
                    key={winner.nombre}
                    className="flex flex-col gap-2 p-3 rounded-lg bg-surface border border-surface-border hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white leading-tight">{winner.nombre}</span>
                      <span className="text-[10px] text-gray-400">Miembro del Club</span>
                    </div>
                    <button
                      onClick={() => handleOpenWinnerDiploma(award, winner)}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/25 hover:border-transparent rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Ver Diploma
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección Próximas Premiaciones */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 pb-1 border-b border-surface-border">
          <span className="text-xl text-gray-500">🔒</span>
          <h3 className="text-lg font-bold text-gray-400 uppercase tracking-wider">Próximos Reconocimientos</h3>
        </div>

        {/* Banner Informativo */}
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex items-center gap-3 text-sm text-gray-400">
          <span className="text-lg text-amber-500/70">📅</span>
          <p>
            Las siguientes categorías de diplomas y reconocimientos especiales se presentarán y habilitarán en las <strong>próximas sesiones</strong> de cierre del club. ¡Mantente atento a la convocatoria!
          </p>
        </div>

        {/* Grid de Premios Hacia el Futuro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
          {FUTURE_AWARDS.map(award => (
            <div 
              key={award.id} 
              className={`rounded-xl border ${award.border} bg-surface-card/65 p-5 relative overflow-hidden group select-none`}
            >
              {/* Overlay de Candado */}
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1.5px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-surface/90 border border-surface-border rounded-xl px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-300 shadow-xl">
                  <span>🔒</span> Presentación más adelante
                </div>
              </div>

              {/* Header Card */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {award.categoryName}
                </span>
                <span className="text-xl filter grayscale opacity-40">{award.icon}</span>
              </div>
              
              {/* Titulo y Desc */}
              <h4 className="text-base font-bold text-gray-400 mb-2">{award.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{award.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Generador */}
      {selectedAward && (
        <DiplomaGeneratorModal
          award={selectedAward}
          category={selectedCategory}
          winner={selectedWinner}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
