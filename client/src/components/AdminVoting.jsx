/**
 * AdminVoting.jsx
 * =====================================
 * Panel del Admin para controlar la votación de juegos.
 * Permite abrir/cerrar la votación y ver los resultados en tiempo real.
 * Los 3 más votados se usarán como categorías exclusivas para la Trivia.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../api/socket';
import useStore from '../store/useStore';

const GAME_THEMES = {
  'Minecraft':             { emoji: '⛏️',  color: '#5d9e3f' },
  'Fortnite':              { emoji: '🚌',  color: '#eab308' },
  'Mortal Kombat XL':      { emoji: '🩸',  color: '#cc2222' },
  'League of Legends':     { emoji: '⚔️',  color: '#c89b3c' },
  'Roblox':                { emoji: '🧱',  color: '#ef4444' },
  'Elden Ring':            { emoji: '💍',  color: '#eab308' },
};

export default function AdminVoting() {
  const { user } = useStore();
  const [socket, setSocket] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const [games, setGames] = useState([]);
  const [results, setResults] = useState({});
  const [top3, setTop3] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    const s = getSocket('admin');
    setSocket(s);

    s.emit('voting:join', { rut: user?.rut });

    s.on('voting:init', (data) => {
      setGames(data.games || []);
      setResults(data.results || {});
      setTop3(data.top3 || []);
      setTotalVotes(data.totalVotes || 0);
      setIsOpen(data.isOpen);
    });

    s.on('admin:voting:update', (data) => {
      setResults(data.results || {});
      setTop3(data.top3 || []);
      setTotalVotes(data.totalVotes || 0);
      setIsOpen(data.isOpen);
    });

    return () => {
      s.off('voting:init');
      s.off('admin:voting:update');
    };
  }, [user]);

  const handleStart = useCallback(() => {
    socket?.emit('admin:voting:start');
  }, [socket]);

  const handleStop = useCallback(() => {
    socket?.emit('admin:voting:stop');
  }, [socket]);

  // Sort games by votes descending
  const sortedGames = [...games].sort((a, b) => (results[b] || 0) - (results[a] || 0));
  const maxVotes = Math.max(1, ...games.map(g => results[g] || 0));

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* Header + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Votación de Juegos</h2>
          <p className="text-xs text-gray-500">Los 3 más votados serán las categorías de la Trivia</p>
        </div>

        <div className="flex gap-2">
          {!isOpen ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-green-500/20"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Abrir Votación
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-red-500/20 animate-pulse"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M6 6h12v12H6z"/>
              </svg>
              Cerrar Votación
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Estado</p>
          <div className="flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <p className={`font-black text-sm ${isOpen ? 'text-green-400' : 'text-gray-500'}`}>
              {isOpen ? 'Abierta' : 'Cerrada'}
            </p>
          </div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Votos Totales</p>
          <p className="text-2xl font-black text-white">{totalVotes}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Juegos</p>
          <p className="text-2xl font-black text-brand-light">{games.length}</p>
        </div>
      </div>

      {/* Results bar chart */}
      {games.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
            Resultados en Tiempo Real
          </h3>
          <div className="flex flex-col gap-3">
            {sortedGames.map((game, i) => {
              const theme = GAME_THEMES[game] || { emoji: '🎮', color: '#7c3aed' };
              const count = results[game] || 0;
              const pct = Math.round((count / maxVotes) * 100);
              const isInTop3 = top3.includes(game);
              const rank = top3.indexOf(game);
              const podiumEmojis = ['🥇', '🥈', '🥉'];

              return (
                <div key={game} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${isInTop3 ? 'bg-surface/60' : ''}`}>
                  <span className="w-7 text-center text-lg shrink-0">
                    {isInTop3 ? podiumEmojis[rank] : theme.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-bold truncate ${isInTop3 ? 'text-white' : 'text-gray-400'}`}>
                        {game}
                      </p>
                      <span className="text-xs font-black tabular-nums ml-2 shrink-0" style={{ color: theme.color }}>
                        {count} votos
                      </span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: theme.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 3 Winners Banner */}
      {top3.length > 0 && !isOpen && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-[#1a1225] to-[#0a0a0f] p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

          <div className="text-center mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/70 mb-1">Resultado Final</p>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              Top 3 Ganadores
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {top3.map((game, i) => {
              const theme = GAME_THEMES[game] || { emoji: '🎮', color: '#c89b3c' };
              return (
                <div
                  key={game}
                  className="flex items-center gap-4 p-4 rounded-2xl border"
                  style={{ borderColor: theme.color + '40', backgroundColor: theme.color + '10' }}
                >
                  <span className="text-2xl">{['🥇','🥈','🥉'][i]}</span>
                  <span className="text-2xl">{theme.emoji}</span>
                  <div className="flex-1">
                    <p className="font-black text-white">{game}</p>
                    <p className="text-sm font-bold" style={{ color: theme.color }}>
                      {results[game] || 0} votos — Seleccionado para Trivia
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-4 bg-brand/10 border border-brand/20 rounded-2xl text-center">
            <p className="text-brand-light text-xs uppercase tracking-widest font-bold mb-1">Siguiente paso</p>
            <p className="text-gray-300 text-sm">
              Ve a <span className="text-white font-bold">Arena de Trivia → Iniciar Partida</span> para usar estas categorías automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {games.length === 0 && (
        <div className="text-center py-16 bg-surface-card rounded-2xl border border-dashed border-surface-border">
          <p className="text-5xl mb-4">🎮</p>
          <p className="font-bold text-gray-400">Abre la votación para comenzar.</p>
        </div>
      )}
    </div>
  );
}
