import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { COMPANY } from '../../shared/company.js';
import { getSessionId } from './userSession.js';
import { getStoredPhone, normalizePhone } from './phoneSession.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const THREADS = 'threads';

export function isFirebaseConfigured() {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

async function assertThreadAccess(threadId) {
  const snap = await getDoc(doc(db, THREADS, threadId));
  if (!snap.exists()) {
    throw new Error('Chat not found');
  }
  const data = snap.data();
  const phone = getStoredPhone();
  if (phone && data.phoneNumber === normalizePhone(phone)) {
    return data;
  }
  if (data.sessionId === getSessionId()) {
    return data;
  }
  throw new Error('Access denied');
}

async function getPhoneThreadId(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  const q = query(collection(db, THREADS), where('phoneNumber', '==', normalized), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

export async function ensurePhoneThread(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  const existing = await getPhoneThreadId(normalized);
  if (existing) return existing;

  const ref = await addDoc(collection(db, THREADS), {
    title: `LAMF · +91 ${normalized}`,
    phoneNumber: normalized,
    company: COMPANY,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToPhoneChat(phoneNumber, callback, onError) {
  const normalized = normalizePhone(phoneNumber);
  let unsubMessages = null;

  const q = query(collection(db, THREADS), where('phoneNumber', '==', normalized), limit(1));

  const unsubThread = onSnapshot(
    q,
    (snapshot) => {
      if (unsubMessages) unsubMessages();

      if (snapshot.empty) {
        callback([]);
        return;
      }

      const threadId = snapshot.docs[0].id;
      const messagesQuery = query(
        collection(db, THREADS, threadId, 'messages'),
        orderBy('createdAt', 'asc')
      );

      unsubMessages = onSnapshot(
        messagesQuery,
        (messagesSnap) => {
          const messages = messagesSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          callback(messages);
        },
        (error) => onError?.(error)
      );
    },
    (error) => onError?.(error)
  );

  return () => {
    unsubThread();
    if (unsubMessages) unsubMessages();
  };
}

export async function addPhoneMessage(phoneNumber, role, content, sources = []) {
  const threadId = await ensurePhoneThread(phoneNumber);
  return addMessage(threadId, role, content, sources);
}

export function subscribeToThreads(callback, onError) {
  const sessionId = getSessionId();
  const q = query(
    collection(db, THREADS),
    where('sessionId', '==', sessionId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const threads = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(threads);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeToMessages(threadId, callback, onError) {
  let unsubMessages = null;

  const threadRef = doc(db, THREADS, threadId);
  const unsubThread = onSnapshot(
    threadRef,
    (threadSnap) => {
      if (!threadSnap.exists() || threadSnap.data().sessionId !== getSessionId()) {
        callback([]);
        return;
      }

      if (unsubMessages) unsubMessages();

      const q = query(
        collection(db, THREADS, threadId, 'messages'),
        orderBy('createdAt', 'asc')
      );

      unsubMessages = onSnapshot(
        q,
        (snapshot) => {
          const messages = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          callback(messages);
        },
        (error) => {
          onError?.(error);
        }
      );
    },
    (error) => {
      onError?.(error);
    }
  );

  return () => {
    unsubThread();
    if (unsubMessages) unsubMessages();
  };
}

export async function createThread(title = 'New chat') {
  const ref = await addDoc(collection(db, THREADS), {
    title,
    company: COMPANY,
    sessionId: getSessionId(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateThreadTitle(threadId, title) {
  await assertThreadAccess(threadId);
  await updateDoc(doc(db, THREADS, threadId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteThread(threadId) {
  await assertThreadAccess(threadId);
  const messagesRef = collection(db, THREADS, threadId, 'messages');
  const messagesSnap = await getDocs(messagesRef);
  const batch = writeBatch(db);
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, THREADS, threadId));
  await batch.commit();
}

export async function addMessage(threadId, role, content, sources = []) {
  await assertThreadAccess(threadId);
  const msgRef = await addDoc(collection(db, THREADS, threadId, 'messages'), {
    role,
    content,
    sources,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, THREADS, threadId), {
    updatedAt: serverTimestamp(),
  });

  return msgRef.id;
}
