# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `server/`)
```bash
npm run dev      # Nodemon with auto-reload
npm start        # Plain Node
```

### Frontend (run from `client/`)
```bash
npm run dev      # Vite dev server on port 5173
npm run build    # Production build to client/dist/
npm run preview  # Serve production build locally
```

There is no root package.json — client and server are independent.

## Architecture

Full-stack SPA dashboard for a video game club. **Google Sheets is the source of truth for players** — the server polls it every 30 seconds and syncs to MongoDB.

```
React 18 + Vite (port 5173, proxies /api → 3001)
  ↕ HTTP + Socket.io
Express + Socket.io (port 3001)
  ↕
MongoDB (local)  +  Google Sheets API v4  +  Groq AI
```

### Backend (`server/`)
- **`server.js`** — entry point; registers all routes, initializes Socket.io handlers, starts Sheets polling
- **`config/env.js`** — loads and validates `.env`; app exits if required vars are missing
- **`services/sheetsService.js`** — polls Google Sheets every `SYNC_INTERVAL_MS` ms, writes to in-memory cache + MongoDB
- **`services/matchmaking.js`** — bracket seeding algorithm: seed `i` vs seed `N-i+1`, pads with BYEs for non-power-of-2 counts
- **`sockets/`** — one handler file per feature: `debateHandler`, `triviaHandler`, `chatHandler`, `waitingRoomHandler`, `pollHandler`, `evalHandler`
- **`models/`** — Mongoose schemas: `Jugador`, `Duelo`, `WRScore`, `MinecraftEval`, `TournamentGroups`, `GauntletPlayer`

### Frontend (`client/src/`)
- **`App.jsx`** — root: enforces login gate, maps `activeView` string to components, initializes the global Socket.io instance
- **`api/socket.js`** — single shared Socket instance via `getSocket(user)`; passes role/userName/rut as query params
- **`api/api.js`** — all HTTP fetch calls in one file
- **`store/`** — Zustand global state
- Tailwind custom theme: dark surfaces (`surface-*`), purple brand (`brand-*`), cyan/green/amber/red accents

### Key environment variables (backend `.env`)
| Variable | Purpose |
|---|---|
| `SPREADSHEET_ID` | Google Sheets document ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | Path to service account JSON |
| `SHEET_RANGE` | e.g. `ClubVideoJuegos!A1:G200` |
| `MONGO_URI` | MongoDB connection string |
| `PORT` | Server port (default 3001) |
| `SYNC_INTERVAL_MS` | Sheets polling interval (default 30000) |
| `WEBHOOK_API_KEY` | Power Automate webhook auth key |

Google Sheets columns expected: A=Nombre_Completo, B=RUT (primary key), C=Discord_WhatsApp, D=Juego_Propuesto, E=Plataforma, F=Horas_Jugadas, G=Trae_Equipo.

### Leaderboard point formula
`(Matches_Played × 10) + (Matches_Won × 50)`

### Authentication
JWT-based. Optional Microsoft Entra ID (Azure AD) SSO via `passport-azure-ad`. `ADMIN_PASSWORD` default is set in `config/env.js`.

### Testing mode
If the URL contains `/testing`, the frontend shows a warning banner and may bypass some restrictions. No formal test suite exists.
