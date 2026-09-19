/**
 * Menu de la Organizacion (hamburguesa) para los modulos internos.
 *
 * Reemplaza la barra oscura de abajo (la inyectaba access-gate.js) por un boton
 * en el encabezado que abre un panel lateral con:
 *   - secciones propias de la pagina (solo donde corresponde: KPI, Campanas)
 *   - los modulos: Cotizador, Orden de servicio, KPI's, Campanas, Finanzas, Tarifas, Usuarios
 *   - modo oscuro y salir
 *
 * Como se usa en cada pagina:
 *   <body data-org="kpi">                    modulo actual (resalta en la lista)
 *   <div id="org-menu-slot"></div>           dentro del encabezado; ahi va el boton
 *   <script>window.TY_ORG_EXTRAS=[{title:'KPI', items:[{label:'X', href:'x.html'}]}]</script>
 *   <script src="js/org-menu.js"></script>   antes de access-gate.js
 * access-gate.js llama a TYOrgMenu.init() cuando el operador ya esta autenticado.
 */
(function () {
  'use strict';

  var ICONS = {
    cotizador: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    'orden-servicio': '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><polyline points="9 14 11 16 15 12"/>',
    kpi: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    campanas: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    finanzas: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    tarifas: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  };

  // Lista unica de modulos (la barra anterior tenia estos mismos, mas Usuarios)
  var MODULOS = [
    { id: 'cotizador',      label: 'Cotizador',         href: 'cotizador.html' },
    { id: 'orden-servicio', label: 'Orden de servicio', href: 'orden-servicio.html' },
    { id: 'kpi',            label: "KPI's",             href: 'kpi-empresa.html' },
    { id: 'campanas',       label: 'Campañas',          href: 'campanas.html' },
    { id: 'finanzas',       label: 'Finanzas',          href: 'finanzas.html' },
    { id: 'tarifas',        label: 'Tarifas',           href: 'tarifas.html' },
    { id: 'usuarios',       label: 'Usuarios',          href: 'usuarios.html' }
  ];

  var drawer = null, overlay = null, burger = null, lastFocus = null, ready = false;

  function svg(name, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.chevron) + '</svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Conserva ?marca= (version demo) en los enlaces internos
  function conMarca(href) {
    var t = window.TENANT;
    if (t && t.id && t.id !== 'ty' && !/^https?:/i.test(href)) {
      return href + (href.indexOf('?') === -1 ? '?' : '&') + 'marca=' + encodeURIComponent(t.id);
    }
    return href;
  }
  function actual() { return (document.body && document.body.getAttribute('data-org')) || ''; }
  function extras() {
    var e = window.TY_ORG_EXTRAS;
    return Array.isArray(e) ? e : [];
  }

  function itemHtml(it, activeId) {
    var externo = !!it.external || /^https?:/i.test(it.href || '');
    var act = it.id && it.id === activeId ? ' active' : '';
    return '<a class="ty-org-item' + act + '" href="' + esc(externo ? it.href : conMarca(it.href)) + '"' +
      (externo ? ' target="_blank" rel="noopener"' : '') + (act ? ' aria-current="page"' : '') + '>' +
      svg(it.id && ICONS[it.id] ? it.id : 'chevron') + '<span>' + esc(it.label) + '</span>' +
      (externo ? svg('ext', 'ty-org-ext') : '') + '</a>';
  }

  function build() {
    var isDark = document.body.classList.contains('ty-dark');
    var act = actual();
    var html = '';

    // Secciones propias de esta pagina (KPI: KPI General/Servicios; Campanas: Prospeccion)
    extras().forEach(function (g) {
      if (!g || !g.items || !g.items.length) return;
      html += '<div class="ty-org-extra"><div class="ty-org-sec">' + esc(g.title || 'En esta página') + '</div>' +
        g.items.map(function (it) { return itemHtml(it, null); }).join('') + '</div>';
    });

    html += '<div class="ty-org-sec">Módulos</div>' +
      MODULOS.map(function (m) { return itemHtml(m, act === m.id ? m.id : null); }).join('');

    var name = (window.TY_USER && window.TY_USER.nombre) || 'Equipo Trasteos Ya';
    var rol = (window.TY_USER && window.TY_USER.rol) || 'Modo operador';

    drawer = document.createElement('aside');
    drawer.className = 'ty-org-drawer';
    drawer.id = 'ty-org-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Menú de la organización');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="ty-org-head"><div><b>Organización</b><small>' + esc(name) + ' · ' + esc(rol) + '</small></div>' +
      '<button type="button" class="ty-org-close" aria-label="Cerrar menú">' + svg('close') + '</button></div>' +
      '<nav class="ty-org-body">' + html + '</nav>' +
      '<div class="ty-org-foot">' +
      '<button type="button" class="ty-org-dark">' + svg(isDark ? 'sun' : 'moon') + '<span>' + (isDark ? 'Modo claro' : 'Modo oscuro') + '</span></button>' +
      '<button type="button" class="ty-org-logout">' + svg('logout') + '<span>Salir</span></button></div>';

    overlay = document.createElement('div');
    overlay.className = 'ty-org-overlay';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', close);
    drawer.querySelector('.ty-org-close').addEventListener('click', close);
    drawer.querySelector('.ty-org-dark').addEventListener('click', function () {
      var dark = document.body.classList.toggle('ty-dark');
      try { localStorage.setItem('ty_dark_mode', dark ? '1' : '0'); } catch (e) {}
      this.innerHTML = svg(dark ? 'sun' : 'moon') + '<span>' + (dark ? 'Modo claro' : 'Modo oscuro') + '</span>';
    });
    drawer.querySelector('.ty-org-logout').addEventListener('click', function () {
      if (!confirm('¿Cerrar sesión?')) return;
      if (window.TYAccessGate && typeof window.TYAccessGate.logout === 'function') {
        window.TYAccessGate.logout();
      } else {
        try { localStorage.removeItem('ty_operator'); } catch (e) {}
        location.href = 'index.html';
      }
    });
    // Al navegar dentro del panel, no dejar el candado de scroll puesto
    drawer.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a.ty-org-item')) unlock();
    });
    drawer.addEventListener('keydown', trapFocus);
  }

  function lock() { document.documentElement.style.overflow = 'hidden'; }
  function unlock() { document.documentElement.style.overflow = ''; }

  function open() {
    if (!ready) return;
    // Se reconstruye al abrir: asi toma las secciones que las paginas registren tarde
    // (p. ej. modulos-externos.js) y el estado actual del modo oscuro.
    if (drawer) { drawer.remove(); overlay.remove(); drawer = overlay = null; }
    build();
    lastFocus = document.activeElement;
    // Forzar un frame para que la transicion corra
    void drawer.offsetWidth;
    drawer.classList.add('open');
    overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    lock();
    var c = drawer.querySelector('.ty-org-close');
    if (c) c.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!drawer) return;
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    unlock();
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !drawer) return;
    var f = drawer.querySelectorAll('a[href],button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function init() {
    if (ready) return;
    ready = true;
    burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'ty-org-burger';
    burger.setAttribute('aria-label', 'Abrir menú de la organización');
    burger.setAttribute('aria-haspopup', 'dialog');
    burger.setAttribute('aria-controls', 'ty-org-drawer');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';
    burger.addEventListener('click', open);

    var slot = document.getElementById('org-menu-slot');
    if (slot) slot.appendChild(burger);
    else { burger.classList.add('ty-org-burger--float'); document.body.appendChild(burger); }
  }

  window.TYOrgMenu = { init: init, open: open, close: close };
})();
