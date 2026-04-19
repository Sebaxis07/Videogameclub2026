/**
 * ChangePasswordModal.jsx
 * =======================
 * Modal para que los estudiantes puedan cambiar
 * su contraseña predeterminada o actual.
 */

import React, { useState } from 'react'
import useStore from '../store/useStore'
import { changePassword } from '../api/api'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { user, logout } = useStore()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (newPassword !== confirmPassword) {
      return setError('Las nuevas contraseñas no coinciden')
    }
    if (newPassword.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres')
    }

    setLoading(true)
    try {
      await changePassword(user.rut, oldPassword, newPassword)

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        // Optionally logout user after password change to force fresh login
        // logout()
      }, 2000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError('')
    setSuccess(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-surface-card">
          <h3 className="text-lg font-bold text-white">Cambiar Contraseña</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">¡Contraseña Actualizada!</h4>
              <p className="text-gray-400 text-sm">Cerrando ventana...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-3 py-2 rounded text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase tracking-wider">Contraseña Actual *</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="input-field w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase tracking-wider">Nueva Contraseña *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 ml-1 uppercase tracking-wider">Confirmar Nueva Contraseña *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field w-full text-sm"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary py-2 px-6 text-sm flex items-center gap-2">
                  {loading ? 'Guardando...' : 'Guardar y Cambiar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
