const mongoose = require('mongoose');
const MinecraftEval = require('./models/MinecraftEval');
const GauntletPlayer = require('./models/GauntletPlayer');
const sheetsService = require('./services/sheetsService');

const playersInImage = [
  { name: "francisco ribeiro", score: 12, group: "A" },
  { name: "Valery Pizarro", score: 10, group: "A" },
  { name: "Sebastian Alexander Anabalon Rojas", score: 12, group: "A" },
  { name: "Miguel aguilera", score: 10, group: "A" },
  { name: "Rodrigo Cofre Barra", score: 7, group: "B" },
  { name: "Angel Torres", score: 8, group: "B" },
  { name: "elias valenzuela", score: 6, group: "B" },
  { name: "Fernanda Carvajal", score: 1, group: "C" },
  { name: "constanza", score: 4, group: "C" },
  { name: "matías cortes", score: 3, group: "C" },
  { name: "Sebastián Rojas", score: 0, group: "C" },
  { name: "Tomas Pizarro", score: 2, group: "C" }
];

async function recover() {
  await mongoose.connect('mongodb://127.0.0.1:27017/videogame_club');
  console.log("Conectado a MongoDB");

  const sync = await sheetsService.syncFromSheets();
  const allSheetPlayers = sync.players;
  console.log(`Sync OK: ${allSheetPlayers.length} jugadores en el Sheet.`);

  const tournamentId = `torneo-${new Date().toISOString().slice(0, 10)}`;

  for (const pi of playersInImage) {
    // Buscar en el sheet por nombre (case insensitive)
    const player = allSheetPlayers.find(p => p.nombre.toLowerCase().includes(pi.name.toLowerCase()));
    
    if (!player) {
      console.warn(`No se encontró RUT para ${pi.name} en el Sheet. Saltando...`);
      continue;
    }

    console.log(`Recuperando ${pi.name} (RUT: ${player.rut})...`);

    // Calcular respuestas aproximadas para el score
    // Sí=3, Más o menos=1, No=0
    let s = pi.score;
    let hotbar = "No", criticos = "No", pvp = "No", clicks = "No";
    
    if (s >= 3) { hotbar = "Sí"; s -= 3; }
    if (s >= 3) { criticos = "Sí"; s -= 3; }
    if (s >= 3) { pvp = "Sí"; s -= 3; }
    if (s >= 3) { clicks = "Sí"; s -= 3; }
    
    if (s >= 1) { 
        if (hotbar === "No") hotbar = "Más o menos"; 
        else if (criticos === "No") criticos = "Más o menos";
        else if (pvp === "No") pvp = "Más o menos";
        else if (clicks === "No") clicks = "Más o menos";
        s -= 1; 
    }
    // Si queda 1 pto más
    if (s >= 1) {
        if (criticos === "No") criticos = "Más o menos";
        else if (pvp === "No") pvp = "Más o menos";
        else if (clicks === "No") clicks = "Más o menos";
    }

    // Insertar Eval
    await MinecraftEval.findOneAndUpdate(
      { "jugador.rut": player.rut },
      {
        jugador: { rut: player.rut, nombre: player.nombre },
        controlHotbar: hotbar,
        controlCriticos: criticos,
        dominioPvP: pvp,
        dominioClicks: clicks
      },
      { upsert: true }
    );

    // Insertar GauntletPlayer
    await GauntletPlayer.findOneAndUpdate(
      { torneo_id: tournamentId, rut: player.rut },
      {
        nombre: player.nombre,
        rut: player.rut,
        grupo: pi.group,
        posicion_grupo: 0,
        estado: 'activo'
      },
      { upsert: true }
    );
  }

  console.log("Recuperación completada.");
  process.exit(0);
}

recover().catch(err => {
  console.error(err);
  process.exit(1);
});
