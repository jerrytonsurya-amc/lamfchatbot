/** Canonical roles stored in Firestore: user | assistant */
export function normalizeMessageRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'user' || r === 'customer') return 'user';
  if (r === 'assistant' || r === 'bot' || r === 'model' || r === 'ai') return 'assistant';
  return r || 'assistant';
}

export function isUserMessage(role) {
  return normalizeMessageRole(role) === 'user';
}
