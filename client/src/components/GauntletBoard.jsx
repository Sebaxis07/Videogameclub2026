import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RoundTimer } from './MinecraftTournament';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Configuración visual ────────────────────────────────────────────────────

const FASE_CONFIG = {
  grupos:     { label: 'Round Robin',   short: 'RR',     icon: '⚔️', color: '#60a5fa', tier: 0, desc: 'Todos contra todos dentro del mismo nivel' },
  promocion:  { label: 'Duelo de Promoción', short: 'Promo', icon: '🔺', color: '#34d399', tier: 1, desc: 'C1 vs B2 — El primer filtro (nerf al B)' },
  camino:     { label: 'Camino Élite',  short: 'Camino', icon: '⚡', color: '#fbbf24', tier: 2, desc: 'Peldaño 1 · Retador vs B1 (nerf al B)' },
  // gauntlet_1 y gauntlet_2 quedan como fases legacy — no se usan en el flujo actual
  gauntlet_1: { label: 'Gauntlet I',    short: 'G-I',    icon: '🔥', color: '#f97316', tier: 3, desc: '(Legacy) vs A4' },
  gauntlet_2: { label: 'Gauntlet II',   short: 'G-II',   icon: '🔥', color: '#ef4444', tier: 4, desc: '(Legacy) vs A3' },
  gauntlet_3: { label: 'Peldaño Final', short: 'G-III',  icon: '💀', color: '#a855f7', tier: 5, desc: 'Peldaño 2 · Retador vs A2 (nerf al A)' },
  gran_final: { label: 'Gran Final',    short: 'Final',  icon: '👑', color: '#eab308', tier: 6, desc: 'El Retador vs A1 — El Boss (nerf al A)' },
};

// Solo los 4 peldaños del diseño oficial: Promo → Camino → Peldaño vs A2 → Gran Final
const ESCALADA_ORDER = ['promocion', 'camino', 'gauntlet_3', 'gran_final'];

const ESTADO_CONFIG = {
  esperando_inicio: { label: 'Esperando',    color: '#6b7280', bg: '#6b728015' },
  jugando_grupos:   { label: 'En Grupos',    color: '#60a5fa', bg: '#60a5fa15' },
  eliminado:        { label: 'Eliminado',    color: '#ef4444', bg: '#ef444415' },
  promovido:        { label: 'Promovido',    color: '#34d399', bg: '#34d39915' },
  en_camino:        { label: 'En Camino',    color: '#fbbf24', bg: '#fbbf2415' },
  en_gauntlet:      { label: 'Gauntlet',     color: '#f97316', bg: '#f9731615' },
  finalista:        { label: 'Finalista',    color: '#a855f7', bg: '#a855f715' },
  campeon:          { label: '👑 Campeón',   color: '#eab308', bg: '#eab30815' },
};

const GRUPO_CONFIG = {
  A: { label: 'Expertos',      color: '#f87171', icon: '🔥', glow: '#ef4444' },
  B: { label: 'Intermedios',   color: '#fbbf24', icon: '⚡', glow: '#f59e0b' },
  C: { label: 'Principiantes', color: '#4ade80', icon: '🌱', glow: '#22c55e' },
};

const MEDAL = ['🥇', '🥈', '🥉'];

function getInitials(nombre = '') {
  return nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Subcomponente: Avatar del jugador ───────────────────────────────────────

function PlayerAvatar({ player, size = 36, showGrupo = true }) {
  const grupo = GRUPO_CONFIG[player?.grupo] || {};
  return (
    <div style={{
      position: 'relative',
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${grupo.color}30, ${grupo.color}10)`,
      border: `2px solid ${grupo.color}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: grupo.color,
      flexShrink: 0,
      boxShadow: `0 4px 14px ${grupo.color}20, inset 0 1px 0 ${grupo.color}30`,
    }}>
      {getInitials(player?.nombre || '??')}
      {showGrupo && player?.grupo && (
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          width: size * 0.45, height: size * 0.45, borderRadius: '50%',
          background: grupo.color, color: '#0a0a14',
          fontSize: size * 0.22, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #0a0a14',
        }}>
          {player.grupo}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponente: Tarjeta de Jugador ───────────────────────────────────────

function PlayerCard({ player, position = null, highlight = false }) {
  const estado = ESTADO_CONFIG[player.estado] || ESTADO_CONFIG.esperando_inicio;
  const grupo  = GRUPO_CONFIG[player.grupo] || {};
  const isPodium = position !== null && position < 3;
  const medal = isPodium ? MEDAL[position] : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: highlight ? `linear-gradient(90deg, ${grupo.color}15, transparent)` : '#1a1a2e',
      border: `1px solid ${highlight ? grupo.color + '40' : '#ffffff08'}`,
      borderRadius: 12, transition: 'all 0.2s',
      position: 'relative', overflow: 'hidden',
    }}>
      {isPodium && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
          background: `linear-gradient(180deg, ${grupo.color}, transparent)`,
        }} />
      )}
      {position !== null && (
        <span style={{
          fontSize: medal ? 20 : 13,
          color: medal ? undefined : '#6b7280',
          fontWeight: 800, minWidth: 24, textAlign: 'center',
        }}>
          {medal || `#${position + 1}`}
        </span>
      )}
      <PlayerAvatar player={player} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.nombre}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
          {(player.wins_grupos > 0 || player.derrotas_grupos > 0) && (
            <span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{player.wins_grupos || 0}W</span>
              <span style={{ color: '#4b5563', margin: '0 4px' }}>·</span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{player.derrotas_grupos || 0}L</span>
            </span>
          )}
          {/* Indicador de racha activa */}
          {(player.racha_actual || 0) > 0 && (
            <span style={{ color: '#f97316', fontWeight: 800, fontSize: 10 }}
              title={`Racha de ${player.racha_actual} victoria(s) — ¡3 seguidas = +9 pts!`}>
              {'🔥'.repeat(Math.min(player.racha_actual, 3))} {player.racha_actual === 2 ? '¡Falta 1!' : ''}
            </span>
          )}
          {player.wins_bracket > 0 && (
            <span style={{ color: '#a855f7', fontWeight: 700 }}>🏆 {player.wins_bracket}</span>
          )}
        </div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px',
        borderRadius: 10, background: estado.bg,
        color: estado.color, flexShrink: 0, whiteSpace: 'nowrap',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {estado.label}
      </span>
    </div>
  );
}

// ─── Ruleta Rusa: rueda de premios visual ───────────────────────────────────

// Paleta clásica de ruleta de feria: rojo, amarillo, azul, verde, azul marino,
// ciclando de forma que ningún color quede adyacente a sí mismo.
const WHEEL_PALETTE = ['#d92d20', '#f4c21c', '#1d7fcc', '#1aa64b', '#14307a'];

const KIT_WHEEL_SEGMENTS = {
  melee_clasico: {
    downgrade_pechera: { label: 'Cuero', icon: '🛡️' },
    downgrade_encantamientos: { label: 'Ceguera', icon: '👁️‍🌫️' },
    arma_hierro: { label: 'Madera', icon: '🪵' },
    sin_arco: { label: 'Desnudo', icon: '👙' },
    sin_gapples: { label: 'Sin Curar', icon: '❌' },
    sin_mechero: { label: '5 Coraz.', icon: '💔' },
    sin_cana: { label: 'Lento III', icon: '🐢' },
    weakness_i: { label: 'Debilidad', icon: '🥀' },
    slowness_i: { label: 'Puños', icon: '👊' }
  },
  glass_cannon: {
    downgrade_pechera: { label: 'Cuero', icon: '🛡️' },
    downgrade_encantamientos: { label: 'Ceguera', icon: '👁️‍🌫️' },
    arma_hierro: { label: 'Oro', icon: '🪵' },
    sin_arco: { label: 'Desnudo', icon: '👙' },
    sin_gapples: { label: 'Fatiga', icon: '❌' },
    sin_mechero: { label: '5 Coraz.', icon: '💔' },
    sin_cana: { label: 'Lento III', icon: '🐢' },
    weakness_i: { label: 'Debil III', icon: '🥀' },
    slowness_i: { label: 'Puños', icon: '👊' }
  },
  combo_speed: {
    downgrade_pechera: { label: 'Cuero', icon: '🛡️' },
    downgrade_encantamientos: { label: 'Ceguera', icon: '👁️‍🌫️' },
    arma_hierro: { label: 'Madera', icon: '🪵' },
    sin_arco: { label: 'Desnudo', icon: '👙' },
    sin_gapples: { label: 'Sin Speed', icon: '❌' },
    sin_mechero: { label: '5 Coraz.', icon: '💔' },
    sin_cana: { label: 'Lento IV', icon: '🐢' },
    weakness_i: { label: 'Debilidad', icon: '🥀' },
    slowness_i: { label: 'Puños', icon: '👊' }
  },
  nodebuff_express: {
    downgrade_pechera: { label: 'Cuero', icon: '🛡️' },
    downgrade_encantamientos: { label: 'Ceguera', icon: '👁️‍🌫️' },
    arma_hierro: { label: 'Hierro', icon: '🪵' },
    sin_arco: { label: 'Desnudo', icon: '👙' },
    sin_gapples: { label: 'Sin Pots', icon: '❌' },
    sin_mechero: { label: '5 Coraz.', icon: '💔' },
    sin_cana: { label: 'Lento III', icon: '🐢' },
    weakness_i: { label: 'Debilidad', icon: '🥀' },
    slowness_i: { label: 'Puños', icon: '👊' }
  }
};

// Orden de los sectores de la rueda. Los IDs deben calzar con
// server/services/gauntlet/nerfs.js para que la rueda aterrice sobre el nerf
// que el backend ya eligió. El color se asigna cíclicamente.
const WHEEL_SEGMENTS = [
  { id: 'downgrade_pechera',        icon: '🛡️', label: 'Pechera' },
  { id: 'downgrade_encantamientos', icon: '👁️‍🌫️', label: 'Ceguera' },
  { id: 'arma_hierro',              icon: '⚔️', label: 'Hierro' },
  { id: 'sin_arco',                 icon: '👙', label: 'Desnudo' },
  { id: 'sin_gapples',              icon: '❌', label: 'Sin curar' },
  { id: 'sin_mechero',              icon: '💔', label: 'Vida' },
  { id: 'sin_cana',                 icon: '🐢', label: 'Lento' },
  { id: 'weakness_i',               icon: '🥀', label: 'Debilidad' },
  { id: 'slowness_i',               icon: '👊', label: 'Puños' },
].map((s, i) => ({ ...s, color: WHEEL_PALETTE[i % WHEEL_PALETTE.length] }));

function polarToCart(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx, cy, r, startDeg, endDeg) {
  const start = polarToCart(cx, cy, r, startDeg);
  const end   = polarToCart(cx, cy, r, endDeg);
  const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
  return ['M', cx, cy, 'L', start.x, start.y, 'A', r, r, 0, largeArc, 1, end.x, end.y, 'Z'].join(' ');
}

function RouletteWheel({ rotation, size = 220, kitId }) {
  const cx = 50, cy = 50, r = 48;
  const seg = 360 / WHEEL_SEGMENTS.length;

  const kitIdSanitized = kitId || 'melee_clasico';
  const segments = WHEEL_SEGMENTS.map(s => {
    const override = KIT_WHEEL_SEGMENTS[kitIdSanitized]?.[s.id];
    return override ? { ...s, ...override } : s;
  });

  // Centro tipo caramelo: 12 cuñas alternando rojo/blanco desde el centro.
  const candyWedges = Array.from({ length: 12 }, (_, i) => {
    const a0 = i * 30;
    const a1 = (i + 1) * 30;
    return {
      d: describeSlice(cx, cy, 7, a0, a1),
      fill: i % 2 === 0 ? '#d92d20' : '#ffffff',
    };
  });

  return (
    <div style={{ position: 'relative', width: size, paddingTop: 22, flexShrink: 0 }}>
      {/* Banderín rojo tipo feria (arriba) */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 32, height: 34,
        zIndex: 3,
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))',
      }}>
        <svg viewBox="0 0 32 34" style={{ width: '100%', height: '100%' }}>
          {/* Cabeza del banderín (redondeado) */}
          <path
            d="M 6 2 Q 16 -1 26 2 L 26 14 Q 22 18 16 22 Q 10 18 6 14 Z"
            fill="#d92d20" stroke="#7a1410" strokeWidth="1.2"
          />
          {/* Brillo */}
          <path d="M 8 3 Q 16 1 24 3 L 24 7 Q 16 5 8 7 Z" fill="#ff8a82" opacity="0.65" />
          {/* Cuello/vara que entra al borde de la rueda */}
          <rect x="14" y="20" width="4" height="12" rx="1" fill="#2a2a2a" stroke="#000" strokeWidth="0.6" />
        </svg>
      </div>

      {/* Rueda */}
      <div style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        padding: 0,
        background: '#000',
        boxShadow: '0 14px 32px rgba(0,0,0,0.7), inset 0 0 0 3px #000',
      }}>
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%', height: '100%',
            display: 'block',
            borderRadius: '50%',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 4s cubic-bezier(0.17, 0.62, 0.24, 1)',
          }}
        >
          {/* Borde negro exterior grueso */}
          <circle cx={cx} cy={cy} r={r + 1.5} fill="#000" />

          {segments.map((s, i) => {
            const start = i * seg;
            const end = (i + 1) * seg;
            const d = describeSlice(cx, cy, r, start, end);
            const mid = start + seg / 2;
            const iconPos = polarToCart(cx, cy, r * 0.72, mid);
            const textColor = s.color === '#f4c21c' ? '#1a1a1a' : '#ffffff';
            return (
              <g key={s.id}>
                <path d={d} fill={s.color} stroke="#000" strokeWidth="0.9" />
                <g transform={`rotate(${mid} ${iconPos.x} ${iconPos.y})`}>
                  <text
                    x={iconPos.x} y={iconPos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize="8"
                    fill={textColor}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {s.icon}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Pines amarillos prominentes en cada separación */}
          {segments.map((_, i) => {
            const pin = polarToCart(cx, cy, r - 2.6, i * seg);
            return (
              <g key={`pin-${i}`}>
                <circle cx={pin.x} cy={pin.y} r="1.7" fill="#f4c21c" stroke="#7a5a00" strokeWidth="0.35" />
                <circle cx={pin.x - 0.5} cy={pin.y - 0.5} r="0.5" fill="#fff8c2" opacity="0.8" />
              </g>
            );
          })}

          {/* Anillo exterior negro fino */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#000" strokeWidth="1" />

          {/* Centro tipo caramelo (peppermint) */}
          <circle cx={cx} cy={cy} r="8" fill="#000" />
          <circle cx={cx} cy={cy} r="7.2" fill="#ffffff" />
          {candyWedges.map((w, i) => (
            <path key={`candy-${i}`} d={w.d} fill={w.fill} />
          ))}
          <circle cx={cx} cy={cy} r="7.2" fill="none" stroke="#000" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r="1.6" fill="#ffffff" stroke="#000" strokeWidth="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─── Subcomponente: Revelación de Nerf (Ruleta Rusa) ─────────────────────────

function NerfReveal({ nerf, dueloId, kitId, compact = false }) {
  const storageKey = `nerf-revealed-${dueloId}`;
  const [revealed, setRevealed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; }
    catch { return true; }
  });
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  if (!nerf || !nerf.id) return null;

  const handleReveal = () => {
    if (spinning || revealed) return;
    setSpinning(true);

    const idx = Math.max(0, WHEEL_SEGMENTS.findIndex(s => s.id === nerf.id));
    const seg = 360 / WHEEL_SEGMENTS.length;
    const targetCenter = idx * seg + seg / 2;
    // Pequeño wobble dentro del sector para que nunca caiga perfectamente centrado
    const wobble = (Math.random() - 0.5) * (seg * 0.55);
    // Rotación final en sentido horario: 7 vueltas completas + ajuste al sector ganador
    const finalRotation = 360 * 7 - targetCenter + wobble;

    setRotation(finalRotation);
    setTimeout(() => {
      setSpinning(false);
      setRevealed(true);
      try { localStorage.setItem(storageKey, '1'); } catch (e) { /* noop */ }
    }, 4200);
  };

  if (!revealed) {
    return (
      <div style={{
        background: 'radial-gradient(circle at center, #1a0533 0%, #0a0a14 75%)',
        border: '2px dashed #a855f780',
        borderRadius: 14,
        padding: compact ? '16px 14px 18px' : '22px 20px',
        margin: compact ? '8px 10px' : '0 10px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800, color: '#a855f7',
          textTransform: 'uppercase', letterSpacing: '0.18em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          🎰 Ruleta Rusa · A vs C
        </div>
        <RouletteWheel rotation={rotation} size={compact ? 190 : 240} kitId={kitId} />
        <button
          onClick={handleReveal}
          disabled={spinning}
          style={{
            background: spinning ? '#a855f730' : 'linear-gradient(135deg, #a855f7, #ec4899)',
            border: 'none', borderRadius: 10,
            padding: '11px 26px',
            color: '#fff', fontWeight: 900, fontSize: 13,
            letterSpacing: '0.08em',
            cursor: spinning ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            boxShadow: spinning ? 'none' : '0 6px 22px #a855f770, 0 0 0 2px #a855f740',
            transition: 'all 0.2s',
          }}
        >
          {spinning ? '⚙️ Girando...' : '🎯 Girar Ruleta'}
        </button>
        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', maxWidth: 260 }}>
          {spinning
            ? 'La ruleta decide el destino del experto...'
            : '9 nerfeos posibles · el destino decide el handicap del Grupo A'}
        </div>
      </div>
    );
  }

  const SEVERITY_LABEL = { 1: 'Leve', 2: 'Moderado', 3: 'Brutal' };
  const severityColor = nerf.severity >= 3 ? '#ef4444' : (nerf.severity === 2 ? '#fbbf24' : '#4ade80');

  return (
    <div style={{
      background: `linear-gradient(135deg, ${nerf.color}15 0%, #0a0a14 60%)`,
      border: `2px solid ${nerf.color}60`,
      borderRadius: 12, overflow: 'hidden',
      margin: compact ? '8px 10px' : '0 10px 10px',
      boxShadow: `0 4px 20px ${nerf.color}25`,
      animation: 'nerfAppear 0.5s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        background: `linear-gradient(90deg, ${nerf.color}25, transparent)`,
        borderBottom: `1px solid ${nerf.color}30`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>{nerf.categoriaIcon}</span>
        <span style={{
          fontSize: 10, fontWeight: 800, color: nerf.color,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          Nerf · {nerf.categoria}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 9, fontWeight: 800, color: severityColor,
          padding: '2px 7px', borderRadius: 8,
          background: `${severityColor}15`,
          border: `1px solid ${severityColor}40`,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {SEVERITY_LABEL[nerf.severity] || 'Nivel ' + nerf.severity}
        </span>
      </div>
      {/* Body */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{
          fontSize: 14, fontWeight: 900, color: '#fff',
          marginBottom: 4,
        }}>
          {nerf.nombre}
        </div>
        <div style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5 }}>
          {nerf.descripcion}
        </div>
        {nerf.impacto && (
          <div style={{
            marginTop: 6, padding: '6px 10px',
            background: `${nerf.color}10`, borderRadius: 6,
            borderLeft: `2px solid ${nerf.color}`,
            fontSize: 11, color: '#9ca3af', fontStyle: 'italic',
          }}>
            💥 {nerf.impacto}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponente: Tarjeta de Duelo (compacta para bracket) ─────────────────

function DuelSlot({ duelo, onResolve, readOnly = false, isActive = false }) {
  const fase = FASE_CONFIG[duelo?.fase] || {};
  const isDone = duelo?.estado === 'completado';
  const isPending = duelo?.estado === 'pendiente';

  if (!duelo) {
    return (
      <div style={{
        padding: '16px', background: '#0a0a14',
        border: '1px dashed #ffffff10', borderRadius: 12,
        textAlign: 'center', color: '#4b5563', fontSize: 12,
      }}>
        ⏳ Esperando fase anterior
      </div>
    );
  }

  const j1 = duelo.jugador1_id;
  const j2 = duelo.jugador2_id;
  if (!j1 || !j2) return null;

  const winnerId = duelo.ganador_id?._id?.toString() || duelo.ganador_id?.toString();
  const j1Wins = isDone && winnerId === j1._id?.toString();
  const j2Wins = isDone && winnerId === j2._id?.toString();

  const renderPlayer = (jugador, isWinner, isLoser) => (
    <button
      disabled={isDone || readOnly}
      onClick={() => !isDone && !readOnly && onResolve(duelo._id, jugador._id)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10,
        background: isWinner
          ? `linear-gradient(90deg, ${fase.color}25, ${fase.color}10)`
          : isLoser ? '#1a1a2e70' : '#1a1a2e',
        border: `1.5px solid ${isWinner ? fase.color + '60' : '#ffffff10'}`,
        cursor: isDone || readOnly ? 'default' : 'pointer',
        opacity: isLoser ? 0.35 : 1,
        textDecoration: isLoser ? 'line-through' : 'none',
        transition: 'all 0.2s',
        textAlign: 'left', minWidth: 0,
      }}
      onMouseEnter={e => {
        if (!isDone && !readOnly) {
          e.currentTarget.style.background = `${fase.color}15`;
          e.currentTarget.style.borderColor = fase.color + '50';
        }
      }}
      onMouseLeave={e => {
        if (!isDone && !readOnly && !isWinner) {
          e.currentTarget.style.background = '#1a1a2e';
          e.currentTarget.style.borderColor = '#ffffff10';
        }
      }}
    >
      <PlayerAvatar player={jugador} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isWinner ? '#fff' : '#e5e7eb',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {jugador.nombre}
        </div>
        {jugador.posicion_grupo && (
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
            {GRUPO_CONFIG[jugador.grupo]?.label} · #{jugador.posicion_grupo}
          </div>
        )}
      </div>
      {isWinner && <span style={{ fontSize: 18, flexShrink: 0 }}>🏆</span>}
    </button>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #12121e 0%, #0f0f1a 100%)',
      border: `2px solid ${isActive ? fase.color : (isDone ? fase.color + '50' : '#ffffff10')}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: isActive ? `0 0 32px ${fase.color}40, inset 0 0 20px ${fase.color}10` : (isDone ? `0 4px 20px ${fase.color}15` : 'none'),
      animation: isActive && isPending ? 'activeGlow 2.4s ease infinite' : 'none',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        background: `linear-gradient(90deg, ${fase.color}20, transparent)`,
        borderBottom: `1px solid ${fase.color}20`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>{fase.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: fase.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {fase.label}
        </span>
        <span style={{ flex: 1 }} />
        {isDone && (
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
            RESUELTO
          </span>
        )}
        {isPending && isActive && (
          <span style={{
            fontSize: 10, color: fase.color, fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 10,
            background: `${fase.color}15`, border: `1px solid ${fase.color}40`,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: fase.color, animation: 'pulse 1s ease infinite',
            }} />
            EN VIVO
          </span>
        )}
      </div>

      {/* Jugadores */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {renderPlayer(j1, j1Wins, isDone && !j1Wins)}
        <div style={{
          textAlign: 'center', fontSize: 10, fontWeight: 800,
          color: isPending ? fase.color : '#4b5563', letterSpacing: '0.2em',
        }}>
          ⚔️ VS
        </div>
        {renderPlayer(j2, j2Wins, isDone && !j2Wins)}
      </div>

      {/* Cronómetro de la ronda */}
      {isPending && !readOnly && (
        <div style={{
          padding: '10px 12px 12px',
          borderTop: `1px dashed ${fase.color}25`,
          background: `linear-gradient(180deg, transparent, ${fase.color}05)`,
          display: 'flex', justifyContent: 'center',
        }}>
          <RoundTimer duelId={duelo._id} accent={fase.color} variant={isActive ? 'inline' : 'compact'} />
        </div>
      )}

      {/* Ruleta de Nerf (si aplica) */}
      {duelo.nerf?.id && (
        <div style={{ padding: '0 0 10px' }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: '#a855f7',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            padding: '0 14px 6px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>🎲</span>
            Handicap del Experto ({j2?.nombre})
          </div>
          <NerfReveal nerf={duelo.nerf} dueloId={duelo._id} kitId={duelo.kit?.id} compact />
        </div>
      )}
    </div>
  );
}

// ─── Subcomponente: Grupo (base de la escalada) ──────────────────────────────

function GrupoBase({ grupo, jugadores, promoteCount = 0 }) {
  const cfg = GRUPO_CONFIG[grupo];
  const ordenados = [...jugadores].sort((a, b) => {
    if (a.posicion_grupo && b.posicion_grupo) return a.posicion_grupo - b.posicion_grupo;
    return (b.wins_grupos || 0) - (a.wins_grupos || 0);
  });

  return (
    <div style={{
      background: `linear-gradient(180deg, ${cfg.color}08, #0f0f1a)`,
      border: `1.5px solid ${cfg.color}30`,
      borderRadius: 14, overflow: 'hidden', flex: 1, minWidth: 0,
    }}>
      <div style={{
        padding: '10px 14px',
        background: `linear-gradient(90deg, ${cfg.color}20, transparent)`,
        borderBottom: `1px solid ${cfg.color}25`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>
            Grupo {grupo}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>{cfg.label}</div>
        </div>
        <span style={{ fontSize: 10, color: '#6b7280' }}>{jugadores.length}</span>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ordenados.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', color: '#4b5563', fontSize: 11 }}>
            Sin jugadores
          </div>
        ) : ordenados.map((j, idx) => {
          const advances = idx < promoteCount;
          const eliminated = j.estado === 'eliminado';
          return (
            <div key={j._id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8,
              background: advances ? `${cfg.color}12` : 'transparent',
              border: `1px solid ${advances ? cfg.color + '30' : '#ffffff06'}`,
              opacity: eliminated ? 0.35 : 1,
              position: 'relative',
            }}>
              <span style={{
                fontSize: advances && idx < 3 ? 14 : 10,
                color: advances ? cfg.color : '#6b7280',
                fontWeight: 800, minWidth: 20, textAlign: 'center',
              }}>
                {advances && idx < 3 ? MEDAL[idx] : `#${idx + 1}`}
              </span>
              <span style={{
                flex: 1, fontSize: 12, fontWeight: 600,
                color: advances ? '#f3f4f6' : '#9ca3af',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: eliminated ? 'line-through' : 'none',
              }}>
                {j.nombre}
              </span>
              {advances && (
                <span title="Avanza a la escalada" style={{ fontSize: 12, color: cfg.color }}>↑</span>
              )}
              {j.wins_grupos !== undefined && (j.wins_grupos > 0 || j.derrotas_grupos > 0) && (
                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>
                  {j.wins_grupos || 0}-{j.derrotas_grupos || 0}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Subcomponente: Banner de Campeón ────────────────────────────────────────

function CampeonBanner({ campeon }) {
  if (!campeon) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #422006 0%, #78350f 50%, #422006 100%)',
      border: '2px solid #eab30880',
      borderRadius: 20, padding: '24px 32px', marginBottom: 24,
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      boxShadow: '0 0 60px #eab30840, inset 0 1px 0 #fde68a40',
      animation: 'championGlow 3s ease infinite',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 30% 50%, #eab30820, transparent 70%)',
      }} />
      <div style={{ fontSize: 72, filter: 'drop-shadow(0 0 20px #eab30880)', position: 'relative' }}>
        👑
      </div>
      <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
        <div style={{ fontSize: 11, color: '#fde68a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          ¡Ha sido coronado!
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', marginTop: 4, lineHeight: 1, textShadow: '0 4px 16px #eab30850' }}>
          {campeon.nombre}
        </div>
        <div style={{ fontSize: 13, color: '#fde68a', marginTop: 6, fontWeight: 600 }}>
          🏆 Campeón del Torneo · Grupo {campeon.grupo} · {campeon.wins_bracket} victorias en bracket
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponente: Status Bar con el duelo activo ───────────────────────────

function StatusBar({ escalada, duelosPendientes, onJumpToActive }) {
  const activeEtapa = useMemo(() => {
    return escalada?.find(e => e.duelo?.estado === 'pendiente' && e.fase !== 'grupos');
  }, [escalada]);

  if (!activeEtapa) return null;
  const fase = FASE_CONFIG[activeEtapa.fase] || {};
  const { jugador1_id: j1, jugador2_id: j2 } = activeEtapa.duelo || {};

  return (
    <div style={{
      background: `linear-gradient(90deg, ${fase.color}15 0%, #0a0a14 60%)`,
      border: `1.5px solid ${fase.color}50`,
      borderRadius: 14, padding: '14px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      boxShadow: `0 4px 32px ${fase.color}20`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: fase.color,
        animation: 'pulse 1.8s ease infinite',
      }} />
      <div style={{ fontSize: 28 }}>{fase.icon}</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, color: fase.color,
          textTransform: 'uppercase', letterSpacing: '0.15em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: fase.color, animation: 'pulse 1s ease infinite',
          }} />
          Duelo en vivo · {fase.label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginTop: 4 }}>
          {j1?.nombre || '?'} <span style={{ color: fase.color, margin: '0 10px' }}>VS</span> {j2?.nombre || '?'}
        </div>
      </div>
      <button
        onClick={onJumpToActive}
        style={{
          background: `${fase.color}20`, color: fase.color,
          border: `1.5px solid ${fase.color}60`,
          borderRadius: 10, padding: '8px 16px', fontWeight: 800, fontSize: 12,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Ir al duelo →
      </button>
    </div>
  );
}

// ─── Subcomponente: Escalada visual ──────────────────────────────────────────

function EscaladaLadder({ escalada, grupos, onResolve, campeon }) {
  const etapasBracket = ESCALADA_ORDER.map(fase => {
    return escalada?.find(e => e.fase === fase) || { fase, duelo: null };
  });
  const activeFase = etapasBracket.find(e => e.duelo?.estado === 'pendiente')?.fase;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Trono del campeón (al tope) */}
      <div style={{
        textAlign: 'center', padding: '20px 0 8px',
        borderBottom: campeon ? '1px dashed #eab30840' : '1px dashed #ffffff08',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: campeon ? '#eab308' : '#4b5563',
          textTransform: 'uppercase', letterSpacing: '0.2em',
        }}>
          {campeon ? '👑 Trono del Campeón' : '👑 Cima del torneo'}
        </div>
        {campeon && (
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 6 }}>
            {campeon.nombre}
          </div>
        )}
      </div>

      {/* Escalada invertida: Gran Final arriba, Promoción abajo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[...etapasBracket].reverse().map((etapa, idx) => {
          const fase = FASE_CONFIG[etapa.fase] || {};
          const isActive = etapa.fase === activeFase;
          const isDone = etapa.duelo?.estado === 'completado';
          const isLocked = !etapa.duelo;

          return (
            <div key={etapa.fase} style={{
              display: 'grid', gridTemplateColumns: '180px 1fr',
              gap: 20, alignItems: 'stretch',
            }}>
              {/* Etiqueta del tier (izquierda) */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                justifyContent: 'center', gap: 6, paddingRight: 4,
                borderRight: `2px solid ${isDone ? fase.color + '50' : (isActive ? fase.color : '#ffffff08')}`,
                opacity: isLocked ? 0.35 : 1,
                transition: 'all 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    color: isDone ? fase.color : (isActive ? '#fff' : '#6b7280'),
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    Tier {fase.tier}
                  </span>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isDone ? `${fase.color}25` : (isActive ? `${fase.color}18` : '#12121e'),
                    border: `2px solid ${isDone ? fase.color : (isActive ? fase.color : '#ffffff10')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: isActive ? `0 0 16px ${fase.color}60` : 'none',
                    animation: isActive ? 'pulse 2s ease infinite' : 'none',
                  }}>
                    {fase.icon}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 15, fontWeight: 900,
                    color: isDone ? fase.color : (isActive ? '#fff' : '#9ca3af'),
                  }}>
                    {fase.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#4b5563', maxWidth: 160 }}>
                    {fase.desc}
                  </div>
                </div>
              </div>

              {/* Duelo (derecha) */}
              <div style={{ minWidth: 0 }}>
                {etapa.duelo ? (
                  <DuelSlot duelo={etapa.duelo} onResolve={onResolve} isActive={isActive} />
                ) : (
                  <div style={{
                    height: '100%', minHeight: 80,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0a0a14',
                    border: '1px dashed #ffffff10',
                    borderRadius: 12, color: '#4b5563', fontSize: 12,
                    padding: '12px 16px',
                  }}>
                    🔒 Bloqueado — esperando resultado previo
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Base: Los tres grupos */}
      <div style={{
        marginTop: 12, padding: '18px 0 0',
        borderTop: '2px dashed #ffffff10',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: '#6b7280',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textAlign: 'center', marginBottom: 14,
        }}>
          Base · Fase de Grupos (Round Robin)
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 14,
        }}>
          <GrupoBase grupo="C" jugadores={grupos.C || []} promoteCount={1} />
          <GrupoBase grupo="B" jugadores={grupos.B || []} promoteCount={2} />
          <GrupoBase grupo="A" jugadores={grupos.A || []} promoteCount={4} />
        </div>
        <div style={{
          fontSize: 10, color: '#4b5563', textAlign: 'center',
          marginTop: 10, fontStyle: 'italic',
        }}>
          ↑ Los destacados avanzan a la escalada
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal: GauntletBoard ─────────────────────────────────────

export default function GauntletBoard({ torneoId }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('escalada');
  const [flash, setFlash] = useState(null);

  const fetchSnapshot = useCallback(async () => {
    if (!torneoId) return;
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/gauntlet/snapshot?torneo_id=${encodeURIComponent(torneoId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSnapshot(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  const handleResolve = async (dueloId, ganadorId) => {
    try {
      const res = await fetch(`${BASE_URL}/gauntlet/duelo/${dueloId}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ganador_id: ganadorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFlash({ type: 'ok', msg: `✅ Resultado registrado${data.siguienteDuelo ? ' · Próximo duelo creado' : ''}` });
      setTimeout(() => setFlash(null), 2400);
      await fetchSnapshot();
    } catch (e) {
      setFlash({ type: 'error', msg: 'Error: ' + e.message });
      setTimeout(() => setFlash(null), 3000);
    }
  };

  if (loading && !snapshot) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 48, animation: 'spin 1.4s linear infinite' }}>⚔️</div>
      <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>Cargando torneo...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, background: '#dc262620', border: '1px solid #dc2626', borderRadius: 12, color: '#f87171' }}>
      <strong>Error:</strong> {error}
    </div>
  );

  if (!snapshot) return null;

  const { grupos, escalada, campeon, duelosPendientes, duelosCompletados } = snapshot;

  // Progreso total del torneo
  const totalEtapas = ESCALADA_ORDER.length;
  const etapasCompletadas = escalada?.filter(e => e.duelo?.estado === 'completado' && e.fase !== 'grupos').length || 0;
  const progreso = Math.round((etapasCompletadas / totalEtapas) * 100);

  const jumpToActive = () => setActiveTab('escalada');

  // Historial
  const historial = [...(duelosCompletados || [])]
    .filter(d => d.fase !== 'grupos')
    .sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.05); } }
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes activeGlow {
          0%, 100% { box-shadow: 0 0 24px currentColor20, inset 0 0 10px currentColor10; }
          50%      { box-shadow: 0 0 40px currentColor50, inset 0 0 20px currentColor20; }
        }
        @keyframes championGlow {
          0%, 100% { box-shadow: 0 0 40px #eab30830, inset 0 1px 0 #fde68a30; }
          50%      { box-shadow: 0 0 80px #eab30860, inset 0 1px 0 #fde68a60; }
        }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes rouletteSpin { from { transform: rotate(0deg) scale(1.15); } to { transform: rotate(360deg) scale(1.15); } }
        @keyframes nerfAppear {
          0%   { opacity: 0; transform: scale(0.85) translateY(-6px); }
          60%  { opacity: 1; transform: scale(1.04) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Campeón Banner */}
      <CampeonBanner campeon={campeon} />

      {/* Progreso del torneo */}
      {!campeon && (
        <div style={{
          background: '#12121e', border: '1px solid #ffffff10',
          borderRadius: 14, padding: '14px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 22 }}>⚔️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Progreso del Torneo
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#a855f7' }}>
                {etapasCompletadas} / {totalEtapas} etapas · {progreso}%
              </span>
            </div>
            <div style={{ height: 8, background: '#1a1a2e', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${progreso}%`, height: '100%',
                background: 'linear-gradient(90deg, #a855f7, #ec4899, #eab308)',
                transition: 'width 0.5s ease',
                boxShadow: '0 0 12px #a855f780',
              }} />
            </div>
          </div>
          <div style={{
            fontSize: 11, color: '#6b7280', textAlign: 'right',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span><strong style={{ color: '#fbbf24' }}>{duelosPendientes?.filter(d => d.fase !== 'grupos').length || 0}</strong> pendientes</span>
            <span><strong style={{ color: '#4ade80' }}>{duelosCompletados?.length || 0}</strong> resueltos</span>
          </div>
        </div>
      )}

      {/* Status bar del duelo activo */}
      <StatusBar escalada={escalada} duelosPendientes={duelosPendientes} onJumpToActive={jumpToActive} />

      {/* Flash messages */}
      {flash && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 50,
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: flash.type === 'ok' ? '#16a34a20' : '#dc262620',
          border: `1.5px solid ${flash.type === 'ok' ? '#16a34a' : '#dc2626'}`,
          color: flash.type === 'ok' ? '#4ade80' : '#f87171',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.3s ease',
        }}>
          {flash.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'escalada', label: 'La Escalada', icon: '⚔️' },
          { id: 'grupos',   label: 'Grupos',      icon: '👥' },
          { id: 'tabla',    label: 'Jugadores',   icon: '📊' },
          { id: 'historia', label: 'Historia',    icon: '📜' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 18px', borderRadius: 10,
              border: `1.5px solid ${activeTab === tab.id ? '#a855f7' : '#ffffff12'}`,
              background: activeTab === tab.id ? '#a855f720' : '#12121e',
              color: activeTab === tab.id ? '#c4b5fd' : '#9ca3af',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={fetchSnapshot}
          style={{
            background: '#ffffff08', border: '1px solid #ffffff12', borderRadius: 10,
            padding: '9px 14px', color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* ── Tab: La Escalada ─────────────────────────────────────────────── */}
      {activeTab === 'escalada' && (
        <EscaladaLadder
          escalada={escalada}
          grupos={grupos || { A: [], B: [], C: [] }}
          onResolve={handleResolve}
          campeon={campeon}
        />
      )}

      {/* ── Tab: Grupos ──────────────────────────────────────────────────── */}
      {activeTab === 'grupos' && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 18,
        }}>
          {['A', 'B', 'C'].map(g => {
            const cfg = GRUPO_CONFIG[g];
            const jugadores = [...(grupos?.[g] || [])].sort((a, b) => {
              if (a.posicion_grupo && b.posicion_grupo) return a.posicion_grupo - b.posicion_grupo;
              return (b.wins_grupos || 0) - (a.wins_grupos || 0);
            });
            const promoteCount = g === 'A' ? 4 : (g === 'B' ? 2 : 1);

            return (
              <div key={g} style={{
                background: `linear-gradient(180deg, ${cfg.color}10 0%, #12121e 40%)`,
                border: `1.5px solid ${cfg.color}30`,
                borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '16px 20px',
                  background: `linear-gradient(90deg, ${cfg.color}25, transparent)`,
                  borderBottom: `1px solid ${cfg.color}25`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{cfg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Grupo {g}</div>
                      <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avanzan</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: cfg.color }}>{promoteCount}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jugadores.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                      Sin jugadores en este grupo
                    </div>
                  ) : jugadores.map((j, idx) => (
                    <PlayerCard key={j._id} player={j} position={idx} highlight={idx < promoteCount} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Tabla de todos los jugadores ───────────────────────────── */}
      {activeTab === 'tabla' && (
        <div style={{ background: '#12121e', border: '1px solid #ffffff12', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ffffff12', background: '#1a1a2e' }}>
                {['#', 'Jugador', 'Grupo', 'Pos.', 'Grupos (W-L)', 'Bracket 🏆', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'left', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['A', 'B', 'C'].flatMap(g => {
                const lista = [...(grupos?.[g] || [])].sort((a, b) => {
                  if (a.posicion_grupo && b.posicion_grupo) return a.posicion_grupo - b.posicion_grupo;
                  return (b.wins_grupos || 0) - (a.wins_grupos || 0);
                });
                return lista;
              }).map((j, idx) => {
                const esta = ESTADO_CONFIG[j.estado] || {};
                const grup = GRUPO_CONFIG[j.grupo] || {};
                const eliminated = j.estado === 'eliminado';
                return (
                  <tr key={j._id} style={{
                    borderBottom: '1px solid #ffffff06',
                    transition: 'background 0.15s',
                    opacity: eliminated ? 0.45 : 1,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff04'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <PlayerAvatar player={j} size={28} showGrupo={false} />
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: '#f3f4f6',
                          textDecoration: eliminated ? 'line-through' : 'none',
                        }}>
                          {j.nombre}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, color: grup.color, fontWeight: 800 }}>{grup.icon} {j.grupo}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>
                      {j.posicion_grupo ? `#${j.posicion_grupo}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>{j.wins_grupos || 0}W</span>
                      <span style={{ color: '#4b5563', margin: '0 4px' }}>-</span>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>{j.derrotas_grupos || 0}L</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#a855f7', fontWeight: 700 }}>
                      {j.wins_bracket || 0}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 10, background: esta.bg, color: esta.color, fontWeight: 700 }}>
                        {esta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Historia ────────────────────────────────────────────────── */}
      {activeTab === 'historia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {historial.length === 0 ? (
            <div style={{
              padding: 60, textAlign: 'center', color: '#4b5563',
              background: '#12121e', borderRadius: 14, border: '1px dashed #ffffff10',
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📜</div>
              <p style={{ fontSize: 14, fontWeight: 700 }}>Aún no hay duelos resueltos en la escalada</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>El primer duelo de Promoción iniciará cuando finalices el Grupo C.</p>
            </div>
          ) : historial.map(d => {
            const fase = FASE_CONFIG[d.fase] || {};
            const winnerId = d.ganador_id?._id?.toString() || d.ganador_id?.toString();
            const j1 = d.jugador1_id, j2 = d.jugador2_id;
            const j1Wins = winnerId === j1?._id?.toString();
            const winner = j1Wins ? j1 : j2;
            const loser  = j1Wins ? j2 : j1;

            return (
              <div key={d._id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 18px',
                background: '#12121e', borderRadius: 12,
                border: `1px solid ${fase.color}20`,
                borderLeft: `3px solid ${fase.color}`,
              }}>
                <span style={{ fontSize: 22 }}>{fase.icon}</span>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: fase.color,
                  padding: '3px 9px', borderRadius: 8, background: `${fase.color}15`,
                  textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  {fase.label}
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <span style={{ color: '#fff', fontWeight: 800 }}>{winner?.nombre}</span>
                  <span style={{ color: '#6b7280', margin: '0 8px' }}>venció a</span>
                  <span style={{ color: '#9ca3af', textDecoration: 'line-through' }}>{loser?.nombre}</span>
                </div>
                {d.resolvedAt && (
                  <span style={{ fontSize: 11, color: '#4b5563' }}>
                    {new Date(d.resolvedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
