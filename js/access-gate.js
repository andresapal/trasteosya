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
    wrap.style.visibility = 'visible';
    document.body.appendChild(wrap);

    const input = wrap.querySelector('.ty-gate-modal__input');
    const err = wrap.querySelector('.ty-gate-modal__err');
    setTimeout(() => input.focus(), 50);

    function submit() {
      if (checkPin(input.value)) {
        setOperator(true);
        wrap.remove();
        if (opts.onSuccess) opts.onSuccess();
        else {
          if (typeof _saveSession === 'function') _saveSession();
          location.reload();
        }
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

  // ============ TOOLBAR OPERADOR ============
  function injectOpToolbar() {
    if (!isOperator()) return;
    if (document.querySelector('.ty-op-toolbar')) return;
    const bar = document.createElement('div');
    bar.className = 'ty-op-toolbar ty-op-toolbar--hidden';
    var darkIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    var lightIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    bar.innerHTML =
      '<a href="cotizador.html" class="ty-op-toolbar__link">Cotizador</a>' +
      '<a href="orden-servicio.html" class="ty-op-toolbar__link">Orden de servicio</a>' +
      '<a href="kpi-empresa.html" class="ty-op-toolbar__link">KPI\'s</a>' +
      '<a href="campanas.html" class="ty-op-toolbar__link">Campañas</a>' +
      '<a href="servicios.html" class="ty-op-toolbar__link">Servicios</a>' +
      '<button type="button" class="ty-op-toolbar__dark" title="Modo oscuro">' + (localStorage.getItem('ty_dark_mode')==='1' ? lightIcon : darkIcon) + '</button>' +
      '<button type="button" class="ty-op-toolbar__logout">Salir</button>';
    document.body.appendChild(bar);
    bar.querySelector('.ty-op-toolbar__dark').onclick = function () {
      var isDark = document.body.classList.toggle('ty-dark');
      localStorage.setItem('ty_dark_mode', isDark ? '1' : '0');
      this.innerHTML = isDark ? lightIcon : darkIcon;
    };
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
    if (isOperator() && localStorage.getItem('ty_dark_mode') === '1') {
      document.body.classList.add('ty-dark');
    }

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
          if (localStorage.getItem('ty_dark_mode') === '1') {
            document.body.classList.add('ty-dark');
          }
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
