/**
 * TriviaArena.jsx
 * =====================================
 * Vista del Estudiante para la Arena de Trivia en Tiempo Real.
 *
 * Fases: idle → lobby → question → reviewing → finished
 * Comodines: 50/50 (local), Flashbang (broadcast), Doble o Nada (server-side)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '../api/socket';
import useStore from '../store/useStore';
import TriviaRulesModal from './TriviaRulesModal';
import TriviaCourtroom from './TriviaCourtroom';

const T_TOTAL = 15; // segundos para el timer visual

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

/** Overlay de Flashbang */
function FlashbangOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999 }}
      className="pointer-events-none"
    />
  );
}

/** Botón de comodín */
function WildcardButton({ id, label, icon, available, active, onClick, description }) {
  return (
    <button
      onClick={() => onClick(id)}
      disabled={!available}
      className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
        active
          ? 'border-amber-400 bg-amber-400/20 text-amber-300 scale-105'
          : available
            ? 'border-surface-border bg-surface text-gray-300 hover:border-brand/50 hover:bg-brand/5 hover:text-white'
            : 'border-surface-border/30 bg-surface/30 text-gray-700 cursor-not-allowed opacity-40'
      }`}
      title={description}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/** Opción de respuesta */
function AnswerOption({ index, text, disabled, selected, hidden, correct, revealed, onClick }) {
  if (hidden) return <div className="rounded-xl border border-dashed border-surface-border/30 bg-surface/20 opacity-0 pointer-events-none min-h-[56px]" />;

  const letters = ['A', 'B', 'C', 'D'];
  let classes = 'flex items-center gap-3 w-full p-4 rounded-xl border text-left transition-all text-sm font-medium ';

  if (revealed) {
    classes += correct
      ? 'border-green-500 bg-green-500/10 text-green-300'
      : (selected ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-surface-border/30 bg-surface/30 text-gray-600');
  } else if (selected) {
    classes += 'border-brand bg-brand/20 text-white scale-[1.01]';
  } else if (disabled) {
    classes += 'border-surface-border/50 bg-surface/50 text-gray-500 cursor-not-allowed';
  } else {
    classes += 'border-surface-border bg-surface text-gray-300 hover:border-brand/50 hover:bg-brand/5 hover:text-white cursor-pointer';
  }

  return (
    <button onClick={() => !disabled && onClick(index)} className={classes} disabled={disabled}>
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border ${
        revealed && correct ? 'border-green-500 bg-green-500/20 text-green-300'
        : revealed && selected ? 'border-red-500 bg-red-500/20 text-red-300'
        : selected ? 'border-brand bg-brand/30 text-brand-light' : 'border-surface-border bg-surface text-gray-500'
      }`}>
        {letters[index]}
      </span>
      {text}
    </button>
  );
}

/** Timer bar */
function TimerBar({ secondsLeft }) {
  const pct = (secondsLeft / T_TOTAL) * 100;
  const color = secondsLeft > 8 ? 'from-green-500 to-emerald-400' : secondsLeft > 4 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-rose-400';
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
        <span>Tiempo restante</span>
        <span className={`font-black text-sm ${secondsLeft <= 4 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{secondsLeft}s</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-1000 ease-linear`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────

export default function TriviaArena() {
  const { user } = useStore();

  // ── Socket & game state ────────────────────────────────────────────────────
  const [socket, setSocket]               = useState(null);
  const [gameStatus, setGameStatus]       = useState('idle'); // idle|lobby|question|reviewing|finished
  const [playerCount, setPlayerCount]     = useState(0);
  const [lobbyPlayers, setLobbyPlayers]   = useState([]);
  const [factionInfo, setFactionInfo]     = useState(null);  // { factionId, isLoner }
  const [ranking, setRanking]             = useState([]);
  const [totalScore, setTotalScore]       = useState(0);
  const [joined, setJoined]               = useState(false);

  // ── Question state ─────────────────────────────────────────────────────────
  const [question, setQuestion]           = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [hiddenIndices, setHiddenIndices] = useState([]);
  const [hasAnswered, setHasAnswered]     = useState(false);
  const [result, setResult]               = useState(null); // { correct, pointsEarned, correctIndex, ... }

  // ── Wildcards ──────────────────────────────────────────────────────────────
  const [wildcards, setWildcards]         = useState([]);
  const [activeDoble, setActiveDoble]     = useState(false); // Doble o Nada activado

  // ── Timer ──────────────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft]     = useState(T_TOTAL);
  const timerRef                          = useRef(null);

  // ── Flashbang ──────────────────────────────────────────────────────────────
  const [flashbangVisible, setFlashbangVisible] = useState(false);

  // ── Final ranking ──────────────────────────────────────────────────────────
  const [finalRanking, setFinalRanking]   = useState([]);

  // ── Rules & Screen Capture ────────────────────────────────────────────────
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [screenStream, setScreenStream]         = useState(null);
  const videoRef                                 = useRef(null);
  const canvasRef                                = useRef(null);

  // ── Sanctions ──────────────────────────────────────────────────────────────
  const [isDisqualified, setIsDisqualified]     = useState(false);

  // ── Anti-Cheat ─────────────────────────────────────────────────────────────
  const [interrupted, setInterrupted]     = useState(false);
  const [interruptedBy, setInterruptedBy] = useState(null); 

  // ── Courtroom ──────────────────────────────────────────────────────────────
  const [courtSession, setCourtSession]   = useState({ active: false });

  // ── Live Monitor (Admin Eyes Only) ──────────────────────────────────────────
  const lastUpdateRef                      = useRef(0);
  const mousePosRef                        = useRef({ x: 0, y: 0 });

  // ──────────────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setSecondsLeft(T_TOTAL);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket(user);
    setSocket(s);

    s.on('trivia:joined', (data) => {
      setJoined(true);
      setWildcards(data.wildcards || []);
      setFactionInfo({ factionId: data.factionId, isLoner: data.isLoner });
      setGameStatus(data.status || 'lobby');
      setPlayerCount(data.playerCount || 0);
      setIsDisqualified(data.disqualified || false);
    });

    s.on('trivia:playerCount', (count) => setPlayerCount(count));
    s.on('trivia:lobbyPlayers', (players) => setLobbyPlayers(players));

    s.on('trivia:gameStarted', () => {
      setGameStatus('lobby');
      setQuestion(null);
      setResult(null);
      setHasAnswered(false);
      setSelectedIndex(null);
      setHiddenIndices([]);
      setActiveDoble(false);
    });

    s.on('question:new', (q) => {
      setQuestion(q);
      setGameStatus('question');
      setHasAnswered(false);
      setSelectedIndex(null);
      setHiddenIndices([]);
      setResult(null);
      setActiveDoble(false);
      startTimer();
    });

    s.on('question:result', (res) => {
      stopTimer();
      setResult(res);
      setHasAnswered(true);
      setGameStatus('reviewing');
      setTotalScore(res.totalScore);
    });

    s.on('trivia:ranking', (r) => setRanking(r));

    s.on('trivia:playerStatus', (status) => {
      if (status.disqualified !== undefined) {
        setIsDisqualified(status.disqualified);
      }
    });

    s.on('trivia:finished', (finalRank) => {
      stopTimer();
      setGameStatus('finished');
      setFinalRanking(finalRank);
    });

    s.on('trivia:reset', () => {
      stopTimer();
      setGameStatus('idle');
      setQuestion(null);
      setResult(null);
      setHasAnswered(false);
      setSelectedIndex(null);
      setWildcards(['5050', 'flashbang', 'doublenada']);
      setActiveDoble(false);
      setTotalScore(0);
      setFinalRanking([]);
    });

    // ── Wildcards ────────────────────────────────────────────────────────
    s.on('wildcard:5050:result', ({ hideIndices }) => {
      setHiddenIndices(hideIndices);
    });

    s.on('wildcard:doublenada:activated', () => {
      setActiveDoble(true);
    });

    s.on('trivia:wildcardsUpdate', (newWildcards) => {
      setWildcards(newWildcards);
    });

    // ── Flashbang ────────────────────────────────────────────────────────
    s.on('wildcard:flashbang:effect', () => {
      setFlashbangVisible(true);
      setTimeout(() => setFlashbangVisible(false), 1500);
    });

    // ── Anti-Cheat ──────────────────────────────────────────────────────
    s.on('trivia:gameInterrupted', () => {
      setInterrupted(true);
      stopTimer();
    });

    s.on('trivia:resumed', () => {
      setInterrupted(false);
    });

    // ── Courtroom Events ─────────────────────────────────────────────────
    s.on('court:start', (session) => {
      setCourtSession(session);
      stopTimer();
    });

    s.on('court:update', (session) => setCourtSession(session));
    s.on('court:lawyerDesignated', (session) => setCourtSession(session));
    s.on('court:deliberating', (session) => setCourtSession(session));
    s.on('court:verdict', (session) => setCourtSession(session));
    s.on('court:closed', () => setCourtSession({ active: false }));

    return () => {
      stopTimer();
      s.off('trivia:joined');
      s.off('trivia:playerCount');
      s.off('trivia:lobbyPlayers');
      s.off('trivia:gameStarted');
      s.off('question:new');
      s.off('question:result');
      s.off('trivia:ranking');
      s.off('trivia:finished');
      s.off('trivia:reset');
      s.off('wildcard:5050:result');
      s.off('wildcard:doublenada:activated');
      s.off('trivia:wildcardsUpdate');
      s.off('wildcard:flashbang:effect');
      s.off('court:start');
      s.off('court:update');
      s.off('court:lawyerDesignated');
      s.off('court:deliberating');
      s.off('court:verdict');
      s.off('court:closed');
    };
  }, [user.rut, user.nombre, startTimer, stopTimer]);

  // ── Screen Snapshotter Engine ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !screenStream || !hasAcceptedRules || gameStatus === 'idle') return;

    // Conectar el stream al video oculto para poder capturar frames
    if (videoRef.current) {
      videoRef.current.srcObject = screenStream;
    }

    const captureInterval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Solo capturar si el video está listo
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Dibujar frame redimensionado (320x180 es suficiente para monitoreo)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Comprimir a WebP (muy ligero)
        const frameData = canvas.toDataURL('image/webp', 0.4);
        
        socket.emit('trivia:screenFrame', {
          rut: user.rut,
          nombre: user.nombre,
          frame: frameData
        });
      }
    }, 3000); // 1 frame cada 3 segundos es óptimo

    return () => clearInterval(captureInterval);
  }, [socket, screenStream, hasAcceptedRules, gameStatus, user.rut, user.nombre]);

  const handleAppeal = () => {
    socket?.emit('trivia:appeal', { rut: user.rut, nombre: user.nombre });
  };

  const handleAcceptRules = (stream) => {
    setScreenStream(stream);
    setHasAcceptedRules(true);
    
    // Unirse formalmente a la trivia SOLO después de aceptar reglas
    socket?.emit('trivia:join', { rut: user.rut, nombre: user.nombre });

    // Si el usuario deja de compartir pantalla manualmente (solo si existe el stream)
    if (stream) {
      stream.getVideoTracks()[0].onended = () => {
        setHasAcceptedRules(false);
        setScreenStream(null);
        // Opcional: desconectar al usuario o pedir reconexión
      };
    }
  };

  // ── Detection: visibilitychange ───────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Disparamos si la pestaña se oculta MIENTRAS hay una pregunta activa y el alumno no ha respondido.
      if (document.visibilityState === 'hidden' && gameStatus === 'question' && !hasAnswered && !interrupted) {
        socket?.emit('trivia:cheatAttempt', { rut: user.rut, nombre: user.nombre });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, gameStatus, hasAnswered, interrupted, user.rut, user.nombre]);

  // ── Tracking: Mouse & Live State ──────────────────────────────────────────
  useEffect(() => {
    if (!socket || gameStatus !== 'question' || interrupted) return;

    const interval = setInterval(() => {
      // Throttle: solo enviar si ha pasado suficiente tiempo
      socket.emit('trivia:liveUpdate', {
        rut: user.rut,
        nombre: user.nombre,
        mouse: mousePosRef.current,
        selectedIndex,
        hasAnswered,
        visibility: document.visibilityState
      });
    }, 1000); // Cada 1 segundo es suficiente para monitoreo visual fluido

    return () => clearInterval(interval);
  }, [socket, gameStatus, interrupted, selectedIndex, hasAnswered, user.rut, user.nombre]);

  const handleMouseMove = (e) => {
    if (gameStatus !== 'question' || interrupted) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mousePosRef.current = { x: Math.round(x), y: Math.round(y) };
  };

  // ──────────────────────────────────────────────────────────────────────────

  const handleAnswer = useCallback((index) => {
    if (!socket || hasAnswered || gameStatus !== 'question') return;
    setSelectedIndex(index);
    setHasAnswered(true);
    stopTimer();
    socket.emit('question:answer', {
      rut: user.rut,
      answerIndex: index,
      wildcardFlag: activeDoble ? 'doublenada' : null,
    });
  }, [socket, hasAnswered, gameStatus, stopTimer, user.rut, activeDoble]);

  const handleWildcard = useCallback((id) => {
    if (!socket || !wildcards.includes(id) || gameStatus !== 'question') return;
    if (id === '5050')     socket.emit('wildcard:5050',     { rut: user.rut });
    if (id === 'flashbang') socket.emit('wildcard:flashbang', { rut: user.rut });
    if (id === 'doublenada') socket.emit('wildcard:doublenada', { rut: user.rut });
  }, [socket, wildcards, gameStatus, user.rut]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDERS
  // ──────────────────────────────────────────────────────────────────────────

  // ── HELPER FOR RENDERING AVATARS ─────────────────────────────────────────
  const renderLobbyAvatars = () => {
    if (!lobbyPlayers || lobbyPlayers.length === 0) return null;
    return (
      <div className="mt-8 flex flex-col items-center animate-fade-in w-full max-w-2xl px-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 text-center">Estudiantes Conectados ({lobbyPlayers.length})</p>
        <div className="flex flex-wrap gap-4 justify-center">
          {lobbyPlayers.map((p, i) => (
            <div key={p.rut || i} className="flex flex-col items-center gap-1.5 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black border-2 shadow-lg
                ${p.rut === user.rut ? 'bg-brand text-white border-brand-light shadow-brand/20 scale-110' : 'bg-surface border-brand/30 text-brand-light'}`}>
                {p.nombre ? p.nombre.charAt(0).toUpperCase() : '?'}
              </div>
              <span className="text-[10px] text-gray-400 max-w-[60px] truncate text-center leading-tight">
                {p.nombre ? p.nombre.split(' ')[0] : 'Anon'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── DISQUALIFIED OVERLAY ───────────────────────────────────────────────
  if (isDisqualified) {
    return (
      <div className="fixed inset-0 z-[20000] bg-[#05050a] flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full bg-red-600/5 border border-red-600/20 rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl shadow-red-600/20">
          <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center mb-6 animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-10 h-10 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">Acción Disciplinaria</h2>
          <p className="text-red-400 font-bold text-xs uppercase tracking-widest mb-6">Descalificado de la Arena</p>
          
          <p className="text-gray-400 text-sm mb-10 leading-relaxed text-center">
            Tu participación ha sido revocada por el sistema. Si crees que esto es un error, puedes solicitar un **Juicio Supremo por IA**.
          </p>

          <button 
            onClick={handleAppeal}
            disabled={courtSession.active}
            className="w-full px-10 py-5 bg-brand hover:bg-brand-light text-white font-black rounded-2xl transition-all shadow-xl shadow-brand/20 uppercase tracking-widest text-xs border border-white/10"
          >
            {courtSession.active ? 'Tribunal en Sesión...' : '⚖️ Solicitar Apelación'}
          </button>

          <p className="mt-10 text-[10px] text-gray-700 font-bold uppercase tracking-widest leading-none">Inacap Videojuegos • Arena de Trivia</p>
        </div>
      </div>
    );
  }

  // ── COURTROOM OVERLAY (High Priority) ────────────────────────────────────
  if (courtSession.active) {
    return <TriviaCourtroom socket={socket} courtSession={courtSession} user={user} />;
  }

  // ── RULES MODAL (Gatekeeper) ─────────────────────────────────────────────
  if (!hasAcceptedRules) {
    return <TriviaRulesModal onAccept={handleAcceptRules} />;
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (!joined || gameStatus === 'idle') {
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] py-10 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#7c3aed15_0%,_transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-surface border-t-brand animate-spin" />
          <h2 className="text-2xl font-black text-white">Conectando a la Arena…</h2>
          <p className="text-gray-400 text-sm max-w-xs mb-4">
            El módulo de trivia está listo. El administrador iniciará la partida en breve.
          </p>
        </div>
        <div className="relative z-10 w-full">
          {renderLobbyAvatars()}
        </div>
      </div>
    );
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────
  if (gameStatus === 'lobby') {
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] py-10 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#7c3aed15_0%,_transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 text-brand-light">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-1">¡Bienvenido, {user.nombre?.split(' ')[0]}!</h2>
            <p className="text-gray-400 text-sm">La partida comenzará cuando el Admin envíe la primera pregunta.</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-center">
            <div className="bg-surface rounded-xl border border-surface-border p-3">
              <p className="text-sm font-black text-white">{factionInfo?.isLoner ? '⚡ Solitario' : `Dúo ${factionInfo?.factionId}`}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Tu Facción</p>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border p-3">
              <p className="text-xl font-black text-white">{lobbyPlayers.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Jugadores</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] text-center">Tus Comodines (Vista Previa)</p>
            <div className="flex gap-2 justify-center opacity-80 scale-95 pointer-events-none">
              <WildcardButton id="5050"     label="50/50"       icon="✂️" available description="Elimina 2 opciones incorrectas" onClick={() => {}} />
              <WildcardButton id="flashbang" label="Flashbang"  icon="💥" available description="Ciega las pantallas de los rivales" onClick={() => {}} />
              <WildcardButton id="doublenada" label="Doble/Nada" icon="🎲" available description="Puntos ×2 si aciertas, −500 si fallas" onClick={() => {}} />
            </div>
          </div>

          <div className="w-full h-0.5 bg-surface-border animate-pulse rounded mt-2" />
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 animate-pulse mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            Esperando al administrador…
          </p>
        </div>
        <div className="relative z-10 w-full mt-4">
          {renderLobbyAvatars()}
        </div>
      </div>
    );
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────
  if (gameStatus === 'finished') {
    const myRankEntry = finalRanking.find(f => f.members?.some(m => m.rut === user.rut));
    const myRank = myRankEntry ? finalRanking.indexOf(myRankEntry) : -1;
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <div className="card-glow flex flex-col items-center min-h-[500px] p-6 animate-fade-in gap-5">
        <div className="text-center">
          <p className="text-brand-light text-xs uppercase tracking-widest font-bold mb-2">Trivia Finalizada</p>
          <h2 className="text-3xl font-black text-white">¡Resultados Finales!</h2>
          <p className="text-gray-400 text-sm mt-1">Tu puntaje: <span className="text-white font-black">{totalScore.toLocaleString()} pts</span></p>
        </div>

        {myRank >= 0 && (
          <div className={`w-full p-4 rounded-2xl border text-center ${
            myRank === 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-surface-border bg-surface'
          }`}>
            <p className="text-4xl mb-1">{medals[myRank] || `#${myRank + 1}`}</p>
            <p className="text-white font-bold">Tu facción quedó en el puesto {myRank + 1}</p>
            {myRankEntry?.isLoner && <p className="text-xs text-amber-400 mt-1">⚡ Tus puntos se multiplicaron ×2 por ser Lobo Solitario</p>}
          </div>
        )}

        <div className="w-full">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Ranking Final de Facciones</p>
          <div className="flex flex-col gap-2">
            {finalRanking.map((f, i) => (
              <div key={f.factionId} className={`flex items-center gap-3 p-3 rounded-xl border ${
                f.members.some(m => m.rut === user.rut) ? 'border-brand/40 bg-brand/5' : 'border-surface-border bg-surface'
              }`}>
                <span className="text-lg w-7 text-center">{medals[i] || `#${i + 1}`}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{f.isLoner ? '⚡ Lobo Solitario' : `Dúo ${f.factionId}`}</p>
                  <p className="text-[10px] text-gray-400">{f.members.map(m => m.nombre).join(' + ')}</p>
                </div>
                <span className="font-black text-brand-light">{f.factionScore.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── QUESTION / REVIEWING ──────────────────────────────────────────────────
  if (gameStatus === 'question' || gameStatus === 'reviewing') {
    return (
      <>
        <FlashbangOverlay visible={flashbangVisible} />

        {/* ── Interruption Overlay ─────────────────────────────────────── */}
        {interrupted && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="max-w-md w-full bg-surface-card border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-red-500/10">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-10 h-10 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-4">¡Juego Detenido!</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-1">
                Un alumno ha salido de la pestaña o ha minimizado la aplicación.
              </p>
              <p className="text-red-400/80 text-[11px] uppercase tracking-wider font-bold mb-6">
                Intento de trampa detectado
              </p>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500 italic">
                  Esperando a que el profesor reanude la partida...
                </p>
                <div className="w-full h-1 bg-surface-border rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-1/3 animate-[shimmer_2s_infinite_linear]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content Container ───────────────────────────────────── */}
        <div 
          onMouseMove={handleMouseMove}
          className={`flex flex-col gap-4 animate-fade-in ${interrupted ? 'blur-sm grayscale-[0.5] pointer-events-none' : ''}`}
        >

          {/* ── Flashbang blocker overlay (visible while loading) */}

          {/* ── Header: progress + timer ─────────────────────────────────── */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Pregunta</span>
                <span className="text-white font-black">{question?.questionNumber}/{question?.totalQuestions}</span>
              </div>
              <div className="flex gap-2">
                {question?.categoria && (
                  <span className="badge bg-brand/10 text-brand-light text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {question.categoria}
                  </span>
                )}
                {question?.tipo_dificultad && (
                  <span className={`badge text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    question.tipo_dificultad === 'Competitiva'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-surface-border text-gray-400'
                  }`}>
                    {question.tipo_dificultad}
                  </span>
                )}
              </div>
            </div>
            {!hasAnswered && <TimerBar secondsLeft={secondsLeft} />}
          </div>

          {/* ── Question text ─────────────────────────────────────────────── */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <p className="text-white font-bold text-base leading-snug">{question?.pregunta}</p>
          </div>

          {/* ── Wildcards ─────────────────────────────────────────────────── */}
          {!hasAnswered && (
            <div className="flex gap-2 justify-center flex-wrap">
              <WildcardButton
                id="5050"
                label="50/50"
                icon="✂️"
                available={wildcards.includes('5050')}
                onClick={handleWildcard}
                description="Elimina 2 respuestas incorrectas"
              />
              <WildcardButton
                id="flashbang"
                label="Flashbang"
                icon="💥"
                available={wildcards.includes('flashbang')}
                onClick={handleWildcard}
                description="Ciega las pantallas rivales por 1.5s"
              />
              <WildcardButton
                id="doublenada"
                label="Doble o Nada"
                icon="🎲"
                available={wildcards.includes('doublenada')}
                active={activeDoble}
                onClick={handleWildcard}
                description="Si aciertas: puntos ×2. Si fallas: −500 pts a tu facción"
              />
            </div>
          )}

          {activeDoble && !hasAnswered && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-center">
              <p className="text-amber-300 text-xs font-bold">
                🎲 Doble o Nada activado — ¡Elige con cuidado!
              </p>
            </div>
          )}

          {/* ── Answer options ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {question?.opciones?.map((opt, i) => (
              <AnswerOption
                key={i}
                index={i}
                text={opt}
                disabled={hasAnswered}
                selected={selectedIndex === i}
                hidden={hiddenIndices.includes(i)}
                correct={result?.correctIndex === i}
                revealed={hasAnswered && result != null}
                onClick={handleAnswer}
              />
            ))}
          </div>

          {/* ── Result feedback ───────────────────────────────────────────── */}
          {hasAnswered && result && (
            <div className={`rounded-2xl border p-5 text-center animate-slide-up ${
              result.correct
                ? 'border-green-500/40 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/5'
            }`}>
              <p className={`text-2xl font-black mb-1 ${result.correct ? 'text-green-300' : 'text-red-400'}`}>
                {result.correct ? '¡Correcto!' : 'Incorrecto'}
              </p>
              {result.correct && (
                <p className="text-white font-bold text-lg">
                  +{result.pointsEarned.toLocaleString()} pts
                  {result.isDoubleOrNothing && <span className="text-amber-400 ml-2">(×2 Doble o Nada)</span>}
                </p>
              )}
              {!result.correct && result.isDoubleOrNothing && (
                <p className="text-red-300 text-sm mt-1">−500 pts descontados de tu facción</p>
              )}
              <p className="text-gray-400 text-xs mt-2">
                Puntaje total: <span className="text-white font-bold">{result.totalScore.toLocaleString()}</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">Esperando la siguiente pregunta…</p>
            </div>
          )}

          {hasAnswered && !result && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-amber-300 text-sm font-bold">Tiempo agotado — sin respuesta registrada</p>
              <p className="text-gray-500 text-xs mt-1">Esperando la siguiente pregunta…</p>
            </div>
          )}

          {/* ── Mini live ranking ─────────────────────────────────────────── */}
          {ranking.length > 0 && (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Ranking en Vivo</p>
              <div className="flex flex-col gap-1.5">
                {ranking.slice(0, 5).map((f, i) => {
                  const isMyFaction = f.factionId === factionInfo?.factionId;
                  return (
                    <div key={f.factionId} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${isMyFaction ? 'bg-brand/10 border border-brand/20' : ''}`}>
                      <span className="text-gray-500 w-4">#{i + 1}</span>
                      <span className={`flex-1 truncate ${isMyFaction ? 'text-brand-light font-bold' : 'text-gray-300'}`}>
                        {f.isLoner ? '⚡' : '👥'} {f.members.map(m => m.nombre).join(' & ')}
                      </span>
                      <span className={`font-black tabular-nums ${isMyFaction ? 'text-brand-light' : 'text-gray-400'}`}>
                        {f.factionScore.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} width={320} height={180} className="hidden" />
    </>
  );
}
