import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { generateGauntletBracket, saveTournamentGroups } from '../api/api';

export default function GroupPhaseBoard({ game }) {
  const { 
    tournamentGroups, 
    setTournamentGroups, 
    setTournamentPhase, 
    setTournamentBracket,
    setTournamentStandings
  } = useStore();

  const [standings, setLocalStandings] = useState({ A: [], B: [], C: [] });
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Recalculate standings whenever matches change
  useEffect(() => {
    const newStandings = { A: [], B: [], C: [] };
    
    // Flatten players logically grouped by Gran Grupo A, B, C
    const groupedStats = { A: [], B: [], C: [] };

    tournamentGroups.forEach(group => {
      const stats = {};
      group.players.forEach(p => {
        stats[p.nombre] = { player: p, wins: 0, matches: 0 };
      });

      group.matches.forEach(m => {
        if (m.winner) {
          stats[m.player1.nombre].matches++;
          stats[m.player2.nombre].matches++;
          stats[m.winner.nombre].wins++;
        }
      });

      // Sort group players by wins desc
      const sorted = Object.values(stats).sort((a, b) => b.wins - a.wins).map(s => s.player);
      if (groupedStats[group.nivel]) {
        groupedStats[group.nivel].push(...sorted);
      }
    });

    setLocalStandings({
      A: groupedStats.A,
      B: groupedStats.B,
      C: groupedStats.C
    });
  }, [tournamentGroups]);

  const handleMatchWinner = (groupId, matchId, winnerPlayer) => {
    const newGroups = tournamentGroups.map(g => {
      if (g.id !== groupId) return g;
      const newMatches = g.matches.map(m => {
        if (m.id !== matchId) return m;
        return { ...m, winner: winnerPlayer };
      });
      return { ...g, matches: newMatches };
    });
    setTournamentGroups(newGroups);
    saveTournamentGroups(game, newGroups).catch(e => console.error("Auto-save failed", e));
  };

  const handlePlayerChange = (groupId, matchId, playerSlot, selectValue) => {
    const group = tournamentGroups.find(g => g.id === groupId);
    const newPlayer = group.players.find(p => p.rut === selectValue);
    if (!newPlayer) return;

    const newGroups = tournamentGroups.map(g => {
      if (g.id !== groupId) return g;
      const newMatches = g.matches.map(m => {
        if (m.id !== matchId) return m;
        return { ...m, [playerSlot]: newPlayer, winner: null }; // Reset winner if swapped
      });
      return { ...g, matches: newMatches };
    });
    setTournamentGroups(newGroups);
    saveTournamentGroups(game, newGroups).catch(e => console.error("Auto-save failed", e));
  };

  const handleGenerateGauntlet = async () => {
    setGenerating(true);
    try {
      setTournamentStandings(standings); // store final
      const data = await generateGauntletBracket(game, standings);
      setTournamentBracket(data);
      setTournamentPhase('bracket');
    } catch (e) {
      alert("Error generando The Gauntlet: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0 20px', paddingBottom: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>⚔️ Fase de Grupos (Round Robin)</h2>
        <p style={{ color: '#9ca3af', fontSize: 15 }}>Registra los ganadores de cada enfrentamiento todos-contra-todos. Al terminar, genera The Gauntlet.</p>
        
        <button 
          onClick={() => setIsEditing(!isEditing)}
          style={{ 
            position: 'absolute', top: 0, right: 0,
            background: isEditing ? '#f59e0b' : '#374151', color: '#fff',
            border: 'none', padding: '8px 16px', borderRadius: 8,
            fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s'
          }}
        >
          {isEditing ? '✓ Guardar Cambios' : '✏️ Modo Edición'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          onClick={handleGenerateGauntlet}
          disabled={generating}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none', borderRadius: 12, padding: '12px 24px',
            color: '#fff', fontWeight: 800, fontSize: 16,
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
          }}
        >
          {generating ? 'Construyendo...' : '🏁 Finalizar y Generar The Gauntlet'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {tournamentGroups.map(group => (
          <div key={group.id} style={{ background: '#12121e', border: '1px solid #ffffff12', borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 18, color: '#f3f4f6', fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>
              Grupo {group.id} <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 'normal' }}>({group.nivel})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.matches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontSize: 13, background: '#10b98115', borderRadius: 10, border: '1px dashed #10b98140' }}>
                  Avanza automáticamente (Único jugador en nivel)
                </div>
              ) : group.matches.map(m => {
                const isP1Winner = m.winner?.nombre === m.player1.nombre;
                const isP2Winner = m.winner?.nombre === m.player2.nombre;
                
                return (
                  <div key={m.id} style={{ 
                    display: 'flex', alignItems: 'stretch', 
                    background: '#1e1e2e', 
                    borderRadius: 10, 
                    border: isEditing ? '1px solid #f59e0b' : '1px solid #ffffff10',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {isEditing ? (
                      <select 
                        value={m.player1?.rut || ''}
                        onChange={(e) => handlePlayerChange(group.id, m.id, 'player1', e.target.value)}
                        style={{ flex: 1, padding: '10px', background: '#374151', color: '#fff', border: 'none', outline: 'none' }}
                      >
                        {group.players.map(p => <option key={p.rut} value={p.rut}>{p.nombre}</option>)}
                      </select>
                    ) : (
                      <button 
                        onClick={() => handleMatchWinner(group.id, m.id, m.player1)}
                        style={{ 
                          flex: 1, padding: '10px 12px', border: 'none', 
                          background: isP1Winner ? 'linear-gradient(135deg, #10b98130, #05966950)' : 'transparent',
                          color: isP1Winner ? '#10b981' : '#f3f4f6',
                          cursor: 'pointer', transition: 'all 0.2s',
                          fontWeight: isP1Winner ? 800 : 600,
                          fontSize: 13,
                          textAlign: 'center',
                          wordBreak: 'break-word'
                        }}
                        onMouseEnter={e => !isP1Winner && (e.currentTarget.style.background = '#ffffff08')}
                        onMouseLeave={e => !isP1Winner && (e.currentTarget.style.background = 'transparent')}
                      >
                        {m.player1.nombre}
                      </button>
                    )}
                    
                    <div style={{ width: 1, background: '#ffffff1a' }} />
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, color: '#9ca3af', fontWeight: 800, background: '#1a1a24' }}>
                      VS
                    </div>
                    <div style={{ width: 1, background: '#ffffff1a' }} />
                    
                    {isEditing ? (
                      <select 
                        value={m.player2?.rut || ''}
                        onChange={(e) => handlePlayerChange(group.id, m.id, 'player2', e.target.value)}
                        style={{ flex: 1, padding: '10px', background: '#374151', color: '#fff', border: 'none', outline: 'none' }}
                      >
                        {group.players.map(p => <option key={p.rut} value={p.rut}>{p.nombre}</option>)}
                      </select>
                    ) : (
                      <button 
                        onClick={() => handleMatchWinner(group.id, m.id, m.player2)}
                        style={{ 
                          flex: 1, padding: '10px 12px', border: 'none', 
                          background: isP2Winner ? 'linear-gradient(135deg, #10b98130, #05966950)' : 'transparent',
                          color: isP2Winner ? '#10b981' : '#f3f4f6',
                          cursor: 'pointer', transition: 'all 0.2s',
                          fontWeight: isP2Winner ? 800 : 600,
                          fontSize: 13,
                          textAlign: 'center',
                          wordBreak: 'break-word'
                        }}
                        onMouseEnter={e => !isP2Winner && (e.currentTarget.style.background = '#ffffff08')}
                        onMouseLeave={e => !isP2Winner && (e.currentTarget.style.background = 'transparent')}
                      >
                        {m.player2.nombre}
                      </button>
                    )}
                    
                    {m.winner && !isEditing && (
                      <button 
                        onClick={() => handleMatchWinner(group.id, m.id, null)} 
                        style={{ 
                          background: '#ef444420', border: 'none', borderLeft: '1px solid #ef444440',
                          color: '#ef4444', padding: '0 14px', cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ef444430'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ef444420'}
                        title="Deshacer victoria"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
