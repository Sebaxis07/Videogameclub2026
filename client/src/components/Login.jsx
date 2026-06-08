/**
 * Login.jsx
 * ==========
 * Pantalla Global de Login para distinguir entre Admin (encargado)
 * y Estudiante (usando RUT/Contraseña).
 */

import React, { useState } from 'react'
import useStore from '../store/useStore'
import { loginUser, loginGuest, sendRsvp } from '../api/api'

export default function Login() {
  const { setUser } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestName, setGuestName] = useState('')

  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [rsvpSuccess, setRsvpSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginUser(username, password)
      setUser(data.user)
    } catch (err) {
      setError(err.message)
      setShake(true)
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginGuest(guestName)
      setUser(data.user)
    } catch (err) {
      setError(err.message)
      setShake(true)
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-6 font-sans">
      <div className={`w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden ${shake ? 'animate-shake' : ''}`}>

        {/* Header */}
        <div className="bg-brand/10 border-b border-surface-border px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-transparent pointer-events-none"></div>
          <div className="w-16 h-16 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center mx-auto mb-4 relative z-10 shadow-[0_0_15px_rgba(var(--brand-rgb),0.3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-brand-light">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-2xl relative z-10">Acceso al Dashboard</h2>
          <p className="text-gray-400 mt-2 text-sm relative z-10">Ingresá tus credenciales para continuar</p>
        </div>

        {/* Form */}
        {error.includes('LOGIN_NOT_AVAILABLE') ? (
          <div className="px-8 py-10 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Acceso No Disponible</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              El dashboard no está activo en este momento. Volvé el viernes entre las <strong className="text-white">16:30 y 19:30</strong>, o espera a que un administrador active el acceso.
            </p>

            {/* RSVP Section */}
            <div className="pt-4 border-t border-surface-border">
              {rsvpSuccess ? (
                <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm px-4 py-3 rounded-lg animate-fade-in text-center font-medium">
                  ¡Respuesta guardada con éxito!
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-white">¿Podrás asistir en esta sesión?</p>
                  <div className="flex gap-4 justify-center">
                    <button 
                      onClick={async () => {
                        setRsvpLoading(true)
                        try {
                          await sendRsvp(username, password, true)
                          setRsvpSuccess(true)
                        } catch (err) { alert(err.message) }
                        setRsvpLoading(false)
                      }}
                      disabled={rsvpLoading}
                      className="px-6 py-2.5 rounded-xl font-medium transition-all bg-brand/20 border border-brand/50 text-brand-light hover:bg-brand/30 w-32"
                    >
                      {rsvpLoading ? '...' : 'Sí, asistiré'}
                    </button>
                    <button 
                      onClick={async () => {
                        setRsvpLoading(true)
                        try {
                          await sendRsvp(username, password, false)
                          setRsvpSuccess(true)
                        } catch (err) { alert(err.message) }
                        setRsvpLoading(false)
                      }}
                      disabled={rsvpLoading}
                      className="px-6 py-2.5 rounded-xl font-medium transition-all bg-surface-border text-gray-400 hover:text-white hover:bg-surface-hover w-32 border border-transparent"
                    >
                      {rsvpLoading ? '...' : 'No puedo'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setError(''); setUsername(''); setPassword(''); setRsvpSuccess(false); }}
              className="btn-primary w-full py-3 mt-4"
            >
              Volver Atrás
            </button>
          </div>
        ) : (
          isGuestMode ? (
            <form onSubmit={handleGuestSubmit} className="px-8 py-8 space-y-6">
              {error && !error.includes('LOGIN_NOT_AVAILABLE') && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg text-center animate-fade-in">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 ml-1 uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="input-field w-full transition-all focus:ring-2 focus:ring-brand/50"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`btn-primary w-full py-3.5 text-[0.95rem] tracking-wide transition-all ${loading ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02]'}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Autenticando...
                  </span>
                ) : "Ingresar como Invitado"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGuestMode(false);
                    setError('');
                  }}
                  className="text-xs text-brand-light font-bold hover:underline bg-transparent border-0 cursor-pointer"
                >
                  Volver al inicio de sesión tradicional
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
              {error && !error.includes('LOGIN_NOT_AVAILABLE') && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg text-center animate-fade-in">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 ml-1 uppercase tracking-wider">
                    Usuario / RUT (Con punto y guion!)
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: admin o 12.345.678-9"
                    className="input-field w-full transition-all focus:ring-2 focus:ring-brand/50"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-gray-400 mb-1 ml-1 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña secreta"
                    className="input-field w-full pr-10 focus:ring-2 focus:ring-brand/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-300 transition-colors bg-transparent border-0 cursor-pointer"
                    tabIndex="-1"
                  >
                    {showPwd
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`btn-primary w-full py-3.5 text-[0.95rem] tracking-wide transition-all ${loading ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02]'}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Autenticando...
                  </span>
                ) : "Ingresar Plag"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsGuestMode(true);
                    setError('');
                  }}
                  className="text-xs text-brand-light font-bold hover:underline bg-transparent border-0 cursor-pointer"
                >
                  ¿Eres un invitado? Regístrate aquí
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  )
}
