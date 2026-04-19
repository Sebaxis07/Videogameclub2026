const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  nombre: String,
  rut: String,
  isBye: Boolean,
}, { strict: false });

const MatchSchema = new mongoose.Schema({
  id: String,
  player1: PlayerSchema,
  player2: PlayerSchema,
  winner: PlayerSchema,
}, { strict: false });

const GroupSchema = new mongoose.Schema({
  id: String,
  nivel: String,
  players: [PlayerSchema],
  matches: [MatchSchema],
}, { strict: false });

const TournamentGroupsSchema = new mongoose.Schema({
  game: { type: String, required: true, unique: true }, // e.g. "minecraft"
  groups: [GroupSchema],
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TournamentGroups", TournamentGroupsSchema);
