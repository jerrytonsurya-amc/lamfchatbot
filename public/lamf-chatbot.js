(function () {
  if (window.__LAMF_CHATBOT_LOADED__) return;
  window.__LAMF_CHATBOT_LOADED__ = true;

  var config = window.LAMF_CHATBOT_CONFIG || {};
  var scriptEl = document.currentScript;
  var scriptOrigin = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : '';
  var baseUrl = (config.baseUrl || scriptOrigin || '').replace(/\/$/, '');
  var embedUrl = (config.embedUrl || baseUrl + '/embed').replace(/\/$/, '');
  var zIndex = config.zIndex || 2147483000;
  var panelWidth = config.width || 380;
  var panelHeight = config.height || 560;

  var launcher = document.createElement('div');
  launcher.id = 'lamf-chatbot-launcher';
  launcher.innerHTML =
    '<style>' +
    '#lamf-chatbot-launcher{position:fixed;bottom:24px;right:24px;z-index:' +
    zIndex +
    ';font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
    '#lamf-chatbot-btn{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;' +
    'background:linear-gradient(145deg,#d4920a,#b87d08);color:#fff;box-shadow:0 8px 24px rgba(212,146,10,.4);' +
    'display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}' +
    '#lamf-chatbot-btn:hover{transform:scale(1.06);box-shadow:0 10px 28px rgba(212,146,10,.5)}' +
    '#lamf-chatbot-btn svg{width:28px;height:28px}' +
    '#lamf-chatbot-panel{position:fixed;bottom:96px;right:24px;width:' +
    panelWidth +
    'px;height:' +
    panelHeight +
    'px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);' +
    'border:none;border-radius:16px;box-shadow:0 12px 48px rgba(15,23,42,.18);' +
    'z-index:' +
    (zIndex + 1) +
    ';display:none;overflow:hidden;background:#fff}' +
    '#lamf-chatbot-panel.open{display:block}' +
    '@media(max-width:480px){#lamf-chatbot-panel{bottom:0;right:0;left:0;width:100%;max-width:100%;' +
    'height:100%;max-height:100%;border-radius:0}}' +
    '</style>' +
    '<button id="lamf-chatbot-btn" type="button" aria-label="Open LAMF AI Assistant">' +
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>' +
    '</button>' +
    '<iframe id="lamf-chatbot-panel" title="Shriram Credit LAMF AI Assistant" src="' +
    embedUrl +
    '" allow="clipboard-write"></iframe>';

  document.body.appendChild(launcher);

  var btn = document.getElementById('lamf-chatbot-btn');
  var panel = document.getElementById('lamf-chatbot-panel');
  var isOpen = false;

  function setOpen(open) {
    isOpen = open;
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-label', open ? 'Close LAMF AI Assistant' : 'Open LAMF AI Assistant');
  }

  btn.addEventListener('click', function () {
    setOpen(!isOpen);
  });

  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'lamf-chatbot-close') {
      setOpen(false);
    }
  });
})();
