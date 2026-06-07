import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

// Minigames
import GuessTheCharacter from './minigames/GuessTheCharacter';
import RpsArena from './minigames/RpsArena';
import ClubClicker from './minigames/ClubClicker';
import DinoRun from './minigames/DinoRun';
import SimonSays from './minigames/SimonSays';
import PixelCanvas from './minigames/PixelCanvas';

const GAMES = [
  { id: 'guess',   icon: '🦇', label: 'Personaje Misterioso', color: 'from-violet-500 to-purple-700' },
  { id: 'rps',     icon: '⚔️', label: 'Piedra Papel Tijera',  color: 'from-orange-500 to-red-600' },
  { id: 'clicker', icon: '💎', label: 'Club Clicker',         color: 'from-cyan-400 to-blue-600' },
  { id: 'dino',    icon: '🦖', label: 'Dino Run',             color: 'from-green-400 to-emerald-600' },
  { id: 'simon',   icon: '🎯', label: 'Simón Dice',           color: 'from-yellow-400 to-orange-500' },
  { id: 'canvas',  icon: '🎨', label: 'Lienzo del Club',      color: 'from-pink-500 to-rose-600' },
];

export default function WaitingRoom() {
  const { user } = useStore();
  const isAdmin = user?.role === 'admin';
  
  const [roomState, setRoomState] = useState({ isOpen: false, players: [], activeGame: null, canvasCooldownEnabled: true });
  const [clickRanking, setClickRanking] = useState([]);
  const [dinoRecord, setDinoRecord] = useState(null);
  const [simonRecord, setSimonRecord] = useState(null);
  const [guessState, setGuessState] = useState(null);
  const [canvasTopic, setCanvasTopic] = useState('...');
  
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket(user?.role);
    socketRef.current = socket;

    socket.emit('wr:join');

    socket.on('wr:init', (data) => {
      setRoomState({ isOpen: data.isOpen, players: data.players, activeGame: data.activeGame, canvasCooldownEnabled: data.canvasCooldownEnabled !== false });
      setClickRanking(data.clickRanking);
      setDinoRecord(data.dinoRecord);
      setSimonRecord(data.simonRecord);
      setGuessState(data.guess);
      setCanvasTopic(data.canvasTopic || '...');
    });

    socket.on('wr:room-state', (state) => {
      setRoomState(prev => ({ ...prev, ...state }));
    });

    socket.on('wr:click-ranking', (ranking) => {
      setClickRanking(ranking);
    });

    socket.on('wr:dino-record', (rec) => setDinoRecord(rec));
    socket.on('wr:simon-record', (rec) => setSimonRecord(rec));

    socket.on('wr:new-character', (charData) => {
      setGuessState({
        imageUrl: charData.imageUrl,
        blurPx: charData.blurPx,
        solved: false,
        winners: guessState?.winners || [],
        hint: charData.hint
      });
    });

    socket.on('wr:character-hint', (data) => {
      setGuessState(prev => prev ? { ...prev, blurPx: data.blurPx, hint: data.hint } : null);
    });

    socket.on('wr:canvas-full', (data) => {
      setCanvasTopic(data.topic);
    });

    socket.on('wr:guess-correct', (data) => {
      setGuessState(prev => prev ? {
        ...prev,
        solved: true,
        blurPx: 0,
        winners: data.winners,
        hint: `¡Adivinado por ${data.winner}!`
      } : null);
    });

    return () => {
      socket.emit('wr:leave');
      socket.off('wr:init');
      socket.off('wr:room-state');
      socket.off('wr:click-ranking');
      socket.off('wr:dino-record');
      socket.off('wr:simon-record');
      socket.off('wr:new-character');
      socket.off('wr:character-hint');
      socket.off('wr:guess-correct');
    };
  }, [user]);

  // Admin Controls
  const toggleRoom = () => socketRef.current?.emit('wr:admin-toggle');
  const setGame = (gameId) => socketRef.current?.emit('wr:admin-set-game', gameId);
  const nextCharacter = () => socketRef.current?.emit('wr:admin-new-character');
  const resetCanvas = () => socketRef.current?.emit('wr:admin-canvas-new');
  const toggleCanvasCooldown = () => socketRef.current?.emit('wr:admin-toggle-canvas-cooldown');

  // Si no está abierta y es alumno
  if (!roomState.isOpen && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <span className="text-8xl mb-4" style={{ filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.4))' }}>🕹️</span>
        <h2 className="text-2xl font-black text-white">Sala de Espera Cercada</h2>
        <p className="text-gray-500 mb-8">El administrador abrirá la sala pronto. ¡Prepárate!</p>
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-surface-border animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-surface-border animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-surface-border animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  // Active game mapping
  const activeGameObj = GAMES.find(g => g.id === roomState.activeGame) || GAMES[0];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      
      {/* ─── Admin Bar ──────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-[#0b0b18] border border-brand/30 p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-brand-light uppercase tracking-widest">Admin Control</span>
              <span className="text-sm font-bold text-gray-300">Sala de Espera</span>
            </div>
            <button
              onClick={toggleRoom}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                roomState.isOpen ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
              }`}
            >
              {roomState.isOpen ? 'CERRAR SALA' : 'ABRIR SALA'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end w-full pb-2 sm:pb-0">
            {GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => setGame(g.id)}
                className={`px-3 py-2 border rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                  roomState.activeGame === g.id
                    ? 'bg-brand text-white border-brand scale-105 shadow-lg'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                }`}
              >
                <span>{g.icon}</span>
                <span className="text-xs font-bold">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Main Arcade Board ──────────────────────────────────────────────── */}
      <div className="bg-[#080812] border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Decoración superior tipo Arcade */}
        <div className="h-2 w-full bg-gradient-to-r from-violet-600 via-cyan-400 to-emerald-500" />
        
        {/* Selector de Juego (Visible para alumnos si el admin no ha forzado uno, o solo info) */}
        {!isAdmin && (
          <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-3">
              <span className="text-2xl">{activeGameObj.icon}</span>
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${activeGameObj.color}`}>
                {activeGameObj.label}
              </span>
            </h2>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-gray-400">{roomState.players.length} online</span>
            </div>
          </div>
        )}

        {/* Administrador: Info del juego activo si lo cambió */}
        {isAdmin && (
          <div className="bg-white/5 border-b border-white/5 px-6 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-400">
              Viendo: <strong className="text-white">{activeGameObj.label} {activeGameObj.icon}</strong>
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-gray-500">{roomState.players.length} conectados</span>
              {roomState.activeGame === 'guess' && (
                <button onClick={nextCharacter} className="text-xs px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
                  🔄 Próximo Personaje
                </button>
              )}
              {roomState.activeGame === 'canvas' && (
                <>
                  <button onClick={toggleCanvasCooldown} className={`text-xs px-3 py-1 text-white rounded-lg transition-colors ${roomState.canvasCooldownEnabled ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
                    {roomState.canvasCooldownEnabled ? '⏳ Cooldown ON' : '⚡ Cooldown OFF'}
                  </button>
                  <button onClick={resetCanvas} className="text-xs px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors">
                    💥 Cambiar Tema
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Content del Minijuego Activo ───────────────────────────────── */}
        <div className="min-h-[400px]">
          {roomState.activeGame === 'guess' || !roomState.activeGame ? (
            <GuessTheCharacter socket={socketRef.current} guessState={guessState} />
          ) : roomState.activeGame === 'rps' ? (
            <RpsArena socket={socketRef.current} players={roomState.players} myId={socketRef.current?.id} />
          ) : roomState.activeGame === 'clicker' ? (
            <ClubClicker socket={socketRef.current} ranking={clickRanking} />
          ) : roomState.activeGame === 'dino' ? (
            <DinoRun socket={socketRef.current} record={dinoRecord} />
          ) : roomState.activeGame === 'simon' ? (
            <SimonSays socket={socketRef.current} record={simonRecord} />
          ) : roomState.activeGame === 'canvas' ? (
            <PixelCanvas socket={socketRef.current} initialTopic={canvasTopic} cooldownEnabled={roomState.canvasCooldownEnabled} isAdmin={isAdmin} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
