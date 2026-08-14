const STORAGE_KEY = 'lamf-chat-threads';

function loadThreads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function getLocalThreads() {
  return loadThreads();
}

export function createLocalThread(title = 'New chat') {
  const thread = {
    id: `local-${Date.now()}`,
    title,
    company: 'LAMF',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  const threads = loadThreads();
  threads.unshift(thread);
  saveThreads(threads);
  return thread.id;
}

export function updateLocalThreadTitle(threadId, title) {
  const threads = loadThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return;
  thread.title = title;
  thread.updatedAt = Date.now();
  saveThreads(threads);
}

export function deleteLocalThread(threadId) {
  const threads = loadThreads().filter((t) => t.id !== threadId);
  saveThreads(threads);
}

export function getLocalMessages(threadId) {
  const thread = loadThreads().find((t) => t.id === threadId);
  return thread?.messages || [];
}

export function addLocalMessage(threadId, role, content, sources = []) {
  const threads = loadThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;

  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    sources,
    createdAt: Date.now(),
  };

  thread.messages.push(message);
  thread.updatedAt = Date.now();
  saveThreads(threads);
  return message.id;
}

export function withTimeout(promise, ms, label = 'Operation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
