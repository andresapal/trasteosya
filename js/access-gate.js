/* ============================================
   TRASTEOS YA — Access Gate (modo operador con PIN)
   ============================================
   NOTA: Este es un gating ligero del lado del cliente.
   No es seguridad real (cualquiera con DevTools puede ver el PIN).
   Para auth real, integrar Firebase/Supabase con backend.
   ============================================ */

(function () {
  'use strict';

  // PIN visible en el codigo (gating ligero - acordado con el cliente)
  // Para hacerlo un poco menos obvio, esta en base64.
  const PIN_HASH = 'QEFuZHJlczI0MDUq';  // = '@Andres2405*'
  const STORAGE_KEY = 'ty_operator';

  function checkPin(input) {
    try { return btoa(input) === PIN_HASH; }
    catch (e) { return false; }
  }

  function isOperator() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }

  function setOperator(state) {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* silent */ }
  }

  function applyBodyClass() {
    document.body.classList.toggle('is-operator', isOperator());
    document.body.classList.toggle('is-public', !isOperator());
  }

  // ============ MODAL DE PIN ============
  function showPinModal(opts) {
    opts = opts || {};
    if (document.querySelector('.ty-gate-modal')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ty-gate-modal';
    wrap.innerHTML =
      '<div class="ty-gate-modal__overlay"></div>' +
      '<div class="ty-gate-modal__box" role="dialog" aria-modal="true">' +
        '<div class="ty-gate-modal__icon">🔒</div>' +
        '<h3 class="ty-gate-modal__title">Acceso operador</h3>' +
        '<p class="ty-gate-modal__lead">' + (opts.message || 'Ingresa el PIN para activar las funciones internas (costos, márgenes, descuento, orden de servicio).') + '</p>' +
        '<input type="password" class="ty-gate-modal__input" placeholder="PIN" autocomplete="off">' +
        '<div class="ty-gate-modal__err" role="alert"></div>' +
        '<div class="ty-gate-modal__actions">' +
          '<button type="button" class="ty-gate-modal__cancel">' + (opts.adminOnly ? 'Volver al inicio' : 'Cancelar') + '</button>' +
          '<button type="button" class="ty-gate-modal__ok">Entrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    const input = wrap.querySelector('.ty-gate-modal__input');
    const err = wrap.querySelector('.ty-gate-modal__err');
    setTimeout(() => input.focus(), 50);

    function submit() {
      if (checkPin(input.value)) {
        setOperator(true);
        wrap.remove();
        if (opts.onSuccess) opts.onSuccess();
        else location.reload();
      } else {
        err.textContent = 'PIN incorrecto. Intenta de nuevo.';
        input.value = '';
        input.focus();
        wrap.querySelector('.ty-gate-modal__box').classList.add('shake');
        setTimeout(() => wrap.querySelector('.ty-gate-modal__box').classList.remove('shake'), 400);
      }
    }
    function cancel() {
      wrap.remove();
      if (opts.adminOnly && !isOperator()) {
        location.href = 'index.html';
      }
    }

    wrap.querySelector('.ty-gate-modal__ok').onclick = submit;
    wrap.querySelector('.ty-gate-modal__cancel').onclick = cancel;
    wrap.querySelector('.ty-gate-modal__overlay').onclick = cancel;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  // ============ BOTON CANDADO ============
  function injectLockButton() {
    if (document.querySelector('.ty-lock-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ty-lock-btn';
    function update() {
      const on = isOperator();
      btn.classList.toggle('ty-lock-btn--on', on);
      btn.innerHTML = on ? '🔓' : '🔒';
      btn.setAttribute('aria-label', on ? 'Cerrar sesión operador' : 'Acceso operador');
      btn.title = on ? 'Modo operador activo · clic para salir' : 'Acceso operador';
    }
    btn.onclick = function () {
      if (isOperator()) {
        if (confirm('¿Cerrar sesión operador? Volverás al inicio.')) {
          setOperator(false);
          location.href = 'index.html';
        }
      } else {
        showPinModal();
      }
    };
    update();
    document.body.appendChild(btn);
  }

  // ============ RESEÑA STANDALONE ============
  window.resenaStandalone = function() {
    if (typeof pedirResena === 'function') { pedirResena(); return; }
    // Build standalone modal
    if (document.querySelector('.ty-resena-modal')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ty-resena-modal';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
    wrap.innerHTML =
      '<div style="position:absolute;inset:0;background:rgba(5,14,45,.6);backdrop-filter:blur(6px)" onclick="this.parentElement.remove()"></div>' +
      '<div style="position:relative;background:#fff;border-radius:16px;padding:28px 24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:system-ui,sans-serif">' +
        '<h3 style="font-size:16px;margin:0 0 4px;color:#1a1a2e">Enviar pedido de reseña</h3>' +
        '<p style="font-size:12px;color:#6b7280;margin:0 0 16px">Se abrirá WhatsApp con el mensaje listo.</p>' +
        '<label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Nombre del cliente</label>' +
        '<input id="ty-res-nombre" type="text" placeholder="Nombre" style="width:100%;padding:10px 12px;border:1px solid #e2e5ea;border-radius:8px;font-size:14px;margin:4px 0 12px;font-family:inherit">' +
        '<label style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Teléfono (WhatsApp)</label>' +
        '<input id="ty-res-tel" type="tel" placeholder="3XX XXX XXXX" style="width:100%;padding:10px 12px;border:1px solid #e2e5ea;border-radius:8px;font-size:14px;margin:4px 0 16px;font-family:inherit">' +
        '<div style="display:flex;gap:8px">' +
          '<button type="button" onclick="this.closest(\'.ty-resena-modal\').remove()" style="flex:1;padding:10px;border:1px solid #e2e5ea;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;font-family:inherit">Cancelar</button>' +
          '<button type="button" id="ty-res-enviar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#16A34A;color:#fff;font-weight:600;cursor:pointer;font-size:13px;font-family:inherit">Enviar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    setTimeout(function(){ wrap.querySelector('#ty-res-nombre').focus(); }, 50);
    wrap.querySelector('#ty-res-enviar').onclick = function() {
      var nombre = wrap.querySelector('#ty-res-nombre').value.trim();
      var tel = wrap.querySelector('#ty-res-tel').value.replace(/\D/g, '');
      if (tel && tel.indexOf('57') !== 0) tel = '57' + tel;
      var primer = nombre ? nombre.split(/\s+/)[0] : '';
      var saludo = primer ? ('¡Hola ' + primer + '!') : '¡Hola!';
      var link = localStorage.getItem('ty_resena_link') || 'https://g.page/r/CY8SnfZIjp_VEAE/review';
      var msg = saludo + ' 👋\n\nGracias por confiar en Trasteos Ya. Esperamos que hayas quedado satisfecho con nuestro servicio.\n\n¿Nos regalarías un minuto para compartir tu experiencia? Tu opinión nos ayuda a seguir mejorando y permite que más personas conozcan nuestro trabajo.\n\n⭐ Déjanos tu reseña aquí:\n' + link + '\n\n¡Muchas gracias por tu apoyo y por elegir a Trasteos Ya! 🚚💙❤️\n\nTrasteosya.online';
      var base = tel ? ('https://wa.me/' + tel) : 'https://wa.me/';
      window.open(base + '?text=' + encodeURIComponent(msg), '_blank');
      wrap.remove();
    };
  }

  // ============ TOOLBAR OPERADOR ============
  function injectOpToolbar() {
    if (!isOperator()) return;
    if (document.querySelector('.ty-op-toolbar')) return;
    const bar = document.createElement('div');
    bar.className = 'ty-op-toolbar ty-op-toolbar--hidden';
    bar.innerHTML =
      '<a href="cotizador.html" class="ty-op-toolbar__link">Cotizador</a>' +
      '<a href="orden-servicio.html" class="ty-op-toolbar__link">Orden de servicio</a>' +
      '<a href="kpis.html" class="ty-op-toolbar__link">KPI\'s</a>' +
      '<a href="servicios.html" class="ty-op-toolbar__link">Servicios</a>' +
      '<button type="button" class="ty-op-toolbar__link ty-op-toolbar__resena" onclick="resenaStandalone()">Reseña</button>' +
      '<button type="button" class="ty-op-toolbar__logout">Salir</button>';
    document.body.appendChild(bar);
    bar.querySelector('.ty-op-toolbar__logout').onclick = function () {
      if (confirm('¿Cerrar sesión operador?')) {
        setOperator(false);
        location.reload();
      }
    };

    // Trigger zone: show toolbar when cursor/finger near bottom edge
    const trigger = document.createElement('div');
    trigger.className = 'ty-op-trigger';
    document.body.appendChild(trigger);
    trigger.addEventListener('mouseenter', function () { bar.classList.remove('ty-op-toolbar--hidden'); });
    bar.addEventListener('mouseleave', function (e) {
      if (!bar.contains(e.relatedTarget) && e.relatedTarget !== trigger) {
        bar.classList.add('ty-op-toolbar--hidden');
      }
    });
    // Mobile: tap trigger zone to toggle
    trigger.addEventListener('touchstart', function (e) {
      e.preventDefault();
      bar.classList.toggle('ty-op-toolbar--hidden');
    }, { passive: false });
    // Also show/hide on swipe up from bottom
    let touchStartY = 0;
    document.addEventListener('touchstart', function (e) { touchStartY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      const dy = touchStartY - e.changedTouches[0].clientY;
      const fromBottom = window.innerHeight - touchStartY;
      if (dy > 40 && fromBottom < 80) bar.classList.remove('ty-op-toolbar--hidden');
      else if (dy < -40 && !bar.contains(e.target)) bar.classList.add('ty-op-toolbar--hidden');
    }, { passive: true });
  }

  // ============ INIT ============
  function boot() {
    applyBodyClass();

    const isAdminOnly = document.body.dataset.gate === 'admin-only';
    const hasGate = document.body.dataset.gate;

    if (isAdminOnly && !isOperator()) {
      // Esconder el contenido hasta autenticarse
      document.body.style.visibility = 'hidden';
      showPinModal({
        adminOnly: true,
        message: 'Esta es una herramienta privada del equipo Trasteos Ya. Ingresa tu PIN para continuar.',
        onSuccess: function () {
          applyBodyClass();
          document.body.style.visibility = '';
          injectLockButton();
          injectOpToolbar();
        }
      });
      return;
    }

    if (hasGate) {
      injectLockButton();
      injectOpToolbar();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
