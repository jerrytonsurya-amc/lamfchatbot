import { normalizePhone } from './phoneSession.js';

function storageKey(phone) {
  return `lamf-phone-chat-${normalizePhone(phone)}`;
}

export function loadPhoneMessages(phone) {
  if (!phone) return [];
  try {
    const raw = localStorage.getItem(storageKey(phone));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePhoneMessages(phone, messages) {
  if (!phone) return;
  localStorage.setItem(storageKey(phone), JSON.stringify(messages));
}
