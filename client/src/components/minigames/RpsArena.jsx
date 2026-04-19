import React, { useState, useEffect } from 'react';

const CHOICES = [
  { id: 'rock', emoji: '🪨', label: 'Piedra' },
  { id: 'paper', emoji: '📄', label: 'Papel' },
  { id: 'scissors', emoji: '✂️', label: 'Tijeras' },
];

export default function RpsArena({ socket, players, myId }) {
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [myChoice, setMyChoice] = useState(null);
  const [result, setResult] = useState(null); // { winner: name, p1: name, p2: name, c1, c2, msg }

  useEffect(() => {
    if (!socket) return;

    socket.on('wr:rps-challenge-sent', ({ challengeId }) => {
      setActiveChallengeId(challengeId);
    });

    socket.on('wr:rps-challenge-recv', (data) => {
      setIncomingChallenge(data);
    });

    socket.on('wr:rps-result', (data) => {
      setResult(data);
      setIncomingChallenge(null);
      setActiveChallengeId(null);
      setMyChoice(null);
      setTimeout(() => setResult(null), 5000);
    });

    socket.on('wr:rps-rejected', ({ by }) => {
      alert(`${by} ha rechazado tu desafío.`);
      setActiveChallengeId(null);
      setMyChoice(null);
    });

    socket.on('wr:rps-error', ({ msg }) => {
      alert(msg);
      setActiveChallengeId(null);
      setIncomingChallenge(null);
    });

    socket.on('wr:rps-timeout', () => {
      alert("El tiempo del desafío ha expirado.");
      setActiveChallengeId(null);
      setIncomingChallenge(null);
      setMyChoice(null);
    });

    return () => {
      socket.off('wr:rps-challenge-sent');
      socket.off('wr:rps-challenge-recv');
      socket.off('wr:rps-result');
      socket.off('wr:rps-rejected');
      socket.off('wr:rps-error');
      socket.off('wr:rps-timeout');
    };
  }, [socket]);

  const sendChallenge = (targetId) => {
    socket.emit('wr:rps-challenge', { targetSocketId: targetId });
    setActiveChallengeId('waiting'); // Optimistic UI
  };

  const acceptChallenge = () => {
    setActiveChallengeId(incomingChallenge.challengeId);
    setIncomingChallenge(null);
  };

  const rejectChallenge = () => {
    socket.emit('wr:rps-reject', { challengeId: incomingChallenge.challengeId });
    setIncomingChallenge(null);
  };

  const makeChoice = (choiceId) => {
    setMyChoice(choiceId);
    socket.emit('wr:rps-choice', { challengeId: activeChallengeId, choice: choiceId });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* Lista de Jugadores */}
      <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
          <span>👥</span> Jugadores en la Sala ({players.length - 1})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
          {players.filter(p => p.socketId !== myId).map(p => (
            <div key={p.socketId} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 hover:border-brand/50 transition-colors">
              <div>
                <p className="text-sm font-bold text-gray-200">{p.name}</p>
                <p className="text-[10px] text-gray-500 uppercase">{p.role}</p>
              </div>
              <button
                onClick={() => sendChallenge(p.socketId)}
                disabled={activeChallengeId || incomingChallenge}
                className="bg-brand/20 text-brand-light border border-brand/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand hover:text-white transition-colors disabled:opacity-30"
              >
                ⚔️ Desafiar
              </button>
            </div>
          ))}
          {players.length <= 1 && (
            <p className="text-gray-500 text-sm py-4">No hay otros jugadores en la sala.</p>
          )}
        </div>
      </div>

      {/* Zona de Duelo */}
      <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center min-h-[300px] relative">
        
        {!activeChallengeId && !incomingChallenge && !result && (
          <div className="text-center text-gray-500">
            <span className="text-4xl block mb-2">⚔️</span>
            <p>Desafía a alguien para empezar un duelo de Piedra, Papel o Tijeras.</p>
          </div>
        )}

        {/* Recibiendo Desafío */}
        {incomingChallenge && !activeChallengeId && (
          <div className="text-center animate-fade-in bg-white/5 p-6 rounded-2xl border border-orange-500/30">
            <h3 className="text-xl font-bold text-white mb-2">¡Desafío Entrante!</h3>
            <p className="text-gray-300 mb-6"><strong className="text-orange-400">{incomingChallenge.from}</strong> te ha desafiado.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={rejectChallenge} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/40">Rechazar</button>
              <button onClick={acceptChallenge} className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold">¡Aceptar!</button>
            </div>
          </div>
        )}

        {/* Esperando / Jugando */}
        {activeChallengeId && (
          <div className="text-center w-full animate-fade-in">
            {activeChallengeId === 'waiting' ? (
              <div className="py-8">
                <Spinner />
                <p className="mt-4 text-gray-400 font-medium">Esperando respuesta del oponente...</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold mb-6">Elige tu jugada:</h3>
                <div className="flex justify-center gap-4">
                  {CHOICES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => makeChoice(c.id)}
                      disabled={!!myChoice}
                      className={`w-20 h-20 text-4xl rounded-2xl flex items-center justify-center transition-all ${
                        myChoice === c.id 
                          ? 'bg-brand border-2 border-white scale-110' 
                          : myChoice 
                            ? 'bg-white/5 opacity-40 grayscale' 
                            : 'bg-white/10 hover:bg-brand/50 hover:scale-105 border border-white/20'
                      }`}
                    >
                      {c.emoji}
                    </button>
                  ))}
                </div>
                {myChoice && <p className="mt-6 text-brand-light font-bold">Esperando al oponente...</p>}
              </div>
            )}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="text-center w-full animate-fade-in">
            <h3 className="text-2xl font-black text-white mb-6">
              {result.winner === null ? '¡Empate!' : `¡${result.winner} Gana!`}
            </h3>
            <div className="flex justify-center items-center gap-8">
              <div className="text-center">
                <p className="text-sm text-gray-400 font-bold mb-2">{result.p1}</p>
                <div className="w-20 h-20 text-4xl bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  {CHOICES.find(c => c.id === result.choice1)?.emoji}
                </div>
              </div>
              <span className="text-2xl font-black text-brand-light">VS</span>
              <div className="text-center">
                <p className="text-sm text-gray-400 font-bold mb-2">{result.p2}</p>
                <div className="w-20 h-20 text-4xl bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  {CHOICES.find(c => c.id === result.choice2)?.emoji}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Spinner = () => (
  <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-brand rounded-full" role="status" aria-label="loading">
    <span className="sr-only">Loading...</span>
  </div>
);
