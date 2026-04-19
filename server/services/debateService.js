"use strict";

const { getDebateStats } = require("./sheetsService");

// Estado en memoria del debate
// Array de { juego, votes, eliminated }
let debateState = null;

function getDebate() {
  if (!debateState) {
    // Inicializar desde los datos de Sheets
    const stats = getDebateStats();
    debateState = stats.map((s) => ({
      juego: s.juego,
      votes: s.count, // Inician con el conteo de las propuestas del formulario
      eliminated: false,
    }));
  }
  return debateState;
}

function voteGame(juego, amount) {
  const state = getDebate();
  const game = state.find((g) => g.juego === juego);
  if (game && !game.eliminated) {
    game.votes += amount;
    if (game.votes < 0) game.votes = 0;
  }
  return state;
}

function eliminateGame(juego) {
  const state = getDebate();
  const game = state.find((g) => g.juego === juego);
  if (game) {
    game.eliminated = true;
  }
  return state;
}

function resetDebate() {
  debateState = null;
  return getDebate();
}

module.exports = {
  getDebate,
  voteGame,
  eliminateGame,
  resetDebate,
};
