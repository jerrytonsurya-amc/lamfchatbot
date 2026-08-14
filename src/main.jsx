import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import EmbedApp from './EmbedApp';
import PreviewApp from './PreviewApp';
import './index.css';

const path = window.location.pathname.replace(/\/$/, '') || '/';

function Root() {
  if (path === '/embed') return <EmbedApp />;
  if (path === '/preview') return <PreviewApp />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
