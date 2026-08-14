import { getClientDateTime } from './datetime.js';

export function getEmbedApiBase() {
  if (typeof window === 'undefined') return '';
  return window.LAMF_CHATBOT_API_BASE || window.location.origin;
}

export async function sendEmbedChatMessage(message, history = []) {
  const apiBase = getEmbedApiBase().replace(/\/$/, '');
  const res = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      currentDateTime: getClientDateTime(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to get response');
  }

  return res.json();
}
