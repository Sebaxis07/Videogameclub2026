/**
 * AdminLiveMonitor.jsx
 * =====================================
 * Monitor de Estudiantes Híbrido.
 * Muestra la captura de pantalla real si está disponible, o una réplica
 * de alta fidelidad de la interfaz si el alumno no puede compartir pantalla.
 */

import React, { useEffect, useState } from 'react';

function StudentLiveCard({ student, currentQuestion }) {
  const isTabHidden = student.visibility === 'hidden';
  const hasAnswered = student.hasAnswered;
  const currentQ    = currentQuestion; 

  return (
    <div className={`relative bg-[#0a0a0f] rounded-2xl border-2 transition-all duration-300 overflow-hidden min-h-[220px] flex flex-col ${
      isTabHidden ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-surface-border hover:border-brand/40 shadow-sm shadow-black/50'
    }`}>
      
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="p-2 border-b border-surface-border bg-surface-card/50 flex justify-between items-center z-50">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center text-[8px] font-black shrink-0">
            {student.nombre?.charAt(0).toUpperCase()}
          </div>
          <span className="text-[9px] font-black text-white truncate max-w-[80px]">
            {student.nombre?.split(' ')[0]}
          </span>
        </div>
        <div className="flex gap-1 items-center shrink-0">
          {!isTabHidden && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />}
          {isTabHidden && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
          <span className={`text-[8px] font-bold ${isTabHidden ? 'text-red-400' : 'text-gray-500'}`}>
            {student.frame ? 'VIDEO' : 'MIRROR'}
          </span>
        </div>
      </div>

      {/* ── Content Area (Real Screen or Mock Mirror) ─────────────────── */}
      <div className="relative flex-1 bg-black overflow-hidden flex flex-col">
        
        {student.frame ? (
          /* REAL SCREEN CAPTURE */
          <img 
            src={student.frame} 
            alt="Real Time Screen" 
            className="absolute inset-0 w-full h-full object-contain animate-fade-in"
          />
        ) : (
          /* HIGH FIDELITY MOCK FALLBACK */
          <div className="p-2 flex flex-col gap-2 flex-1 relative select-none scale-[0.85] origin-top">
            {/* Pregunta Progress */}
            <div className="flex justify-between items-center text-[7px] text-gray-500 font-bold uppercase">
              <span>{currentQ?.categoria || 'Trivia'}</span>
              <span>{currentQ?.questionNumber || '—'}/{currentQ?.totalQuestions || '—'}</span>
            </div>
            
            {/* Mock Timer */}
            <div className="h-1 bg-surface-border/30 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-brand w-2/3 opacity-40" />
            </div>

            {/* Mock Question Box */}
            <div className="bg-surface-card/60 border border-surface-border/40 rounded-lg p-2 min-h-[45px]">
              <p className="text-[8px] leading-tight text-gray-300 line-clamp-3">
                {currentQ?.pregunta || 'Esperando inicio de pregunta...'}
              </p>
            </div>

            {/* Mock Options Grid */}
            <div className="grid grid-cols-2 gap-1.5 mt-auto">
              {['A', 'B', 'C', 'D'].map((letter, idx) => {
                const isSelected = student.selectedIndex === idx;
                return (
                  <div 
                    key={idx}
                    className={`flex items-center gap-1 p-1 rounded-lg border text-[7px] transition-all ${
                      isSelected 
                        ? 'bg-brand/20 border-brand text-white'
                        : 'bg-surface-border/10 border-surface-border/30 text-gray-700'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center font-black ${
                      isSelected ? 'bg-brand text-white border-brand-light' : 'bg-surface border-surface-border'
                    }`}>
                      {letter}
                    </div>
                    <span className="truncate opacity-50">{currentQ?.opciones?.[idx] || '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Shared Overlays ────────────────────────────────────────────── */}
        
        {/* Cursor Point */}
        {!isTabHidden && student.mouse && (
          <div 
            className="absolute w-2.5 h-2.5 bg-brand rounded-full border border-white/50 shadow-lg shadow-brand/40 pointer-events-none transition-all duration-300 ease-out z-[100]"
            style={{ 
              left: `${student.mouse.x}%`, 
              top: `${student.mouse.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="absolute inset-0 bg-brand rounded-full animate-ping opacity-30" />
          </div>
        )}

        {/* Status Stamp */}
        {hasAnswered && (
          <div className="absolute inset-0 z-40 bg-green-500/5 backdrop-blur-[1px] flex items-center justify-center p-2 rounded-b-2xl">
            <div className="bg-green-500 text-white font-black text-[9px] px-3 py-1 rounded-full shadow-lg shadow-green-500/20 uppercase tracking-tighter transform -rotate-12 border-2 border-white/20">
              ✓ RESPONDIDO
            </div>
          </div>
        )}

        {/* Hidden Overlay */}
        {isTabHidden && (
          <div className="absolute inset-0 z-[110] bg-[#0a0a0f]/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
             <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mb-2 animate-pulse">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
             </div>
             <p className="text-red-400 font-black text-[9px] uppercase tracking-widest text-center">Trampa Detectada</p>
             <p className="text-gray-500 text-[7px] mt-1 text-center font-bold">PESTAÑA OCULTA</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLiveMonitor({ socket, currentQuestion }) {
  const [liveData, setLiveData] = useState({}); // { rut: data }

  useEffect(() => {
    if (!socket) return;

    const handleLiveData = (data) => {
      setLiveData(prev => ({
        ...prev,
        [data.rut]: { ...(prev[data.rut] || {}), ...data }
      }));
    };

    socket.on('admin:trivia:liveDataFeed', handleLiveData);
    socket.on('admin:trivia:screenFrameFeed', handleLiveData);

    return () => {
      socket.off('admin:trivia:liveDataFeed', handleLiveData);
      socket.off('admin:trivia:screenFrameFeed', handleLiveData);
    };
  }, [socket]);

  const students = Object.values(liveData).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface/30 border border-dashed border-surface-border rounded-3xl animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-surface-border/30 flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium">Esperando actividad de los alumnos...</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-1 italic">
          Nota: Se mostrará video real en local/https, y réplica de UI en el resto de casos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-fade-in">
      {students.map((student) => (
        <StudentLiveCard 
          key={student.rut} 
          student={student} 
          currentQuestion={currentQuestion}
        />
      ))}
    </div>
  );
}
