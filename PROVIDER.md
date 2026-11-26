# Provider Integration — BulletRani

End-to-end notes for onboarding BulletRani on `api.dpbossking.com` (or local gateway).

**Base URL:** `https://api.dpbossking.com/api/v1`  
**Local:** `http://localhost:3000/api/v1`

---

## Recommended game record (admin)

| Field | Value |
|-------|--------|
| `code` / `gameCode` | `BULLETRANI` |
| `slug` | `bulletrani` |
| `name` | `BulletRani` |
| `status` | `ACTIVE` |
| `launchUrl` | Deployed user client root, e.g. `https://play.yourcdn.com/` |
| `maintenanceMode` | `false` |

The user client must be served at `launchUrl` and reads `?sessionToken=` on boot.

---

## Phase checklist

### Admin

- [ ] Game created with `code=BULLETRANI`, `launchUrl`, `status=ACTIVE`
- [ ] Operator created with `apiKey`, `apiSecretPath`, matching `currency`
- [ ] Game added to operator `enabledGames`
- [ ] HMAC secret stored at `apiSecretPath`
- [ ] Operator `ACTIVE`, `maintenanceMode=false`

### Operator backend

- [ ] HMAC sign `POST /api/v1/launch` (path must be exactly `/api/v1/launch`)
- [ ] Optional: `POST /api/v1/validate-operator` before go-live
- [ ] Redirect player to returned `launchUrl` (do not invent the URL)
- [ ] Secret never sent to the browser

### Operator frontend

- [ ] `GET /enabled-games?operatorId=` for lobby
- [ ] Play button hits **your** backend launch, not Provider API from the browser

### BulletRani game client (this repo `/user`)

- [ ] `VITE_PROVIDER_API_URL` points at gateway `/api/v1`
- [ ] Boot: `sessionToken` → validate → `TABLE_CREATED`
- [ ] Each crash round: `ROUND_CREATED` → `ROUND_STARTED` → `ROUND_ENDED`
- [ ] Unload: `SESSION_ENDED` (SDK `attachUnloadHandler`)
- [ ] Invalid/expired token shows session gate (no gameplay)
- [ ] Wallet debit/credit stay on Java game server (`sessionToken` via socket)

### Java game server (`/backend-java`)

- [ ] Open **Admin → Provider Integration** and enable wallet + paste game-server API key
  (or set `PROVIDER_ENABLED` / `GAME_SERVER_API_KEY` in env — admin UI overrides persist in store)
- [ ] `gameCode` matches Provider admin game record (`BULLETRANI`)
- [ ] Bets/cashouts use Provider wallet when `sessionToken` is present

---

## Client lifecycle (Phase 3)

```
?sessionToken=...
  → POST /sessions/validate
  → TABLE_CREATED
  → (per round) ROUND_CREATED → ROUND_STARTED → ROUND_ENDED
  → SESSION_ENDED on leave
```

Implementation: `user/src/providerSdk.js` + boot gate in `user/src/App.jsx`.

Without `sessionToken` in the URL, the client runs **local demo** mode (no Provider calls).

With a token that fails validate (401 / 403 / 404), gameplay is **blocked**.

---

## Env quick reference

| Where | Variable | Purpose |
|-------|----------|---------|
| User Vite | `VITE_PROVIDER_API_URL` | Gateway base (`…/api/v1`) |
| Java | `provider.enabled` | Turn on Provider wallet |
| Operator | `OPERATOR_API_KEY` / `OPERATOR_SECRET` | HMAC launch (operator side only) |

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Empty lobby games | Game not in operator `enabledGames` |
| 403 Game not enabled | Wrong `gameCode` (use `BULLETRANI`) |
| 401 Invalid signature | Secret / path / raw body mismatch |
| 401 Timestamp expired | Clock skew &gt; 5 minutes |
| Session gate in client | Bad/expired `sessionToken` or validate down |
| Bets stay local | `provider.enabled=false` or missing socket `sessionToken` |
