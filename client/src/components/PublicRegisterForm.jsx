import React, { useState, useEffect } from 'react';
import { publicRegisterPlayer } from '../api/api';

export default function PublicRegisterForm({ game: initialGame, onCancel }) {
  const [game, setGame] = useState(initialGame || 'minecraft');
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // Set default level when game changes
  useEffect(() => {
    if (game === 'minecraft') {
      setLevel('B'); // Default Tier B
    } else {
      setLevel('Plata'); // Default Plata
    }
  }, [game]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await publicRegisterPlayer({
        nombre: nombre.trim(),
        rut: rut.trim() || undefined,
        game,
        level
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al procesar el registro.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const isMC = game === 'minecraft';
  const accentColor = isMC ? 'emerald' : 'red';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans transition-all duration-700 bg-radial`}
      style={{
        background: isMC 
          ? 'radial-gradient(circle at center, #071c0b 0%, #020703 100%)'
          : 'radial-gradient(circle at center, #170406 0%, #050001 100%)'
      }}
    >
      <div className={`w-full max-w-lg bg-black/40 border backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500 ${
        isMC ? 'border-emerald-500/20 shadow-emerald-950/20' : 'border-red-500/20 shadow-red-950/20'
      } ${shake ? 'animate-shake' : ''}`}>

        {success ? (
          <div className="text-center py-10 animate-fade-in flex flex-col items-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 mb-6 ${
              isMC ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-red-600 bg-red-600/10 text-red-500'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">¡Inscripción Exitosa!</h2>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-8">
              Tu registro ha sido procesado. Ya estás integrado en el torneo de <strong className="text-white uppercase">{isMC ? 'Minecraft' : 'Mortal Kombat'}</strong>.
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                setNombre('');
                setRut('');
              }}
              className={`px-6 py-3 rounded-2xl text-xs uppercase tracking-wider font-black text-white transition-all w-full cursor-pointer hover:scale-[1.02] ${
                isMC 
                  ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                  : 'bg-red-600 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              }`}
            >
              Inscribir a otra persona
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-gray-300 font-bold mt-4 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Selector Header */}
            <div className="text-center pb-4 border-b border-white/5">
              <div className="flex justify-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setGame('minecraft')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
                    isMC 
                      ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  ⚔️ Minecraft
                </button>
                <button
                  type="button"
                  onClick={() => setGame('mortalkombat')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
                    !isMC 
                      ? 'bg-red-600/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                      : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  🐉 Mortal Kombat
                </button>
              </div>
              <h2 className="text-xl font-black text-white">Registro de Participantes</h2>
              <p className="text-xs text-gray-500 mt-1">
                Completa tus datos para ingresar al bracket del torneo en vivo.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-2xl text-center font-medium animate-fade-in">
                ⚠️ {error}
              </div>
            )}

            {/* Fields */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sebastián Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`w-full bg-black/40 border rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                    isMC 
                      ? 'border-white/10 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20' 
                      : 'border-white/10 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20'
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                  RUT <span className="text-gray-600 font-semibold">(Opcional para agilizar acceso)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 12.345.678-9"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  className={`w-full bg-black/40 border rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                    isMC 
                      ? 'border-white/10 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20' 
                      : 'border-white/10 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20'
                  }`}
                />
              </div>

              {/* Skill Level Selection */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                  ¿Cuál es tu nivel en el juego?
                </label>
                
                {isMC ? (
                  /* Minecraft Levels */
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { val: 'C', lbl: 'Principiante', sub: 'Tier C' },
                      { val: 'B', lbl: 'Intermedio', sub: 'Tier B' },
                      { val: 'A', lbl: 'Experto', sub: 'Tier A' }
                    ].map(lvl => (
                      <button
                        key={lvl.val}
                        type="button"
                        onClick={() => setLevel(lvl.val)}
                        className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                          level === lvl.val
                            ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400'
                            : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <p className="text-xs font-bold">{lvl.lbl}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">{lvl.sub}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Mortal Kombat Levels */
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { val: 'Bronce', lbl: 'Casual', sub: 'Novato' },
                      { val: 'Plata', lbl: 'Peleador', sub: 'Intermedio' },
                      { val: 'Oro', lbl: 'Experto', sub: 'Leyenda' }
                    ].map(lvl => (
                      <button
                        key={lvl.val}
                        type="button"
                        onClick={() => setLevel(lvl.val)}
                        className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                          level === lvl.val
                            ? 'bg-red-600/15 border-red-500 text-red-500'
                            : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <p className="text-xs font-bold">{lvl.lbl}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">{lvl.sub}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-2xl text-xs uppercase tracking-wider font-black text-white transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50 ${
                  isMC 
                    ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]' 
                    : 'bg-red-600 hover:bg-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                }`}
              >
                {loading ? 'Procesando registro...' : '¡Inscribirme en el Torneo!'}
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 text-center text-xs text-gray-500 hover:text-gray-300 font-bold transition-all bg-transparent border-0 cursor-pointer"
              >
                Cancelar y volver al Dashboard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
