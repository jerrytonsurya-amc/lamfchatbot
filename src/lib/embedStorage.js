import { getSessionId } from './userSession.js';

function storageKey() {
  return `lamf-embed-messages-${getSessionId()}`;
}

export function loadEmbedMessages() {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEmbedMessages(messages) {
  localStorage.setItem(storageKey(), JSON.stringify(messages));
}
