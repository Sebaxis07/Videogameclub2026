import React, { useState, useEffect, useRef } from 'react';

const COLORS = [
  '#000000', // Negro
  '#ffffff', // Blanco
  '#ef4444', // Rojo
  '#f97316', // Naranja
  '#eab308', // Amarillo
  '#22c55e', // Verde claro
  '#065f46', // Verde oscuro
  '#3b82f6', // Azul claro
  '#1d4ed8', // Azul oscuro
  '#8b5cf6', // Violeta
  '#ec4899', // Rosa
  '#78350f', // Marrón
];

const CANVAS_SIZE = 50;
const CELL_SIZE = 8; // Pixels visuales por cada celda

export default function PixelCanvas({ socket, initialTopic }) {
  const canvasRef = useRef(null);
  const [activeColor, setActiveColor] = useState(COLORS[2]);
  const [cooldown, setCooldown] = useState(0); // milisegundos restantes
  const [topic, setTopic] = useState(initialTopic);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: -1, y: -1 });

  // Grid local para ref de dibujo rápido
  const gridRef = useRef(Array(CANVAS_SIZE * CANVAS_SIZE).fill(null));

  useEffect(() => {
    if (!socket) return;

    socket.emit('wr:canvas-get');

    const handleFull = ({ grid, topic }) => {
      gridRef.current = grid;
      setTopic(topic);
      renderCanvas();
    };

    const handleUpdate = ({ index, color }) => {
      gridRef.current[index] = color;
      renderPartial(index, color);
    };

    const handleCooldown = ({ readyAt }) => {
      const remaining = readyAt - Date.now();
      if (remaining > 0) {
        setCooldown(remaining);
      }
    };

    socket.on('wr:canvas-full', handleFull);
    socket.on('wr:canvas-update', handleUpdate);
    socket.on('wr:canvas-cooldown', handleCooldown);

    return () => {
      socket.off('wr:canvas-full', handleFull);
      socket.off('wr:canvas-update', handleUpdate);
      socket.off('wr:canvas-cooldown', handleCooldown);
    };
  }, [socket]);

  // Manejador del timer visual del cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 100) return 0;
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [cooldown]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = '#0F0F1A';
    ctx.fillRect(0, 0, CANVAS_SIZE * CELL_SIZE, CANVAS_SIZE * CELL_SIZE);

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE * CELL_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE * CELL_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw pixels
    const grid = gridRef.current;
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const color = grid[y * CANVAS_SIZE + x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  };

  const renderPartial = (index, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const x = index % CANVAS_SIZE;
    const y = Math.floor(index / CANVAS_SIZE);
    
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    } else {
      // Re-render empty cell
      ctx.fillStyle = '#0F0F1A';
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  };

  const drawHoverCursor = (ctx, x, y) => {
    renderCanvas(); // Redraw base first to clear previous cursors
    if (!isHovering || x < 0 || y < 0) return;
    
    ctx.strokeStyle = cooldown > 0 ? 'rgba(255,0,0,0.8)' : 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw semi-transparent preview if no cooldown
    if (cooldown === 0) {
      ctx.fillStyle = activeColor + '80'; // 50% opacity
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Calcular escala exacta porque CSS puede achicar el canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const x = Math.floor(mouseX / CELL_SIZE);
    const y = Math.floor(mouseY / CELL_SIZE);
    
    if (x !== hoverPos.x || y !== hoverPos.y) {
      setHoverPos({ x, y });
      drawHoverCursor(canvas.getContext('2d'), x, y);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverPos({ x: -1, y: -1 });
    renderCanvas(); // Clear cursors
  };

  const handleClickCanvas = (e) => {
    if (cooldown > 0 || !socket) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const x = Math.floor(mouseX / CELL_SIZE);
    const y = Math.floor(mouseY / CELL_SIZE);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      // Optistic render
      const index = y * CANVAS_SIZE + x;
      gridRef.current[index] = activeColor;
      renderPartial(index, activeColor);
      setCooldown(3000); // Trigger fake cooldown immediately

      socket.emit('wr:canvas-place', { x, y, color: activeColor });
      drawHoverCursor(canvas.getContext('2d'), x, y);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      {/* Información del Tema */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-[600px] mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-brand-light uppercase tracking-widest block mb-1">Tema Actual:</span>
          <h3 className="text-xl font-bold text-white">🎨 "{topic}"</h3>
        </div>
        
        {/* Cooldown visual */}
        <div className="flex items-center gap-3">
           <span className="text-xs font-bold text-gray-500">Cooldown:</span>
           <div className="w-10 h-10 rounded-full border-2 border-white/10 relative flex items-center justify-center bg-black overflow-hidden">
             {cooldown > 0 ? (
               <>
                 <div 
                  className="absolute bottom-0 left-0 right-0 bg-red-500/50 transition-all duration-100 ease-linear"
                  style={{ height: `${(cooldown / 3000) * 100}%` }}
                 />
                 <span className="text-xs font-bold text-white z-10">{(cooldown / 1000).toFixed(1)}</span>
               </>
             ) : (
               <span className="text-emerald-400 text-sm font-black animate-pulse">OK</span>
             )}
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Canvas */}
        <div 
          className="rounded-xl overflow-hidden border border-white/20 shadow-[0_0_30px_rgba(34,211,238,0.1)] bg-[#0F0F1A] cursor-crosshair"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onClick={handleClickCanvas}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE * CELL_SIZE}
            height={CANVAS_SIZE * CELL_SIZE}
            className="block w-full max-w-[400px] h-auto object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Paleta de Colores */}
        <div className="bg-black/40 border border-white/10 p-4 rounded-2xl w-full md:w-20 flex md:flex-col gap-3 justify-center flex-wrap">
          {COLORS.map(color => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                activeColor === color ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
      
      <p className="mt-6 text-sm text-gray-500 font-medium">Trabaja en equipo. Solo puedes colocar 1 píxel cada 3 segundos.</p>
    </div>
  );
}
