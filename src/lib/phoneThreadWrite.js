import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  createMessageEntry,
  parseMessagesFromThreadData,
  legacySubcollectionDocToMessage,
  sortMessages,
  toStoredMessage,
} from '../../shared/threadMessages.js';

const THREADS = 'threads';

async function loadLegacySubcollectionMessages(firestore, threadId) {
  const messagesSnap = await getDocs(
    query(collection(firestore, THREADS, threadId, 'messages'), orderBy('createdAt', 'asc'))
  );
  return sortMessages(messagesSnap.docs.map(legacySubcollectionDocToMessage));
}

export async function loadPhoneThreadMessages(firestore, threadId, threadData = null) {
  const data =
    threadData || (await getDoc(doc(firestore, THREADS, threadId))).data() || {};
  const inline = parseMessagesFromThreadData(data);
  if (inline !== null) return inline;
  return loadLegacySubcollectionMessages(firestore, threadId);
}

export async function appendPhoneThreadMessage(firestore, threadId, role, content, sources = []) {
  const entry = createMessageEntry(role, content, sources);
  if (!entry.content) return null;

  const threadRef = doc(firestore, THREADS, threadId);
  const preSnap = await getDoc(threadRef);
  let seed = parseMessagesFromThreadData(preSnap.data());
  if (seed === null) {
    seed = await loadLegacySubcollectionMessages(firestore, threadId);
  }

  const storedEntry = toStoredMessage(entry);

  await runTransaction(firestore, async (tx) => {
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

  return entry.id;
}
