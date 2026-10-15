import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendEmbedChatMessage } from '../../lib/embedApi';
import {
  subscribeToPhoneChat,
  addPhoneMessage,
  isFirebaseConfigured,
} from '../../lib/firebase.js';
import { loadPhoneMessages, savePhoneMessages } from '../../lib/phoneChatStorage.js';
import {
  getVerifiedPhone,
  setStoredPhone,
  clearStoredPhone,
  markPhoneOtpVerified,
  isValidIndianPhone,
  normalizePhone,
  formatPhoneDisplay,
} from '../../lib/phoneSession.js';
import { detectOutOfScopeQuestion, getOutOfScopeMessage } from '../../../shared/companyGuard.js';
import { normalizeMessageRole } from '../../../shared/messageRole.js';
import './EmbedWidget.css';

const ACCESS_OTP = '0000';

const markdownComponents = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

function FolioFace() {
  return (
    <span className="folio-face" aria-hidden="true">
      <span className="folio-eye" />
      <span className="folio-eye" />
    </span>
  );
}

function AssistantCopy({ content }) {
  return (
    <div className="embed-assistant">
      <div className="embed-assistant-copy">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function EmbedBubble({ role, content, isLoading }) {
  const isUser = role === 'user';

  return (
    <div className={`embed-bubble ${role}`}>
      {!isUser && <FolioFace />}
      <div className="embed-bubble-body">
        {isLoading ? (
          <div className="embed-typing">
            <span />
            <span />
            <span />
          </div>
        ) : isUser ? (
          <p>{content}</p>
        ) : (
          <AssistantCopy content={content} />
        )}
      </div>
    </div>
  );
}

function FailedReply({ onRetry }) {
  return (
    <div className="embed-fail">
      <FolioFace />
      <div className="embed-fail-card">
        <p>Sorry, that reply did not come through.</p>
        <button type="button" className="embed-text-link" onClick={onRetry}>
          Try Again
        </button>
      </div>
    </div>
  );
}

function WidgetHeader({ onClose, onNewChat, showNewChat }) {
  return (
    <header className="embed-widget-header">
      <div className="embed-header-brand">
        <FolioFace />
        <div className="embed-header-copy">
          <h1>Folio</h1>
          <div className="embed-header-sub">
            <span>AI assistant</span>
            {showNewChat && (
              <button type="button" className="embed-new-chat" onClick={onNewChat}>
                New chat
              </button>
            )}
          </div>
        </div>
      </div>
      <button type="button" className="embed-widget-close" onClick={onClose} aria-label="Close chat">
        ×
      </button>
    </header>
  );
}

export default function EmbedWidget({ onClose, standalone = false }) {
  const [phase, setPhase] = useState(() => (getVerifiedPhone() ? 'chat' : 'welcome'));
  const [phone, setPhone] = useState(() => getVerifiedPhone());
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(!isFirebaseConfigured());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [failedText, setFailedText] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const wasLoadingRef = useRef(false);
  const queuedRef = useRef(null);
  const sendMessageRef = useRef(null);

  const focusChatInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, phase, failedText, isOnline, showBackOnline]);

  useEffect(() => {
    if (phase === 'chat') focusChatInput();
  }, [phase, focusChatInput]);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) focusChatInput();
    wasLoadingRef.current = isLoading;
  }, [isLoading, focusChatInput]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      const queued = queuedRef.current;
      queuedRef.current = null;
      if (queued && sendMessageRef.current) {
        sendMessageRef.current(queued, { alreadyShown: true, persistUser: true });
      }
      window.setTimeout(() => setShowBackOnline(false), 4000);
    };
    const onOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'chat' || !phone) return undefined;

    if (useLocalOnly) {
      setMessages(loadPhoneMessages(phone));
      return undefined;
    }

    const unsub = subscribeToPhoneChat(
      phone,
      (nextMessages) => {
        const formatted = nextMessages.map((m) => ({
          id: m.id,
          role: normalizeMessageRole(m.role),
          content: m.content,
        }));
        setMessages((prev) => {
          const pending = prev.filter(
            (m) =>
              m.pending &&
              !formatted.some((s) => s.role === m.role && s.content === m.content)
          );
          return [...formatted, ...pending];
        });
        savePhoneMessages(phone, formatted);
      },
      (err) => {
        console.warn('Firestore unavailable, using local chat storage:', err);
        setUseLocalOnly(true);
        setMessages(loadPhoneMessages(phone));
      }
    );

    return unsub;
  }, [phase, phone, useLocalOnly]);

  useEffect(() => {
    if (phase === 'chat' && phone && useLocalOnly) {
      savePhoneMessages(phone, messages);
    }
  }, [messages, phone, phase, useLocalOnly]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    window.parent.postMessage({ type: 'lamf-chatbot-close' }, '*');
  }, [onClose]);

  const handleContinue = (e) => {
    e.preventDefault();
    if (!isValidIndianPhone(phoneInput)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    const normalized = normalizePhone(phoneInput);
    setPhoneError('');
    setPendingPhone(normalized);
    setOtpInput('');
    setOtpError('');
    setPhase('otp');
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const code = otpInput.replace(/\D/g, '');
    if (code !== ACCESS_OTP) {
      setOtpError('Incorrect OTP. Please try again.');
      return;
    }
    const normalized = setStoredPhone(pendingPhone);
    markPhoneOtpVerified();
    setOtpError('');
    setPhone(normalized);
    setPhase('chat');
  };

  const handleNewChat = () => {
    clearStoredPhone();
    setPhone(null);
    setPhoneInput('');
    setPendingPhone('');
    setOtpInput('');
    setOtpError('');
    setMessages([]);
    setPhoneError('');
    setFailedText(null);
    queuedRef.current = null;
    setPhase('welcome');
  };

  const persistMessage = useCallback(
    async (role, content, sources = []) => {
      if (useLocalOnly || !phone) return;
      try {
        await addPhoneMessage(phone, role, content, sources);
      } catch (err) {
        console.warn('Failed to save message to Firestore:', err);
        setUseLocalOnly(true);
      }
    },
    [phone, useLocalOnly]
  );

  const sendMessage = useCallback(
    async (text, options = {}) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !phone) return;

      const alreadyShown = Boolean(options.alreadyShown);
      if (!alreadyShown) {
        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed, pending: true };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
      }
      setFailedText(null);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queuedRef.current = trimmed;
        setIsOnline(false);
        return;
      }

      setIsLoading(true);

      try {
        if (!useLocalOnly && (!alreadyShown || options.persistUser)) {
          await persistMessage('user', trimmed);
        }

        if (detectOutOfScopeQuestion(trimmed)) {
          const reply = getOutOfScopeMessage();
          if (!useLocalOnly) await persistMessage('assistant', reply);
          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
          return;
        }

        const prior = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
        const last = prior[prior.length - 1];
        const historySource =
          last && last.role === 'user' && last.content === trimmed
            ? prior
            : [...prior, { role: 'user', content: trimmed }];
        const history = historySource.map((m) => ({ role: m.role, content: m.content }));
        const { answer } = await sendEmbedChatMessage(trimmed, history, phone);
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: answer }]);
      } catch (err) {
        console.warn('Chat reply failed:', err);
        setFailedText(trimmed);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, phone, useLocalOnly, persistMessage]
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const widgetClass = [
    'embed-widget',
    standalone ? 'embed-widget--standalone' : 'embed-widget--frame',
  ].join(' ');

  return (
    <div className={widgetClass}>
      <WidgetHeader
        onClose={handleClose}
        onNewChat={handleNewChat}
        showNewChat={phase === 'chat'}
      />

      {phase === 'welcome' || phase === 'otp' ? (
        <div className="embed-widget-welcome-screen">
          <div className="embed-welcome-card">
            {phase === 'welcome' ? (
              <>
                <h2>Start a conversation</h2>
                <p>Enter your mobile number. We will send an OTP before opening the chat.</p>
                <form onSubmit={handleContinue}>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Mobile number"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    aria-invalid={Boolean(phoneError)}
                  />
                  {phoneError && <p className="embed-welcome-error">{phoneError}</p>}
                  <button type="submit">Continue</button>
                </form>
              </>
            ) : (
              <>
                <h2>Enter OTP</h2>
                <p>
                  Enter the 4-digit code sent to {formatPhoneDisplay(pendingPhone)} to open the chat.
                </p>
                <form onSubmit={handleVerifyOtp}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="0000"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => {
                      setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (otpError) setOtpError('');
                    }}
                    aria-invalid={Boolean(otpError)}
                    autoFocus
                  />
                  {otpError && <p className="embed-welcome-error">{otpError}</p>}
                  <button type="submit" disabled={otpInput.length !== 4}>
                    Verify
                  </button>
                </form>
                <button type="button" className="embed-otp-back" onClick={() => setPhase('welcome')}>
                  Change number
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="embed-widget-messages">
            {phone && (
              <div className="embed-notice">
                Number verified. This chat is saved to {formatPhoneDisplay(phone)} on this device.
              </div>
            )}
            {messages.map((msg) => (
              <EmbedBubble key={msg.id} role={msg.role} content={msg.content} />
            ))}
            {!isOnline && (
              <div className="embed-notice embed-notice--offline">
                You are offline. Messages will send once you are back.
              </div>
            )}
            {isLoading && <EmbedBubble role="assistant" isLoading />}
            {failedText && <FailedReply onRetry={() => sendMessage(failedText, { alreadyShown: true })} />}
            {showBackOnline && isOnline && <div className="embed-notice embed-notice--online">Back online.</div>}
            <div ref={bottomRef} />
          </div>

          <form className="embed-widget-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your loan"
              autoComplete="off"
              autoFocus
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22l-4-9-9-4 20-7z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
