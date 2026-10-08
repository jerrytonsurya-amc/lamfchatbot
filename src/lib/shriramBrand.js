/** Official Shriram Credit logo (bundled copy mirrors shriramcredit.in/assets/images/logo.png). */
export const SHRIRAM_CREDIT_LOGO_URL = 'https://www.shriramcredit.in/assets/images/logo.png';

export function getShriramLogoSrc() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}/shriram-credit-logo.png`;
  }
  return '/shriram-credit-logo.png';
}
