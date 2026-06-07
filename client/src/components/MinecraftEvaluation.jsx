import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { fetchPlayers } from '../api/api';
import { getSocket } from '../api/socket';

const OPTIONS = ["Sí", "Más o menos", "No"];

const EVAL_FIELDS = [
  { key: 'controlHotbar',  label: 'Control Hotbar',            icon: '🎒', desc: 'Manejo ágil del inventario en combate' },
  { key: 'controlCriticos', label: 'Control Críticos',         icon: '⚔️', desc: 'Golpes críticos con timing correcto' },
  { key: 'dominioPvP',     label: 'Dominio en PvP',            icon: '🛡️', desc: 'Lectura y respuesta de combate' },
  { key: 'dominioClicks',  label: 'Dominio Clicks (Butterfly/Drag)', icon: '🖱️', desc: 'Velocidad y precisión de clicks' },
];

const BLANK_EVAL = {
  controlHotbar: 'Más o menos',
  controlCriticos: 'Más o menos',
  dominioPvP: 'Más o menos',
  dominioClicks: 'Más o menos',
};

const OPTION_CONFIG = {
  'Sí':          { color: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)',  glyph: '✓' },
  'Más o menos': { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.4)',  glyph: '~' },
  'No':          { color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)', glyph: '✗' },
};

/* ── Reusable sub-components ─────────────────────────────────────────── */

function SkillRow({ field, value, onChange, readOnly = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{field.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#d1d5db' }}>{field.label}</span>
        <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 'auto' }}>{field.desc}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {OPTIONS.map(opt => {
          const cfg = OPTION_CONFIG[opt];
          const isSelected = value === opt;
          return readOnly ? (
            <div
              key={opt}
              style={{
                flex: 1, textAlign: 'center', padding: '7px 4px',
                borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: isSelected ? cfg.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                color: isSelected ? cfg.color : '#374151',
                transition: 'all 0.2s',
              }}
            >
              {isSelected && <span style={{ marginRight: 3 }}>{cfg.glyph}</span>}{opt}
            </div>
          ) : (
            <label
              key={opt}
              style={{
                flex: 1, textAlign: 'center', padding: '7px 4px',
                borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: isSelected ? cfg.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                color: isSelected ? cfg.color : '#6b7280',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <input type="radio" name={`${field.key}`} value={opt} checked={isSelected}
                onChange={() => onChange(field.key, opt)} style={{ display: 'none' }} />
              {isSelected && <span style={{ marginRight: 3 }}>{cfg.glyph}</span>}{opt}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function EvalBadge({ status }) {
  const cfg = OPTION_CONFIG[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)', glyph: '?' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      {cfg.glyph} {status}
    </span>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

export default function MinecraftEvaluation() {
  const { players, user, setPlayers } = useStore();
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [player1, setPlayer1Raw] = useState('');
  const [eval1, setEval1] = useState({ ...BLANK_EVAL });

  const [player2, setPlayer2] = useState('');
  const [eval2, setEval2] = useState({ ...BLANK_EVAL });
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLabel, setPartnerLabel] = useState('');
  const [partnerScores, setPartnerScores] = useState({});

  const socketRef = useRef(null);
  const isAdmin          = user?.role === 'admin';
  const isAssistant      = user?.role === 'asistente';
  const isAdminOrAssistant = isAdmin || isAssistant;

  const myLabel     = isAdmin ? 'Admin' : 'Asistente';
  const partnerRole = isAdmin ? 'asistente' : 'admin';

  /* WebSocket */
  useEffect(() => {
    if (!isAdminOrAssistant) return;
    const socket = getSocket(user.role);
    socketRef.current = socket;

    socket.on('eval:fullState', (state) => {
      const partnerData = state[partnerRole];
      if (partnerData?.rut) {
        setPlayer2(partnerData.rut);
        setPartnerScores(partnerData.scores || {});
        setPartnerOnline(true);
        setPartnerLabel(partnerRole === 'admin' ? 'Admin' : 'Asistente');
      }
    });

    socket.on('eval:partnerUpdate', ({ role, rut, scores }) => {
      if (role === partnerRole) {
        setPlayer2(rut || '');
        setPartnerScores(scores || {});
        setPartnerOnline(!!rut);
        setPartnerLabel(role === 'admin' ? 'Admin' : 'Asistente');
      }
    });

    return () => {
      socket.off('eval:fullState');
      socket.off('eval:partnerUpdate');
    };
  }, [isAdminOrAssistant, partnerRole, user?.role]);

  const emitMyState = (rut, nombre, scores) => {
    socketRef.current?.emit('eval:update', { role: user.role, rut: rut || null, nombre: nombre || null, scores });
  };

  const setPlayer1 = (rut) => {
    setPlayer1Raw(rut);
    const p = players.find(pl => pl.rut === rut);
    
    let newEval = { ...BLANK_EVAL };
    if (rut) {
      const existingEval = evaluations.find(ev => ev.jugador?.rut === rut);
      if (existingEval) {
        newEval = {
          controlHotbar: existingEval.controlHotbar || 'Más o menos',
          controlCriticos: existingEval.controlCriticos || 'Más o menos',
          dominioPvP: existingEval.dominioPvP || 'Más o menos',
          dominioClicks: existingEval.dominioClicks || 'Más o menos',
        };
      }
    }
    
    setEval1(newEval);
    emitMyState(rut, p?.nombre, newEval);
  };

  const handleEval1Change = (key, value) => {
    const next = { ...eval1, [key]: value };
    setEval1(next);
    const p = players.find(pl => pl.rut === player1);
    emitMyState(player1, p?.nombre, next);
  };

  /* Data */
  useEffect(() => {
    if (isAdminOrAssistant) fetchEvaluations();
    if (players.length === 0) loadPlayers();
  }, [isAdminOrAssistant, players?.length]);

  const loadPlayers = async () => {
    try {
      const res = await fetchPlayers();
      if (res?.players) setPlayers(res.players);
    } catch (e) { console.error(e); }
  };

  const fetchEvaluations = async () => {
    try {
      const res = await fetch('/api/minecraft-eval');
      if (res.ok) setEvaluations(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const toSave = [];
    if (player1) {
      const p1Obj = players.find(p => p.rut === player1);
      toSave.push({ jugador: { rut: p1Obj.rut, nombre: p1Obj.nombre }, ...eval1 });
    }
    if (player2 && isAdmin) {
      const p2Obj = players.find(p => p.rut === player2);
      if (p2Obj) toSave.push({ jugador: { rut: p2Obj.rut, nombre: p2Obj.nombre }, ...partnerScores });
    }
    if (toSave.length === 0) { alert('Selecciona al menos un jugador.'); setIsLoading(false); return; }
    if (player1 && player2 && player1 === player2) { alert('No puedes evaluar al mismo jugador en ambas columnas.'); setIsLoading(false); return; }

    try {
      const res = await fetch('/api/minecraft-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations: toSave }),
      });
      if (res.ok) {
        setPlayer1('');
        fetchEvaluations();
      } else alert('Error al guardar.');
    } catch (e) { alert('Error de red.'); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta evaluación?')) return;
    try {
      const res = await fetch(`/api/minecraft-eval/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvaluations();
    } catch { alert('Error de red'); }
  };

  if (!isAdminOrAssistant) return null;

  const partnerPlayerObj = players.find(p => p.rut === player2);
  const partnerName      = partnerPlayerObj?.nombre || '';

  /* ── Styles ── */
  const cardStyle = (accent = '#4ade80') => ({
    background: 'rgba(10, 20, 12, 0.85)',
    border: `1px solid ${accent}22`,
    borderRadius: 18,
    padding: 22,
    backdropFilter: 'blur(12px)',
    position: 'relative',
    overflow: 'hidden',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'mcFadeIn 0.4s ease' }}>
      <style>{`
        @keyframes mcFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes mcPulse  { 0%,100% { box-shadow:0 0 0 0 rgba(74,222,128,0.5); } 50% { box-shadow:0 0 0 6px rgba(74,222,128,0); } }
        @keyframes mcSpin   { to { transform:rotate(360deg); } }
        .mc-btn { transition: all 0.18s ease !important; }
        .mc-btn:hover:not(:disabled) { transform: translateY(-1px) !important; filter: brightness(1.1); }
        .mc-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .mc-row:hover { background: rgba(74,222,128,0.05) !important; }
      `}</style>

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(5,46,22,0.9) 0%, rgba(8,15,10,0.95) 100%)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: 20, padding: '20px 26px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        boxShadow: '0 8px 40px rgba(74,222,128,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, #166534, #14532d)',
          border: '2px solid rgba(74,222,128,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, boxShadow: '0 4px 20px rgba(74,222,128,0.2)',
        }}>⚔️</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff',
            background: 'linear-gradient(90deg, #fff 30%, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Evaluación Minecraft PvP
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
            Evaluando simultáneamente con dos evaluadores · Sincronización en tiempo real
          </p>
        </div>

        {/* Sync badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 40,
          background: partnerOnline ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${partnerOnline ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
          fontSize: 12, fontWeight: 600,
          color: partnerOnline ? '#4ade80' : '#4b5563',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: partnerOnline ? '#4ade80' : '#374151',
            animation: partnerOnline ? 'mcPulse 2s infinite' : 'none',
          }} />
          {partnerOnline
            ? `🔗 ${partnerLabel} · "${partnerName}"`
            : `⬜ Esperando a ${partnerRole === 'admin' ? 'Admin' : 'Asistente'}…`}
        </div>
      </div>

      {/* ── Instruction strip ────────────────────────────── */}
      <div style={{
        background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)',
        borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#9ca3af',
        borderLeft: '3px solid #4ade80',
      }}>
        <strong style={{ color: '#4ade80' }}>{myLabel}</strong>: selecciona tu jugador en{' '}
        <em style={{ color: '#d1d5db' }}>Escrutinio A</em>. El{' '}
        <em style={{ color: '#d1d5db' }}>Escrutinio B</em> se sincroniza automáticamente con tu compañero.
      </div>

      {/* ── Dual evaluation columns ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

        {/* ── Escrutinio A — editable ─── */}
        <div style={{ ...cardStyle('#4ade80'), border: '1px solid rgba(74,222,128,0.2)' }}>
          {/* top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3,
            background: 'linear-gradient(90deg, #4ade80, #16a34a)', borderRadius: '18px 18px 0 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>A</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>Escrutinio A</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{myLabel} (Tú)</div>
            </div>
            <div style={{
              marginLeft: 'auto', padding: '3px 10px', borderRadius: 20,
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
              fontSize: 10, fontWeight: 700, color: '#4ade80',
            }}>EDITABLE</div>
          </div>

          {/* Player select */}
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <select
              id="mc-eval-player1-select"
              value={player1}
              onChange={e => setPlayer1(e.target.value)}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12,
                padding: '10px 14px', color: player1 ? '#fff' : '#6b7280',
                fontSize: 13, outline: 'none', cursor: 'pointer',
                appearance: 'none', WebkitAppearance: 'none',
              }}
            >
              <option value="">👤 Seleccionar Jugador 1...</option>
              {players.map(p => {
                const isEval = evaluations.some(ev => ev.jugador?.rut === p.rut);
                return (
                  <option key={p.rut} value={p.rut}>
                    {p.nombre}{isEval ? ' ✔ (Evaluado)' : ''}
                  </option>
                );
              })}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4ade80', pointerEvents: 'none' }}>▾</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {EVAL_FIELDS.map(field => (
              <SkillRow key={field.key} field={field} value={eval1[field.key]} onChange={handleEval1Change} />
            ))}
          </div>
        </div>

        {/* ── Escrutinio B — read-only (partner) ─── */}
        <div style={{
          ...cardStyle('#fbbf24'),
          border: `1px solid ${partnerOnline ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.05)'}`,
          opacity: partnerOnline ? 1 : 0.65,
          transition: 'all 0.3s',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: 3,
            background: partnerOnline
              ? 'linear-gradient(90deg, #fbbf24, #d97706)'
              : 'rgba(255,255,255,0.08)',
            borderRadius: '18px 18px 0 0',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: partnerOnline ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${partnerOnline ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              color: partnerOnline ? '#fbbf24' : '#4b5563',
            }}>B</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: partnerOnline ? '#fbbf24' : '#4b5563' }}>Escrutinio B</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{partnerLabel || (partnerRole === 'admin' ? 'Admin' : 'Asistente')} (Compañero)</div>
            </div>
            {partnerOnline && (
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                fontSize: 10, fontWeight: 700, color: '#4ade80',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                EN VIVO
              </div>
            )}
          </div>

          {/* Partner player display */}
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 12,
            background: partnerOnline && partnerName ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${partnerOnline && partnerName ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
            fontSize: 13, fontWeight: 600,
            color: partnerOnline && partnerName ? '#fde68a' : '#374151',
            fontStyle: partnerOnline && partnerName ? 'normal' : 'italic',
          }}>
            {partnerOnline && partnerName ? `👤 ${partnerName}` : 'Sin selección del compañero aún…'}
          </div>

          {partnerOnline ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {EVAL_FIELDS.map(field => (
                <SkillRow key={field.key} field={field} value={partnerScores[field.key] || 'Más o menos'} readOnly />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#374151' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>
                Esperando conexión del {partnerRole === 'admin' ? 'Admin' : 'Asistente'}…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Save Button ───────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          id="mc-eval-save-btn"
          className="mc-btn"
          onClick={handleSave}
          disabled={isLoading || !player1}
          style={{
            background: isLoading || !player1
              ? 'rgba(74,222,128,0.2)'
              : 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
            border: `1px solid ${!player1 ? 'rgba(74,222,128,0.1)' : 'rgba(74,222,128,0.4)'}`,
            borderRadius: 14, padding: '12px 28px', color: '#fff',
            fontWeight: 800, fontSize: 15, cursor: !player1 || isLoading ? 'not-allowed' : 'pointer',
            opacity: !player1 ? 0.5 : 1,
            boxShadow: player1 ? '0 6px 24px rgba(74,222,128,0.25)' : 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          {isLoading ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'mcSpin 0.8s linear infinite' }} />
              Guardando…
            </>
          ) : (
            <>
              💾 {isAdmin ? 'Guardar Ambos Registros' : 'Guardar Mi Evaluación'}
            </>
          )}
        </button>
      </div>

      {/* ── Stored evaluations table ──────────────────────── */}
      <div style={{
        background: 'rgba(10,15,12,0.9)', border: '1px solid rgba(74,222,128,0.12)',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
      }}>
        {/* Table header */}
        <div style={{
          padding: '16px 22px',
          background: 'linear-gradient(90deg, rgba(22,101,52,0.6), rgba(10,15,12,0.6))',
          borderBottom: '1px solid rgba(74,222,128,0.12)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Registros de Evaluación</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{evaluations.length} jugador{evaluations.length !== 1 ? 'es' : ''} evaluado{evaluations.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80',
          }}>🔒 Solo Admin & Asistente</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
            <thead>
              <tr style={{ background: 'rgba(22,101,52,0.3)' }}>
                {['Estudiante', 'Control Hotbar', 'Control Críticos', 'Dominio PvP', 'Dom. Clicks', ...(isAdmin ? ['Acciones'] : [])].map(h => (
                  <th key={h} style={{
                    padding: '12px 18px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: '#4ade80',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(74,222,128,0.15)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ padding: '48px 24px', textAlign: 'center', color: '#374151' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div>
                    <p style={{ margin: 0, fontWeight: 600 }}>Aún no hay evaluaciones registradas.</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#374151' }}>Evalúa jugadores usando el formulario de arriba.</p>
                  </td>
                </tr>
              ) : (
                evaluations.map((ev, idx) => (
                  <tr
                    key={ev._id}
                    className="mc-row"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: '#4ade80',
                        }}>
                          {(ev.jugador?.nombre || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        {ev.jugador ? ev.jugador.nombre : <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Estudiante eliminado</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}><EvalBadge status={ev.controlHotbar} /></td>
                    <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}><EvalBadge status={ev.controlCriticos} /></td>
                    <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}><EvalBadge status={ev.dominioPvP} /></td>
                    <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}><EvalBadge status={ev.dominioClicks} /></td>
                    {isAdmin && (
                      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                        <button
                          className="mc-btn"
                          onClick={() => handleDelete(ev._id)}
                          style={{
                            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                            borderRadius: 8, padding: '5px 12px', color: '#f87171',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          🗑 Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
