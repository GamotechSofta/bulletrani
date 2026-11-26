import { ProviderGameSDK, ProviderSDKError } from '@gamotech/game-sdk-client';

/**
 * Phase 3 — Game client (Provider Integration Guide)
 *
 * launchUrl → ?sessionToken=...
 * 1) POST /sessions/validate
 * 2) TABLE_CREATED
 * 3) ROUND_CREATED → ROUND_STARTED → ROUND_ENDED (per crash round)
 * 4) SESSION_ENDED on unload
 *
 * Wallet debit/credit stays on the Java game server (never in browser).
 */

const API_BASE = import.meta.env.VITE_PROVIDER_API_URL || 'https://api.dpbossking.com/api/v1';

let sdk = null;
let tableId = null;
let ready = false;

export function getProviderSdk() {
  return sdk;
}

export function isProviderReady() {
  return ready && !!sdk?.sessionToken;
}

export function getSessionToken() {
  return sdk?.sessionToken || null;
}

export function getProviderTableId() {
  return tableId;
}

export function hasLaunchSessionToken(search = window.location.search) {
  return !!new URLSearchParams(search).get('sessionToken');
}

/**
 * @returns {Promise<
 *   | { mode: 'local' }
 *   | { mode: 'provider', session: object, tableId: string }
 *   | { mode: 'error', error: string, status?: number }
 * >}
 */
export async function initProviderSession() {
  const launchedWithToken = hasLaunchSessionToken();
  sdk = new ProviderGameSDK({ apiBaseUrl: API_BASE });

  if (!launchedWithToken) {
    ready = false;
    sdk = null;
    return { mode: 'local' };
  }

  try {
    // 1) Validate session (required first step — do not trust URL for player/operator ids)
    const session = await sdk.initFromUrl();
    sdk.attachUnloadHandler();

    // 2) TABLE_CREATED after local table setup
    tableId = await sdk.createTable({
      tableId: `bulletrani_${Date.now()}`,
      game: session.gameCode || 'BULLETRANI'
    });

    ready = true;
    return { mode: 'provider', session, tableId };
  } catch (err) {
    ready = false;
    sdk = null;
    tableId = null;

    const message = err?.message || 'Session invalid';
    const status = err?.status;
    // Token was present but validation/events failed → block gameplay
    return { mode: 'error', error: friendlySessionError(message, status), status };
  }
}

function friendlySessionError(message, status) {
  if (status === 401 || /expired|missing/i.test(message)) {
    return 'Session expired or missing. Please re-launch the game from your operator lobby.';
  }
  if (status === 403 || /ended|revoked|closed/i.test(message)) {
    return 'Session closed. Please re-launch the game from your operator lobby.';
  }
  if (status === 404 || /not found|invalid/i.test(message)) {
    return 'Invalid session. Please re-launch the game from your operator lobby.';
  }
  return message || 'Unable to start Provider session.';
}

/** ROUND_CREATED — when the game allocates a new round (countdown / preparing) */
export async function notifyRoundCreated(roundNumber, payload = {}) {
  if (!isProviderReady()) return;
  try {
    await sdk.createRound({
      roundId: String(roundNumber),
      tableId,
      ...payload
    });
  } catch (e) {
    console.warn('[provider] ROUND_CREATED failed', e);
  }
}

/** ROUND_STARTED — when flight / gameplay begins */
export async function notifyRoundStarted(roundNumber, payload = {}) {
  if (!isProviderReady()) return;
  try {
    await sdk.startRound({
      roundId: String(roundNumber),
      tableId,
      ...payload
    });
  } catch (e) {
    console.warn('[provider] ROUND_STARTED failed', e);
  }
}

/** Step 7: ROUND_ENDED */
export async function notifyRoundEnded(roundNumber, payload = {}) {
  if (!isProviderReady()) return;
  try {
    await sdk.endRound({
      roundId: String(roundNumber),
      tableId,
      ...payload
    });
  } catch (e) {
    console.warn('[provider] ROUND_ENDED failed', e);
  }
}

export { ProviderSDKError };
