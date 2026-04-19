const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:3000";

const testAccounts = [
  { rut: "22.022.482-1", nombre: "Test 1" },
  { rut: "22.169.741-3", nombre: "Test 2" },
  { rut: "24.763.951-9", nombre: "Test 3" },
  { rut: "22.090.451-2", nombre: "Test 4" },
  { rut: "28.832.015-2", nombre: "Test 5" },
  { rut: "21.828.051-K", nombre: "Test 6" },
  { rut: "21.355.768-8", nombre: "Test 7" },
  { rut: "21.411.204-3", nombre: "Test 8" },
  { rut: "22.315.927-3", nombre: "Test 9" },
  { rut: "20.980.656-8", nombre: "Test 10" },
  { rut: "21.383.849-0", nombre: "Test 11" },
  { rut: "22.502.567-3", nombre: "Test 12" },
  { rut: "22.393.517-6", nombre: "Test 13" },
];

console.log(`Conectando ${testAccounts.length} bots de prueba...`);

testAccounts.forEach((acc, i) => {
  setTimeout(() => {
    // Al simular el socket, pasamos role y nombre igual que el frontend
    const socket = io(SERVER_URL, { 
      query: { rut: acc.rut, role: 'student', userName: acc.nombre } 
    });

    socket.on("connect", () => {
      console.log(`[+] Bot conectado: ${acc.nombre}`);
      socket.emit("trivia:join", { rut: acc.rut, nombre: acc.nombre });
    });

    // ¡Hacer que los bots respondan solos!
    socket.on("question:new", (q) => {
      // Esperan entre 1 a 4 segundos y responden al azar
      setTimeout(() => {
        const numOptions = q.opciones?.length || 4;
        const randomAnswer = Math.floor(Math.random() * numOptions);
        socket.emit('question:answer', { rut: acc.rut, answerIndex: randomAnswer });
        console.log(`    -> ${acc.nombre} envió respuesta: opción ${['A','B','C','D','E','F'][randomAnswer]}`);
      }, Math.random() * 3000 + 1000);
    });

    socket.on("disconnect", () => {
      console.log(`[-] Bot desconectado ${acc.nombre}`);
    });

  }, i * 200);
});
