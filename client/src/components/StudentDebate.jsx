/**
 * StudentDebate.jsx
 * =====================================
 * Vista de Votación en Vivo para los Alumnos.
 * 
 * Escucha eventos por WebSocket y muestra la fase actual:
 * 1. idle -> "Esperando inicio..."
 * 2. revealing -> Muestra juegos uno a uno
 * 3. voting -> Permite seleccionar 3 juegos y enviar
 * 4. finished -> Mensaje de agradecimiento
 */

import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

export default function StudentDebate() {
  const { user } = useStore();
  const [socket, setSocket] = useState(null);
  const [liveState, setLiveState] = useState({ status: 'idle', games: [], votedStudents: [] });
  
  // Voto del alumno
  const [selectedGames, setSelectedGames] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const s = getSocket('student');
    setSocket(s);

    s.on('debate-state', (state) => {
      setLiveState(state);
      if (state.votedStudents.includes(user.rut)) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
      }
    });

    s.on('vote-success', () => {
      setHasVoted(true);
    });

    return () => {
      s.off('debate-state');
      s.off('vote-success');
    };
  }, [user.rut]);

  const toggleSelect = (gameName) => {
    if (hasVoted || liveState.status !== 'voting') return;
    
    // Limitar a un solo voto
    setSelectedGames([gameName]);
  };

  const submitVote = () => {
    if (!socket || selectedGames.length === 0) return;
    socket.emit('student:vote', { rut: user.rut, selectedGames });
  };

  const { status, games } = liveState;
  const revealedGames = games.filter(g => g.status === 'revealed');

  // ─── IDLE ──────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-fade-in relative overflow-hidden">
        <div className="absolute top-10 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand/10 via-transparent to-transparent opacity-50"></div>
        <div className="w-16 h-16 rounded-full border-4 border-surface border-t-brand animate-spin mb-6 relative z-10" />
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 relative z-10">Esperando al Administrador</h2>
        <p className="text-gray-400 max-w-sm relative z-10">
          La fase de debate no ha comenzado aún. Por favor mantente en esta pantalla; empezará automáticamente en breve.
        </p>
      </div>
    );
  }

  // ─── REVELACIÓN (PRESENTING) ───────────────────────────────────────
  if (status === 'revealing') {
    const lastRevealed = revealedGames[revealedGames.length - 1];
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-fade-in relative z-10">
        <h3 className="text-brand-light font-bold tracking-widest uppercase text-xs mb-8">
          Revelando Opciones de Juego...
        </h3>
        
        {lastRevealed ? (
          <div key={lastRevealed.name} className="animate-slide-up w-full px-2 max-w-2xl">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Nueva Propuesta:</h2>
            <div className="bg-[#1A1A2E] border-2 border-brand shadow-[0_0_30px_rgba(124,58,237,0.3)] rounded-2xl py-8 px-6 sm:px-12 inline-block w-full sm:w-auto mt-4">
              <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-brand to-cyan-400 tracking-wide break-words">
                {lastRevealed.name}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-8 animate-pulse">Esperando siguiente juego...</p>
          </div>
        ) : (
          <p className="text-gray-400">Atento a la pantalla...</p>
        )}
      </div>
    );
  }

  // ─── VOTACIÓN ACTIVA ─────────────────────────────────────────────
  if (status === 'voting' && !hasVoted) {
    return (
      <div className="card-glow flex flex-col min-h-[500px] p-4 sm:p-6 animate-fade-in text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">¡La Votación está Abierta!</h2>
        <p className="text-amber-400 font-medium mb-6">Selecciona el juego que más quieras jugar y envía tu voto.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 overflow-y-auto w-full max-w-3xl mx-auto mb-6">
          {revealedGames.map((g) => {
            const isSelected = selectedGames.includes(g.name);
            return (
              <button 
                key={g.name} 
                onClick={() => toggleSelect(g.name)}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isSelected 
                    ? 'bg-brand/20 border-brand shadow-[0_0_15px_rgba(124,58,237,0.3)] scale-105 transform' 
                    : 'bg-surface-card border-surface-border text-gray-300 hover:border-brand/40 hover:bg-surface-hover'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mb-3 ${isSelected ? 'bg-brand border-brand' : 'bg-surface border-gray-600'}`}>
                  {isSelected && <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white"><circle cx="10" cy="10" r="5" /></svg>}
                </div>
                <span className={`font-bold text-sm leading-tight ${isSelected ? 'text-white' : ''}`}>
                  {g.name}
                </span>
              </button>
            )
          })}
        </div>

        <div className="pt-4 border-t border-surface-border flex flex-col items-center">
          <p className="text-gray-400 text-sm mb-4">
            {selectedGames.length > 0 ? 'Has seleccionado un juego.' : 'Aún no seleccionas un juego.'}
          </p>
          <button 
            onClick={submitVote} 
            disabled={selectedGames.length === 0}
            className={`px-10 py-4 rounded-2xl font-bold text-lg w-full sm:w-auto transition-all ${
              selectedGames.length > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-gray-900 shadow-xl shadow-amber-500/20 hover:-translate-y-1'
                : 'bg-surface border border-surface-border text-gray-600 cursor-not-allowed'
            }`}
          >
            Confirmar y Enviar Voto
          </button>
        </div>
      </div>
    );
  }

  // ─── YA VOTÓ O EL DEBATE TERMINÓ ─────────────────────────────────
  if (hasVoted || status === 'finished') {
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-fade-in relative overflow-hidden z-10">
        <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-10 h-10 text-green-400">
             <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-white mb-2">¡Voto Registrado con Éxito!</h2>
        <p className="text-gray-400 max-w-sm mb-8">
          {status === 'finished' 
            ? 'El debate ha finalizado. El administrador revelará los resultados en pantalla principal pronto.'
            : 'Tu voto fue enviado. Mira la pantalla del administrador para ver los resultados en vivo.'}
        </p>
      </div>
    );
  }

  return null;
}
