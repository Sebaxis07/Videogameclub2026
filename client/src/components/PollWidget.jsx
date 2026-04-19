import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

export default function PollWidget() {
  const { user } = useStore();
  const [poll, setPoll] = useState(null);
  const [isOpen, setIsOpen] = useState(false); // Controls expansion
  const [hasVoted, setHasVoted] = useState(false);
  const [socket, setSocket] = useState(null);
  
  // Admin form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    if (!user) return;
    const s = getSocket(user);
    setSocket(s);

    const handlePollState = (p) => {
      setPoll(p);
      if (p) {
        setIsOpen(true);
        if (p.votedUsers && user && p.votedUsers.includes(user.rut || s.id)) {
          setHasVoted(true);
        } else {
          setHasVoted(false);
        }
      } else {
        setHasVoted(false);
        setIsOpen(false);
      }
    };

    s.on('poll:state', handlePollState);
    return () => {
      s.off('poll:state', handlePollState);
    };
  }, [user]);

  const isAdmin = user?.role === 'admin';

  // --- Admin Handlers ---
  const handleAddOption = () => setOptions([...options, '']);
  const handleOptionChange = (idx, val) => {
    const newOptions = [...options];
    newOptions[idx] = val;
    setOptions(newOptions);
  };
  
  const handleStartPoll = () => {
    const validOptions = options.filter(o => o.trim() !== '');
    if (!question.trim() || validOptions.length < 2) return alert('Debes ingresar una pregunta y al menos dos opciones');
    socket.emit('admin:start-poll', { question, options: validOptions });
    setQuestion('');
    setOptions(['', '']);
  };

  const handleClosePoll = () => {
    socket.emit('admin:close-poll');
  };

  const handleClearPoll = () => {
    socket.emit('admin:clear-poll');
  };

  // --- Student Handlers ---
  const handleVote = (idx) => {
    socket.emit('student:vote-poll', { rut: user.rut, optionIndex: idx });
    setHasVoted(true);
  };

  if (!isAdmin && !poll) return null;

  // Render Widget
  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 shadow-2xl ${isOpen ? 'left-4 sm:left-auto w-auto sm:w-96' : 'w-16 h-16 rounded-full cursor-pointer overflow-hidden'}`}>
      
      {/* Minimized Icon view */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full h-full bg-brand hover:bg-brand-light flex items-center justify-center rounded-full text-white animate-pulse-slow"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}

      {/* Expanded view */}
      {isOpen && (
        <div className="bg-surface-card border border-surface-border rounded-xl flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-3 border-b border-surface-border flex justify-between items-center bg-brand/10 rounded-t-xl">
            <h3 className="text-white font-bold inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-brand">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Encuesta Rápida
            </h3>
            <div className="flex items-center gap-2">
              {isAdmin && !poll && (
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar">
            {isAdmin && !poll ? (
              // ADMIN CREATION VIEW
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1 block">Pregunta</label>
                  <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Ej. ¿Qué pedimos para comer?"
                    className="w-full bg-surface-hover text-white rounded-lg p-2 text-sm border border-surface-border focus:border-brand outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1 block">Opciones</label>
                  {options.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={e => handleOptionChange(idx, e.target.value)}
                      placeholder={`Opción ${idx + 1}`}
                      className="w-full bg-surface-hover text-white rounded-lg p-2 text-sm border border-surface-border mt-2 focus:border-brand outline-none"
                    />
                  ))}
                  <button onClick={handleAddOption} className="text-xs text-brand hover:text-brand-light mt-2 font-bold">+ Añadir opción</button>
                </div>
                <button
                  onClick={handleStartPoll}
                  className="w-full btn-primary py-2 rounded-lg text-sm font-bold shadow-lg"
                >
                  Lanzar Encuesta a todos
                </button>
              </div>
            ) : poll ? (
              // ACTIVE/CLOSED POLL VIEW (Admin & Students)
              <div className="space-y-4">
                <div className="text-center">
                  {!poll.active && <span className="text-[10px] font-bold uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full mb-2 inline-block">Cerrada</span>}
                  <h4 className="text-lg font-black text-white leading-tight">{poll.question}</h4>
                </div>
                
                <div className="space-y-2">
                  {poll.options.map((opt, idx) => {
                    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
                    const pct = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                    
                    const canVote = !isAdmin && poll.active && !hasVoted;
                    return (
                      <button 
                        key={idx}
                        onClick={() => canVote && handleVote(idx)}
                        disabled={!canVote}
                        className={`w-full relative overflow-hidden rounded-lg border text-left flex items-center justify-between p-3 transition-colors ${
                          canVote ? 'hover:border-brand hover:bg-brand/10 border-surface-border bg-surface-hover cursor-pointer' 
                          : 'border-surface-border bg-surface cursor-default'
                        }`}
                      >
                        {/* Progress Bar (visible if voted, or admin, or closed) */}
                        {(!poll.active || hasVoted || isAdmin) && (
                          <div className="absolute left-0 top-0 bottom-0 bg-brand/20 transition-all duration-500" style={{ width: `${pct}%`}}></div>
                        )}
                        <span className="relative z-10 text-sm font-medium text-white">{opt.text}</span>
                        {(!poll.active || hasVoted || isAdmin) && (
                          <span className="relative z-10 text-xs text-gray-400 font-bold">{pct}% ({opt.votes})</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-center text-gray-500">
                  {poll.votedUsers.length} voto(s) totales
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t border-surface-border">
                    {poll.active ? (
                      <button onClick={handleClosePoll} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-md text-xs font-bold transition-colors">
                        Cerrar Votación
                      </button>
                    ) : (
                      <button onClick={handleClearPoll} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded-md text-xs font-bold transition-colors">
                        Ocultar y Crear Nueva
                      </button>
                    )}
                  </div>
                )}
                {!isAdmin && !poll.active && (
                  <button onClick={() => setIsOpen(false)} className="w-full mt-2 text-xs text-gray-500 underline hover:text-white">
                    Minimizar widget
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
