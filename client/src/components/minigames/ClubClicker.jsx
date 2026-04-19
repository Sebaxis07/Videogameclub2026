import React, { useState, useEffect, useRef } from 'react';

export default function ClubClicker({ socket, ranking }) {
  const [localClicks, setLocalClicks] = useState(0);
  const [cps, setCps] = useState(0);
  const clicksThisSecond = useRef(0);
  const isScaling = useRef(false);

  useEffect(() => {
    // Setup CPS calculator
    const interval = setInterval(() => {
      setCps(clicksThisSecond.current);
      clicksThisSecond.current = 0;
    }, 1000);

    // Setup listener for total clicks ack from server (optional smooth sync)
    const handleAck = ({ total }) => {
      setLocalClicks(total);
    };

    if (socket) {
      socket.on('wr:click-ack', handleAck);
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.off('wr:click-ack', handleAck);
    };
  }, [socket]);

  const handleClick = (e) => {
    e.preventDefault();
    if (!socket) return;
    
    // Optistic update
    setLocalClicks(prev => prev + 1);
    clicksThisSecond.current += 1;
    
    socket.emit('wr:click');

    // Visual effect on the button
    const btn = e.currentTarget;
    if (!isScaling.current) {
      isScaling.current = true;
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
        isScaling.current = false;
      }, 50);
    }
    
    // Create floating +1
    createFloatingText(e.clientX, e.clientY);
  };

  const createFloatingText = (x, y) => {
    const el = document.createElement('div');
    el.textContent = '+1';
    el.className = 'absolute text-brand-light font-black text-2xl pointer-events-none z-50 animate-fade-out-up';
    
    // Add some random jitter
    const jx = (Math.random() - 0.5) * 40;
    const jy = (Math.random() - 0.5) * 40;
    
    el.style.left = `${x + jx}px`;
    el.style.top = `${y + jy}px`;
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* Zona Central de Click */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-center mb-8">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Tus Puntos</p>
          <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-cyan-400">
            {localClicks.toLocaleString()}
          </h2>
          <p className="text-sm font-medium text-cyan-500 mt-2">{cps} clicks / segundo</p>
        </div>

        <button
          onClick={handleClick}
          className="relative group outline-none select-none"
          style={{ transition: 'transform 0.05s ease-out' }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-brand blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
          
          {/* Main button */}
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-surface to-surface-card border-4 border-brand-light/30 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.3)] overflow-hidden group-active:border-brand-light group-hover:border-brand-light/60 transition-colors">
            <span className="text-7xl group-hover:scale-110 transition-transform duration-300">💎</span>
          </div>
        </button>
        <p className="mt-8 text-sm text-gray-500 font-medium">¡Haz clic lo más rápido posible!</p>
      </div>

      {/* Top 10 Ranking */}
      <div className="w-full md:w-72 bg-black/40 rounded-2xl border border-white/10 p-4 flex flex-col max-h-[400px]">
        <h3 className="text-sm font-bold text-gray-300 mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
          <span>🏆</span> Top 10 Clickers (En Vivo)
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {ranking?.length > 0 ? (
            ranking.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className={`font-black w-4 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold text-gray-200 truncate max-w-[120px]">{r.name}</span>
                </div>
                <span className="text-xs font-black text-brand-light bg-brand/10 px-2 py-0.5 rounded-md">
                  {r.clicks.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nadie ha hecho clic todavía...</p>
          )}
        </div>
      </div>

      {/* CSS inyectado para la animación de floating text */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeOutUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(1.5); }
        }
        .animate-fade-out-up {
          animation: fadeOutUp 0.8s ease-out forwards;
        }
      `}} />
    </div>
  );
}
