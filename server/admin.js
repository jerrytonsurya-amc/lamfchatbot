import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore/lite';
import { computeLeadScore } from '../shared/leadScore.js';

const FIREBASE_APP_NAME = 'lamf-admin-server';
const THREADS = 'threads';

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || '#2404';
}

export function isValidAdminPassword(password) {
  if (typeof password !== 'string') return false;
  const expected = Buffer.from(getAdminPassword());
  const given = Buffer.from(password);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function getDb() {
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

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** All phone-number chat threads with their messages and a lead score, highest score first. */
export async function getAdminLeads() {
  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Firebase is not configured on the server');
  }

  const db = getDb();
  const threadsSnap = await getDocs(collection(db, THREADS));
  const phoneThreads = threadsSnap.docs.filter((d) => d.data().phoneNumber);

  const leads = await Promise.all(
    phoneThreads.map(async (threadDoc) => {
      const thread = threadDoc.data();
      const messagesSnap = await getDocs(
        query(collection(db, THREADS, threadDoc.id, 'messages'), orderBy('createdAt', 'asc'))
      );
      const messages = messagesSnap.docs.map((m) => {
        const data = m.data();
        return {
          id: m.id,
          role: data.role,
          content: data.content || '',
          createdAt: toIso(data.createdAt),
        };
      });

      const lastActivity =
        toIso(thread.updatedAt) || messages[messages.length - 1]?.createdAt || toIso(thread.createdAt);

      return {
        threadId: threadDoc.id,
        phoneNumber: thread.phoneNumber,
        createdAt: toIso(thread.createdAt),
        lastActivity,
        messageCount: messages.length,
        userMessageCount: messages.filter((m) => m.role === 'user').length,
        lead: computeLeadScore(messages, lastActivity),
        messages,
      };
    })
  );

  leads.sort(
    (a, b) =>
      b.lead.score - a.lead.score ||
      new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime()
  );

  return leads;
}
