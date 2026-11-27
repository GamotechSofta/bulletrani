/**
 * Pure URL parameter parsing & safety helpers for Operations Launch & Boot.
 */

export function isSafeCloseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function readOperationsLaunchParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  return {
    token: params.get('token'),
    partnerCode: params.get('partner_code'),
    gid: params.get('gid'),
    gameCode: params.get('game_code'),
    username: params.get('username'),
    userId: params.get('user_id'),
    currency: params.get('currency') || 'INR',
    lang: params.get('lang') || 'en',
    extsess: params.get('extsess'),
    closeUrl: params.get('close_url'),
    rawCurrency: params.get('currency'),
    rawLang: params.get('lang')
  };
}

export function hasOperationsLaunch(search = window.location.search) {
  const params = new URLSearchParams(search);
  if (params.has('sessionToken')) return false;
  return (
    params.has('token') ||
    params.has('partner_code') ||
    params.has('gid') ||
    params.has('game_code')
  );
}
