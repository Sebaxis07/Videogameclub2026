import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';
import InfiltradoArena from './InfiltradoArena';

const CATEGORIES = [
  "Personajes Legendarios",
  "Juegos Populares",
  "Consolas & Hardware",
  "Objetos y Power-Ups",
  "Películas de Videojuegos"
];

const STEPS = [
  { id: 'lobby', label: 'Lobby', icon: '🛋️' },
  { id: 'clues', label: 'Pistas', icon: '✍️' },
  { id: 'voting', label: 'Votación', icon: '🗳️' },
  { id: 'guess_word', label: 'Escape', icon: '🧠' },
  { id: 'results', label: 'Resultados', icon: '🏆' }
];

export default function AdminInfiltrado() {
  const { user } = useStore();
  const [viewMode, setViewMode] = useState('admin'); // 'admin' | 'player'
  const [gameState, setGameState] = useState({
    phase: 'lobby',
    players: [],
    category: '',
    secretWord: '',
    turnOrder: [],
    currentTurnIndex: 0,
    impostorSocketId: null,
    accusedSocketId: null,
    accusedName: '',
    winnerTeam: null,
    accusedIsImpostor: false,
    guessOptions: []
  });

  const [selectedCat, setSelectedCat] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.role);
    socketRef.current = socket;

    socket.emit('infil:join');

    socket.on('infil:admin-state', (state) => {
      setGameState(state);
      setErrorMsg('');
    });

    socket.on('infil:error', ({ msg }) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    });

    return () => {
      socket.emit('infil:leave');
      socket.off('infil:admin-state');
      socket.off('infil:error');
    };
  }, [user]);

  const addBots = () => {
    socketRef.current?.emit('infil:admin-add-bots');
  };

  const joinAsPlayer = () => {
    socketRef.current?.emit('infil:admin-join-game');
  };

  const leaveAsPlayer = () => {
    socketRef.current?.emit('infil:admin-leave-game');
  };

  const startGame = () => {
    socketRef.current?.emit('infil:admin-start', { category: selectedCat || null });
  };

  const skipTurn = () => {
    socketRef.current?.emit('infil:admin-skip-turn');
  };

  const forceVoting = () => {
    socketRef.current?.emit('infil:admin-force-voting');
  };

  const resetGame = () => {
    socketRef.current?.emit('infil:admin-reset');
  };

  const activePlayersCount = gameState.players.length;
  const canStart = activePlayersCount >= 3;
  const currentTurnSocketId = gameState.turnOrder[gameState.currentTurnIndex];
  const currentTurnPlayer = gameState.players.find(p => p.socketId === currentTurnSocketId);
  const isAdminInRoster = gameState.players.some(p => p.socketId === socketRef.current?.id);

  // Obtener porcentaje de votos para las barras de progreso
  const getVotePercentage = (count) => {
    const totalVotes = gameState.players.reduce((sum, p) => sum + (p.voted ? 1 : 0), 0);
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  if (viewMode === 'player') {
    return (
      <div className="space-y-6">
        {/* Toggle Bar */}
        <div className="flex justify-center bg-black/40 border border-white/5 rounded-2xl p-1.5 max-w-md mx-auto">
          <button
            onClick={() => setViewMode('admin')}
            className="flex-1 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-all text-gray-400 hover:text-white"
          >
            ⚙️ Control Moderador
          </button>
          <button
            onClick={() => setViewMode('player')}
            className="flex-1 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-all bg-cyan-500 text-black shadow-md"
          >
            🎒 Mi Pantalla de Juego
          </button>
        </div>

        <InfiltradoArena />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8 select-none">
      
      {/* ─── VISTA INTERMEDIA CONMUTADOR JUGADOR ─── */}
      {isAdminInRoster && (
        <div className="flex justify-center bg-black/40 border border-white/5 rounded-2xl p-1.5 max-w-md mx-auto">
          <button
            onClick={() => setViewMode('admin')}
            className={`flex-1 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-all ${
              viewMode === 'admin'
                ? 'bg-brand text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ Control Moderador
          </button>
          <button
            onClick={() => setViewMode('player')}
            className={`flex-1 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-all ${
              viewMode === 'player'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎒 Mi Pantalla de Juego
          </button>
        </div>
      )}
      
      {/* ─── ENCABEZADO Y TIMELINE DEL CONTROLADOR ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-[#0f0f22]/60 border border-brand/20 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="text-center lg:text-left space-y-1">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <span className="text-3xl">👑</span>
            <h1 className="text-3xl font-black tracking-wider uppercase bg-gradient-to-r from-violet-500 via-brand-light to-cyan-400 bg-clip-text text-transparent">
              PANEL INFILTRADO
            </h1>
          </div>
          <p className="text-gray-400 text-sm font-medium">Control de flujos y estado en tiempo real.</p>
        </div>

        {/* Stepper para moderador */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-2">
          {STEPS.map((s, idx) => {
            const isActive = s.id === gameState.phase;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand/20 to-cyan-500/20 border-brand text-white shadow-[0_0_15px_rgba(124,58,237,0.2)] font-black'
                      : 'bg-white/5 border-white/5 text-gray-500'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs uppercase tracking-wider hidden sm:block">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <span className="text-lg font-bold text-white/5">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border-l-4 border-red-500 text-red-300 p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-lg">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* ─── CUADRÍCULA DE CONTROL ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL DE ACCIÓN CENTRAL */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b0b18]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-2xl min-h-[400px] flex flex-col justify-between overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent pointer-events-none" />

            {/* ─── LOBBY CONTROL ─── */}
            {gameState.phase === 'lobby' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Configurar Partida</h2>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Seleccionar Categoría del Juego
                    </label>
                    <select
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="bg-black border-2 border-white/10 focus:border-brand rounded-2xl px-4 py-4 text-white outline-none font-bold text-sm w-full transition-colors"
                    >
                      <option value="">🎯 Aleatoria (Cualquiera)</option>
                      {CATEGORIES.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {!canStart && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl text-xs font-semibold">
                      Se requiere un mínimo de 3 jugadores conectados para habilitar el botón de inicio. Puedes simular bots para probar.
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={addBots}
                      className="flex-1 py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black rounded-2xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 hover:scale-[1.01]"
                    >
                      🤖 CARGAR BOTS DE PRUEBA
                    </button>

                    {isAdminInRoster ? (
                      <button
                        onClick={leaveAsPlayer}
                        className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black rounded-2xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 hover:scale-[1.01]"
                      >
                        ❌ SALIR DE LA PARTIDA
                      </button>
                    ) : (
                      <button
                        onClick={joinAsPlayer}
                        className="flex-1 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-black rounded-2xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 hover:scale-[1.01]"
                      >
                        🎮 UNIRSE COMO JUGADOR
                      </button>
                    )}

                    <button
                      onClick={startGame}
                      disabled={!canStart}
                      className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
                        canStart
                          ? 'bg-brand hover:bg-brand-light text-white hover:scale-[1.01]'
                          : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      🚀 INICIAR PARTIDA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CLUES PHASE CONTROL ─── */}
            {gameState.phase === 'clues' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Parámetros Secretos de Servidor</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-400 block">Categoría</span>
                      <strong className="text-white uppercase text-sm">{gameState.category}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Palabra Secreta</span>
                      <strong className="text-green-400 uppercase text-sm tracking-wide">{gameState.secretWord}</strong>
                    </div>
                  </div>
                </div>

                <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                  <span className="text-xs font-black text-brand-light bg-brand/10 border border-brand/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    Transmisión en Proceso
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Escribiendo palabra clave</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Esperando que <strong className="text-amber-400">{currentTurnPlayer?.name || 'Jugador'}</strong> envíe su palabra.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={skipTurn}
                    className="flex-1 py-3.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black hover:border-transparent rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    ⏳ SALTAR TURNO ACTIVO
                  </button>
                  <button
                    onClick={resetGame}
                    className="py-3.5 px-6 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white hover:border-transparent rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    Terminar Partida
                  </button>
                </div>

              </div>
            )}

            {/* ─── VOTING PHASE CONTROL ─── */}
            {gameState.phase === 'voting' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="text-center py-6 space-y-3">
                  <span className="text-xs font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full tracking-widest uppercase">
                    Votaciones Abiertas
                  </span>
                  <h3 className="text-xl font-bold text-white">Escrutinio General</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Los jugadores están emitiendo sus votos. Puedes esperar a que termine el recuento automático o forzar el cierre inmediatamente.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={forceVoting}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 hover:scale-[1.01]"
                  >
                    🗳️ CERRAR VOTACIONES Y MOSTRAR RESULTADOS
                  </button>
                  <button
                    onClick={resetGame}
                    className="w-full py-3 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white hover:border-transparent rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    Abortar Partida
                  </button>
                </div>
              </div>
            )}

            {/* ─── GUESS WORD CONTROL ─── */}
            {gameState.phase === 'guess_word' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between text-center py-6">
                <div className="space-y-4">
                  <span className="text-5xl block animate-bounce">🔍</span>
                  <h3 className="text-xl font-bold text-white">Último Plan de Escape</h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    El infiltrado ha sido identificado. Ahora está visualizando las 5 opciones para intentar adivinar el secreto.
                  </p>
                </div>

                <button
                  onClick={resetGame}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  💥 REINICIAR Y VOLVER AL LOBBY
                </button>
              </div>
            )}

            {/* ─── RESULTS CONTROL ─── */}
            {gameState.phase === 'results' && (
              <div className="space-y-8 flex-1 flex flex-col justify-between text-center py-4">
                
                {/* Ganador */}
                <div className="space-y-2">
                  <span className="text-6xl block animate-bounce">🏆</span>
                  <h2 className={`text-3xl font-black uppercase tracking-wider ${
                    gameState.winnerTeam === 'innocents' ? 'text-green-400' : 'text-red-500'
                  }`}>
                    {gameState.winnerTeam === 'innocents' ? '¡Ganan los Inocentes!' : '¡Gana el Infiltrado!'}
                  </h2>
                  <p className="text-xs text-gray-400">La sesión concluyó de forma limpia en el servidor.</p>
                </div>

                {/* Botón de jugar otra ronda */}
                <button
                  onClick={resetGame}
                  className="w-full py-4 bg-gradient-to-r from-brand to-cyan-500 hover:from-brand-light hover:to-cyan-400 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-brand/20 transition-all hover:scale-[1.01] active:scale-95"
                >
                  🔄 EMPEZAR NUEVA PARTIDA (RESET)
                </button>
              </div>
            )}

          </div>
        </div>

        {/* COLUMNA LATERAL - ESTADÍSTICAS Y PANEL DE ESTUDIANTES */}
        <div className="space-y-6">
          
          {/* MONITOR SECRETO (MOSTRAR PALABRA Y DE VELAR AL INFILTRADO) */}
          {gameState.phase !== 'lobby' && (
            <div className="bg-[#0b0b18]/80 border border-brand/20 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Monitoreo de Roles
              </h3>

              <div className="space-y-3">
                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Palabra Secreta:</span>
                  <strong className="text-green-400 uppercase font-black tracking-wider">{gameState.secretWord}</strong>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Infiltrado:</span>
                  <strong className="text-red-400 uppercase font-black">
                    {gameState.players.find(p => p.socketId === gameState.impostorSocketId)?.name || 'N/A'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO DE LOS JUGADORES */}
          <div className="bg-[#0b0b18]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Roster y Pistas dadas
              </h3>
              <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-bold">
                {activePlayersCount}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {gameState.players.map((p, idx) => {
                const isImpostor = p.socketId === gameState.impostorSocketId;
                const percent = getVotePercentage(p.voteCount);

                return (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-200 truncate">{p.name}</span>
                        {gameState.phase !== 'lobby' && (
                          <span className={`text-[8px] font-black uppercase px-1 rounded ${
                            isImpostor ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {isImpostor ? 'Infil' : 'Ino'}
                          </span>
                        )}
                      </div>
                      
                      <span className="text-[10px] text-gray-400">
                        {p.clue ? `"${p.clue}"` : 'Esperando...'}
                      </span>
                    </div>

                    {/* Mostrar barra de votos si estamos en fase de votación o posterior */}
                    {['voting', 'reveal_accused', 'guess_word', 'results'].includes(gameState.phase) && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-gray-500">
                          <span>Votos: {p.voteCount}</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isImpostor ? 'bg-red-500' : 'bg-brand'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}
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
