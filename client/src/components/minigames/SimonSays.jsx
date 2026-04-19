import React, { useState, useEffect, useRef } from 'react';

const COLORS = [
  { id: 0, bg: 'bg-green-500',   active: 'bg-green-300 shadow-[0_0_40px_rgba(74,222,128,1)]' },
  { id: 1, bg: 'bg-red-500',     active: 'bg-red-300 shadow-[0_0_40px_rgba(248,113,113,1)]' },
  { id: 2, bg: 'bg-yellow-500',  active: 'bg-yellow-300 shadow-[0_0_40px_rgba(253,224,71,1)]' },
  { id: 3, bg: 'bg-blue-500',    active: 'bg-blue-300 shadow-[0_0_40px_rgba(96,165,250,1)]' }
];

const BEEP_FREQS = [329.63, 261.63, 220, 164.81]; // E4, C4, A3, E3

export default function SimonSays({ socket, record }) {
  const [sequence, setSequence] = useState([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeButton, setActiveButton] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(0);
  
  const audioCtxRef = useRef(null);

  useEffect(() => {
    // Init audio context on first interaction
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playBeep = (id) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(BEEP_FREQS[id], ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const playErrorSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const startGame = () => {
    const firstStep = Math.floor(Math.random() * 4);
    setSequence([firstStep]);
    setPlayerStep(0);
    setLevel(1);
    setIsPlaying(true);
    setGameOver(false);
    playSequence([firstStep]);
  };

  const playSequence = async (seq) => {
    setIsShowingSequence(true);
    // Pausa inicial
    await new Promise(r => setTimeout(r, 600));

    for (let i = 0; i < seq.length; i++) {
      setActiveButton(seq[i]);
      playBeep(seq[i]);
      
      // Velocidad basada en el nivel
      const duration = Math.max(200, 600 - (seq.length * 15));
      await new Promise(r => setTimeout(r, duration));
      
      setActiveButton(null);
      await new Promise(r => setTimeout(r, duration / 2));
    }
    setIsShowingSequence(false);
  };

  const handlePlayerClick = (id) => {
    if (!isPlaying || isShowingSequence || gameOver) return;

    setActiveButton(id);
    
    if (id !== sequence[playerStep]) {
      // Error
      playErrorSound();
      setGameOver(true);
      setIsPlaying(false);
      setActiveButton(null);
      
      // Submit score
      if (level > 0 && socket) {
        socket.emit('wr:score-submit', { game: 'simon', score: level - 1 });
      }
      return;
    }

    // Acierto
    playBeep(id);
    setTimeout(() => setActiveButton(null), 200);

    if (playerStep === sequence.length - 1) {
      // Avanzó de nivel
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setPlayerStep(0);
      const newSeq = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(newSeq);
      playSequence(newSeq);
    } else {
      setPlayerStep(playerStep + 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-black text-white">Simón Dice</h3>
        <p className="text-sm text-gray-500">Memoriza la secuencia y repítela</p>
        <div className="flex justify-center gap-6 mt-4">
          <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Nivel Actual</p>
            <p className="text-2xl font-mono font-bold text-brand-light">{level}</p>
          </div>
          <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Récord Global</p>
            <p className="text-2xl font-mono font-bold text-yellow-400">lvl {record?.level || 0}</p>
            <p className="text-[10px] text-gray-500">{record?.name || 'Nadie'}</p>
          </div>
        </div>
      </div>

      {/* Grid de juego */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-4 w-[280px] h-[280px] p-4 bg-black/40 rounded-full border border-white/10 shadow-2xl overflow-hidden relative">
          
          {/* Circular Divider */}
          <div className="absolute inset-x-0 h-4 bg-[#0F0F1A] top-1/2 -translate-y-1/2 z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 w-4 bg-[#0F0F1A] left-1/2 -translate-x-1/2 z-10 pointer-events-none"></div>
          <div className="absolute w-24 h-24 bg-[#0F0F1A] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center border-4 border-black box-content shadow-inner pointer-events-none">
            <span className="text-gray-600 font-black text-xs uppercase tracking-widest">SIMON</span>
          </div>

          {COLORS.map((c, i) => {
            const isTopLeft = i === 0;
            const isTopRight = i === 1;
            const isBottomLeft = i === 2;
            const isBottomRight = i === 3;
            
            let radiusClass = '';
            if (isTopLeft) radiusClass = 'rounded-tl-full';
            if (isTopRight) radiusClass = 'rounded-tr-full';
            if (isBottomLeft) radiusClass = 'rounded-bl-full';
            if (isBottomRight) radiusClass = 'rounded-br-full';

            return (
              <button
                key={c.id}
                onClick={() => handlePlayerClick(c.id)}
                disabled={!isPlaying || isShowingSequence || gameOver}
                className={`w-full h-full transition-all duration-150 ${c.bg} ${radiusClass} opacity-60 ${
                  activeButton === c.id ? `!opacity-100 scale-105 z-10 ${c.active}` : ''
                } ${
                  (!isPlaying || isShowingSequence) ? 'cursor-default' : 'hover:opacity-80 active:scale-95'
                }`}
              />
            );
          })}
        </div>

        {/* Overlays */}
        {!isPlaying && !gameOver && (
          <div className="mt-8 text-center">
            <button
              onClick={startGame}
              className="bg-brand hover:bg-brand-dark px-8 py-3 rounded-full text-white font-black tracking-widest uppercase transition-transform hover:scale-105 shadow-xl"
            >
              Iniciar Juego
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-red-500/90 backdrop-blur-md rounded-2xl p-6 text-center z-50 border border-red-400 shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-fade-in">
            <h3 className="text-2xl font-black text-white mb-2">¡INCORRECTO!</h3>
            <p className="text-red-100 font-medium mb-6">Llegaste al nivel {level - 1}</p>
            <button
              onClick={startGame}
              className="w-full bg-white text-red-600 font-black px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              REINTENTAR
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
