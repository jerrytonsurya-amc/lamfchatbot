import { useEffect, useMemo, useState } from 'react';
import './components/embed/EmbedPreview.css';

function getSnippet(baseUrl) {
  return `<!-- Shriram Credit LAMF AI Assistant — paste before </body> -->
<!-- Adds a floating bot icon (bottom-right). Click to open the chat panel. -->
<script>
  window.LAMF_CHATBOT_CONFIG = {
    baseUrl: '${baseUrl}'
  };
</script>
<script src="${baseUrl}/lamf-chatbot.js" defer></script>`;
}

export default function PreviewApp() {
  const [copied, setCopied] = useState(false);
  const baseUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );
  const snippet = useMemo(() => getSnippet(baseUrl), [baseUrl]);

  useEffect(() => {
    window.LAMF_CHATBOT_CONFIG = { baseUrl };

    if (document.getElementById('lamf-chatbot-launcher')) return undefined;

    const script = document.createElement('script');
    script.id = 'lamf-chatbot-loader';
    script.src = '/lamf-chatbot.js';
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.getElementById('lamf-chatbot-loader')?.remove();
      document.getElementById('lamf-chatbot-launcher')?.remove();
    };
  }, [baseUrl]);

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="embed-preview-page">
      <div className="embed-preview-banner">
        <div className="embed-preview-banner-inner">
          <span className="embed-preview-badge">Live widget preview</span>
          <h1>Website embed demo</h1>
          <p>
            This page simulates your website with the floating chatbot icon active at the
            bottom-right. Click the gold bot button to open the chat — enter a phone number to start.
          </p>
          <div className="embed-preview-actions">
            <a href="/" className="embed-preview-link">
              ← Open widget demo
            </a>
            <button type="button" className="embed-preview-copy" onClick={copySnippet}>
              {copied ? 'Copied!' : 'Copy embed code'}
            </button>
          </div>
        </div>
      </div>

      <main className="embed-preview-mock-site">
        <header className="mock-header">
          <div className="mock-logo">Shriram Credit</div>
          <nav className="mock-nav">
            <span>Home</span>
            <span>LAMF</span>
            <span>Apply Now</span>
            <span>Contact</span>
          </nav>
        </header>

        <section className="mock-hero">
          <h2>Loan Against Mutual Funds</h2>
          <p>
            Unlock liquidity from your mutual fund portfolio without selling your investments.
            Fast approval, flexible withdrawals, and competitive rates.
          </p>
          <button type="button" className="mock-cta">
            Check eligibility
          </button>
        </section>

        <section className="mock-features">
          <div className="mock-feature-card">
            <h3>No selling required</h3>
            <p>Pledge eligible MF units as security while they stay in your name.</p>
          </div>
          <div className="mock-feature-card">
            <h3>Quick disbursement</h3>
            <p>Withdraw funds in tranches up to your approved drawing power.</p>
          </div>
          <div className="mock-feature-card">
            <h3>24/7 AI support</h3>
            <p>Ask our LAMF AI Assistant anything about eligibility and process.</p>
          </div>
        </section>
      </main>

      <aside className="embed-snippet-panel">
        <h3>Embed snippet for your website</h3>
        <p>Paste this before the closing <code>&lt;/body&gt;</code> tag on any page:</p>
        <pre className="embed-snippet-code">{snippet}</pre>
        <p className="embed-snippet-note">
          Replace <code>baseUrl</code> with your deployed URL (e.g.{' '}
          <code>https://lamfchatbot.vercel.app</code>). The script adds a floating bot icon;
          clicking it opens the chat in a panel. Optional:{' '}
          <code>window.LAMF_CHATBOT.open()</code> / <code>.close()</code> / <code>.toggle()</code>.
        </p>
      </aside>
    </div>
  );
}
