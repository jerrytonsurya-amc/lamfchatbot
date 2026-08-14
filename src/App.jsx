import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import {
  subscribeToThreads,
  subscribeToMessages,
  createThread,
  updateThreadTitle,
  deleteThread,
  addMessage,
} from './lib/firebase';
import {
  getLocalThreads,
  createLocalThread,
  updateLocalThreadTitle,
  deleteLocalThread,
  getLocalMessages,
  addLocalMessage,
  withTimeout,
} from './lib/localChat';
import { sendChatMessage } from './lib/api';
import { detectOutOfScopeQuestion, getOutOfScopeMessage } from '../shared/companyGuard.js';
import './App.css';

const FIRESTORE_TIMEOUT_MS = 3000;

function generateTitle(message) {
  const trimmed = message.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40) + '...';
}

export default function App() {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');

  useEffect(() => {
    if (useLocalOnly) {
      setThreads(getLocalThreads());
      return undefined;
    }

    const unsub = subscribeToThreads(
      (nextThreads) => {
        setThreads(nextThreads);
        setStorageNotice('');
      },
      (err) => {
        console.warn('Firestore unavailable, using local chat storage:', err);
        setUseLocalOnly(true);
        setThreads(getLocalThreads());
        setStorageNotice(
          err?.code === 'permission-denied'
            ? 'Firestore rules are blocking access. In Firebase Console → Firestore → Rules, publish the rules from firestore.rules in this project, then refresh.'
            : 'Chat history is saved locally. Enable Firestore in Firebase to sync across devices.'
        );
      }
    );

    return unsub;
  }, [useLocalOnly]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return undefined;
    }

    if (useLocalOnly) {
      setMessages(getLocalMessages(activeThreadId));
      return undefined;
    }

    const unsub = subscribeToMessages(
      activeThreadId,
      setMessages,
      (err) => {
        console.warn('Firestore messages unavailable, using local chat storage:', err);
        setUseLocalOnly(true);
        setMessages(getLocalMessages(activeThreadId));
        setStorageNotice(
          err?.code === 'permission-denied'
            ? 'Firestore rules are blocking access. In Firebase Console → Firestore → Rules, publish the rules from firestore.rules in this project, then refresh.'
            : 'Chat history is saved locally. Enable Firestore in Firebase to sync across devices.'
        );
      }
    );

    return unsub;
  }, [activeThreadId, useLocalOnly]);

  const refreshLocalState = useCallback((threadId = activeThreadId) => {
    setThreads(getLocalThreads());
    if (threadId) {
      setMessages(getLocalMessages(threadId));
    }
  }, [activeThreadId]);

  const handleNewChat = useCallback(async () => {
    if (useLocalOnly) {
      const id = createLocalThread('New chat');
      setActiveThreadId(id);
      refreshLocalState(id);
      return;
    }

    try {
      const id = await withTimeout(createThread('New chat'), FIRESTORE_TIMEOUT_MS, 'Create chat');
      setActiveThreadId(id);
    } catch (err) {
      console.warn('Firestore create failed, switching to local storage:', err);
      setUseLocalOnly(true);
      const id = createLocalThread('New chat');
      setActiveThreadId(id);
      refreshLocalState(id);
      setStorageNotice(
        'Firestore is not available. Chat works locally — enable Firestore in Firebase for cloud sync.'
      );
    }
  }, [useLocalOnly, refreshLocalState]);

  const handleSelectThread = useCallback((id) => {
    setActiveThreadId(id);
  }, []);

  const handleDeleteThread = useCallback(
    async (id) => {
      if (useLocalOnly) {
        deleteLocalThread(id);
        refreshLocalState();
        if (activeThreadId === id) {
          setActiveThreadId(null);
        }
        return;
      }

      try {
        await withTimeout(deleteThread(id), FIRESTORE_TIMEOUT_MS, 'Delete chat');
        if (activeThreadId === id) {
          setActiveThreadId(null);
        }
      } catch (err) {
        console.warn('Firestore delete failed:', err);
        setUseLocalOnly(true);
        deleteLocalThread(id);
        refreshLocalState();
        if (activeThreadId === id) {
          setActiveThreadId(null);
        }
      }
    },
    [activeThreadId, useLocalOnly, refreshLocalState]
  );

  const handleSend = useCallback(
    async (text) => {
      setIsLoading(true);

      let threadId = activeThreadId;
      const trimmed = text.trim();
      const title = generateTitle(trimmed);

      const persistUserMessage = async (id) => {
        if (useLocalOnly) {
          addLocalMessage(id, 'user', trimmed);
          refreshLocalState(id);
          return;
        }

        try {
          await withTimeout(addMessage(id, 'user', trimmed), FIRESTORE_TIMEOUT_MS, 'Save message');
        } catch (err) {
          console.warn('Firestore save failed, switching to local storage:', err);
          setUseLocalOnly(true);
          addLocalMessage(id, 'user', trimmed);
          refreshLocalState(id);
          setStorageNotice(
            'Firestore is not available. Chat works locally — enable Firestore in Firebase for cloud sync.'
          );
        }
      };

      const persistAssistantMessage = async (id, answer, sources) => {
        if (useLocalOnly) {
          addLocalMessage(id, 'assistant', answer, sources);
          refreshLocalState(id);
          return;
        }

        try {
          await withTimeout(addMessage(id, 'assistant', answer, sources), FIRESTORE_TIMEOUT_MS, 'Save reply');
        } catch (err) {
          console.warn('Firestore save failed:', err);
          setUseLocalOnly(true);
          addLocalMessage(id, 'assistant', answer, sources);
          refreshLocalState(id);
        }
      };

      try {
        if (!threadId) {
          if (useLocalOnly) {
            threadId = createLocalThread(title);
          } else {
            try {
              threadId = await withTimeout(createThread(title), FIRESTORE_TIMEOUT_MS, 'Create chat');
            } catch (err) {
              console.warn('Firestore create failed, switching to local storage:', err);
              setUseLocalOnly(true);
              threadId = createLocalThread(title);
              setStorageNotice(
                'Firestore is not available. Chat works locally — enable Firestore in Firebase for cloud sync.'
              );
            }
          }
          setActiveThreadId(threadId);
          refreshLocalState(threadId);
        } else if (messages.length === 0) {
          if (useLocalOnly) {
            updateLocalThreadTitle(threadId, title);
            refreshLocalState(threadId);
          } else {
            try {
              await withTimeout(updateThreadTitle(threadId, title), FIRESTORE_TIMEOUT_MS, 'Update title');
            } catch {
              setUseLocalOnly(true);
              updateLocalThreadTitle(threadId, title);
              refreshLocalState(threadId);
            }
          }
        }

        await persistUserMessage(threadId);

        if (detectOutOfScopeQuestion(trimmed)) {
          await persistAssistantMessage(threadId, getOutOfScopeMessage(), []);
          return;
        }

        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { answer, sources } = await sendChatMessage(trimmed, history);
        await persistAssistantMessage(threadId, answer, sources || []);
      } catch (err) {
        const errorText = err.message?.includes('rate-limited')
          ? '⏳ The AI service is temporarily busy due to rate limits. Please wait about a minute and try again.'
          : `Sorry, I encountered an error: ${err.message}. Please try again.`;

        if (threadId) {
          if (useLocalOnly) {
            addLocalMessage(threadId, 'assistant', errorText);
            refreshLocalState(threadId);
          } else {
            try {
              await addMessage(threadId, 'assistant', errorText);
            } catch {
              setUseLocalOnly(true);
              addLocalMessage(threadId, 'assistant', errorText);
              refreshLocalState(threadId);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeThreadId, messages, useLocalOnly, refreshLocalState]
  );

  return (
    <div className="app">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
      />
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        onSend={handleSend}
        disabled={false}
        notice={storageNotice}
      />
    </div>
  );
}
