# Dashboard Club de Videojuegos 🎮

Dashboard administrativo privado para gestionar ligas de un Club de Videojuegos.
**Google Sheets** es la única fuente de verdad (Single Source of Truth).

## Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend  | Node.js + Express |
| Estado   | Zustand |
| Datos    | Google Sheets API v4 |

## Estructura

```
videogame-club-dashboard/
├── server/
│   ├── server.js                  # Entry point Express + polling 30s
│   ├── package.json
│   ├── .env.example               # Variables de entorno
│   ├── routes/
│   │   └── api.js                 # GET /api/players|debate|bracket|leaderboard
│   └── services/
│       ├── matchmaking.js         # ⚡ Algoritmo seeding + bracket
│       ├── sheetsService.js       # Google Sheets API v4
│       └── leaderboard.js        # Fórmula puntos
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── api/api.js             # Cliente HTTP
        ├── store/useStore.js      # Zustand global store
        └── components/
            ├── Sidebar.jsx
            ├── SyncStatus.jsx
            ├── DebateChart.jsx    # Módulo 2: gráfico de debate
            ├── BracketBoard.jsx   # Módulo 3: árbol interactivo
            ├── Leaderboard.jsx    # Módulo 4: Top 5
            └── PlayersTable.jsx   # Rosster completo
```

## Algoritmo de Emparejamiento

Seed `i` vs Seed `N - i + 1` donde N es la siguiente potencia de 2.

**Ejemplo con N=8:**
```
Seed 1 (más horas) ──── vs ──── Seed 8
Seed 2             ──── vs ──── Seed 7
Seed 3             ──── vs ──── Seed 6
Seed 4             ──── vs ──── Seed 5
```

Si N no es potencia de 2, se añaden **BYEs** para los seeds más altos.

## Fórmula de Puntos

```
Puntos Totales = (Partidas_Jugadas × 10) + (Partidas_Ganadas × 50)
```

## Configuración

### 1. Backend

```bash
cd server
cp .env.example .env
# Edita .env con tu SPREADSHEET_ID y la ruta al JSON de Service Account
npm install
npm start
```

#### Google Sheets Setup
1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita la **Google Sheets API**
3. Crea una **Service Account** y descarga su key JSON
4. Comparte el spreadsheet con el email de la Service Account (modo lectura)
5. Pon el `.json` en `server/serviceAccountKey.json`

#### Columnas del Spreadsheet (fila 1 = cabeceras, fila 2+ = datos)
| Col | Campo | Tipo |
|-----|-------|------|
| A | Nombre_Completo | String |
| B | RUT | String (PK) |
| C | Discord_WhatsApp | String |
| D | Juego_Propuesto | String |
| E | Plataforma | String |
| F | Horas_Jugadas | Number |
| G | Trae_Equipo | Boolean (si/no/true/false) |

### 2. Frontend

```bash
cd client
npm install
npm run dev
# Abre http://localhost:5173
```

> El proxy de Vite redirige `/api/*` → `http://localhost:3001/api/*`

## Módulos

| Módulo | Componente | Descripción |
|--------|-----------|-------------|
| 1 | `SyncStatus` | Polling 30s + sync manual |
| 2 | `DebateChart` | Barras por Juego_Propuesto |
| 3 | `BracketBoard` | Árbol interactivo con click-to-advance |
| 4 | `Leaderboard` | Top 5 por fórmula de puntos |
