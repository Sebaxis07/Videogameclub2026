/**
 * StudentDashboard.jsx
 * ====================
 * Vista principal para estudiantes.
 * Muestra resumen personal y su historial de asistencia y equipos.
 */

import React, { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { fetchStudentHistory } from '../api/api'

// Helper para farmatear fecha localmente (ISO a DD/MM/YYYY)
function formatDate(isoDate) {
  if (!isoDate) return 'Fecha desconocida';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export default function StudentDashboard() {
  const { user } = useStore()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.nombre) return;
    
    setLoading(true);
    fetchStudentHistory(user.nombre)
      .then(data => {
        // history = [{ sessionId, date, status, game, present, equipment: [] }]
        // Ordenamos desc por fecha
        const sorted = (data.history || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(sorted);
      })
      .catch(err => {
        console.error("Error al cargar historial:", err);
        setError('No se pudo cargar tu historial.');
      })
      .finally(() => {
        setLoading(false);
      })
  }, [user]);

  // Contadores para resumen rápido
  const totalAsistencias = history.filter(s => s.present).length;
  const totalEquiposPuestos = history.reduce((acc, s) => acc + (s.equipment?.length || 0), 0);

  return (
    <div className="animate-fade-in flex flex-col items-center min-h-[60vh] px-2 md:px-0">
      
      {/* ── HEADER DEL ESTUDIANTE ── */}
      <div className="w-full bg-surface-card border border-surface-border rounded-2xl shadow-lg p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0 w-24 h-24 rounded-full bg-brand/20 border-4 border-brand/40 flex items-center justify-center shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-brand-light">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        
        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl font-extrabold text-white mb-1 tracking-tight">{user?.nombre || 'Estudiante'}</h2>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start items-center text-sm font-medium">
            <span className="text-gray-400 font-mono tracking-wider bg-surface px-2 py-0.5 rounded border border-surface-border">
              {user?.rut}
            </span>
            <span className="text-brand-light bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md uppercase text-xs tracking-bold">
              Rol: {user?.role}
            </span>
          </div>
        </div>

        {/* Cajas de resumen numérico */}
        <div className="flex gap-4">
          <div className="bg-surface border border-surface-border px-4 py-3 rounded-xl text-center min-w-[100px]">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Asistencias</p>
            <p className="text-2xl font-black text-brand-light leading-none">{loading ? '-' : totalAsistencias}</p>
          </div>
          <div className="bg-surface border border-surface-border px-4 py-3 rounded-xl text-center min-w-[100px]">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Préstamos</p>
            <p className="text-2xl font-black text-white leading-none">{loading ? '-' : totalEquiposPuestos}</p>
          </div>
        </div>
      </div>

      {/* ── LISTADO DE HISTORIAL ── */}
      <div className="w-full">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-surface-border pb-2 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-brand">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historial de Sesiones
        </h3>

        {error && (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <svg className="animate-spin mx-auto h-8 w-8 text-brand-light mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-gray-400">Cargando tu registro histórico...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 bg-surface-card rounded-2xl border border-surface-border/50 border-dashed">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">Aún no hay registros de tus sesiones.</p>
            <p className="text-gray-500 text-sm mt-1">Conforme asistas al club, aparecerá tu historial aquí.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((session, i) => (
              <div key={session.sessionId || i} className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-brand/40 transition-colors">
                
                {/* Session Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-bold text-white">{formatDate(session.date)}</span>
                      {session.status === 'active' && (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                          En Curso
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-brand-light">
                      Juego/Evento: <span className="text-white">{session.game || 'No especificado'}</span>
                    </p>
                  </div>

                  {/* Asistencia Badge */}
                  <div className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm border shadow-sm ${
                    session.present 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {session.present ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        Presente
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Ausente
                      </>
                    )}
                  </div>
                </div>

                {/* Equipment Section */}
                {session.present && (
                  <div className="mt-4 bg-surface rounded-lg p-4 border border-surface-border/50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                      Equipos Registrados
                    </h4>
                    
                    {(!session.equipment || session.equipment.length === 0) ? (
                      <p className="text-sm text-gray-500 italic">No trajiste ni solicitaste equipos en esta sesión.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {session.equipment.map((eq) => (
                          <div key={eq.id} className="flex flex-col p-3 bg-surface-card border border-surface-border rounded-lg relative overflow-hidden group hover:border-brand/30 transition-colors">
                            <div className={`absolute top-0 right-0 w-2 h-full ${eq.returnedAt ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <div className="flex justify-between items-start pr-3">
                              <span className="font-semibold text-white text-sm">
                                {eq.brand} {eq.model}
                              </span>
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${eq.returnedAt ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                {eq.returnedAt ? 'Devuelto' : 'Prestado'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider">{eq.type}</p>
                            {eq.description && (
                              <p className="text-xs text-gray-400 mt-2 truncate max-w-[200px]" title={eq.description}>{eq.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
