// storage.js
const KEY = 'sid_auth';

export function saveSession({ username, token }) {
  localStorage.setItem(KEY, JSON.stringify({ username, token }));
}
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
  catch { return null; }
}
export function clearSession() {
  localStorage.removeItem(KEY);
}
export function isAuthenticated() {
  const s = loadSession();
  return Boolean(s?.token && s?.username);
}
export function getToken() { return loadSession()?.token || null; }
export function getUsername() { return loadSession()?.username || null; }
