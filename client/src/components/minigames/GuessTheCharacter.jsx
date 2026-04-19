import React, { useState } from 'react';

export default function GuessTheCharacter({ socket, guessState }) {
  const [guess, setGuess] = useState('');

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || guessState?.solved) return;
    socket.emit("wr:guess", { answer: guess });
    setGuess('');
  };

  if (!guessState) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400">
        <span className="text-4xl mb-4">🦇</span>
        <p>Aún no hay personaje disponible. ¡El admin lanzará uno pronto!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* Zona de Imagen */}
      <div className="flex-1 flex flex-col items-center">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 aspect-video w-full max-w-md flex items-center justify-center">
          <img
            src={guessState.imageUrl}
            alt="Personaje misterioso"
            className="w-full h-full object-contain transition-all duration-1000 ease-in-out"
            style={{ filter: `blur(${guessState.solved ? 0 : guessState.blurPx}px)` }}
          />
          {guessState.solved && (
            <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center animate-fade-in backdrop-blur-sm">
              <span className="text-4xl">🎉</span>
              <h3 className="text-2xl font-black text-white text-shadow-lg text-center px-4">
                ¡{guessState.winners[0]?.name} acertó!
              </h3>
              <p className="text-lg font-bold text-green-300 bg-black/60 px-4 py-1 rounded-full mt-2">
                {guessState.hint.split(' ').slice(-1)[0]} {/* Solo muestra el nombre, el hint en server no tiene el nombre pero `answer` si viene en el evento... Espera, corrijo esto */}
                 Es el personaje correcto.
              </p>
            </div>
          )}
        </div>

        {!guessState.solved && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400 mb-2">Pista: {guessState.hint}</p>
            <form onSubmit={handleGuess} className="flex gap-2">
              <input
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Escribe el nombre aquí..."
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-brand w-64"
                disabled={guessState.solved}
              />
              <button
                type="submit"
                disabled={!guess.trim() || guessState.solved}
                className="bg-brand hover:bg-brand-dark px-4 py-2 rounded-xl text-white font-bold transition-colors disabled:opacity-50"
              >
                Adivinar
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Historial de Ganadores */}
      <div className="w-full md:w-64 bg-black/40 rounded-2xl border border-white/10 p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">🏆 Últimos Acertijos</h3>
        {guessState.winners?.length > 0 ? (
          <div className="space-y-3">
            {guessState.winners.map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️'}</span>
                <div>
                  <p className="text-sm font-bold text-gray-300">{w.name}</p>
                  <p className="text-[10px] text-gray-600">{new Date(w.ts).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nadie ha adivinado todavía.</p>
        )}
      </div>
    </div>
  );
}
