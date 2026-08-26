import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendEmbedChatMessage } from '../../lib/embedApi';
import { detectOutOfScopeQuestion, getOutOfScopeMessage } from '../../../shared/companyGuard.js';
import './EmbedWidget.css';

const QUICK_PROMPTS = [
  'What is LAMF?',
  'Who is eligible?',
  'How does disbursement work?',
];

function EmbedBubble({ role, content, isLoading }) {
  const isUser = role === 'user';

  return (
    <div className={`embed-bubble ${role}`}>
      {!isUser && <div className="embed-bubble-avatar">AI</div>}
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

export default function EmbedWidget({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    window.parent.postMessage({ type: 'lamf-chatbot-close' }, '*');
  }, [onClose]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      try {
        if (detectOutOfScopeQuestion(trimmed)) {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: 'assistant', content: getOutOfScopeMessage() },
          ]);
          return;
        }

        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const { answer } = await sendEmbedChatMessage(trimmed, history);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: answer },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, something went wrong: ${err.message}`,
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, messages]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="embed-widget">
      <header className="embed-widget-header">
        <div className="embed-widget-brand">
          <div className="embed-widget-logo">S</div>
          <div>
            <div className="embed-widget-title">Shriram Credit LAMF AI</div>
            <div className="embed-widget-subtitle">Loan Against Mutual Funds</div>
          </div>
        </div>
        <button type="button" className="embed-widget-close" onClick={handleClose} aria-label="Close chat">
          ×
        </button>
      </header>

      <div className="embed-widget-messages">
        {messages.length === 0 ? (
          <div className="embed-widget-welcome">
            <h2>Hi! How can I help?</h2>
            <p>Ask about LAMF eligibility, process, rates, or FAQs.</p>
            <div className="embed-quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="embed-quick-prompt"
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <EmbedBubble key={msg.id} role={msg.role} content={msg.content} />
          ))
        )}
        {isLoading && <EmbedBubble role="assistant" isLoading />}
        <div ref={bottomRef} />
      </div>

      <form className="embed-widget-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your LAMF question..."
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
