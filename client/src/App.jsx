/**
 * App.jsx — Raíz de la Aplicación
 * =====================================
 * Layout principal: Login Global, Sidebar dinámico.
 */

import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import DebateChart from './components/DebateChart'
import StudentDebate from './components/StudentDebate'
import BracketBoard from './components/BracketBoard'
import Leaderboard from './components/Leaderboard'
import PlayersTable from './components/PlayersTable'
import SessionModule from './components/SessionModule'
import ConfigModule from './components/ConfigModule'
import DiplomasModule from './components/DiplomasModule'
import Login from './components/Login'
import StudentDashboard from './components/StudentDashboard'
import ChangePasswordModal from './components/ChangePasswordModal'
import TriviaArena from './components/TriviaArena'
import AdminTrivia from './components/AdminTrivia'
import ChatModule from './components/ChatModule'
import WaitingRoom from './components/WaitingRoom'
import PollWidget from './components/PollWidget'
import FormQR from './components/FormQR'
import MinecraftEvaluation from './components/MinecraftEvaluation'
import MinecraftTournament from './components/MinecraftTournament'
import MortalKombatEvaluation from './components/MortalKombatEvaluation'
import MortalKombatTournament from './components/MortalKombatTournament'
import GarticArena from './components/GarticArena'
import AdminGartic from './components/AdminGartic'
import InfiltradoArena from './components/InfiltradoArena'
import AdminInfiltrado from './components/AdminInfiltrado'
import VotingArena from './components/VotingArena'
import AdminVoting from './components/AdminVoting'
import DirectMessages from './components/DirectMessages'
import PixelQuizArena from './components/PixelQuizArena'
import AdminPixelQuiz from './components/AdminPixelQuiz'
import TournamentPlanner from './components/TournamentPlanner'
import TimelineModule from './components/TimelineModule'
import PublicRegisterForm from './components/PublicRegisterForm'
import useStore from './store/useStore'
import { fetchSettings } from './api/api'
import { getSocket } from './api/socket'
import config from './config/env'

const VIEW_TITLES = {
  debate:            { title: 'Fase de Debate',         sub: 'Votos por Juego Propuesto · 8 Abril 2026' },
  bracket:           { title: 'Bracket Manager',        sub: 'Temporada Regular & Súper Torneo · Abr–Jun 2026' },
  leaderboard:       { title: 'Ranking Mensual',        sub: 'Top 5 · Temporada Regular' },
  players:           { title: 'Roster de Jugadores',    sub: 'Todos los inscritos · Fuente: Google Sheets' },
  hardware:          { title: 'Sesiones',               sub: 'Asistencia · Equipos por sesión · Reportes' },
  diplomas:          { title: 'Reconocimientos',        sub: 'Generación de Diplomas y Premios' },
  timeline:          { title: 'Línea de Tiempo',         sub: 'Nuestra Historia & Hitos' },
  config:            { title: 'Configuración',          sub: 'Variables de entorno y servidor' },
  'student-history': { title: 'Mi Historial',           sub: 'Asistencia y Equipos Registrados' },
  trivia:            { title: 'Arena de Trivia',        sub: 'Preguntas en Tiempo Real · Facciones · Comodines' },
  chat:              { title: 'Chat del Club',           sub: 'Mensajería en tiempo real · GIFs · Emojis' },
  'waiting-room':    { title: 'Sala de Espera',          sub: 'Arcade Hall · Minijuegos Multijugador' },
  'form-qr':         { title: 'Formulario QR',           sub: 'Escaneo rápido para Google Forms' },
  'minecraft-eval':  { title: 'Escrutinio MC',           sub: 'Evaluación PvP Simultánea' },
  'minecraft-torneo':{ title: 'Torneo Minecraft PvP',   sub: 'Gauntlet · Grupos A/B/C · Escalada al Título' },
  'mk-eval':         { title: 'Escrutinio MK XL',         sub: 'Evaluación Mortal Kombat · Casual / Peleador / Experto' },
  'mk-torneo':       { title: 'Torneo Mortal Kombat XL',  sub: 'Desafío a los Jefes · Bloques A/B · Boss Fight · Gran Final' },
  gartic:            { title: 'Gartic Club',             sub: 'El teléfono descompuesto dibujado' },
  infiltrado:        { title: 'Infiltrado Arena',        sub: 'Juego de deducción, asociación mental y camuflaje gamer' },
  'direct-messages': { title: 'Mensajes Directos',       sub: 'Conversaciones 1-a-1' },
  'voting':          { title: 'Votación de Juegos',      sub: 'Elige tu juego · Los 3 más votados definen la Trivia' },
  'pixel-quiz':      { title: 'Pixel Quiz Arena',         sub: 'Trivia 1v1 · King of the Hill · 15s por pregunta' },
  'planner':         { title: 'Planificador de Evento',   sub: 'Estimación de tiempos y gestión de estaciones' },
}

function ContentView({ view, user }) {
  switch (view) {
    case 'debate':          return (user?.role === 'student' || user?.role === 'guest') ? <StudentDebate /> : <DebateChart />
    case 'bracket':         return <BracketBoard />
    case 'leaderboard':     return <Leaderboard />
    case 'players':         return <PlayersTable />
    case 'hardware':        return <SessionModule />
    case 'diplomas':        return <DiplomasModule />
    case 'timeline':        return <TimelineModule />
    case 'config':          return <ConfigModule />
    case 'student-history': return <StudentDashboard />
    case 'trivia':          return (user?.role === 'student' || user?.role === 'guest') ? <TriviaArena /> : <AdminTrivia />
    case 'chat':            return <ChatModule />
    case 'waiting-room':    return <WaitingRoom />
    case 'form-qr':         return <FormQR />
    case 'minecraft-eval':  return <MinecraftEvaluation />
    case 'minecraft-torneo': return <MinecraftTournament />
    case 'mk-eval':         return <MortalKombatEvaluation />
    case 'mk-torneo':       return <MortalKombatTournament />
    case 'gartic':          return (user?.role === 'student' || user?.role === 'guest') ? <GarticArena /> : <AdminGartic />
    case 'infiltrado':      return (user?.role === 'student' || user?.role === 'guest') ? <InfiltradoArena /> : <AdminInfiltrado />
    case 'direct-messages': return <DirectMessages />
    case 'voting':          return (user?.role === 'student' || user?.role === 'guest') ? <VotingArena /> : <AdminVoting />
    case 'pixel-quiz':      return (user?.role === 'student' || user?.role === 'guest') ? <PixelQuizArena /> : <AdminPixelQuiz />
    case 'planner':         return <TournamentPlanner />
    default:                return <StudentDashboard />
  }
}

// Detecta si estamos en entorno testing (ruta /testing o parametro testing)
const isTesting = window.location.href.toLowerCase().includes('testing');

export default function App() {
  const { activeView, user, logout, visibleModules, setVisibleModules } = useStore()
  const { title, sub } = VIEW_TITLES[activeView] || VIEW_TITLES.debate
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false)
  const [registerGame, setRegisterGame] = useState(null)

  // Check url parameters for registration QR code scans
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reg = params.get('register');
    if (reg === 'minecraft' || reg === 'mortal_kombat' || reg === 'mortalkombat' || reg === 'mk') {
      setRegisterGame(reg === 'minecraft' ? 'minecraft' : 'mortalkombat');
    }
  }, []);

  // Fetch settings on load if user is logged in
  useEffect(() => {
    if (user) {
      fetchSettings()
        .then(data => setVisibleModules(data.visibleModules || []))
        .catch(err => console.error("Error cargando configuración:", err))
      if (user?.role) {
        const socket = getSocket(user);
        const handleSettingsUpdate = (payload) => {
          if (Array.isArray(payload)) {
            setVisibleModules(payload);
          } else {
            if (payload.visibleModules) setVisibleModules(payload.visibleModules);
            // Si el admin bloqueó el login, echamos a los estudiantes en vivo
            if (payload.loginActive === false && (user.role === 'student' || user.role === 'guest') && !isTesting) {
              logout();
            }
          }
        };

        socket.on('settings:updated', handleSettingsUpdate);

        return () => {
          socket.off('settings:updated', handleSettingsUpdate);
        }
      }
    }
  }, [user, setVisibleModules])

  // Keep-alive ping for Render backend to prevent sleep when client is active
  useEffect(() => {
    if (!user) return;

    const ping = () => {
      fetch(`${config.API_URL}/health`)
        .then(res => res.json())
        .then(data => console.log('[Keep-Alive] Server is awake:', data))
        .catch(err => console.error('[Keep-Alive] Failed to ping server:', err));
    };

    ping(); // Ping immediately on load/login

    const interval = setInterval(ping, 300000); // Ping every 5 minutes
    return () => clearInterval(interval);
  }, [user]);

  // ─── QR Registration Form Gate ───────────────────────────────────────────────
  if (registerGame) {
    return (
      <PublicRegisterForm 
        game={registerGame} 
        onCancel={() => {
          setRegisterGame(null);
          const url = new URL(window.location);
          url.searchParams.delete('register');
          window.history.replaceState({}, '', url);
        }} 
      />
    );
  }

  // ─── Global Login Gate ────────────────────────────────────────────────────────
  if (!user) {
    return <Login />
  }

  const isAdmin = user.role === 'admin';
  
  // Decide what to actually render.
  // if student-history, it's always allowed for students
  let actualView = activeView;
  let isModuleVisible = false;
  
  if (isAdmin) {
    isModuleVisible = true;
  } else {
    // Alumnos:
    if (actualView === 'student-history') {
      isModuleVisible = true;
    } else if (visibleModules.includes(actualView) && actualView !== 'config') {
      isModuleVisible = true;
    } else {
      // Not allowed or hidden, fallback to student-history
      actualView = 'student-history';
      isModuleVisible = true; 
    }
  }

  const currentTitle = VIEW_TITLES[actualView]?.title || 'Dashboard';
  const currentSub = VIEW_TITLES[actualView]?.sub || '';

  return (
    <div className="flex h-screen bg-surface overflow-hidden w-full">
      {/* Sidebar para admin y estudiantes */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentView={actualView} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full md:ml-64 relative">
        {isTesting && isAdmin && (
          <div className="bg-orange-500/20 border-b border-orange-500/50 text-orange-200 px-4 py-2 text-sm font-bold text-center flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            MODO TESTING: Los estudiantes no verán los cambios que realices aquí (URL: /testing).
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-surface-border bg-surface-card sticky top-0 z-10 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 text-gray-400 hover:text-white bg-surface rounded-lg border border-surface-border"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white leading-tight">
              {currentTitle}
            </h1>
          </div>
        </div>

        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
          {/* Top Bar for Desktop & Mobile User Menu */}
          <div className="flex justify-between items-start mb-6 animate-slide-up">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-white">
                {currentTitle}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{currentSub}</p>
            </div>

            {/* User Dropdown / Info */}
            <div className="flex items-center gap-4 bg-surface-card px-4 py-2 rounded-xl border border-surface-border ml-auto">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white">{user.nombre}</span>
                <span className="text-[10px] uppercase tracking-wider text-brand-light font-bold">
                  {user.role}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-brand-light">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 ml-2 border-l border-surface-border pl-4">
                {!isAdmin && (
                  <button 
                    onClick={() => setIsPwdModalOpen(true)}
                    className="p-1.5 text-gray-400 hover:text-brand transition-colors"
                    title="Cambiar Contraseña"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </button>
                )}
                <button 
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  title="Cerrar Sesión"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Rutas de Contenido */}
          <div key={actualView} className="animate-slide-up">
            <ContentView view={actualView} user={user} />
          </div>
        </div>
      </main>

      {/* Modal Cambio de Contraseña (Solo Alumnos) */}
      <ChangePasswordModal isOpen={isPwdModalOpen} onClose={() => setIsPwdModalOpen(false)} />

      {/* Poll Widget Global */}
      <PollWidget />
    </div>
  )
}
