const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const API_BASE = `http://${host}:5000`;
export const SOCKET_SERVER = `http://${host}:5001`;
