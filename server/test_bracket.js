const ts = require('./services/tournamentService');
const { buildBracket } = require('./services/matchmaking');

// Simular 4 jugadores
const niveles = ['alto', 'alto', 'medio', 'bajo'];
['Ana', 'Boris', 'Carlos', 'Diana'].forEach((n, i) => {
  ts.registerPlayer('minecraft', { nombre: n, nivel: niveles[i], cps: 14 - i * 3, victorias: 10 - i * 2 });
});

const players = ts.getPlayersForMatchmaking('minecraft');
console.log('Players (ordenados por seedWeight):');
players.forEach(p => console.log(' - ' + p.nombre + ': seedWeight=' + p.seedWeight + ' (nivel=' + p.nivel + ', cps=' + p.cps + ')'));

const bracket = buildBracket(players);
console.log('\nPrimera Ronda (bracket R1):');
bracket.rounds[0].forEach(m => {
  const p1 = m.player1 ? m.player1.nombre + ' [' + m.player1.nivel + ']' : 'null';
  const p2 = m.player2 ? m.player2.nombre + ' [' + m.player2.nivel + ']' : 'null';
  console.log('  Match: ' + p1 + '  vs  ' + p2 + (m.winner ? ' → auto: ' + m.winner.nombre : ''));
});
console.log('\nTotal jugadores:', bracket.totalPlayers, '| BYEs:', bracket.totalByes, '| Rondas:', bracket.rounds.length);
