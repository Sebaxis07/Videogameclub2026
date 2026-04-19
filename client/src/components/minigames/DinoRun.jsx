import React, { useState, useEffect, useRef } from 'react';

// Constantes físicas del juego
const GRAVITY = 0.4;
const JUMP_POWER = -8;
const SPEED_INITIAL = 4;
const GROUND_Y = 130;

export default function DinoRun({ socket, record }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);

  // Refs mutables para el gameloop sin re-renderizar React
  const state = useRef({
    dino: { y: GROUND_Y, vy: 0 },
    obstacles: [],
    speed: SPEED_INITIAL,
    score: 0,
    frames: 0,
    animFrame: null
  });

  // Gameloop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      updateInfo();
      draw(ctx);
      state.current.animFrame = requestAnimationFrame(loop);
    };
    state.current.animFrame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(state.current.animFrame);
  }, [isPlaying, isGameOver]);

  const updateInfo = () => {
    const s = state.current;
    s.frames++;
    
    // Aumentar score (más lento)
    if (s.frames % 10 === 0) {
      s.score++;
      setScore(s.score);
    }
    
    // Aumentar velocidad progresivamente (mucho más lento)
    if (s.frames % 800 === 0) {
      s.speed += 0.2;
    }

    // Física Dino
    s.dino.vy += GRAVITY;
    s.dino.y += s.dino.vy;
    if (s.dino.y >= GROUND_Y) {
      s.dino.y = GROUND_Y;
      s.dino.vy = 0;
    }

    // Spawn Obstáculos (más espaciados)
    if (s.frames % 120 === 0 && Math.random() > 0.4) {
      s.obstacles.push({ x: 600, w: 20, h: 30 + Math.random() * 20 });
    }

    // Mover y limpiar obstáculos, chequear colisión
    for (let i = s.obstacles.length - 1; i >= 0; i--) {
      let obs = s.obstacles[i];
      obs.x -= s.speed;
      
      // Hitbox simple y perdonadora (Dino es approx 25x25 en x:50, y:s.dino.y)
      const dx = 55;
      const dy = s.dino.y - 20; 
      
      if (
        obs.x < dx + 15 && 
        obs.x + obs.w > dx - 10 && 
        GROUND_Y - obs.h < dy + 25
      ) {
        // COLISIÓN!
        gameOver();
        return;
      }

      if (obs.x + obs.w < 0) {
        s.obstacles.splice(i, 1);
      }
    }
  };

  const draw = (ctx) => {
    const s = state.current;
    // Limpiar
    ctx.fillStyle = '#0F0F1A';
    ctx.fillRect(0, 0, 600, 150);

    // Piso
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(600, GROUND_Y);
    ctx.stroke();

    // Dibujar Dino (Emoji 🏃 o 👾)
    ctx.font = '30px serif';
    ctx.fillText('👾', 50, s.dino.y);

    // Dibujar obstáculos (🔥)
    ctx.font = '24px serif';
    s.obstacles.forEach(obs => {
      // ctx.fillStyle = '#f87171';
      // ctx.fillRect(obs.x, GROUND_Y - obs.h, obs.w, obs.h);
      ctx.fillText('🔥', obs.x, GROUND_Y - 5);
    });
  };

  const jump = () => {
    if (!isPlaying) {
      startGame();
      return;
    }
    if (isGameOver) {
      resetGame();
      return;
    }
    const s = state.current;
    if (s.dino.y === GROUND_Y) {
      s.dino.vy = JUMP_POWER;
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
  };

  const resetGame = () => {
    state.current = {
      dino: { y: GROUND_Y, vy: 0 },
      obstacles: [],
      speed: SPEED_INITIAL,
      score: 0,
      frames: 0,
      animFrame: null
    };
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const gameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    // Enviar score al server
    if (state.current.score > 0 && socket) {
      socket.emit('wr:score-submit', { game: 'dino', score: state.current.score });
    }
  };

  // Listeners de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

  return (
    <div className="flex flex-col items-center p-4 select-none">
      
      {/* Header Info */}
      <div className="w-full max-w-[600px] flex justify-between items-end mb-4">
        <div>
          <h3 className="text-xl font-black text-white">Dino Run (Versión Club)</h3>
          <p className="text-sm text-gray-500">Presiona ESPACIO o toca para saltar</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-brand-light uppercase tracking-widest mb-1">
            Récord Global: {record?.score || 0} ({record?.name || 'Nadie'})
          </p>
          <p className="text-2xl font-mono font-bold text-cyan-400">
            {score.toString().padStart(5, '0')}
          </p>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div 
        className="relative bg-[#0F0F1A] border-2 border-white/10 rounded-2xl overflow-hidden cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:border-cyan-500/50 transition-colors"
        onClick={jump}
        style={{ width: 600, height: 150 }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="block w-full h-full"
        />

        {/* Overlays */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="text-white font-bold bg-white/10 border border-white/20 px-4 py-2 rounded-xl animate-pulse">
              [ Presiona ESPACIO para empezar ]
            </span>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-[2px]">
            <span className="text-3xl mb-2">💥</span>
            <h2 className="text-xl font-black text-white mb-2">¡GAME OVER!</h2>
            <span className="text-white font-medium bg-white/10 border border-white/20 px-4 py-1.5 rounded-xl">
              Toca para reintentar
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
