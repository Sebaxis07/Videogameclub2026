import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

export default function AdminGartic() {
  const { user } = useStore();
  const [gameState, setGameState] = useState({ phase: 'lobby', players: [], chains: {} });
  
  // Reveal state
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0); // 0: prompt, 1: draw, 2: guess

  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const socket = getSocket(user.role);
    socketRef.current = socket;

    socket.emit('gartic:join');

    socket.on('gartic:state', (state) => {
      setGameState(state);
    });

    return () => {
      socket.emit('gartic:leave');
      socket.off('gartic:state');
    };
  }, [user]);

  const setPhase = (phase) => {
    if (phase === 'reveal') {
      setRevealIndex(0);
      setRevealStep(0);
    }
    socketRef.current?.emit('gartic:admin-set-phase', { phase });
  };

  const resetGame = () => {
    if (window.confirm("¿Seguro que quieres reiniciar todo el juego?")) {
      socketRef.current?.emit('gartic:admin-reset');
    }
  };

  const readyCount = gameState.players.filter(p => p.ready).length;
  const totalCount = gameState.players.length;

  const chainsArray = Object.entries(gameState.chains || {}).map(([rut, chain]) => ({ rut, ...chain }));
  
  // Reveal navigation
  const nextRevealStep = () => {
    if (revealStep < 2) {
      setRevealStep(prev => prev + 1);
    } else {
      if (revealIndex < chainsArray.length - 1) {
        setRevealIndex(prev => prev + 1);
        setRevealStep(0);
      } else {
        alert("¡Se acabaron las historias!");
      }
    }
  };

  const prevRevealStep = () => {
    if (revealStep > 0) {
      setRevealStep(prev => prev - 1);
    } else {
      if (revealIndex > 0) {
        setRevealIndex(prev => prev - 1);
        setRevealStep(2);
      }
    }
  };

  const currentChain = chainsArray[revealIndex];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 tracking-tight flex items-center gap-3">
            <span>🎨</span> Admin: Gartic Club
          </h1>
          <p className="text-gray-400 font-medium">Panel de control de la partida</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={resetGame} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-colors">
            Reiniciar Juego
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* PANEL IZQUIERDO: CONTROLES Y ESTADO */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-surface-card border border-surface-border p-6 rounded-3xl shadow-xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Estado Actual</h3>
            
            <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/5 mb-6 flex justify-between items-center">
              <span className="text-white font-bold capitalize">{gameState.phase}</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-gray-400">{readyCount} / {totalCount} listos</span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Cambiar Fase</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'lobby', label: '1. Lobby (Espera)' },
                { id: 'prompt', label: '2. Escribir Frase' },
                { id: 'draw', label: '3. Dibujar' },
                { id: 'guess', label: '4. Adivinar' },
                { id: 'reveal', label: '5. Revelar (Cine)' },
              ].map(phase => (
                <button
                  key={phase.id}
                  onClick={() => setPhase(phase.id)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm text-left transition-all ${
                    gameState.phase === phase.id 
                    ? 'bg-brand text-white border-brand scale-105 shadow-[0_0_20px_rgba(124,58,237,0.3)]' 
                    : 'bg-surface-hover text-gray-400 border-surface-border hover:text-white'
                  }`}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border p-6 rounded-3xl shadow-xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Jugadores ({totalCount})</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {gameState.players.map(p => (
                <div key={p.rut} className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5">
                  <span className="text-sm font-medium text-white truncate">{p.name}</span>
                  {p.ready ? (
                    <span className="text-xs font-black text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">LISTO</span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500">...</span>
                  )}
                </div>
              ))}
              {totalCount === 0 && <span className="text-sm text-gray-500">Nadie conectado</span>}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: REVEAL / MONITOR */}
        <div className="lg:col-span-3">
          <div className="bg-surface-card border border-surface-border p-6 md:p-8 rounded-3xl shadow-xl min-h-[600px] flex flex-col relative overflow-hidden">
            
            {gameState.phase !== 'reveal' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <span className="text-8xl mb-6">🍿</span>
                <h2 className="text-2xl font-black text-white">Monitor en Espera</h2>
                <p className="text-gray-400 mt-2 max-w-sm">Avanza a la fase "Revelar (Cine)" cuando todos hayan terminado de jugar para mostrar los resultados aquí.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {chainsArray.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">No hay historias que mostrar.</div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div className="text-sm font-bold text-brand-light uppercase tracking-widest">
                        Historia {revealIndex + 1} de {chainsArray.length}
                      </div>
                      <div className="text-xl font-black text-white">
                        Iniciada por: <span className="text-pink-400">{currentChain?.ownerName}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8 relative">
                      
                      {/* Step 0: Original Prompt */}
                      {revealStep >= 0 && (
                        <div className="animate-fade-in text-center max-w-2xl w-full">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Frase Original</span>
                          <div className="bg-surface-hover border border-surface-border p-6 rounded-2xl">
                            <span className="text-3xl font-black text-white">{currentChain?.originalPrompt}</span>
                          </div>
                        </div>
                      )}

                      {/* Step 1: Drawing */}
                      {revealStep >= 1 && (
                        <div className="animate-fade-in w-full flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2 mt-4">Dibujo</span>
                          <div className="bg-[#0F0F1A] border-4 border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full">
                            {currentChain?.drawingUrl ? (
                              <img src={currentChain.drawingUrl} alt="Dibujo" className="w-full h-auto" />
                            ) : (
                              <div className="py-24 text-center text-red-400 font-bold bg-red-500/10">No se hizo dibujo</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 2: Final Guess */}
                      {revealStep >= 2 && (
                        <div className="animate-fade-in text-center max-w-2xl w-full mt-4">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Resultado Final (Adivinanza)</span>
                          <div className="bg-brand/20 border-2 border-brand p-6 rounded-2xl shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                            <span className="text-4xl font-black text-white">{currentChain?.finalGuess || "(Sin adivinanza)"}</span>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Navigation Controls */}
                    <div className="flex justify-between items-center mt-auto pt-6 border-t border-surface-border">
                      <button 
                        onClick={prevRevealStep}
                        disabled={revealIndex === 0 && revealStep === 0}
                        className="px-6 py-3 bg-surface-hover hover:bg-surface-border text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Anterior
                      </button>
                      <button 
                        onClick={nextRevealStep}
                        disabled={revealIndex === chainsArray.length - 1 && revealStep === 2}
                        className="px-8 py-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-black rounded-xl transition-transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
