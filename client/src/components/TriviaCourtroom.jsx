import React, { useState, useEffect } from 'react';

export default function TriviaCourtroom({ socket, courtSession, user }) {
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  const isDefendant = courtSession.defendant?.rut === user.rut;
  const isLawyer = courtSession.lawyer?.rut === user.rut;

  // Sync initial timer when phase changes
  useEffect(() => {
    if (courtSession.timer) {
      setTimeLeft(courtSession.timer);
    }
  }, [courtSession.phase, courtSession.timer]);

  // Local countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (courtSession.phase === 'statements' && isLawyer) {
      socket.emit('court:submitOpeningStatement', { argument: inputValue });
    } else if (courtSession.phase === 'defendant_speech' && isDefendant) {
      socket.emit('court:submitDefendantStatement', { argument: inputValue });
    } else if (courtSession.phase === 'closing' && isLawyer) {
      socket.emit('court:submitClosingArgument', { argument: inputValue });
    }
    setInputValue('');
  };

  const renderActionArea = () => {
    if (courtSession.phase === 'statements' && isLawyer) {
      return (
        <form onSubmit={handleSubmit} className="w-full flex gap-2 animate-fade-in">
          <input
            type="text"
            className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors"
            placeholder="Escribe tu alegato de apertura..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-light transition-colors">
            Enviar
          </button>
        </form>
      );
    }

    if (courtSession.phase === 'defendant_speech' && isDefendant) {
      return (
        <form onSubmit={handleSubmit} className="w-full flex gap-2 animate-fade-in">
          <input
            type="text"
            className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors"
            placeholder="Escribe tu declaración..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-light transition-colors">
            Enviar
          </button>
        </form>
      );
    }

    if (courtSession.phase === 'closing' && isLawyer) {
      return (
        <form onSubmit={handleSubmit} className="w-full flex gap-2 animate-fade-in">
          <input
            type="text"
            className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors"
            placeholder="Escribe tu alegato final..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-light transition-colors">
            Enviar
          </button>
        </form>
      );
    }

    // Para el resto de los roles o fases donde no actúan
    if (['statements', 'closing'].includes(courtSession.phase)) {
      return (
        <div className="w-full text-center py-3 bg-surface/50 rounded-xl border border-surface-border/50 text-gray-500 italic text-sm animate-fade-in">
          Esperando al abogado defensor...
        </div>
      );
    }
    
    if (courtSession.phase === 'defendant_speech') {
      return (
        <div className="w-full text-center py-3 bg-surface/50 rounded-xl border border-surface-border/50 text-gray-500 italic text-sm animate-fade-in">
          Esperando la declaración del acusado...
        </div>
      );
    }

    return null;
  };

  const translatePhase = (phase) => {
    const phases = {
      roulette: 'Selección de Defensor',
      opening: 'Audiencia de Apertura',
      statements: 'Alegatos',
      defendant_speech: 'Declaración del Imputado',
      evidence: 'Presentación de Pruebas',
      ai_duel: 'Duelo de IA',
      closing: 'Alegatos de Clausura',
      deliberation: 'Deliberación',
      verdict: 'Veredicto'
    };
    return phases[phase] || phase;
  };

  return (
    <div className="fixed inset-0 z-[30000] bg-[#05050a]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="max-w-3xl w-full bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
        {/* Header */}
        <div className="text-center border-b border-surface-border pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center justify-center gap-3">
            <span className="text-brand-light">⚖️</span> 
            Corte Suprema
            <span className="text-brand-light">⚖️</span>
          </h2>
          <div className="inline-block bg-brand/10 border border-brand/20 px-4 py-1.5 rounded-full">
            <p className="text-brand-light font-bold text-xs uppercase tracking-[0.2em]">
              Fase: {translatePhase(courtSession.phase)}
            </p>
          </div>
        </div>

        {/* Roles Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border transition-colors ${isDefendant ? 'border-red-500/50 bg-red-500/10' : 'border-surface-border bg-surface'}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Acusado</p>
            <p className={`font-bold text-lg ${isDefendant ? 'text-red-400' : 'text-white'}`}>
              {courtSession.defendant?.nombre || 'Desconocido'}
              {isDefendant && <span className="ml-2 text-xs text-red-500/80">(Tú)</span>}
            </p>
          </div>
          <div className={`p-4 rounded-2xl border transition-colors ${isLawyer ? 'border-brand/50 bg-brand/10' : 'border-surface-border bg-surface'}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Abogado Defensor</p>
            <p className={`font-bold text-lg ${isLawyer ? 'text-brand-light' : 'text-white'}`}>
              {courtSession.lawyer?.nombre || 'Buscando al azar...'}
              {isLawyer && <span className="ml-2 text-xs text-brand-light/80">(Tú)</span>}
            </p>
          </div>
        </div>

        {/* Judge Message */}
        <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6 text-center animate-slide-up">
          <p className="text-white text-lg font-medium italic leading-relaxed">
            "{courtSession.judgeMessage}"
          </p>
        </div>

        {/* Evidence View */}
        {courtSession.phase === 'evidence' && courtSession.evidence && (
          <div className="bg-surface border border-surface-border rounded-2xl p-5 animate-fade-in">
            <h4 className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-3">Evidencia Registrada</h4>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
              {courtSession.evidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Duel View */}
        {courtSession.phase === 'ai_duel' && courtSession.aiBattle && (
          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
            {courtSession.aiBattle.map((msg, i) => (
              <div key={i} className={`p-4 rounded-2xl border text-sm animate-slide-up shadow-sm ${
                msg.role === 'prosecutor' 
                  ? 'bg-red-500/5 border-red-500/20 text-red-100 mr-8' 
                  : 'bg-blue-500/5 border-blue-500/20 text-blue-100 ml-8'
              }`} style={{ animationDelay: `${i * 200}ms` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${msg.role === 'prosecutor' ? 'bg-red-400' : 'bg-blue-400'}`} />
                  <span className={`font-bold text-xs uppercase tracking-wider ${msg.role === 'prosecutor' ? 'text-red-400' : 'text-blue-400'}`}>
                    {msg.label}
                  </span>
                </div>
                <p className="leading-relaxed opacity-90">{msg.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action Area (For Lawyer / Defendant) */}
        {renderActionArea()}

        {/* Verdict Phase */}
        {courtSession.phase === 'verdict' && (
          <div className={`p-8 rounded-3xl text-center border animate-slide-up shadow-2xl ${
            courtSession.verdict === 'pardon' 
              ? 'bg-green-500/10 border-green-500/30 shadow-green-500/10' 
              : 'bg-red-500/10 border-red-500/30 shadow-red-500/10'
          }`}>
            <h3 className={`text-4xl font-black uppercase tracking-widest mb-4 ${
              courtSession.verdict === 'pardon' ? 'text-green-400' : 'text-red-400'
            }`}>
              {courtSession.verdict === 'pardon' ? '¡Absuelto!' : 'Culpable'}
            </h3>
            <p className="text-white text-lg leading-relaxed max-w-xl mx-auto">
              {courtSession.verdictReason}
            </p>
            {courtSession.verdict === 'pardon' && (
              <div className="mt-6 inline-block bg-green-500/20 border border-green-500/30 rounded-xl px-6 py-3">
                <p className="text-green-300 text-sm font-bold flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  +3000 pts para el Abogado Defensor
                </p>
              </div>
            )}
            {courtSession.verdict !== 'pardon' && (
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest mt-6">
                La sentencia es definitiva.
              </p>
            )}
          </div>
        )}

        {/* Timer Progress */}
        {timeLeft > 0 && courtSession.phase !== 'verdict' && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="flex justify-center items-center gap-2 text-gray-400 font-bold">
              <span className="animate-pulse">⏳</span>
              <span className="font-mono">{timeLeft}s</span>
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / courtSession.timer) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
