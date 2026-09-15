const PHONE_KEY = 'lamf_user_phone';

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianPhone(phone) {
  const normalized = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}

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
