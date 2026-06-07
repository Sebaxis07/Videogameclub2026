import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

const STEPS = [
  { id: 'lobby', label: 'Lobby', icon: '🛋️', desc: 'Espérando jugadores' },
  { id: 'clues', label: 'Pistas', icon: '✍️', desc: 'Deducción de palabras' },
  { id: 'voting', label: 'Votación', icon: '🗳️', desc: 'Descubrir infiltrado' },
  { id: 'guess_word', label: 'Escape', icon: '🧠', desc: 'Adivinar palabra' },
  { id: 'results', label: 'Resultados', icon: '🏆', desc: 'Resumen final' }
];

export default function InfiltradoArena() {
  const { user } = useStore();
  const [gameState, setGameState] = useState({
    phase: 'lobby',
    players: [],
    category: '',
    secretWord: null,
    turnOrder: [],
    currentTurnIndex: 0,
    accusedSocketId: null,
    accusedName: '',
    winnerTeam: null,
    accusedIsImpostor: false,
    guessOptions: [],
    myRole: null,
    myTurn: false,
    hasVoted: false
  });

  const [clueInput, setClueInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showRole, setShowRole] = useState(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.role);
    socketRef.current = socket;

    socket.emit('infil:join');

    socket.on('infil:state', (state) => {
      setGameState(state);
      setErrorMsg('');
    });

    socket.on('infil:error', ({ msg }) => {
      setErrorMsg(msg);
      // Limpiar mensaje de error tras 3 segundos
      setTimeout(() => setErrorMsg(''), 4000);
    });

    return () => {
      socket.emit('infil:leave');
      socket.off('infil:state');
      socket.off('infil:error');
    };
  }, [user]);

  const submitClue = (e) => {
    e.preventDefault();
    const clean = clueInput.trim();
    if (!clean) {
      setErrorMsg('La palabra no puede estar vacía.');
      return;
    }
    if (clean.includes(' ')) {
      setErrorMsg('Debes ingresar solo una palabra.');
      return;
    }
    
    socketRef.current?.emit('infil:submit-clue', { clue: clean });
    setClueInput('');
    setErrorMsg('');
  };

  const submitVote = (targetSocketId) => {
    socketRef.current?.emit('infil:submit-vote', { targetSocketId });
  };

  const submitImpostorGuess = (guess) => {
    socketRef.current?.emit('infil:impostor-guess', { guess });
  };

  // Helper variables
  const currentTurnSocketId = gameState.turnOrder[gameState.currentTurnIndex];
  const currentTurnPlayer = gameState.players.find(p => p.socketId === currentTurnSocketId);
  const isMyTurn = gameState.myTurn;
  const myPlayerInfo = gameState.players.find(p => p.socketId === socketRef.current?.id);

  // Obtener color dinámico para avatares
  const getAvatarColor = (name) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-cyan-400 to-blue-500',
      'from-purple-500 to-indigo-600',
      'from-pink-500 to-rose-600',
      'from-amber-400 to-orange-500',
      'from-emerald-400 to-teal-600',
      'from-violet-500 to-fuchsia-600'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8 select-none">
      
      {/* ─── ENCABEZADO Y STEPPER HOLOGRÁFICO ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-[#0f0f22]/60 border border-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="text-center lg:text-left space-y-1">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <span className="text-3xl">🕵️‍♂️</span>
            <h1 className="text-3xl font-black tracking-wider uppercase bg-gradient-to-r from-red-500 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              INFILTRADO ARENA
            </h1>
          </div>
          <p className="text-gray-400 text-sm font-medium">Asociación mental, deducción social y sigilo.</p>
        </div>

        {/* Stepper horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-2">
          {STEPS.map((s, idx) => {
            const isCompleted = idx < STEPS.findIndex(step => step.id === gameState.phase);
            const isActive = s.id === gameState.phase;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isCompleted
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-white/5 border-white/5 text-gray-500'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-black uppercase tracking-wider">{s.label}</div>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <span className={`text-lg font-bold ${isCompleted ? 'text-green-500/40' : 'text-white/5'}`}>→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* NOTIFICACIONES DE ERROR ESTILO ALERTA CYBERPUNK */}
      {errorMsg && (
        <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <span>SYSTEM ERROR: {errorMsg}</span>
          </div>
        </div>
      )}

      {/* ─── CONTENIDO CENTRAL DEL JUEGO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL PRINCIPAL (2 columnas de ancho en desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b0b18]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative min-h-[400px] flex flex-col justify-between overflow-hidden">
            {/* Animación de fondo sutil */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            
            {/* ─── LOBBY VIEW ─── */}
            {gameState.phase === 'lobby' && (
              <div className="flex flex-col items-center justify-center text-center py-8 flex-1">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-pulse mb-6">
                  <div className="w-full h-full bg-[#0b0b18] rounded-full flex items-center justify-center">
                    <span className="text-5xl">📡</span>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Conectando con la Sala</h2>
                <p className="text-gray-400 max-w-md mb-8 text-sm">
                  Esperando las directivas del administrador para sincronizar roles. ¡Asegúrate de coordinar la llamada!
                </p>
                
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 w-full max-w-sm flex items-center justify-between mb-4">
                  <span className="text-gray-400 font-semibold text-sm">Estado de inicio:</span>
                  <span className="text-xs font-black bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    Mínimo 3 jugadores
                  </span>
                </div>
              </div>
            )}

            {/* ─── CLUES PHASE (RONDA DE CLUES) ─── */}
            {gameState.phase === 'clues' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Info superior */}
                <div className="flex justify-between items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Categoría de la ronda</span>
                    <span className="text-lg font-black text-white">{gameState.category}</span>
                  </div>
                  
                  {gameState.myRole === 'innocent' && (
                    <div className="text-right">
                      <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest block">Tu Secreto</span>
                      <span className="text-base font-black text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-xl uppercase">
                        {gameState.secretWord}
                      </span>
                    </div>
                  )}
                </div>

                {/* Input de Clue o Espera */}
                <div className="py-8 flex flex-col items-center justify-center flex-1">
                  {isMyTurn ? (
                    <div className="w-full max-w-md text-center space-y-6">
                      <div className="space-y-2">
                        <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                          ⚡ Tu Turno
                        </span>
                        <h3 className="text-xl font-bold text-white">Ingresa tu palabra clave</h3>
                        <p className="text-xs text-gray-400">
                          Debe ser un adjetivo, característica o sinónimo. ¡Sin espacios!
                        </p>
                      </div>

                      <form onSubmit={submitClue} className="space-y-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={clueInput}
                            onChange={(e) => setClueInput(e.target.value.replace(/\s/g, ''))}
                            placeholder="Escribe aquí..."
                            maxLength={20}
                            className="w-full bg-black/60 border-2 border-amber-500/40 focus:border-amber-500 rounded-2xl px-6 py-4 text-center text-xl font-black text-white outline-none transition-all shadow-[0_0_20px_rgba(245,158,11,0.05)] uppercase"
                            autoFocus
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">
                            {clueInput.length}/20
                          </span>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-[1.01] uppercase tracking-wider text-sm"
                        >
                          Confirmar y Transmitir
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin mx-auto" />
                      <div>
                        <h3 className="text-lg font-bold text-white">Esperando Transmisión</h3>
                        <p className="text-xs text-gray-400">
                          Turno activo de: <strong className="text-amber-400">{currentTurnPlayer?.name || 'Compañero'}</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info inferior de turnos */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center justify-between text-xs text-gray-400">
                  <span>Jugadores restantes: {gameState.turnOrder.length - gameState.currentTurnIndex}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    En línea
                  </span>
                </div>

              </div>
            )}

            {/* ─── VOTING VIEW ─── */}
            {gameState.phase === 'voting' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="text-center max-w-md mx-auto space-y-2">
                  <span className="text-xs font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    🚨 ESCUDRIÑAMIENTO
                  </span>
                  <h2 className="text-2xl font-black text-white">¿Quién es el Infiltrado?</h2>
                  <p className="text-xs text-gray-400">
                    Evalúa las pistas que dio cada jugador y selecciona a tu sospechoso. ¡Si fallas, gana el Infiltrado!
                  </p>
                </div>

                {gameState.hasVoted ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
                      <span className="text-3xl text-green-400">✓</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Voto Emitido Exitosamente</h3>
                    <p className="text-xs text-gray-400 mt-1">Sincronizando con los servidores de votación...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    {gameState.players.map((p, idx) => {
                      const isMe = p.socketId === socketRef.current?.id;
                      const hover = hoveredPlayerId === p.socketId;

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredPlayerId(p.socketId)}
                          onMouseLeave={() => setHoveredPlayerId(null)}
                          className={`relative border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between gap-4 ${
                            isMe
                              ? 'bg-white/5 border-white/5 opacity-60'
                              : hover
                              ? 'bg-red-500/10 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)] scale-[1.02]'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-200 text-sm">{p.name} {isMe && '(Tú)'}</span>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                              Pista dada
                            </span>
                          </div>

                          <div className="bg-black/40 border border-white/5 rounded-xl py-3 flex items-center justify-center">
                            <span className="text-lg font-black text-white uppercase tracking-wider">
                              {p.clue || 'Sin pista'}
                            </span>
                          </div>

                          <button
                            onClick={() => submitVote(p.socketId)}
                            disabled={isMe}
                            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all tracking-wider ${
                              isMe
                                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95'
                            }`}
                          >
                            {isMe ? 'ESTE ERES TÚ' : 'ACUSAR SOSPECHOSO'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-black/30 border border-white/5 p-4 rounded-xl text-center text-xs text-gray-500">
                  Nota: No puedes votar por ti mismo.
                </div>
              </div>
            )}

            {/* ─── GUESS WORD VIEW (ESCAPE DEL INFILTRADO) ─── */}
            {gameState.phase === 'guess_word' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {gameState.impostorSocketId === socketRef.current?.id ? (
                  <div className="text-center py-6 max-w-md mx-auto space-y-8 animate-fade-in">
                    <div className="space-y-2">
                      <span className="text-5xl block animate-bounce">🚨</span>
                      <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest">¡TE DESCUBRIERON!</h2>
                      <p className="text-sm text-gray-400">
                        Te han votado como Infiltrado. Sin embargo, tienes un último plan de escape. Adivina cuál era la palabra secreta correcta:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 w-full">
                      {gameState.guessOptions.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => submitImpostorGuess(opt)}
                          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-black font-black py-4 rounded-2xl text-base uppercase transition-all shadow-lg active:scale-95 hover:scale-[1.01]"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full border-4 border-t-red-500 border-red-500/20 animate-spin" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Último Intento de Escape</h3>
                      <p className="text-sm text-gray-400 max-w-sm mt-2">
                        Acusaste con éxito al Infiltrado (<strong className="text-red-400">{gameState.accusedName}</strong>).
                        Si falla al adivinar la palabra secreta, ustedes ganan.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ─── RESULTS VIEW ─── */}
            {gameState.phase === 'results' && (
              <div className="space-y-8 flex-1 flex flex-col justify-between">
                
                {/* Banner de victoria */}
                <div className="text-center space-y-4">
                  {gameState.winnerTeam === 'innocents' ? (
                    <div className="space-y-2">
                      <span className="text-7xl block animate-bounce" style={{ filter: 'drop-shadow(0 0 30px rgba(34,197,94,0.4))' }}>🏆🎉</span>
                      <h2 className="text-3xl font-black text-green-400 uppercase tracking-widest">
                        ¡Victoria de los Inocentes!
                      </h2>
                      <p className="text-gray-400 text-sm max-w-sm mx-auto">
                        Lograron identificar al infiltrado y éste no pudo descifrar la palabra secreta.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-7xl block animate-bounce" style={{ filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.4))' }}>😈👑</span>
                      <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest">
                        ¡Victoria del Infiltrado!
                      </h2>
                      <p className="text-gray-400 text-sm max-w-sm mx-auto">
                        El infiltrado logró camuflarse exitosamente o adivinó el secreto.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tarjetas resumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Palabra Secreta</span>
                    <div className="text-xl font-black text-green-400 uppercase tracking-wider">
                      {gameState.secretWord}
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Infiltrado de la ronda</span>
                    <div className="text-xl font-black text-red-400">
                      {gameState.players.find(p => p.role === 'impostor')?.name || 'Desconocido'}
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl border border-white/10 p-5 space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Historial y Votos de la Partida
                  </h4>

                  <div className="space-y-2">
                    {gameState.players.map((p, idx) => {
                      const isImpostor = p.role === 'impostor';
                      const accused = gameState.accusedSocketId === p.socketId;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isImpostor 
                              ? 'bg-red-500/10 border-red-500/30' 
                              : 'bg-white/5 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center border border-white/10">
                              <span className="text-xs font-bold">{p.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{p.name}</div>
                              <div className="text-[10px] text-gray-500">
                                {isImpostor ? 'Rol: Infiltrado' : 'Rol: Inocente'} {accused && '(Acusado)'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-gray-500 font-bold block">Pista dada</span>
                            <span className="text-sm font-black text-amber-400 uppercase">{p.clue || 'Ninguna'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* COLUMNA LATERAL (ROSTER DE JUGADORES Y ESTADO DE RED) */}
        <div className="space-y-6">
          
          {/* TARJETA DE ROL SECRETOS (SOLO VISIBLE CUANDO EMPIEZA) */}
          {gameState.phase !== 'lobby' && (
            <div className="bg-[#0b0b18]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              
              <div className="text-center space-y-4">
                <span className="text-4xl block">📦</span>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Tu Rol en la Partida</h3>
                <p className="text-xs text-gray-400">
                  Mantén el secreto oculto de tus compañeros sentados a tu lado.
                </p>

                <div className="relative pt-2">
                  <button
                    onMouseDown={() => setShowRole(true)}
                    onMouseUp={() => setShowRole(false)}
                    onTouchStart={() => setShowRole(true)}
                    onTouchEnd={() => setShowRole(false)}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-colors select-none"
                  >
                    👁️ REVELAR MI ROL
                  </button>

                  {showRole && (
                    <div className="absolute inset-0 bg-[#0f0f2b] border-2 border-cyan-500 rounded-2xl flex flex-col items-center justify-center p-4 animate-scale-up">
                      {gameState.myRole === 'impostor' ? (
                        <div className="text-center">
                          <span className="text-3xl block mb-2">🕵️‍♂️</span>
                          <span className="text-lg font-black text-red-500 uppercase tracking-widest block">INFILTRADO</span>
                          <p className="text-[10px] text-gray-400 mt-1">Mézclate con pistas genéricas.</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-3xl block mb-2">🍏</span>
                          <span className="text-lg font-black text-green-400 uppercase tracking-widest block">INOCENTE</span>
                          <p className="text-[10px] text-gray-400 mt-1">Palabra: <strong className="text-white uppercase text-xs">{gameState.secretWord}</strong></p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LISTA DE JUGADORES (ROSTER DE CONEXIÓN) */}
          <div className="bg-[#0b0b18]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                Lista de Roster
              </h3>
              <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white font-bold">
                {gameState.players.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {gameState.players.map((p, i) => {
                const isCurrent = gameState.phase === 'clues' && p.socketId === currentTurnSocketId;
                const isMe = p.socketId === socketRef.current?.id;
                
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarColor(p.name)} flex items-center justify-center border border-white/20 text-white font-black text-xs`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-200">
                          {p.name} {isMe && <span className="text-gray-500">(Tú)</span>}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {isCurrent ? 'Transmitiendo pista...' : p.voted ? 'Votó sospechoso' : 'Listo'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.clue && (
                        <span className="text-[10px] bg-white/10 text-white font-black px-2 py-0.5 rounded border border-white/5">
                          Pista
                        </span>
                      )}
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
