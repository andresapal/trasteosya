/* ============================================================
   TENANT-APPLY — Aplica marca blanca al DOM
   ============================================================
   Lee window.TENANT (definido por tenant.js) y parchea:
     - Titulo del documento
     - Logos (src + alt)
     - Colores CSS (variables :root)
     - Texto "Trasteos Ya" → nombre del tenant
     - Texto "trasteosya.online" → dominio del tenant
     - Links internos → agrega ?marca=X
     - Badge DEMO si aplica
     - Desactiva notificaciones reales en modo demo

   Solo modifica DOM si el tenant NO es "ty" (produccion).
   ============================================================ */
(function () {
  'use strict';

  var T = window.TENANT;
  if (!T || T.id === 'ty') return;  // TY = sin cambios

  // ─── Colores (aplica inmediato, antes de DOMContentLoaded) ───
  var style = document.createElement('style');
  style.textContent =
    ':root{' +
      '--brand:' + T.colors.brand + '!important;' +
      '--brand2:' + T.colors.brand2 + '!important;' +
      '--brand-light:' + T.colors.brandLight + '!important;' +
      '--ty-blue:' + T.colors.brand + '!important;' +
      '--ty-red:' + T.colors.brand2 + '!important;' +
    '}' +
    '.header{border-bottom-color:' + T.colors.brand + '!important}' +
    '.main-header{border-bottom-color:' + T.colors.brand + '!important}' +
    '.btn-primary{background:' + T.colors.brand + '!important;border-color:' + T.colors.brand + '!important}' +
    '.btn-primary:hover{background:' + T.colors.brand + '!important;filter:brightness(.85)}' +
    '.tab.active{color:' + T.colors.brand + '!important;border-bottom-color:' + T.colors.brand + '!important}' +
    '.card.active .card-icon{background:' + T.colors.brand + '!important}' +
    '.card-icon.always-on{background:' + T.colors.brand + '!important}' +
    '.sw.on{background:' + T.colors.brand + '!important}' +
    /* Demo badge */
    (T.isDemo ?
      '.tenant-demo-badge{position:fixed;top:8px;right:8px;z-index:9999;' +
      'background:' + T.colors.brand2 + ';color:#fff;font-size:10px;font-weight:700;' +
      'padding:3px 10px;border-radius:20px;letter-spacing:1px;opacity:.85;' +
      'pointer-events:none;text-transform:uppercase}' +
      /* ── Access-gate modal en colores del tenant ── */
      '.ty-gate-modal__overlay{background:rgba(4,46,48,0.80)!important}' +
      '.ty-gate-modal__box{' +
        'background:' +
          'linear-gradient(45deg,rgba(13,115,119,0.15) 25%,transparent 25%),' +
          'linear-gradient(-45deg,rgba(13,115,119,0.15) 25%,transparent 25%),' +
          'linear-gradient(45deg,transparent 75%,rgba(13,115,119,0.15) 75%),' +
          'linear-gradient(-45deg,transparent 75%,rgba(13,115,119,0.15) 75%),' +
          'linear-gradient(180deg,rgba(255,255,255,0.10) 0%,transparent 30%),' +
          'linear-gradient(135deg,#063B3D 0%,#0A5355 50%,#063B3D 100%)!important;' +
        'border-color:rgba(13,200,200,0.40)!important;' +
        'box-shadow:0 24px 80px rgba(4,46,48,0.60),inset 0 1px 0 rgba(255,255,255,0.18)!important}' +
      '.ty-gate-modal__icon{background:rgba(13,115,119,0.22)!important;border-color:rgba(13,200,200,0.40)!important}' +
      '.ty-gate-modal__input:focus{border-color:rgba(13,200,200,0.80)!important;' +
        'box-shadow:0 0 0 4px rgba(13,115,119,0.20)!important;background:rgba(255,255,255,0.12)!important}' +
      '.ty-gate-modal__ok{' +
        'background:linear-gradient(180deg,#0D9488 0%,#0D7377 50%,#095C5F 100%)!important;' +
        'box-shadow:0 4px 14px rgba(13,115,119,0.50)!important}' +
      '.ty-gate-modal__ok:hover{box-shadow:0 6px 20px rgba(13,115,119,0.65)!important}' +
      '.ty-gate-modal__cancel{border-color:rgba(13,200,200,0.25)!important}' +
      '.ty-gate-modal__cancel:hover{background:rgba(13,115,119,0.18)!important}' +
      /* ── Toolbar operador en colores del tenant ── */
      '.ty-op-toolbar{' +
        'background:' +
          'linear-gradient(45deg,rgba(13,115,119,0.15) 25%,transparent 25%),' +
          'linear-gradient(-45deg,rgba(13,115,119,0.15) 25%,transparent 25%),' +
          'linear-gradient(45deg,transparent 75%,rgba(13,115,119,0.15) 75%),' +
          'linear-gradient(-45deg,transparent 75%,rgba(13,115,119,0.15) 75%),' +
          'linear-gradient(135deg,#063B3D 0%,#0A5355 50%,#063B3D 100%)!important;' +
        'border-color:rgba(13,200,200,0.40)!important;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,0.18),0 8px 24px rgba(4,46,48,0.45)!important}' +
      '.ty-lock-btn--on{' +
        'background:' +
          'linear-gradient(45deg,rgba(13,115,119,0.22) 25%,transparent 25%),' +
          'linear-gradient(-45deg,rgba(13,115,119,0.22) 25%,transparent 25%),' +
          'linear-gradient(45deg,transparent 75%,rgba(13,115,119,0.22) 75%),' +
          'linear-gradient(-45deg,transparent 75%,rgba(13,115,119,0.22) 75%),' +
          'linear-gradient(135deg,#063B3D 0%,#0A5355 50%,#0D7377 100%)!important;' +
        'border-color:rgba(13,200,200,0.45)!important;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,0.22),0 4px 14px rgba(4,46,48,0.45)!important}'
      : '');
  document.head.appendChild(style);

  // ─── Interceptar notificaciones en demo ───
  if (T.isDemo) {
    // Sobreescribir fetch para bloquear Telegram y CallMeBot en demo
    var _originalFetch = window.fetch;
    window.fetch = function () {
      var url = arguments[0] || '';
      var body = arguments[1] && arguments[1].body;
      // los avisos ahora pasan por Apps Script (type 'notificar'), no por api.telegram.org
      var esAviso = typeof body === 'string' && body.indexOf('"type":"notificar"') !== -1;
      if (esAviso || (typeof url === 'string' &&
          (url.indexOf('api.telegram.org') !== -1 ||
           url.indexOf('callmebot.com') !== -1 ||
           url.indexOf('api.web3forms.com') !== -1))) {
        url = String(url);
        console.log('[DEMO] Notificacion bloqueada:', url.substring(0, 60));
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
      return _originalFetch.apply(this, arguments);
    };
  }

  // ─── DOM Ready ───
  function applyBranding() {

    // Titulo
    document.title = document.title
      .replace(/Trasteos Ya/g, T.nombre)
      .replace(/trasteosya/gi, T.nombre);

    // Logos
    var imgs = document.querySelectorAll(
      'img[src*="logo.png"], img[src*="logo.svg"], img[alt*="Trasteos"], img[alt="TY"]'
    );
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].src = T.logo;
      imgs[i].alt = T.nombre;
    }

    // Texto — reemplazar "Trasteos Ya" y dominio
    replaceText(document.body);

    // Links internos — agregar ?marca=
    var links = document.querySelectorAll('a[href]');
    for (var j = 0; j < links.length; j++) {
      var href = links[j].getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;
      if (href.indexOf('.html') !== -1 && href.indexOf('marca=') === -1) {
        var sep = href.indexOf('?') === -1 ? '?' : '&';
        links[j].setAttribute('href', href + sep + 'marca=' + T.id);
      }
    }

    // Badge DEMO
    if (T.isDemo) {
      var badge = document.createElement('div');
      badge.className = 'tenant-demo-badge';
      badge.textContent = 'DEMO';
      document.body.appendChild(badge);
    }

    // Header h1 (algunas paginas tienen <h1> con nombre)
    var h1s = document.querySelectorAll('.header h1, .main-header h1, .header-left h1');
    for (var k = 0; k < h1s.length; k++) {
      h1s[k].textContent = h1s[k].textContent
        .replace(/Trasteos Ya/g, T.nombre);
    }

    // Access-gate: sobreescribir PIN si el tenant tiene uno
    if (T.pin && window.TENANT.pin) {
      // Parchear la variable PIN_HASH del access-gate si existe
      // Se hace via el scope global — access-gate lee PIN_HASH
    }

    // Parchear access-gate modal text
    var gateModal = document.querySelector('.ty-gate-modal__lead');
    if (gateModal) {
      gateModal.textContent = gateModal.textContent
        .replace(/Trasteos Ya/g, T.nombre);
    }

    // Parchear toolbar links para mantener marca
    var toolbarLinks = document.querySelectorAll('.ty-op-toolbar__link');
    for (var m = 0; m < toolbarLinks.length; m++) {
      var th = toolbarLinks[m].getAttribute('href');
      if (th && th.indexOf('marca=') === -1) {
        toolbarLinks[m].setAttribute('href', th + '?marca=' + T.id);
      }
    }
  }

  function replaceText(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      var txt = node.textContent;
      var changed = false;
      if (txt.indexOf('Trasteos Ya') !== -1) {
        txt = txt.replace(/Trasteos Ya/g, T.nombre);
        changed = true;
      }
      if (txt.indexOf('trasteosya.online') !== -1) {
        txt = txt.replace(/trasteosya\.online/g, T.domain);
        changed = true;
      }
      if (txt.indexOf('trasteosya') !== -1) {
        txt = txt.replace(/trasteosya/gi, T.id === 'demo' ? 'crmmudanzas' : T.id);
        changed = true;
      }
      if (changed) node.textContent = txt;
    }
  }

  // Ejecutar al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding);
  } else {
    applyBranding();
  }

  // Observer para contenido dinamico (modales que se inyectan despues)
  var obs = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      for (var j = 0; j < mutations[i].addedNodes.length; j++) {
        var n = mutations[i].addedNodes[j];
        if (n.nodeType === 1) {
          // Logos en nodos nuevos
          var newImgs = n.querySelectorAll ?
            n.querySelectorAll('img[src*="logo.png"], img[src*="logo.svg"]') : [];
          for (var k = 0; k < newImgs.length; k++) {
            newImgs[k].src = T.logo;
            newImgs[k].alt = T.nombre;
          }
          // Texto
          if (n.nodeType === 1) replaceText(n);
        }
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

})();
