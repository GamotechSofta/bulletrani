/**
 * API / Socket base URLs from Vite env.
 * On HTTP LAN only: rewrite localhost → page hostname so phones/PCs can connect.
 * Never rewrite on HTTPS (Vercel) — set real backend URLs in Vercel env instead.
 */
function resolveUrl(raw, fallback) {
  const value = (raw && String(raw).trim()) || fallback;
  if (typeof window === 'undefined') return value;

  try {
    const u = new URL(value);
    const pageIsLocalHttp =
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (
      pageIsLocalHttp &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    ) {
      u.hostname = window.location.hostname;
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    return value.replace(/\/$/, '');
  }
}

export const API_BASE = resolveUrl(
  import.meta.env.VITE_API_BASE,
  'http://localhost:5000'
);

export const SOCKET_SERVER = resolveUrl(
  import.meta.env.VITE_SOCKET_URL,
  'http://localhost:5001'
);
