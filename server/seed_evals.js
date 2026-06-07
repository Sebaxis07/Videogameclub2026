const connectDB = require('./config/db');
const MinecraftEval = require('./models/MinecraftEval');
const MortalKombatEval = require('./models/MortalKombatEval');

const mcEvals = [
  {
    jugador: { rut: "21336688-2", nombre: "francisco ribeiro" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "21.411.204-3", nombre: "Sebastian Alexander Anabalon Rojas" },
    controlHotbar: "Sí", controlCriticos: "Sí", dominioPvP: "Sí", dominioClicks: "Sí"
  },
  {
    jugador: { rut: "11.111.111-1", nombre: "Rodrigo2" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "21.355.768-8", nombre: "Fernanda Carvajal" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "26.324.548-2", nombre: "deibi" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "24.763.951-9", nombre: "Angel Torres" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "4.444.444-4", nombre: "kevin" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "22288480-2", nombre: "elias valenzuela" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "22.090.451-2", nombre: "Tomas Pizarro" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "28.832.015-2", nombre: "Carmen Huaman" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "22.169.741-3", nombre: "Miguel aguilera" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "22.315.927-3", nombre: "Sebastián Rojas" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "3.333.333-3", nombre: "Cristopher" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "2.222.222-2", name: "Benjamin U", nombre: "Benjamin U" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "21135332-K", nombre: "Yamir" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "22.340.829-k", nombre: "Marcelo" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "20.416.069-4", nombre: "Deyanira Rojas" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "23189772-0", nombre: "Derek Gallardo" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "21586510-k", nombre: "Francisca" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "No"
  },
  {
    jugador: { rut: "21985425-9", nombre: "Gabriel" },
    controlHotbar: "No", controlCriticos: "No", dominioPvP: "No", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "44.444.444-4", nombre: "Katalina Club" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  },
  {
    jugador: { rut: "77.777.777-7", nombre: "Sebastian Miranda" },
    controlHotbar: "Más o menos", controlCriticos: "Más o menos", dominioPvP: "Más o menos", dominioClicks: "Más o menos"
  }
];

const mkEvals = [
  {
    jugador: { rut: "22.169.741-3", nombre: "Miguel aguilera" },
    movilidad: "Sí", peligrosidad: "Sí", energia: "Sí", defensa: "Sí"
  },
  {
    jugador: { rut: "24.763.951-9", nombre: "Angel Torres" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "22.090.451-2", nombre: "Tomas Pizarro" },
    movilidad: "No", peligrosidad: "No", energia: "No", defensa: "Más o menos"
  },
  {
    jugador: { rut: "28.832.015-2", nombre: "Carmen Huaman" },
    movilidad: "No", peligrosidad: "No", energia: "No", defensa: "No"
  },
  {
    jugador: { rut: "21.355.768-8", nombre: "Fernanda Carvajal" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "21.411.204-3", nombre: "Sebastian Alexander Anabalon Rojas" },
    movilidad: "Sí", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "22.315.927-3", nombre: "Sebastián Rojas" },
    movilidad: "Sí", peligrosidad: "Sí", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "22288480-2", nombre: "elias valenzuela" },
    movilidad: "Más o menos", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
  },
  {
    jugador: { rut: "26.324.548-2", nombre: "deibi" },
    movilidad: "Más o menos", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
  },
  {
    jugador: { rut: "23189772-0", nombre: "Derek Gallardo" },
    movilidad: "Más o menos", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
  },
  {
    jugador: { rut: "21336688-2", nombre: "francisco ribeiro" },
    movilidad: "Sí", peligrosidad: "Sí", energia: "Sí", defensa: "Sí"
  },
  {
    jugador: { rut: "3.333.333-3", nombre: "Cristopher" },
    movilidad: "Sí", peligrosidad: "Sí", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "2.222.222-2", nombre: "Benjamin U" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "21135332-K", nombre: "Yamir" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "22.340.829-k", nombre: "Marcelo" },
    movilidad: "Sí", peligrosidad: "Sí", energia: "Sí", defensa: "Más o menos"
  },
  {
    jugador: { rut: "21586510-k", nombre: "Francisca" },
    movilidad: "Más o menos", peligrosidad: "No", energia: "No", defensa: "Más o menos"
  },
  {
    jugador: { rut: "4.444.444-4", nombre: "kevin" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "11.111.111-1", nombre: "Rodrigo2" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "20.416.069-4", nombre: "Deyanira Rojas" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "44.444.444-4", nombre: "Katalina Club" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "21985425-9", nombre: "Gabriel" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  },
  {
    jugador: { rut: "77.777.777-7", nombre: "Sebastian Miranda" },
    movilidad: "Más o menos", peligrosidad: "Más o menos", energia: "Más o menos", defensa: "Más o menos"
  }
];

async function run() {
  await connectDB();
  
  console.log("Limpiando colecciones anteriores...");
  await MinecraftEval.deleteMany({});
  await MortalKombatEval.deleteMany({});
  
  console.log("Insertando evaluaciones de Minecraft...");
  await MinecraftEval.insertMany(mcEvals);
  
  console.log("Insertando evaluaciones de Mortal Kombat...");
  await MortalKombatEval.insertMany(mkEvals);
  
  console.log("¡Base de datos MongoDB Atlas poblada exitosamente!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error al poblar base de datos:", err);
  process.exit(1);
});
