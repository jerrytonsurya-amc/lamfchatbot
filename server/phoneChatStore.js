import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore/lite';
import { COMPANY } from '../shared/company.js';
import { normalizePhone, isValidIndianPhone } from '../shared/phone.js';
import { appendThreadMessage } from './threadMessagesIO.js';

const FIREBASE_APP_NAME = 'lamf-phone-chat-store';
const THREADS = 'threads';

function getDb() {
  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Firebase is not configured on the server');
  }
  const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
  const app =
    existing ||
    initializeApp(
      {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
      },
      FIREBASE_APP_NAME
    );
  return getFirestore(app);
}

async function getPhoneThreadId(db, normalizedPhone) {
  const q = query(collection(db, THREADS), where('phoneNumber', '==', normalizedPhone), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

async function ensurePhoneThread(db, normalizedPhone) {
  const existing = await getPhoneThreadId(db, normalizedPhone);
  if (existing) return existing;

  const ref = await addDoc(collection(db, THREADS), {
    title: `LAMF · +91 ${normalizedPhone}`,
    phoneNumber: normalizedPhone,
    company: COMPANY,
    messages: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Append user or assistant message to the thread document `messages` array. */
export async function appendPhoneChatMessage(phoneNumber, role, content, sources = []) {
  const normalized = normalizePhone(phoneNumber);
  if (!isValidIndianPhone(normalized)) return null;

  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) return null;

  const db = getDb();
  const threadId = await ensurePhoneThread(db, normalized);
  const result = await appendThreadMessage(db, threadId, role, content, sources);
  if (!result) return null;

  return { threadId, messageId: result.messageId, role: result.role };
}
