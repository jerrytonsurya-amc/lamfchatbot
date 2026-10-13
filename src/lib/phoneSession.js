import { normalizePhone, isValidIndianPhone } from '../../shared/phone.js';

export { normalizePhone, isValidIndianPhone };

const PHONE_KEY = 'lamf_user_phone';

export function formatPhoneDisplay(phone) {
  const n = normalizePhone(phone);
  if (n.length !== 10) return phone;
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}

export function getStoredPhone() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PHONE_KEY);
  return raw && isValidIndianPhone(raw) ? normalizePhone(raw) : null;
}

export function setStoredPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!isValidIndianPhone(normalized)) {
    throw new Error('Invalid phone number');
  }
  localStorage.setItem(PHONE_KEY, normalized);
  return normalized;
}

export function clearStoredPhone() {
  localStorage.removeItem(PHONE_KEY);
}
