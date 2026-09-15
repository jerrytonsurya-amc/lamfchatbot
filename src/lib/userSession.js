const SESSION_KEY = 'lamf_session_id';
const COOKIE_NAME = 'lamf_session_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

let cachedSessionId = null;

export function getSessionId() {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === 'undefined') return 'server';

  let id = readCookie(COOKIE_NAME) || localStorage.getItem(SESSION_KEY);

  if (!id) {
    id = generateSessionId();
  }

  localStorage.setItem(SESSION_KEY, id);
  writeCookie(COOKIE_NAME, id);
  cachedSessionId = id;
  return id;
}
