import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

export default function GarticArena() {
  const { user } = useStore();
  const [gameState, setGameState] = useState({ phase: 'lobby', players: [] });
  const [assignment, setAssignment] = useState(null);
  
  // States for inputs
  const [promptInput, setPromptInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Canvas refs
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.role);
    socketRef.current = socket;

    socket.emit('gartic:join');

    socket.on('gartic:state', (state) => {
      setGameState(prev => {
        // Reset local submission state if phase changed
        if (prev.phase !== state.phase) {
          setHasSubmitted(false);
          setPromptInput('');
          setGuessInput('');
          // Clear canvas if moving to draw phase
          if (state.phase === 'draw' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.fillStyle = '#0F0F1A';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        return state;
      });
    });

    socket.on('gartic:assignment', (data) => {
      setAssignment(data);
    });

    return () => {
      socket.emit('gartic:leave');
      socket.off('gartic:state');
      socket.off('gartic:assignment');
    };
  }, [user]);

  // Canvas Handlers
  const startDrawing = (e) => {
    if (hasSubmitted) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current || hasSubmitted) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Support touch and mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY
    };
  };

  const clearCanvas = () => {
    if (!canvasRef.current || hasSubmitted) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#0F0F1A';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // Submit Handlers
  const submitPrompt = () => {
    if (!promptInput.trim() || hasSubmitted) return;
    socketRef.current?.emit('gartic:submit-prompt', { prompt: promptInput });
    setHasSubmitted(true);
  };

  const submitDraw = () => {
    if (!canvasRef.current || hasSubmitted) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    socketRef.current?.emit('gartic:submit-draw', { drawingUrl: dataUrl });
    setHasSubmitted(true);
  };

  const submitGuess = () => {
    if (!guessInput.trim() || hasSubmitted) return;
    socketRef.current?.emit('gartic:submit-guess', { guess: guessInput });
    setHasSubmitted(true);
  };

  const me = gameState.players.find(p => p.rut === user?.rut);
  const isReady = me?.ready || hasSubmitted;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 tracking-tight">
          Gartic Club 🎨
        </h1>
        <p className="text-gray-400 font-medium mt-2">El teléfono descompuesto, pero con dibujos</p>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* LOBBY */}
        {gameState.phase === 'lobby' && (
          <div className="text-center py-12">
            <span className="text-6xl mb-6 block animate-bounce" style={{ filter: 'drop-shadow(0 0 20px rgba(236,72,153,0.5))' }}>🛋️</span>
            <h2 className="text-2xl font-black text-white mb-2">Sala de Espera</h2>
            <p className="text-gray-400 mb-8">Esperando a que el administrador inicie la partida...</p>
            <div className="inline-block bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
              <span className="text-sm font-bold text-brand-light block mb-2 uppercase tracking-widest">Jugadores Conectados</span>
              <div className="text-3xl font-black text-white">{gameState.players.length}</div>
            </div>
          </div>
        )}

        {/* PHASE 1: PROMPT */}
        {gameState.phase === 'prompt' && (
          <div className="flex flex-col items-center max-w-lg mx-auto py-8">
            <span className="text-5xl mb-4">✍️</span>
            <h2 className="text-2xl font-black text-white mb-2">Escribe una frase</h2>
            <p className="text-gray-400 text-center mb-8">Escribe algo raro, divertido o desafiante. ¡Alguien más tendrá que dibujarlo!</p>
            
            {!isReady ? (
              <div className="w-full flex flex-col gap-4">
                <input 
                  type="text" 
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ej: Un tiranosaurio rex bebiendo té en Londres"
                  className="w-full bg-black/50 border-2 border-white/10 focus:border-pink-500 rounded-xl px-4 py-4 text-white font-medium outline-none transition-all placeholder:text-gray-600"
                  onKeyDown={(e) => e.key === 'Enter' && submitPrompt()}
                />
                <button 
                  onClick={submitPrompt}
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:scale-[1.02]"
                >
                  ENVIAR FRASE
                </button>
              </div>
            ) : (
              <div className="text-center bg-green-500/10 border border-green-500/20 p-6 rounded-2xl w-full">
                <span className="text-2xl mb-2 block">✅</span>
                <p className="text-green-400 font-bold">¡Frase enviada! Esperando a los demás...</p>
              </div>
            )}
          </div>
        )}

        {/* PHASE 2: DRAW */}
        {gameState.phase === 'draw' && (
          <div className="flex flex-col items-center py-4">
            <h2 className="text-xl font-bold text-gray-400 mb-2">Te toca dibujar:</h2>
            <div className="bg-brand/20 border-2 border-brand px-6 py-3 rounded-2xl mb-6 max-w-2xl text-center">
              <span className="text-2xl font-black text-white">{assignment?.prompt || "Cargando frase..."}</span>
            </div>

            {!isReady ? (
              <div className="w-full flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-[#0F0F1A] border-2 border-white/10 rounded-2xl overflow-hidden shadow-inner cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-auto bg-[#0F0F1A] touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                
                <div className="flex flex-col gap-4 md:w-48 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Herramientas</div>
                  
                  <div className="flex flex-wrap gap-2">
                    {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'].map(c => (
                      <button 
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Grosor: {brushSize}</div>
                    <input 
                      type="range" 
                      min="1" max="20" 
                      value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <button 
                    onClick={clearCanvas}
                    className="mt-4 py-2 bg-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    Borrar Todo
                  </button>

                  <button 
                    onClick={submitDraw}
                    className="mt-auto bg-green-500 hover:bg-green-400 text-white font-black py-4 rounded-xl transition-transform hover:scale-105 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  >
                    ¡LISTO!
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center bg-green-500/10 border border-green-500/20 p-6 rounded-2xl w-full max-w-lg mx-auto">
                <span className="text-2xl mb-2 block">🖼️</span>
                <p className="text-green-400 font-bold">¡Obra de arte enviada! Esperando a que el resto termine...</p>
              </div>
            )}
          </div>
        )}

        {/* PHASE 3: GUESS */}
        {gameState.phase === 'guess' && (
          <div className="flex flex-col items-center max-w-3xl mx-auto py-8">
            <span className="text-5xl mb-4">🤔</span>
            <h2 className="text-2xl font-black text-white mb-2">¿Qué es esto?</h2>
            <p className="text-gray-400 text-center mb-6">Adivina qué intentó dibujar la otra persona.</p>

            <div className="w-full bg-[#0F0F1A] border-2 border-white/10 rounded-2xl overflow-hidden mb-8 shadow-2xl">
              {assignment?.drawingUrl ? (
                <img src={assignment.drawingUrl} alt="Dibujo a adivinar" className="w-full h-auto" />
              ) : (
                <div className="py-20 text-center text-gray-500">No hay dibujo... Alguien no hizo su tarea.</div>
              )}
            </div>

            {!isReady ? (
              <div className="w-full max-w-lg flex flex-col gap-4">
                <input 
                  type="text" 
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Ej: Un perro volando..."
                  className="w-full bg-black/50 border-2 border-white/10 focus:border-brand rounded-xl px-4 py-4 text-white font-medium outline-none transition-all placeholder:text-gray-600"
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                />
                <button 
                  onClick={submitGuess}
                  className="w-full bg-brand hover:bg-brand-light text-white font-black py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:scale-[1.02]"
                >
                  ENVIAR ADIVINANZA
                </button>
              </div>
            ) : (
              <div className="text-center bg-green-500/10 border border-green-500/20 p-6 rounded-2xl w-full max-w-lg">
                <span className="text-2xl mb-2 block">✅</span>
                <p className="text-green-400 font-bold">¡Adivinanza enviada!</p>
              </div>
            )}
          </div>
        )}

        {/* PHASE 4: REVEAL */}
        {gameState.phase === 'reveal' && (
          <div className="text-center py-16">
            <span className="text-6xl mb-6 block animate-bounce">🍿</span>
            <h2 className="text-3xl font-black text-white mb-4">¡Hora del Show!</h2>
            <p className="text-gray-400 text-lg">Mira la pantalla del profesor/administrador para ver los resultados.</p>
          </div>
        )}

      </div>
    </div>
  );
}
