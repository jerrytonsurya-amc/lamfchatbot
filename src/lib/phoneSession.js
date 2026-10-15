import { normalizePhone, isValidIndianPhone } from '../../shared/phone.js';

export { normalizePhone, isValidIndianPhone };

const PHONE_KEY = 'lamf_user_phone';
const OTP_VERIFIED_KEY = 'lamf_phone_otp_verified';

export function formatPhoneDisplay(phone) {
  const n = normalizePhone(phone);
  if (n.length !== 10) return phone;
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}

export function isPhoneOtpVerified() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(OTP_VERIFIED_KEY) === '1';
}

export function markPhoneOtpVerified() {
  localStorage.setItem(OTP_VERIFIED_KEY, '1');
}

/** Phone is available for chat only after OTP verification on this device. */
export function getVerifiedPhone() {
  const phone = getStoredPhone();
  return phone && isPhoneOtpVerified() ? phone : null;
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
  localStorage.removeItem(OTP_VERIFIED_KEY);
}
