import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TableWithChart from './TableWithChart';
import './Message.css';

const markdownComponents = {
  table: ({ children }) => <TableWithChart>{children}</TableWithChart>,
};

export default function Message({ role, content, isLoading }) {
  const isUser = role === 'user';

  return (
    <div className={`message ${role}`}>
      <div className="message-inner">
        <div className="message-avatar">{isUser ? 'U' : 'AI'}</div>
        <div className="message-content">
          {isLoading ? (
            <div className="typing-indicator-wrap">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
              <div className="typing-status">Thinking...</div>
            </div>
          ) : isUser ? (
            <p>{content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
