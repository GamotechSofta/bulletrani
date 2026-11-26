/**
 * API / Socket base URLs from Vite env (baked in at build time).
 * On LAN only: rewrite localhost → page hostname so phones can reach the host PC.
 * Never rewrite on public hosts (e.g. *.vercel.app).
 */
function isPrivateLanHost(hostname) {
  return (
    /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
    hostname.endsWith('.local')
  );
}

function resolveEnvUrl(raw, fallback) {
  const value = (raw && String(raw).trim()) || fallback;
  if (typeof window === 'undefined') return value;

  try {
    const u = new URL(value);
    const pageHost = window.location.hostname;
    if (
      isPrivateLanHost(pageHost) &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    ) {
      u.hostname = pageHost;
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    return value.replace(/\/$/, '');
  }
}

export const API_BASE = resolveEnvUrl(
  import.meta.env.VITE_API_BASE,
  'http://localhost:5000/api'
);

export const SOCKET_URL = resolveEnvUrl(
  import.meta.env.VITE_SOCKET_URL,
  'http://localhost:5001'
);
