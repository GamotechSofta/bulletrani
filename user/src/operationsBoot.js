import { API_BASE } from './config';
import {
  isSafeCloseUrl,
  readOperationsLaunchParams,
  hasOperationsLaunch
} from './operationsParams';

export { isSafeCloseUrl, readOperationsLaunchParams, hasOperationsLaunch };

/**
 * Operations Launch & Boot client helper.
 *
 * Security rule: NEVER call /api/v1/wallet/* directly from the browser.
 * Reads query parameters appended to launchUrl and forwards them to our own
 * game backend (/api/operations/boot), which calls 2051/2052 server-to-server
 * using X-Internal-Key.
 */

/**
 * Forward launch query parameters to game backend /api/operations/boot.
 * @returns {Promise<
 *   | { mode: 'local' }
 *   | { mode: 'operations', token: string, jwt: string | null, userId: number | null, balance: number | null, session: object, ui: object }
 *   | { mode: 'error', error: string, closeUrl: string | null }
 * >}
 */
export async function bootOperationsSession(search = window.location.search) {
  if (!hasOperationsLaunch(search)) {
    return { mode: 'local' };
  }

  const launch = readOperationsLaunchParams(search);
  const safeFallbackClose = isSafeCloseUrl(launch.closeUrl) ? launch.closeUrl.trim() : null;

  try {
    const res = await fetch(`${API_BASE}/api/operations/boot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: launch.token,
        partner_code: launch.partnerCode,
        gid: launch.gid,
        game_code: launch.gameCode,
        username: launch.username,
        user_id: launch.userId,
        currency: launch.rawCurrency,
        lang: launch.rawLang,
        extsess: launch.extsess,
        close_url: launch.closeUrl
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        mode: 'error',
        error: data.error || 'Launch session could not be validated.',
        closeUrl: safeFallbackClose
      };
    }

    const session = data.session || {};
    const validCloseUrl = isSafeCloseUrl(session.closeUrl) ? session.closeUrl : null;
    return {
      mode: 'operations',
      token: launch.token,
      jwt: data.jwt || null,
      userId: data.userId ?? null,
      balance: data.balance != null ? Number(data.balance) : null,
      session: {
        ...session,
        closeUrl: validCloseUrl
      },
      ui: data.ui || {}
    };
  } catch {
    return {
      mode: 'error',
      error: 'Unable to reach the game backend to validate your launch session.',
      closeUrl: safeFallbackClose
    };
  }
}

export async function refreshOperationsBalance(token) {
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/operations/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const data = await res.json();
  if (res.ok && data.success && data.balance != null) {
    return Number(data.balance);
  }
  return null;
}

export function exitGame(closeUrl) {
  if (!closeUrl || !isSafeCloseUrl(closeUrl)) {
    window.close();
    return;
  }
  try {
    (window.top || window).location.href = closeUrl;
  } catch {
    window.location.href = closeUrl;
  }
}
