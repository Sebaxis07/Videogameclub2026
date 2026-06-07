# Dashboard Club de Videojuegos 🎮🏆

Plataforma MERN-Stack (MongoDB, Express, React, Node.js) con comunicación bidireccional en tiempo real mediante WebSockets (Socket.io). Diseñada para la orquestación y administración del Club de Videojuegos, automatizando desde la inscripción de jugadores hasta la ejecución en vivo de ligas, trivias de facciones con comodines, torneos de alta competencia y la ceremonia de diplomas.

El sistema adopta un enfoque híbrido de persistencia: **Google Sheets** actúa como la única fuente de verdad (Single Source of Truth) para la administración administrativa del roster, mientras que **MongoDB** almacena el estado dinámico de los torneos, evaluaciones técnicas, mensajería directa y las configuraciones de la sala en tiempo real.

---

## 📖 Índice
1. [Características Clave y Módulos](#-características-clave-y-módulos)
2. [Deep Dive: Algoritmos y Reglas de Torneo](#-deep-dive-algoritmos-y-reglas-de-torneo)
3. [Estructura del Proyecto y Flujo de Datos](#-estructura-del-proyecto-y-flujo-de-datos)
4. [Esquemas de Base de Datos (MongoDB)](#-esquemas-de-base-de-datos-mongodb)
5. [Protocolo de Comunicación WebSocket (Socket.io)](#-protocolo-de-comunicación-websocket-socketio)
6. [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
7. [Guía de Instalación y Ejecución Local](#-guía-de-instalación-y-ejecución-local)
8. [Estrategia de Despliegue en Producción (Vercel + Render + Atlas)](#-estrategia-de-despliegue-en-producción-vercel--render--atlas)
9. [Resolución de Problemas Comunes (Troubleshooting)](#-resolución-de-problemas-comunes-troubleshooting)

---

## 🚀 Características Clave y Módulos

### Módulo 1: Sincronización y Estado (`SyncStatus`)
* **Sincronización Bidireccional**: Polling automático cada 30 segundos del roster de alumnos desde Google Sheets.
* **Control Manual**: Botón en panel administrativo para forzar la sincronización en caliente ante cambios urgentes en la planilla.
* **Resiliencia**: Sistema de caché en memoria y base de datos para garantizar el funcionamiento del dashboard si la API de Google Sheets experimenta límites de cuota (rate limits).

### Módulo 2: Arena de Debate y Votación (`DebateChart` / `VotingArena`)
* **Votación de Juegos**: Los estudiantes pueden proponer y votar por las tres categorías semanales del club.
* **Gráficos en Tiempo Real**: Renderizado dinámico de barras de votación utilizando Chart.js/Recharts para proyectar los resultados en la pantalla principal del club.

### Módulo 3: Torneo de Minecraft (Gauntlet PvP)
* **Fase de Liga Suiza (Swiss Pairing)**:
  * Generación dinámica de rondas sin repetición de duelos previos.
  * Cálculo automático de desempates utilizando la suma de puntos de los oponentes (**Sistema Buchholz**).
* **Fase de Playoffs**:
  * Árbol interactivo de doble eliminación (Upper y Lower Bracket) para 8 jugadores.
  * Gestión de posiciones comodines (Wildcards) y BYEs para clasificados impares.
* **Impuesto de Tiers (Handicaps)**:
  * Ajuste automático de atributos de juego (armadura, daño y regeneración) para emparejar duelos entre diferentes categorías.
  * Debuffs fijos (Fatiga de picar, debilidad) y debuffs elegidos voluntariamente a cambio de puntos adicionales de Hype.

### Módulo 4: Torneo de Mortal Kombat XL (Desafío de Jefes)
* **División por Rangos**: Clasificación automática basada en evaluaciones previas en tres bloques (Bronce/Novatos, Plata/Intermedios, Oro/Expertos).
* **Bloque A (Novatos)**: Eliminatoria simple; el campeón avanza al Bloque B.
* **Bloque B (Intermedios + Campeón A)**: Eliminatoria simple para definir a los 2 Aspirantes oficiales.
* **Boss Fight**: Los 2 Aspirantes se enfrentan a "Los Jefes" (los 2 Oro con mejor score) con una ruleta de nerfs de personajes aleatorios (ej: "Sin agarres", "Sin ataques especiales", "Botón bloqueado").
* **Gran Final**: Duelo decisivo adaptado según el estado de supervivencia (Titanes, Sorpresa o David vs Goliat).

### Módulo 5: Trivia Arena con Comodines Activos ⚡
* Concurso de opción múltiple en tiempo real con integración de comodines estratégicos por facciones:
  * **Sobrecarga (Overload)**: Duplica los puntos obtenidos si aciertas, pero si fallas le resta 20 puntos al líder actual del ranking.
  * **Escudo (Shield)**: Bloquea cualquier intento de sabotaje o reducción de puntos externa durante el turno actual.
  * **Escáner (Scan)**: Utiliza un algoritmo de descarte para eliminar automáticamente 2 de las alternativas incorrectas.
  * **Ruleta (Roulette)**: Multiplica los puntos de la pregunta por 2 o los divide por 2 de forma aleatoria (50% de probabilidad).

### Módulo 6: Minijuegos Multijugador (Sala de Espera)
* **Gartic Club**: Lienzo compartido en tiempo real (HTML5 Canvas + WebSockets) donde un estudiante dibuja una palabra y el resto adivina en un chat dedicado.
* **Infiltrado Arena**: Un juego de deducción social donde un jugador recibe una palabra ligeramente distinta ("Infiltrado") o ninguna palabra ("Infiltrado Total") y debe camuflarse mediante asociación de palabras cortas.
* **Pixel Quiz Arena**: Dinámica de duelos uno contra uno rápidos con límite de 15 segundos para responder preguntas de cultura gamer general.

---

## 📊 Deep Dive: Algoritmos y Reglas de Torneo

### 1. Algoritmo de Emparejamiento (Swiss Stage)
El motor de emparejamiento suizo se rige bajo los siguientes principios ordenados por prioridad:
1. **Evitar Repetición**: No se puede emparejar a dos jugadores si ya se enfrentaron en rondas anteriores de la fase actual.
2. **Puntuación Similar**: Se agrupa a los jugadores en "Grupos de Puntuación" (Score Groups) y se empareja internamente.
3. **Optimización Greedy**: Si un grupo tiene número impar, el jugador restante se empareja con el mejor posicionado del grupo inferior.
4. **BYE Automático**: Si el número total de jugadores activos es impar, el jugador de menor ranking que no haya recibido un BYE previo avanza automáticamente con una victoria por Walkover (WO).

### 2. Cálculo del Score de Ligas (Leaderboard)
El ranking del club se pondera bajo la siguiente fórmula matemática:
$$\text{Puntos Totales} = (\text{Partidas Jugadas} \times 10) + (\text{Partidas Ganadas} \times 50) + \text{Bonificaciones Especiales (Hype/Trivia)}$$

En caso de empate en los puntos del torneo regular, los criterios de desempate son:
1. Enfrentamiento directo (Head-to-Head).
2. Mayor porcentaje de victorias totales.
3. Horas de juego acumuladas en el registro de Sheets.

---

## 📂 Estructura del Proyecto y Flujo de Datos

```text
videogame-club-dashboard/
├── server/                           # Backend (Node.js & Express)
│   ├── config/
│   │   ├── db.js                     # Configuración del ODM Mongoose
│   │   └── env.js                    # Sanitización y validación estricta de envs
│   ├── models/                       # Modelos de MongoDB
│   │   ├── Jugador.js                # Roster espejo de Google Sheets
│   │   ├── MinecraftEval.js          # Datos técnicos para Torneo MC
│   │   ├── MortalKombatEval.js       # Atributos técnicos para Torneo MK
│   │   ├── MortalKombatTournament.js # Estado interno del bracket de MK
│   │   └── Duelo.js                  # Emparejamientos activos en vivo
│   ├── routes/
│   │   ├── api.js                    # Endpoints para la sincronización y vistas generales
│   │   ├── mcTournament.js           # API REST de control de Minecraft (Swiss/Playoffs)
│   │   └── mortalKombatTournament.js # API REST de control del Desafío a Jefes
│   ├── services/
│   │   ├── sheetsService.js          # Cliente de Google Sheets API v4
│   │   ├── matchmaking.js            # Algoritmo de seeding inicial
│   │   └── mcTournament/
│   │       ├── swissPairing.js       # Implementación matemática de Liga Suiza
│   │       ├── playoffBracket.js     # Orquestador de playoffs de doble eliminación
│   │       └── handicap.js           # Matriz de Tiers y debuffs
│   ├── sockets/                      # Controladores Socket.io
│   │   ├── triviaHandler.js          # Sincronización del temporizador y comodines
│   │   ├── mcTournamentHandler.js    # Reloj y duelos proyectados de Minecraft
│   │   └── mkTournamentHandler.js    # Sucesión de rounds en Mortal Kombat
│   └── server.js                     # Inicializador HTTP, Express y Socket.io
└── client/                           # Frontend (React & Vite)
    ├── src/
    │   ├── api/
    │   │   ├── api.js                # Peticiones REST con Axios/Fetch
    │   │   └── socket.js             # Singleton del cliente WebSocket
    │   ├── store/
    │   │   └── useStore.js           # Estado global de Zustand (sesión, vistas, UI)
    │   └── components/               # Módulos y vistas principales
    │       ├── TimelineModule.jsx    # Hitos del club
    │       ├── VotingArena.jsx       # Interfaz de votación estudiantil
    │       ├── AdminVoting.jsx       # Dashboard de control de votaciones
    │       ├── TriviaArena.jsx       # Cliente multijugador de la Trivia
    │       └── BracketBoard.jsx      # Renderizado de brackets
```

---

## 💾 Esquemas de Base de Datos (MongoDB)

### 1. Evaluaciones de Minecraft (`MinecraftEval.js`)
Almacena el perfil técnico del estudiante que determina su Tier para el torneo.
* `jugador.rut`: Identificador único del alumno.
* `jugador.nombre`: Nombre de pila.
* `controlHotbar`: Calificación del control de inventario dinámico (`Sí`, `No`, `Más o menos`).
* `controlCriticos`: Dominio del salto y golpe crítico (`Sí`, `No`, `Más o menos`).
* `dominioPvP`: Nivel general de combate cuerpo a cuerpo.
* `dominioClicks`: Velocidad y consistencia de CPS (Clicks por segundo).

### 2. Evaluaciones de Mortal Kombat (`MortalKombatEval.js`)
* `movilidad`: Control de distancias y desplazamientos (`Sí`, `No`, `Más o menos`).
* `peligrosidad`: Capacidad para encadenar combos complejos (`Sí`, `No`, `Más o menos`).
* `energia`: Gestión de las barras de meter/energía para rompedores o especiales.
* `defensa`: Uso eficiente de bloqueos y evasiones.

---

## 🔌 Protocolo de Comunicación WebSocket (Socket.io)

El servidor levanta un socket persistente que gestiona los siguientes canales críticos de comunicación:

| Evento Emisor | Payload | Propósito |
| :--- | :--- | :--- |
| `mc_timer:sync` | `{ running: Boolean, seconds: Number }` | Sincroniza el cronómetro del duelo de Minecraft para todos los espectadores en tiempo real. |
| `mc_timer:control` | `{ action: 'start'\|'pause'\|'reset', seconds: Number }` | Orden emitida desde la mesa técnica de administración. |
| `trivia:question` | `{ questionId: String, timer: Number }` | Dispara la apertura de una nueva pregunta para los estudiantes conectados. |
| `trivia:wildcard` | `{ user: String, target: String, type: String }` | Notifica el lanzamiento y la aplicación de un comodín. |
| `settings:updated` | `{ visibleModules: Array, loginActive: Boolean }` | Controla en tiempo real qué pestañas del menú lateral están disponibles para los estudiantes. |

---

## ⚙️ Configuración de Variables de Entorno

### Archivo de Configuración del Servidor (`server/.env`)
Crea este archivo en la raíz del backend para conectar los servicios externos:

```env
# Configuración Básica
PORT=3000
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/videogame_club?retryWrites=true&w=majority

# Identificadores de Google Sheets
SPREADSHEET_ID=17oLPkIhqpUzrLztAjfmCsJxdnnSvurqIi4Lfpyof7eg
SHEET_RANGE=ClubVideoJuegos!A1:G200
SHEET_NAME=ClubVideojuegos

# Parámetros del Motor
SYNC_INTERVAL_MS=30000
ADMIN_PASSWORD=Becky0704

# Autenticación Segura (Escoge una opción)
# Opción 1: Contenido completo del archivo JSON de Google (Ideal para producción en Render/Railway)
GOOGLE_SERVICE_ACCOUNT_KEY_JSON={"type": "service_account", "project_id": "thermal-land-...", "private_key": "-----BEGIN PRIVATE KEY-----\n..."}

# Opción 2: Ruta física al archivo de credenciales local (Ideal para desarrollo local)
# GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./serviceAccountKey.json
```

---

## 💻 Guía de Instalación y Ejecución Local

### Prerrequisitos
* **Node.js** v18 o superior instalado.
* **MongoDB Community Server** instalado y activo localmente.

### 1. Iniciar MongoDB Local
```powershell
# En Windows (PowerShell con privilegios de Administrador)
Start-Service -Name MongoDB
```

### 2. Clonar e Instalar Servidor
```bash
cd server
npm install
# Copiar las credenciales de Sheets y configurar el archivo .env
npm start
```
*Si todo está en orden, deberías ver la confirmación en la consola:*
`[MongoDB] Conectado exitosamente`
`[Sheets] Sync OK — 22 jugadores cargados.`

### 3. Instalar Cliente
```bash
cd ../client
npm install
npm run dev
```
*Abre tu navegador en `http://localhost:5173` para interactuar con la aplicación.*

---

## 🌐 Estrategia de Despliegue en Producción

Para garantizar el correcto funcionamiento de Socket.io en tiempo real y evitar cortes de conexión, se recomienda la siguiente arquitectura:

### 1. Despliegue del Frontend (Vercel)
* **Importar Repositorio**: Selecciona la carpeta raíz del proyecto y define `client` como el **Root Directory**.
* **Variables de Entorno**: Agrega `VITE_API_URL` apuntando a la dirección del servidor en Render (ej: `https://videogame-club-backend.onrender.com/api`).
* **Compilación**: Configura el framework preset en `Vite` (`npm run build` -> carpeta `dist`).

### 2. Despliegue del Backend (Render / Railway)
* **Importar Repositorio**: Especifica `server` como el **Root Directory**.
* **Comando de Compilación**: `npm install`
* **Comando de Inicio**: `npm start`
* **Variables de Entorno**: Añade la variable `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` copiando directamente el contenido del archivo de credenciales de Google para evitar subir la clave de forma insegura a tu repositorio público.

---

## ⚠️ Resolución de Problemas Comunes (Troubleshooting)

### 1. Error `EADDRINUSE: address already in use :::3001`
* **Causa**: El puerto `3001` o `3000` está ocupado por una instancia previa del servidor Express que no se cerró correctamente.
* **Solución**: Ejecuta los siguientes comandos en PowerShell para buscar y finalizar el proceso colgado:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
  ```

### 2. Error `connect ECONNREFUSED 127.0.0.1:27017`
* **Causa**: El servicio local de MongoDB no está ejecutándose en segundo plano.
* **Solución**: Inicia el servicio en PowerShell:
  ```powershell
  Start-Service -Name MongoDB
  ```

### 3. Advertencia de tamaño de Chunk en Vite (`> 500 kB`)
* **Causa**: El cliente incluye grandes dependencias que se compilan en un solo bundle.
* **Solución**: Puedes habilitar la división manual de código añadiendo el siguiente bloque en `client/vite.config.js`:
  ```javascript
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  }
  ```
