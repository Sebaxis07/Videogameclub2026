/**
 * Sidebar.jsx
 * =====================================
 * Navegación lateral del Dashboard.
 * Admin puede alternar visibilidad de los módulos para alumnos.
 */

import React from 'react'
import useStore from '../store/useStore'
import SyncStatus from './SyncStatus'
import { toggleModuleVisibility, fetchSettings, toggleLoginActive } from '../api/api'

const NAV_ITEMS = [
  {
    id: 'debate',
    label: 'Debate',
    studentLabel: 'Votación',
    sublabel: '8 Abril',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M3 3v18l4-4h14V3H3z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
  },
  {
    id: 'bracket',
    label: 'Bracket',
    sublabel: 'Torneo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="2" y="3" width="6" height="4" rx="1" />
        <rect x="2" y="17" width="6" height="4" rx="1" />
        <rect x="16" y="10" width="6" height="4" rx="1" />
        <path d="M8 5h4v14H8M12 12h4" />
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Ranking',
    sublabel: 'Top 5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    id: 'players',
    label: 'Jugadores',
    sublabel: 'Roster',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
  {
    id: 'hardware',
    label: 'Sesiones',
    sublabel: 'Asistencia',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    id: 'diplomas',
    label: 'Diplomas',
    sublabel: 'Premios',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  },
  {
    id: 'trivia',
    label: 'Arena de Trivia',
    sublabel: 'Tiempo Real',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat del Club',
    sublabel: 'Mensajería',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    id: 'waiting-room',
    label: 'Sala de Espera',
    sublabel: 'Minijuegos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 00-1.5 1.5v1.5A1.5 1.5 0 006 12h8.25a1.5 1.5 0 001.5-1.5v-1.5a1.5 1.5 0 00-1.5-1.5h-3.75v0zM20.25 10.5v.75m0 3v.75m0 3v.75M8.25 21h7.5" />
      </svg>
    ),
  },
  {
    id: 'config',
    label: 'Configuración',
    sublabel: 'Ajustes del sistema',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: 'form-qr',
    label: 'Código QR',
    sublabel: 'Mostrar Link en Pantalla',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <path d="M15 15h6v6h-6zM3 9h6M15 9h6M9 3v6M21 3v6M9 15v6M21 15v6" />
        <path d="M12 3v18M3 12h18" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    id: 'minecraft-eval',
    label: 'Evaluación PvP',
    sublabel: 'Escrutinio MC',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 00-1.5 1.5v1.5A1.5 1.5 0 006 12h8.25a1.5 1.5 0 001.5-1.5v-1.5a1.5 1.5 0 00-1.5-1.5h-3.75v0zM20.25 10.5v.75m0 3v.75m0 3v.75M8.25 21h7.5" />
      </svg>
    ),
  },
]

// Iconos para Admin: ojo abierto / cerrado
const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeClosed = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);


export default function Sidebar({ isOpen, setIsOpen, currentView }) {
  const { activeView, setActiveView, user, visibleModules, setVisibleModules, triviaVisible } = useStore()
  const effectiveView = currentView || activeView;

  const isAdmin = user?.role === 'admin';
  const isAssistant = user?.role === 'asistente';
  const isAdminOrAssistant = isAdmin || isAssistant;
  const isTesting = window.location.href.toLowerCase().includes('testing');

  const [loginActive, setLoginActive] = React.useState(false);

  React.useEffect(() => {
    if (isAdmin) {
      fetchSettings().then(data => {
        if (data.loginActive !== undefined) {
          setLoginActive(data.loginActive);
        }
      }).catch(err => console.error("Error cargando settings", err));
    }
  }, [isAdmin]);

  const handleToggleLogin = async () => {
    try {
      const data = await toggleLoginActive();
      setLoginActive(data.loginActive);
    } catch (err) {
      console.error("Error al toggle login", err);
    }
  };

  // Alumnos solo ven lo que está en visibleModules, además de no ver config ni form-qr
  const displayedItems = NAV_ITEMS.filter(item => {
    if (isAdmin) return true;
    if (isAssistant && item.id !== 'config' && item.id !== 'form-qr') return true;
    if (item.id === 'config' || item.adminOnly) return false; // NUNCA para estudiantes
    const safeModules = Array.isArray(visibleModules) ? visibleModules : [];
    return safeModules.includes(item.id);
  });

  if (!isAdminOrAssistant) {
    displayedItems.unshift({
      id: 'student-history',
      label: 'Asistencia y equipos',
      sublabel: 'Historial Personal',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    });
  }

  const handleNavClick = (id) => {
    setActiveView(id)
    if (setIsOpen) setIsOpen(false) // Close sidebar on mobile after clicking
  }

  const handleToggleVisibility = async (e, moduleId) => {
    e.stopPropagation(); // Evitar cambiar de vista
    try {
      const data = await toggleModuleVisibility(moduleId);
      setVisibleModules(data.visibleModules);
    } catch (err) {
      console.error("Error al hacer toggle:", err);
    }
  }

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-surface-card border-r border-surface-border flex flex-col z-30 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-surface-border flex justify-between items-center bg-surface w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white text-lg glow-brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight tracking-wide">Club de</p>
              <p className="font-bold text-gradient text-sm leading-tight tracking-wide">Videojuegos</p>
            </div>
          </div>
          <div className="mt-1">
            <span className="badge bg-brand/15 text-brand-light text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
              {isAdmin ? "Admin" : (isAssistant ? "Asistente" : "Student")}
            </span>
          </div>
        </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 py-2 mb-1 flex justify-between">
          <span>Módulos</span>
          {isAdmin && <span className="text-gray-600 text-[9px]">VISIBLE (ALUMNOS)</span>}
        </p>
        
        {displayedItems.length === 0 && !isAdminOrAssistant ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-brand-light border border-brand/20 bg-brand/5 p-3 rounded-lg">
              No tienes módulos habilitados en este momento.
            </p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const isActive = effectiveView === item.id
            const safeModules = Array.isArray(visibleModules) ? visibleModules : [];
            const isVisibleToStudents = safeModules.includes(item.id)

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-brand/20 text-brand-light'
                      : 'text-gray-400 hover:bg-surface-hover hover:text-white'
                  }`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-brand-light' : 'text-gray-500 group-hover:text-white'}`}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm leading-tight">{(!isAdminOrAssistant && item.studentLabel) ? item.studentLabel : item.label}</p>
                    <p className="text-[10px] text-gray-600 leading-tight">{item.sublabel}</p>
                  </div>
                  {isActive && !isAdminOrAssistant && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-light shrink-0" />
                  )}
                </button>

                {/* Botón Admin: alternar visibilidad al alumno */}
                {isAdmin && item.id !== 'config' && (
                  <button
                    onClick={(e) => handleToggleVisibility(e, item.id)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors border ${
                      isVisibleToStudents 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                        : 'bg-surface-border text-gray-500 border-transparent hover:text-gray-300 hover:bg-surface-hover'
                    }`}
                    title={isVisibleToStudents ? "Ocultar a estudiantes" : "Mostrar a estudiantes"}
                  >
                    {isVisibleToStudents ? <EyeOpen /> : <EyeClosed />}
                  </button>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* Footer — Sync Status & Testing Mode */}
      <div className="p-3 border-t border-surface-border bg-surface-card flex flex-col gap-2">
        {isAdmin && (
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleToggleLogin}
              className={`w-full py-2 px-3 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all border ${loginActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/30'}`}
              title="Permitir o bloquear que los alumnos puedan hacer login"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {loginActive ? 'LOGIN ACTIVO' : 'LOGIN BLOQUEADO'}
            </button>

            <button 
              onClick={() => window.location.href = isTesting ? '/' : '/testing'}
              className={`w-full py-2 px-3 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors ${isTesting ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30' : 'bg-surface hover:bg-surface-hover text-gray-400 hover:text-white border border-surface-border'}`}
              title={isTesting ? "Volver al dashboard normal" : "Probar la app sin afectar a los alumnos"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {isTesting ? 'SALIR DE TESTING' : 'ENTRAR A TESTING'}
            </button>
          </div>
        )}
        <SyncStatus />
      </div>
      </aside>
    </>
  )
}
