/**
 * Enlace del ERP hacia modulos que viven fuera de este sitio.
 *
 * Hoy solo GeoProspector (prospeccion comercial por zonas). Se inyecta en la
 * barra del encabezado de las paginas de administracion, para no repetir el
 * mismo <a> en seis archivos.
 *
 * ─────────────────────────────────────────────────────────────
 *  SI ALGUN DIA CAMBIA LA DIRECCION DEL MODULO, EDITA SOLO ESTA LINEA:
 * ─────────────────────────────────────────────────────────────
 */
var GEOPROSPECTOR_URL = 'https://geoprospector.vercel.app/prospeccion/nueva';

(function () {
  'use strict';

  /**
   * Las seis paginas del ERP no comparten el mismo encabezado:
   *   .header-nav     -> kpis, kpi-empresa, finanzas
   *   .header-actions -> orden-servicio
   *   .header-inner   -> cotizador, campanas
   * Se busca en ese orden y se toma el primero que exista.
   */
  function buscarContenedor() {
    var selectores = ['.header-nav', '.header-actions', '.header-inner'];
    for (var i = 0; i < selectores.length; i++) {
      var el = document.querySelector(selectores[i]);
      if (el) return { el: el, esNav: selectores[i] === '.header-nav' };
    }
    return null;
  }

  function crearEnlace() {
    if (document.querySelector('[data-modulo="geoprospector"]')) return;

    var destino = buscarContenedor();
    if (!destino) return;

    var a = document.createElement('a');
    a.setAttribute('data-modulo', 'geoprospector');
    a.textContent = 'Prospeccion';
    a.href = GEOPROSPECTOR_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'GeoProspector - buscar negocios por zona';

    // En .header-nav hereda los estilos de la pagina. En los demas
    // contenedores hay que darle el aspecto a mano para que no salga como
    // un enlace azul suelto.
    if (!destino.esNav) {
      a.style.cssText =
        'display:inline-flex;align-items:center;font-size:13px;' +
        'color:var(--text-muted,#475569);text-decoration:none;padding:6px 10px;' +
        'border-radius:6px;border:1px solid var(--border,#E2E8F0);' +
        'white-space:nowrap;transition:.15s;margin-left:8px';
      a.addEventListener('mouseover', function () {
        a.style.borderColor = 'var(--brand-blue,#003DA5)';
        a.style.color = 'var(--brand-blue,#003DA5)';
      });
      a.addEventListener('mouseout', function () {
        a.style.borderColor = 'var(--border,#E2E8F0)';
        a.style.color = 'var(--text-muted,#475569)';
      });
    }

    destino.el.appendChild(a);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', crearEnlace);
  } else {
    crearEnlace();
  }
})();
