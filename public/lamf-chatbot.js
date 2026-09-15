(function () {
  if (window.__LAMF_CHATBOT_LOADED__) return;
  window.__LAMF_CHATBOT_LOADED__ = true;

  var BOT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" stroke-width="1.75"/>' +
    '<path d="M12 8V5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
    '<circle cx="12" cy="3.5" r="1.25" fill="currentColor"/>' +
    '<circle cx="9" cy="13" r="1.25" fill="currentColor"/>' +
    '<circle cx="15" cy="13" r="1.25" fill="currentColor"/>' +
    '<path d="M9.5 16.5h5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
    '<path d="M2 12h2M20 12h2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
    '</svg>';

  var CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  function init() {
    if (!document.body || document.getElementById('lamf-chatbot-launcher')) return;

    var config = window.LAMF_CHATBOT_CONFIG || {};
    var scriptEl = document.currentScript;
    var scriptOrigin = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : '';
    var baseUrl = (config.baseUrl || scriptOrigin || window.location.origin || '').replace(/\/$/, '');
    var embedUrl = (config.embedUrl || baseUrl + '/embed').replace(/\/$/, '');
    var zIndex = config.zIndex || 2147483000;
    var panelWidth = config.width || 400;
    var panelHeight = config.height || 620;

    var launcher = document.createElement('div');
    launcher.id = 'lamf-chatbot-launcher';
    launcher.innerHTML =
      '<style>' +
      '#lamf-chatbot-launcher{position:fixed;bottom:24px;right:24px;z-index:' +
      zIndex +
      ';font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '#lamf-chatbot-btn{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;' +
      'background:linear-gradient(145deg,#d4920a,#b87d08);color:#fff;' +
      'box-shadow:0 8px 24px rgba(212,146,10,.45);display:flex;align-items:center;justify-content:center;' +
      'transition:transform .2s,box-shadow .2s,background .2s}' +
      '#lamf-chatbot-btn:hover{transform:scale(1.06);box-shadow:0 10px 28px rgba(212,146,10,.55)}' +
      '#lamf-chatbot-btn.is-open{background:linear-gradient(145deg,#b87d08,#9a6a06)}' +
      '#lamf-chatbot-btn svg{width:28px;height:28px;display:block}' +
      '#lamf-chatbot-panel-wrap{position:fixed;bottom:96px;right:24px;width:' +
      panelWidth +
      'px;height:' +
      panelHeight +
      'px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);' +
      'z-index:' +
      (zIndex + 1) +
      ';pointer-events:none;opacity:0;transform:translateY(16px) scale(.98);' +
      'transition:opacity .25s ease,transform .25s ease}' +
      '#lamf-chatbot-panel-wrap.open{pointer-events:auto;opacity:1;transform:translateY(0) scale(1)}' +
      '#lamf-chatbot-panel{width:100%;height:100%;border:none;border-radius:16px;' +
      'box-shadow:0 12px 48px rgba(212,146,10,.22),0 8px 32px rgba(15,23,42,.12);' +
      'overflow:hidden;background:#fff;display:block}' +
      '@media(max-width:480px){#lamf-chatbot-panel-wrap{bottom:0;right:0;left:0;width:100%;max-width:100%;' +
      'height:100%;max-height:100%;transform:translateY(100%)}' +
      '#lamf-chatbot-panel-wrap.open{transform:translateY(0)}' +
      '#lamf-chatbot-panel{border-radius:0}}' +
      '</style>' +
      '<button id="lamf-chatbot-btn" type="button" aria-label="Open LAMF AI Assistant" aria-expanded="false">' +
      BOT_ICON +
      '</button>' +
      '<div id="lamf-chatbot-panel-wrap" aria-hidden="true">' +
      '<iframe id="lamf-chatbot-panel" title="Shriram Credit LAMF AI Assistant" allow="clipboard-write"></iframe>' +
      '</div>';

    document.body.appendChild(launcher);

    var btn = document.getElementById('lamf-chatbot-btn');
    var panelWrap = document.getElementById('lamf-chatbot-panel-wrap');
    var panel = document.getElementById('lamf-chatbot-panel');
    var isOpen = false;
    var iframeLoaded = false;

    function loadIframe() {
      if (iframeLoaded) return;
      panel.src = embedUrl;
      iframeLoaded = true;
    }

    function setOpen(open) {
      isOpen = open;
      panelWrap.classList.toggle('open', open);
      panelWrap.setAttribute('aria-hidden', open ? 'false' : 'true');
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close LAMF AI Assistant' : 'Open LAMF AI Assistant');
      btn.innerHTML = open ? CLOSE_ICON : BOT_ICON;

      if (open) {
        loadIframe();
      }
    }

    btn.addEventListener('click', function () {
      setOpen(!isOpen);
    });

    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'lamf-chatbot-close') {
        setOpen(false);
      }
    });

    window.LAMF_CHATBOT = {
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      toggle: function () {
        setOpen(!isOpen);
      },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
