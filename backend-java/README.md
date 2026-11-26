# BulletRani Spring Boot Backend

Java/Spring Boot port of the Node crash-game engine.

## Ports
- **REST API:** `http://localhost:5000`
- **Socket.IO:** `http://localhost:5001`

Frontends keep API calls on `:5000` and connect sockets to `:5001`.

## Run (local Maven)
Stop anything already bound to ports 5000/5001, then:

```bat
mvnw.cmd spring-boot:run
```

Or from repo root:

```bat
npm run start:backend-java
```

## Run (Docker)
Requires Docker Desktop and a filled-in `.env` (see `.env.example`).

```bat
docker compose up --build -d
```

API: `http://localhost:5000` · Socket.IO: `http://localhost:5001`

```bat
docker compose logs -f backend
docker compose down
```

The image vendors `libs/game-sdk-1.0.0.jar` (Provider SDK) at build time.

## Provider Game SDK (`in.oreng:game-sdk`)
Wallet debit/credit goes through Provider when enabled:

```bat
set PROVIDER_ENABLED=true
set PROVIDER_API_URL=https://api.dpbossking.com/api/v1
set GAME_SERVER_API_KEY=your-secret
mvnw.cmd spring-boot:run
```

- Bet place → `debit`
- Cashout / cancel refund → `credit`
- Without `sessionToken` (or provider disabled) → local JSON wallet

Client launches with `?sessionToken=...` and uses `@gamotech/game-sdk-client` for session + round events.

## Data
Persists to **MongoDB** (`MONGODB_URI` + `MONGODB_DATABASE` in `.env`).
The legacy `backend/data/store.json` file is no longer written.

Admin login: `admin` / value of `ADMIN_PASSWORD` in `.env` (required; no weak default).

## Stack
- Spring Boot 4 (Web MVC)
- netty-socketio
- `in.oreng:game-sdk` (Provider wallet)
- JJWT
- BCrypt (spring-security-crypto)
