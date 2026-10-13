import { normalizeMessageRole } from './messageRole.js';

export function messageCreatedAtToIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createMessageEntry(role, content, sources = []) {
  const text = typeof content === 'string' ? content.trim() : '';
  return {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    role: normalizeMessageRole(role),
    content: text,
    sources: Array.isArray(sources) ? sources : [],
    createdAt: new Date().toISOString(),
  };
}

export function normalizeInlineMessage(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') {
    return { id: fallbackId, role: 'assistant', content: '', createdAt: null };
  }
  return {
    id: raw.id || fallbackId,
    role: normalizeMessageRole(raw.role),
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt: messageCreatedAtToIso(raw.createdAt),
    sources: raw.sources,
  };
}

export function sortMessages(messages) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
}

export function parseMessagesFromThreadData(threadData) {
  if (!threadData || !Array.isArray(threadData.messages) || threadData.messages.length === 0) {
    return [];
  }
  return sortMessages(
    threadData.messages.map((m, index) => normalizeInlineMessage(m, `inline-${index}`))
  );
}

export function legacySubcollectionDocToMessage(docSnap) {
  const data = docSnap.data();
  return normalizeInlineMessage(
    {
      id: docSnap.id,
      role: data.role,
      content: data.content,
      createdAt: data.createdAt,
      sources: data.sources,
    },
    docSnap.id
  );
}

/** Stored shape on thread document (ISO createdAt). */
export function toStoredMessage(entry) {
  return {
    id: entry.id,
    role: entry.role,
    content: entry.content,
    sources: entry.sources || [],
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}
