import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore/lite';
import {
  createMessageEntry,
  parseMessagesFromThreadData,
  legacySubcollectionDocToMessage,
  sortMessages,
  toStoredMessage,
} from '../shared/threadMessages.js';

const THREADS = 'threads';

async function loadLegacySubcollectionMessages(db, threadId) {
  const messagesSnap = await getDocs(
    query(collection(db, THREADS, threadId, 'messages'), orderBy('createdAt', 'asc'))
  );
  return sortMessages(messagesSnap.docs.map(legacySubcollectionDocToMessage));
}

/** All messages for a thread: inline `messages` array, or legacy subcollection. */
export async function loadThreadMessages(db, threadId, threadData = null) {
  const data =
    threadData ||
    (await getDoc(doc(db, THREADS, threadId))).data() ||
    {};

  const inline = parseMessagesFromThreadData(data);
  if (inline !== null) return inline;

  return loadLegacySubcollectionMessages(db, threadId);
}

/** Append one message to the thread document `messages` array (single doc per conversation). */
export async function appendThreadMessage(db, threadId, role, content, sources = []) {
  const entry = createMessageEntry(role, content, sources);
  if (!entry.content) return null;

  const threadRef = doc(db, THREADS, threadId);
  const preSnap = await getDoc(threadRef);
  let seed = parseMessagesFromThreadData(preSnap.data());
  if (seed === null) {
    seed = await loadLegacySubcollectionMessages(db, threadId);
  }

  const storedEntry = toStoredMessage(entry);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(threadRef);
    if (!snap.exists()) throw new Error('Thread not found');

    let messages = parseMessagesFromThreadData(snap.data());
    if (messages === null) {
      messages = seed.length > 0 ? seed : [];
    } else if (messages.length === 0 && seed.length > 0) {
      messages = seed;
    }

    messages = sortMessages([...messages, storedEntry]);
    tx.update(threadRef, {
      messages,
      updatedAt: serverTimestamp(),
    });
  });

  return { messageId: entry.id, role: entry.role };
}
