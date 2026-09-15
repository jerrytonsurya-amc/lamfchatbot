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
  getStoredPhone,
  setStoredPhone,
  clearStoredPhone,
  isValidIndianPhone,
  formatPhoneDisplay,
} from '../../lib/phoneSession.js';
import { detectOutOfScopeQuestion, getOutOfScopeMessage } from '../../../shared/companyGuard.js';
import { BotIcon } from '../ChatAvatars';
import './EmbedWidget.css';

function EmbedBubble({ role, content, isLoading }) {
  const isUser = role === 'user';

  return (
    <div className={`embed-bubble ${role}`}>
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function WidgetHeader({ phone, onClose, onChangePhone }) {
  return (
    <header className="embed-widget-header">
      <div className="embed-widget-header-main">
        <div className="embed-widget-brand">
          <div className="embed-widget-logo-wrap">
            <div className="embed-widget-logo">
              <BotIcon size={20} />
            </div>
            <span className="embed-widget-online" aria-hidden="true" />
          </div>
          <div>
            <div className="embed-widget-title">Shriram Credit LAMF AI Assistant</div>
            <div className="embed-widget-subtitle">Ask about eligibility, process, rates &amp; FAQs</div>
            {phone && (
              <div className="embed-widget-phone-row">
                <span className="embed-widget-phone">{formatPhoneDisplay(phone)}</span>
                <button type="button" className="embed-widget-change" onClick={onChangePhone}>
                  Change
                </button>
              </div>
            )}
          </div>
        </div>
        <button type="button" className="embed-widget-close" onClick={onClose} aria-label="Close chat">
          ×
        </button>
      </div>
    </header>
  );
}

export default function EmbedWidget({ onClose, standalone = false }) {
  const [phase, setPhase] = useState(() => (getStoredPhone() ? 'chat' : 'welcome'));
  const [phone, setPhone] = useState(() => getStoredPhone());
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(!isFirebaseConfigured());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, phase]);

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
          role: m.role,
          content: m.content,
        }));
        setMessages(formatted);
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
    const normalized = setStoredPhone(phoneInput);
    setPhoneError('');
    setPhone(normalized);
    setPhase('chat');
  };

  const handleChangePhone = () => {
    clearStoredPhone();
    setPhone(null);
    setPhoneInput('');
    setMessages([]);
    setPhoneError('');
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
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !phone) return;

      const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      try {
        if (detectOutOfScopeQuestion(trimmed)) {
          const reply = getOutOfScopeMessage();
          if (useLocalOnly) {
            setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
          } else {
            await persistMessage('user', trimmed);
            await persistMessage('assistant', reply);
          }
          return;
        }

        if (!useLocalOnly) {
          await persistMessage('user', trimmed);
        }

        const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
        const { answer } = await sendEmbedChatMessage(trimmed, history);

        if (useLocalOnly) {
          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: answer }]);
        } else {
          await persistMessage('assistant', answer);
        }
      } catch (err) {
        const errorContent = `Sorry, something went wrong: ${err.message}`;
        if (useLocalOnly) {
          setMessages((prev) => [
            ...prev,
            { id: `e-${Date.now()}`, role: 'assistant', content: errorContent },
          ]);
        } else {
          await persistMessage('assistant', errorContent);
        }
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, messages, phone, useLocalOnly, persistMessage]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const widgetClass = [
    'embed-widget',
    standalone ? 'embed-widget--standalone' : 'embed-widget--frame',
  ].join(' ');

  if (phase === 'welcome') {
    return (
      <div className={widgetClass}>
        <WidgetHeader onClose={handleClose} />
        <div className="embed-widget-welcome-screen">
          <div className="embed-welcome-card">
            <h2>Welcome</h2>
            <p>Please enter your phone number to start chatting</p>
            <form onSubmit={handleContinue}>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="9876543210"
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={widgetClass}>
      <WidgetHeader phone={phone} onClose={handleClose} onChangePhone={handleChangePhone} />

      <div className="embed-widget-messages">
        {messages.map((msg) => (
          <EmbedBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isLoading && <EmbedBubble role="assistant" isLoading />}
        <div ref={bottomRef} />
      </div>

      <form className="embed-widget-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write your message..."
          disabled={isLoading}
          autoComplete="off"
        />
        <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
