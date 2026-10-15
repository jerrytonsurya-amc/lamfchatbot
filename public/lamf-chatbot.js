(function () {
  if (window.__LAMF_CHATBOT_LOADED__) return;
  window.__LAMF_CHATBOT_LOADED__ = true;

  var BOT_ICON =
    '<span class="folio-launcher-face">' +
    '<span class="folio-eye"></span><span class="folio-eye"></span>' +
    '</span>' +
    '<span class="folio-launcher-label">Ask Folio</span>';

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
      '#lamf-chatbot-btn{border:none;background:transparent;padding:0;cursor:pointer;color:#fff;' +
      'display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '#lamf-chatbot-btn .folio-launcher-face{width:64px;height:64px;border-radius:50%;display:flex;' +
      'align-items:center;justify-content:center;gap:8px;' +
      'background:radial-gradient(circle at 35% 30%,#ffe9a3 0%,#f6c43a 58%,#e39b16 100%);' +
      'box-shadow:inset 0 -4px 8px rgba(176,104,8,.22),0 8px 18px rgba(180,120,20,.28);' +
      'animation:folio-bob 2.2s ease-in-out infinite}' +
      '#lamf-chatbot-btn .folio-eye{width:7px;height:11px;border-radius:999px;background:#1c1c1c;' +
      'transform-origin:center;animation:folio-blink 4.2s ease-in-out infinite}' +
      '#lamf-chatbot-btn .folio-launcher-label{background:#1c1c1c;color:#fff;font-size:14px;font-weight:600;' +
      'padding:8px 16px;border-radius:999px;line-height:1;box-shadow:0 6px 16px rgba(0,0,0,.16)}' +
      '#lamf-chatbot-btn.is-open{width:48px;height:48px;border-radius:50%;background:#161616;' +
      'justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.2)}' +
      '#lamf-chatbot-btn.is-open .folio-launcher-face,#lamf-chatbot-btn.is-open .folio-launcher-label{display:none}' +
      '#lamf-chatbot-btn svg{width:22px;height:22px;display:block}' +
      '@keyframes folio-bob{0%,18%,100%{transform:translateY(0)}32%{transform:translateY(-14px)}46%{transform:translateY(0)}56%{transform:translateY(-6px)}66%{transform:translateY(0)}}' +
      '@keyframes folio-blink{0%,40%,48%,100%{transform:scaleY(1)}44%{transform:scaleY(.12)}}' +
      '@media (prefers-reduced-motion:reduce){#lamf-chatbot-btn .folio-launcher-face,#lamf-chatbot-btn .folio-eye{animation:none}}' +
      '#lamf-chatbot-panel-wrap{position:fixed;bottom:148px;right:24px;width:' +
      panelWidth +
      'px;height:' +
      panelHeight +
      'px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);' +
      'z-index:' +
      (zIndex + 1) +
      ';pointer-events:none;opacity:0;transform:translateY(16px) scale(.98);' +
      'transition:opacity .25s ease,transform .25s ease}' +
      '#lamf-chatbot-panel-wrap.open{pointer-events:auto;opacity:1;transform:translateY(0) scale(1)}' +
      '#lamf-chatbot-panel{width:100%;height:100%;border:none;border-radius:28px;' +
      'box-shadow:0 12px 40px rgba(20,16,12,.18);' +
      'overflow:hidden;background:#f6f1e8;display:block}' +
      '@media(max-width:480px){#lamf-chatbot-panel-wrap{bottom:0;right:0;left:0;width:100%;max-width:100%;' +
      'height:100%;max-height:100%;transform:translateY(100%)}' +
      '#lamf-chatbot-panel-wrap.open{transform:translateY(0)}' +
      '#lamf-chatbot-panel{border-radius:0}}' +
      '</style>' +
      '<button id="lamf-chatbot-btn" type="button" aria-label="Ask Folio" aria-expanded="false">' +
      BOT_ICON +
      '</button>' +
      '<div id="lamf-chatbot-panel-wrap" aria-hidden="true">' +
      '<iframe id="lamf-chatbot-panel" title="Shriram Credit LAMF Support" allow="clipboard-write"></iframe>' +
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
      btn.setAttribute('aria-label', open ? 'Close chat support' : 'Ask Folio');
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
