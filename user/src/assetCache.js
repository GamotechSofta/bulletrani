/**
 * Warm Cache API for media + persist small game prefs / data in localStorage.
 */

export const ASSET_URLS = [
  '/bike.png',
  '/favicon.svg',
  '/icons.svg',
  '/sounds/bg-music.mp3',
  '/sounds/bike-start.mp3',
  '/sounds/bike-loop.mp3',
  '/sounds/anime-ahh.mp3',
  '/sounds/car-crash.mp3'
];

const CACHE_NAME = 'bulletrani-static-v1';

const KEYS = {
  music: 'br_music_enabled',
  sfx: 'br_sfx_enabled',
  leaderboard: 'br_leaderboard',
  history: 'br_recent_history'
};

/** Register service worker (production + localhost). */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      console.info('[cache] service worker ready', reg.scope);
      return reg;
    })
    .catch((err) => {
      console.warn('[cache] sw register failed', err);
      return null;
    });
}

/** Precache / refresh media into Cache Storage + browser HTTP cache. */
export async function warmAssetCache() {
  // Parallel browser preload (works even without SW)
  const imgHints = ASSET_URLS.filter((u) => /\.(png|svg)$/i.test(u));
  const audioHints = ASSET_URLS.filter((u) => /\.mp3$/i.test(u));

  imgHints.forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });

  audioHints.forEach((src) => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = src;
  });

  if (!('caches' in window)) return { ok: false, reason: 'no-cache-api' };

  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      ASSET_URLS.map(async (url) => {
        try {
          const hit = await cache.match(url);
          if (hit) return;
          const res = await fetch(url, { cache: 'force-cache' });
          if (res.ok) await cache.put(url, res.clone());
        } catch (e) {
          console.warn('[cache] asset miss', url, e);
        }
      })
    );
    return { ok: true };
  } catch (e) {
    console.warn('[cache] warm failed', e);
    return { ok: false, reason: String(e) };
  }
}

export function loadAudioPrefs() {
  const musicRaw = localStorage.getItem(KEYS.music);
  const sfxRaw = localStorage.getItem(KEYS.sfx);
  return {
    musicEnabled: musicRaw == null ? true : musicRaw === '1',
    soundEnabled: sfxRaw == null ? true : sfxRaw === '1'
  };
}

export function saveAudioPrefs({ musicEnabled, soundEnabled }) {
  if (typeof musicEnabled === 'boolean') {
    localStorage.setItem(KEYS.music, musicEnabled ? '1' : '0');
  }
  if (typeof soundEnabled === 'boolean') {
    localStorage.setItem(KEYS.sfx, soundEnabled ? '1' : '0');
  }
}

export function cacheLeaderboard(topWins) {
  if (!Array.isArray(topWins)) return;
  try {
    localStorage.setItem(
      KEYS.leaderboard,
      JSON.stringify({ at: Date.now(), topWins: topWins.slice(0, 20) })
    );
  } catch (_) {}
}

export function readCachedLeaderboard(maxAgeMs = 1000 * 60 * 30) {
  try {
    const raw = localStorage.getItem(KEYS.leaderboard);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.topWins || !Array.isArray(data.topWins)) return null;
    if (Date.now() - (data.at || 0) > maxAgeMs) return data.topWins; // still show stale
    return data.topWins;
  } catch (_) {
    return null;
  }
}

export function cacheRecentHistory(rounds) {
  if (!Array.isArray(rounds)) return;
  try {
    localStorage.setItem(
      KEYS.history,
      JSON.stringify({ at: Date.now(), rounds: rounds.slice(-40) })
    );
  } catch (_) {}
}

export function readCachedHistory() {
  try {
    const raw = localStorage.getItem(KEYS.history);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data?.rounds) ? data.rounds : [];
  } catch (_) {
    return [];
  }
}
