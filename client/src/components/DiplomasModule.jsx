import React, { useState } from 'react'
import useStore from '../store/useStore'

const AWARDS_CATEGORIES = [
  {
    id: 'competitive',
    title: 'Reconocimientos Competitivos',
    desc: 'Los Pesos Pesados. Para entregar en los Torneos Oficiales.',
    gradient: 'from-yellow-500/10 to-amber-600/10 hover:from-yellow-500/20 hover:to-amber-600/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    awards: [
      { id: 'campeon', title: 'Campeón del Torneo Oficial', icon: '', desc: 'El diploma máximo para el primer lugar (Apertura / Clausura).' },
      { id: 'podio', title: 'Podio de Honor', icon: '', desc: 'Para el 2do y 3er lugar que llegaron a las instancias finales.' },
      { id: 'mvp', title: 'MVP de la Temporada', icon: '', desc: 'Jouer que acumuló más puntos matemáticos en el Leaderboard.' },
      { id: 'invicto', title: 'Campeón Invicto', icon: '', desc: 'Logró ganar el torneo oficial sin ceder ninguna partida.' },
    ]
  },
  {
    id: 'community',
    title: 'Comunidad y Valores',
    desc: 'Premios a la actitud positiva y el compañerismo.',
    gradient: 'from-green-500/10 to-emerald-600/10 hover:from-green-500/20 hover:to-emerald-600/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    awards: [
      { id: 'hardware', title: 'Héroe del Hardware', icon: '', desc: 'El alumno que más veces prestó sus equipos.' },
      { id: 'fairplay', title: 'Premio Fair Play', icon: '', desc: 'Para el jugador más respetuoso o que supo perder con gracia.' },
      { id: 'constancia', title: 'Constancia de Hierro', icon: '', desc: 'Asistencia perfecta y siempre puntual a las 15:40 hrs.' },
      { id: 'mentor', title: 'El Mentor / Asistente', icon: '', desc: 'Ayudó activamente a organizar, ordenar o arbitrar.' },
    ]
  },
  {
    id: 'gamer',
    title: 'Reconocimientos "Gamer"',
    desc: 'Ideales para sacar unas risas durante la premiación.',
    gradient: 'from-purple-500/10 to-fuchsia-600/10 hover:from-purple-500/20 hover:to-fuchsia-600/20',
    border: 'border-fuchsia-500/30',
    text: 'text-fuchsia-400',
    awards: [
      { id: 'comeback', title: 'Rey del Comeback', icon: '', desc: 'Protagonizó la remontada más épica del semestre.' },
      { id: 'tryhard', title: 'El Tryhard', icon: '', desc: 'Registró la mayor cantidad de Horas Jugadas en el club.' },
      { id: 'underdog', title: 'La Sorpresa (Underdog)', icon: '', desc: 'Entró con bajo perfil y eliminó a un gran favorito.' },
      { id: 'casi', title: 'A un click de la gloria', icon: '', desc: 'Llegó siempre a semifinales pero se quedó en la puerta.' },
    ]
  },
  {
    id: 'participation',
    title: 'Certificados de Participación',
    desc: 'Reconocimiento sencillo para eventos masivos.',
    gradient: 'from-blue-500/10 to-cyan-600/10 hover:from-blue-500/20 hover:to-cyan-600/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    awards: [
      { id: 'fundador', title: 'Miembro Fundador', icon: '', desc: 'Asistencia al Debate inaugural del 8 de abril de 2026.' },
    ]
  }
];

// Helper modal para Generar el Diploma
function DiplomaGeneratorModal({ award, category, onClose }) {
  const { players } = useStore()
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  
  if (!award) return null

  // Filtrar jugadores válidos (evitar vacíos)
  const validPlayers = players.filter(p => p.nombre && p.nombre.trim() !== '')

  const handlePrint = () => {
    window.print()
  }

  const selectedPlayer = players.find(p => p.rut === selectedPlayerId) || { nombre: 'Nombre del Alumno' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-4xl flex flex-col max-h-[90vh] print:border-none print:shadow-none print:max-w-none print:h-screen print:w-screen print:rounded-none">
        
        {/* Header (No visible in print) */}
        <div className="p-4 border-b border-surface-border flex justify-between items-center print:hidden">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">{award.icon}</span> Generar Reconocimiento
            </h3>
            <p className="text-sm text-gray-400">{award.title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-xl transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8 print:block print:p-0 print:overflow-visible">
          
          {/* Controls Panel (No visible in print) */}
          <div className="w-full md:w-1/3 space-y-6 print:hidden">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Seleccionar Jugador</label>
              <select 
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                <option value="">-- Elige un jugador --</option>
                {validPlayers.map(p => (
                  <option key={p.rut || p.nombre} value={p.rut}>
                    {p.nombre} {p.alias ? `"${p.alias}"` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
              <h4 className="text-sm font-semibold text-white mb-2">Detalles del Premio</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li><span className="text-gray-500">Categoría:</span> {category.title}</li>
                <li><span className="text-gray-500">Premio:</span> {award.title}</li>
                <li><span className="text-gray-500">Motivo:</span> {award.desc}</li>
              </ul>
            </div>

            <button 
              onClick={handlePrint}
              disabled={!selectedPlayerId}
              className="w-full py-3 bg-brand hover:bg-brand-light text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Imprimir / Guardar PDF
            </button>
          </div>

          {/* Certificate Preview (Visible in print) */}
          <div className="w-full md:w-2/3 overflow-x-auto flex items-start md:items-center justify-start md:justify-center print:w-full print:h-full pb-4 md:pb-0">
            <div className="min-w-[700px] md:min-w-0 relative w-full aspect-[1.414/1] md:aspect-[1.414/1] bg-white text-gray-900 rounded-sm shadow-2xl print:shadow-none print:w-[297mm] print:h-[210mm] print:absolute print:top-0 print:left-0 flex flex-col items-center justify-center border-[12px] border-double border-gray-300 p-8 overflow-hidden shrink-0">
              
              {/* Background watermark/decorations */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                <span className="text-[300px]">{award.icon}</span>
              </div>
              <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-red-600 via-white to-red-600"></div>

              {/* Logos */}
              <div className="absolute top-10 left-12 flex flex-col items-center">
                 <div className="text-3xl font-black text-red-600 tracking-tighter">INACAP</div>
                 <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Sede Principal</div>
              </div>
              <div className="absolute top-10 right-12 text-right">
                <div className="text-xl font-black text-gray-800 tracking-wider flex items-center gap-2 justify-end">
                  <span className="bg-gray-800 text-white w-8 h-8 rounded-md flex items-center justify-center text-sm"></span> VGC
                </div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Video Game Club</div>
              </div>

              {/* Content */}
              <div className="text-center z-10 w-full max-w-2xl mt-12">
                <div className={`text-6xl mb-6 ${category.text.replace('400', '600')} print:text-black drop-shadow-sm`}>{award.icon}</div>
                <h2 className="text-xl md:text-2xl font-bold tracking-[0.2em] text-gray-500 uppercase mb-2">Certificado de Reconocimiento</h2>
                <div className="w-24 h-1 bg-red-600 mx-auto mb-8"></div>
                
                <p className="text-gray-600 italic text-lg mb-4">Otorgado a:</p>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 border-b-2 border-gray-200 pb-2 px-8 inline-block">
                  {selectedPlayer.nombre}
                </h1>
                
                <p className="text-gray-600 text-lg mb-2">Por haber obtenido el título de:</p>
                <h3 className={`text-2xl md:text-3xl font-bold ${category.text.replace('400', '800')} print:text-black mb-6`}>
                  « {award.title} »
                </h3>
                
                <p className="text-gray-500 max-w-md mx-auto italic">
                  {award.desc}
                </p>
              </div>

              {/* Signatures */}
              <div className="absolute bottom-16 left-0 right-0 px-24 flex justify-between items-end">
                <div className="text-center">
                  <div className="w-48 border-b border-gray-400 mb-2"></div>
                  <p className="text-sm font-bold text-gray-800">Coordinador del Club</p>
                  <p className="text-xs text-gray-500">Video Game Club INACAP</p>
                </div>
                
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-yellow-500 shadow-inner rotate-12 relative opacity-90">
                  <div className="absolute inset-1 border border-yellow-600 border-dashed rounded-full"></div>
                  <span className="text-2xl transform -rotate-12"></span>
                </div>

                <div className="text-center">
                  <div className="w-48 border-b border-gray-400 mb-2"></div>
                  <p className="text-sm font-bold text-gray-800">Fecha de Emisión</p>
                  <p className="text-xs text-gray-500">{new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric'})}</p>
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

  const handleSelect = (category, award) => {
    setSelectedCategory(category)
    setSelectedAward(award)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Intro */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-yellow-500/20 shrink-0">
            
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Galería de Reconocimientos</h2>
            <p className="text-gray-400 text-sm max-w-2xl">
              Selecciona una de las categorías para generar un diploma oficial o informal.
              Puedes imprimirlo directamente o guardarlo como PDF para entregarlo a los alumnos.
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {AWARDS_CATEGORIES.map(category => (
          <div key={category.id} className={`rounded-xl border ${category.border} bg-surface-card overflow-hidden flex flex-col`}>
            {/* Header Categoría */}
            <div className={`p-4 border-b ${category.border} bg-gradient-to-r ${category.gradient} transition-colors`}>
              <h3 className={`text-lg font-bold ${category.text} mb-1 drop-shadow-sm`}>{category.title}</h3>
              <p className="text-xs text-gray-400">{category.desc}</p>
            </div>
            
            {/* Lista de Premios */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {category.awards.map(award => (
                <button
                  key={award.id}
                  onClick={() => handleSelect(category, award)}
                  className="flex flex-col text-left p-3 rounded-lg bg-surface border border-surface-border hover:border-gray-500 hover:bg-surface-hover transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl group-hover:scale-110 transition-transform">{award.icon}</span>
                    <span className="font-semibold text-sm text-gray-200 leading-tight">{award.title}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 leading-snug line-clamp-2">
                    {award.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedAward && (
        <DiplomaGeneratorModal
          award={selectedAward}
          category={selectedCategory}
          onClose={() => setSelectedAward(null)}
        />
      )}
    </div>
  )
}
