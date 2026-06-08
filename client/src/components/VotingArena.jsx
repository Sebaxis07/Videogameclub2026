/**
 * VotingArena.jsx
 * =====================================
 * Vista del Estudiante para la Votación de Juegos.
 * El alumno elige 1 juego de 12. Los 3 más votados
 * serán las categorías exclusivas de la Trivia.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../api/socket';
import useStore from '../store/useStore';

// Emojis / colores temáticos por juego
const GAME_THEMES = {
  'Minecraft':             { emoji: '⛏️',  color: '#5d9e3f', bg: 'from-[#071200] to-[#0a1a00]', border: 'border-green-600/40' },
  'Fortnite':              { emoji: '🚌',  color: '#eab308', bg: 'from-[#1a1500] to-[#251f00]', border: 'border-yellow-500/40' },
  'Mortal Kombat XL':      { emoji: '🩸',  color: '#cc2222', bg: 'from-[#1a0000] to-[#2a0000]', border: 'border-red-700/40' },
  'League of Legends':     { emoji: '⚔️',  color: '#c89b3c', bg: 'from-[#1a1200] to-[#2a1f00]', border: 'border-[#c89b3c]/40' },
  'Roblox':                { emoji: '🧱',  color: '#ef4444', bg: 'from-[#1a0000] to-[#250000]', border: 'border-red-500/40' },
  'Elden Ring':            { emoji: '💍',  color: '#eab308', bg: 'from-[#1b1502] to-[#2c2203]', border: 'border-amber-500/40' },
};

function GameCard({ game, votes, totalVotes, selected, myVote, isOpen, onVote }) {
  const theme = GAME_THEMES[game] || { emoji: '🎮', color: '#7c3aed', bg: 'from-[#0a0015] to-[#12002a]', border: 'border-brand/40' };
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  const isVotedByMe = myVote === game;

  return (
    <button
      onClick={() => isOpen && !myVote && onVote(game)}
      disabled={!isOpen || !!myVote}
      className={`
        relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 group
        ${isVotedByMe
          ? `${theme.border} scale-[1.02]`
          : myVote
            ? 'border-surface-border/30 opacity-40 cursor-not-allowed'
            : isOpen
              ? `border-surface-border hover:${theme.border} hover:scale-[1.02] cursor-pointer`
              : 'border-surface-border/30 cursor-not-allowed'
        }
      `}
      style={{
        background: isVotedByMe
          ? `linear-gradient(135deg, ${theme.color}15, ${theme.color}05)`
          : 'var(--color-surface-card)',
        boxShadow: isVotedByMe
          ? `0 0 25px ${theme.color}30`
          : undefined,
      }}
    >
      {/* Selected glow ring */}
      {isVotedByMe && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 30px ${theme.color}20` }}
        />
      )}

      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl leading-none">{theme.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-white leading-tight truncate">{game}</p>
          <p className="text-[11px] font-bold mt-0.5" style={{ color: theme.color }}>
            {votes} voto{votes !== 1 ? 's' : ''}
          </p>
        </div>
        {isVotedByMe && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme.color }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Vote bar */}
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: theme.color }}
        />
      </div>
      <p className="text-[10px] text-gray-500 mt-1 font-bold">{pct}%</p>
    </button>
  );
}

export default function VotingArena() {
  const { user, setActiveView } = useStore();
  const [socket, setSocket] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const [games, setGames] = useState([]);
  const [results, setResults] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [top3, setTop3] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('waiting'); // waiting | voting | closed

  useEffect(() => {
    const s = getSocket(user);
    setSocket(s);

    s.emit('voting:join', { rut: user.rut });

    s.on('voting:init', (data) => {
      setGames(data.games || []);
      setResults(data.results || {});
      setMyVote(data.myVote || null);
      setTop3(data.top3 || []);
      setTotalVotes(data.totalVotes || 0);
      setIsOpen(data.isOpen);
      const currentPhase = data.isOpen ? 'voting' : (data.top3?.length ? 'closed' : 'waiting');
      setPhase(currentPhase);
      if (currentPhase === 'closed') {
        setActiveView('trivia');
      }
    });

    s.on('voting:update', (data) => {
      setResults(data.results || {});
      setTop3(data.top3 || []);
      setTotalVotes(data.totalVotes || 0);
      setIsOpen(data.isOpen);
      if (!data.isOpen && data.top3?.length > 0) {
        setPhase('closed');
        setActiveView('trivia');
      } else if (data.isOpen) {
        setPhase('voting');
      } else {
        setPhase('waiting');
      }
    });

    s.on('voting:success', ({ myVote: mv }) => {
      setMyVote(mv);
    });

    s.on('voting:error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      s.off('voting:init');
      s.off('voting:update');
      s.off('voting:success');
      s.off('voting:error');
    };
  }, [user, setActiveView]);

  const handleVote = useCallback((game) => {
    if (!socket || myVote || !isOpen) return;
    socket.emit('voting:cast', { rut: user.rut, game });
  }, [socket, myVote, isOpen, user.rut]);

  // ── WAITING PHASE ─────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="card-glow flex flex-col items-center justify-center min-h-[500px] py-12 text-center animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#7c3aed15_0%,_transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-4xl animate-pulse">
            🎮
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-2">Votación de Juegos</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
              El administrador abrirá la votación en breve. Elige tu juego favorito y los <span className="text-brand-light font-bold">3 más votados</span> serán las categorías de la Trivia.
            </p>
          </div>
          <div className="w-full h-0.5 bg-surface-border rounded max-w-xs" />
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            Esperando al administrador…
          </p>
        </div>
      </div>
    );
  }

  // ── CLOSED PHASE ──────────────────────────────────────────────────────────
  if (phase === 'closed') {
    const topGames = top3.slice(0, 3);
    const podiumEmojis = ['🥇', '🥈', '🥉'];
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="text-center">
          <p className="text-brand-light text-xs uppercase tracking-widest font-bold mb-1 animate-pulse">Votación Finalizada</p>
          <h2 className="text-3xl font-black text-white">¡Los juegos ganadores!</h2>
          <p className="text-gray-400 text-sm mt-2">Estas serán las categorías de la Arena de Trivia</p>
        </div>

        <div className="flex flex-col gap-3">
          {topGames.map((game, i) => {
            const theme = GAME_THEMES[game] || { emoji: '🎮', color: '#7c3aed' };
            const votes = results[game] || 0;
            return (
              <div
                key={game}
                className="relative overflow-hidden rounded-2xl border-2 p-5 animate-fade-in flex items-center gap-4"
                style={{
                  borderColor: theme.color + '60',
                  background: `linear-gradient(135deg, ${theme.color}15, ${theme.color}05)`,
                  animationDelay: `${i * 150}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: theme.color }} />
                <span className="text-3xl">{podiumEmojis[i]}</span>
                <span className="text-3xl">{theme.emoji}</span>
                <div className="flex-1">
                  <p className="font-black text-white text-lg">{game}</p>
                  <p className="text-sm font-bold" style={{ color: theme.color }}>{votes} votos</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Seleccionado</p>
                  <p className="font-black text-white text-sm">#{i + 1}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-surface-card border border-brand/20 rounded-2xl p-5 text-center">
          <p className="text-brand-light text-xs uppercase tracking-widest font-bold mb-2">Siguiente paso</p>
          <p className="text-gray-300 text-sm">
            El administrador iniciará la <span className="text-white font-bold">Arena de Trivia</span> con preguntas exclusivas de los juegos ganadores.
          </p>
        </div>
      </div>
    );
  }

  // ── VOTING PHASE ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-light text-xs uppercase tracking-widest font-bold">Votación Activa</p>
            <h2 className="text-2xl font-black text-white mt-0.5">¿Cuál quieres jugar?</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">En vivo</span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-surface border border-surface-border rounded-xl px-4 py-2 text-center flex-1">
            <p className="text-xl font-black text-white">{totalVotes}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Votos</p>
          </div>
          <div className="bg-surface border border-surface-border rounded-xl px-4 py-2 text-center flex-1">
            <p className="text-xl font-black text-brand-light">3</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ganadores</p>
          </div>
          <div className="bg-surface border border-surface-border rounded-xl px-4 py-2 text-center flex-1">
            <p className="text-lg font-black text-white truncate">{myVote ? '✅ Votado' : '⏳ Sin voto'}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tu estado</p>
          </div>
        </div>

        {!myVote && (
          <p className="text-xs text-amber-400 text-center font-bold animate-pulse">
            👆 Toca un juego para emitir tu voto (solo puedes votar 1 vez)
          </p>
        )}
        {myVote && (
          <p className="text-xs text-green-400 text-center font-bold">
            ✅ Votaste por <span className="text-white">{myVote}</span>. ¡Espera los resultados!
          </p>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 text-center text-red-400 text-sm font-bold animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-2 gap-3">
        {games.map(game => (
          <GameCard
            key={game}
            game={game}
            votes={results[game] || 0}
            totalVotes={totalVotes}
            myVote={myVote}
            isOpen={isOpen}
            onVote={handleVote}
          />
        ))}
      </div>

      {/* Live Top 3 preview */}
      {top3.length > 0 && (
        <div className="bg-surface-card border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-400 text-[10px] uppercase tracking-widest font-black mb-3">🏆 Top 3 en tiempo real</p>
          <div className="flex flex-col gap-2">
            {top3.map((game, i) => {
              const theme = GAME_THEMES[game] || { color: '#7c3aed' };
              const pct = totalVotes > 0 ? Math.round(((results[game] || 0) / totalVotes) * 100) : 0;
              return (
                <div key={game} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{['🥇','🥈','🥉'][i]}</span>
                  <p className="text-sm font-bold text-white flex-1 truncate">{game}</p>
                  <span className="text-xs font-bold tabular-nums" style={{ color: theme.color }}>
                    {results[game] || 0} votos ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
