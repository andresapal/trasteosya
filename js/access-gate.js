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
        if (confirm('¿Cerrar sesión operador? Volverás al modo público.')) {
          setOperator(false);
          location.reload();
        }
      } else {
        showPinModal();
      }
    };
    update();
    document.body.appendChild(btn);
  }

  // ============ LINK A ORDEN DE SERVICIO (solo operador) ============
  function injectOpToolbar() {
    if (!isOperator()) return;
    if (document.querySelector('.ty-op-toolbar')) return;
    const bar = document.createElement('div');
    bar.className = 'ty-op-toolbar';
    bar.innerHTML =
      '<span class="ty-op-toolbar__badge">MODO OPERADOR</span>' +
      '<a href="cotizador.html" class="ty-op-toolbar__link">Cotizador</a>' +
      '<a href="orden-servicio.html" class="ty-op-toolbar__link">Orden de servicio</a>' +
      '<a href="kpis.html" class="ty-op-toolbar__link">KPI\'s</a>' +
      '<button type="button" class="ty-op-toolbar__logout">Salir</button>';
    document.body.appendChild(bar);
    bar.querySelector('.ty-op-toolbar__logout').onclick = function () {
      if (confirm('¿Cerrar sesión operador?')) {
        setOperator(false);
        location.reload();
      }
    };
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
