import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatPhoneDisplay } from './lib/phoneSession.js';
import './AdminApp.css';

const SESSION_KEY = 'lamf_admin_password';
const LABELS = ['All', 'Hot', 'Warm', 'Cold'];

async function fetchLeads(password) {
  const res = await fetch('/api/admin/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const err = new Error(data.error || 'Incorrect password');
    err.unauthorized = true;
    throw err;
  }
  if (!res.ok) throw new Error(data.details || data.error || 'Failed to load leads');
  return data;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LeadBadge({ lead }) {
  return (
    <span className={`admin-badge admin-badge--${lead.label.toLowerCase()}`}>
      {lead.score} · {lead.label}
    </span>
  );
}

function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchLeads(password);
      sessionStorage.setItem(SESSION_KEY, password);
      onUnlock(password, data);
    } catch (err) {
      setError(err.unauthorized ? 'Incorrect password' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-gate">
      <form className="admin-gate-card" onSubmit={handleSubmit}>
        <h1>LAMF Admin</h1>
        <p>Enter the admin password to view chat leads.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
        />
        {error && <div className="admin-gate-error">{error}</div>}
        <button type="submit" disabled={loading || !password}>
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ password, initialData, onLogout }) {
  const [leads, setLeads] = useState(initialData.leads);
  const [generatedAt, setGeneratedAt] = useState(initialData.generatedAt);
  const [selectedId, setSelectedId] = useState(initialData.leads[0]?.threadId || null);
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const data = await fetchLeads(password);
      setLeads(data.leads);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      if (err.unauthorized) onLogout();
      else setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [password, onLogout]);

  const stats = useMemo(
    () => ({
      total: leads.length,
      hot: leads.filter((l) => l.lead.label === 'Hot').length,
      warm: leads.filter((l) => l.lead.label === 'Warm').length,
      cold: leads.filter((l) => l.lead.label === 'Cold').length,
      questions: leads.reduce((sum, l) => sum + l.userMessageCount, 0),
    }),
    [leads]
  );

  const visibleLeads = useMemo(() => {
    const digits = search.replace(/\D/g, '');
    return leads.filter(
      (l) =>
        (labelFilter === 'All' || l.lead.label === labelFilter) &&
        (!digits || l.phoneNumber.includes(digits))
    );
  }, [leads, search, labelFilter]);

  const selected = leads.find((l) => l.threadId === selectedId) || null;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>LAMF Admin · Chat Leads</h1>
          <span className="admin-header-sub">Updated {formatDateTime(generatedAt)}</span>
        </div>
        <div className="admin-header-actions">
          <button type="button" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="admin-btn-secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-stats">
        <div className="admin-stat">
          <span>Total users</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="admin-stat admin-stat--hot">
          <span>Hot leads</span>
          <strong>{stats.hot}</strong>
        </div>
        <div className="admin-stat admin-stat--warm">
          <span>Warm leads</span>
          <strong>{stats.warm}</strong>
        </div>
        <div className="admin-stat admin-stat--cold">
          <span>Cold leads</span>
          <strong>{stats.cold}</strong>
        </div>
        <div className="admin-stat">
          <span>Questions asked</span>
          <strong>{stats.questions}</strong>
        </div>
      </section>

      <div className="admin-body">
        <aside className="admin-list">
          <div className="admin-list-controls">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mobile number"
            />
            <div className="admin-filters">
              {LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={labelFilter === label ? 'is-active' : ''}
                  onClick={() => setLabelFilter(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-list-items">
            {visibleLeads.length === 0 && <div className="admin-empty">No users found.</div>}
            {visibleLeads.map((l) => (
              <button
                key={l.threadId}
                type="button"
                className={`admin-list-item ${l.threadId === selectedId ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(l.threadId)}
              >
                <div className="admin-list-item-top">
                  <strong>{formatPhoneDisplay(l.phoneNumber)}</strong>
                  <LeadBadge lead={l.lead} />
                </div>
                <div className="admin-list-item-meta">
                  {l.userMessageCount} question{l.userMessageCount === 1 ? '' : 's'} · {formatDateTime(l.lastActivity)}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="admin-detail">
          {!selected ? (
            <div className="admin-empty">Select a user to view their chat.</div>
          ) : (
            <>
              <div className="admin-detail-header">
                <div>
                  <h2>{formatPhoneDisplay(selected.phoneNumber)}</h2>
                  <div className="admin-detail-meta">
                    First chat {formatDateTime(selected.createdAt)} · Last active {formatDateTime(selected.lastActivity)} ·{' '}
                    {selected.messageCount} messages
                  </div>
                </div>
                <div className="admin-score">
                  <span className="admin-score-value">{selected.lead.score}</span>
                  <LeadBadge lead={selected.lead} />
                </div>
              </div>

              <div className="admin-reasons">
                {selected.lead.reasons.map((reason) => (
                  <span key={reason} className="admin-reason">
                    {reason}
                  </span>
                ))}
              </div>

              <div className="admin-transcript">
                {selected.messages.length === 0 && <div className="admin-empty">No messages yet.</div>}
                {selected.messages.map((m) => (
                  <div key={m.id} className={`admin-msg admin-msg--${m.role === 'user' ? 'user' : 'bot'}`}>
                    <div className="admin-msg-bubble">
                      {m.role === 'user' ? (
                        m.content
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      )}
                    </div>
                    <div className="admin-msg-time">
                      {m.role === 'user' ? 'Customer' : 'Bot'} · {formatDateTime(m.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [password, setPassword] = useState(null);
  const [data, setData] = useState(null);
  const [restoring, setRestoring] = useState(() => Boolean(sessionStorage.getItem(SESSION_KEY)));

  useEffect(() => {
    document.title = 'LAMF Admin';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    fetchLeads(saved)
      .then((result) => {
        setPassword(saved);
        setData(result);
      })
      .catch(() => sessionStorage.removeItem(SESSION_KEY))
      .finally(() => setRestoring(false));
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setPassword(null);
    setData(null);
  }, []);

  if (restoring) return <div className="admin-gate">Loading…</div>;

  if (!password || !data) {
    return (
      <PasswordGate
        onUnlock={(pw, result) => {
          setPassword(pw);
          setData(result);
        }}
      />
    );
  }

  return <Dashboard password={password} initialData={data} onLogout={handleLogout} />;
}
