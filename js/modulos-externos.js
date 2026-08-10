/**
 * Enlace del ERP hacia modulos que viven fuera de este sitio.
 *
 * Hoy solo GeoProspector. Se inyecta en la barra .header-nav de las paginas
 * de administracion, para no repetir el mismo <a> en seis archivos.
 *
 * ─────────────────────────────────────────────────────────────
 *  PARA CAMBIAR LA DIRECCION DEL MODULO, EDITA SOLO ESTA LINEA:
 * ─────────────────────────────────────────────────────────────
 */
var GEOPROSPECTOR_URL = 'https://geoprospector.vercel.app/prospeccion/nueva';

(function () {
  'use strict';

  // Mientras se trabaja en el computador, el modulo corre local.
  var URL_LOCAL = 'http://localhost:3000/prospeccion/nueva';

  var esLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  var destino = esLocal ? URL_LOCAL : GEOPROSPECTOR_URL;

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

    var destinoDom = buscarContenedor();
    if (!destinoDom) return;

    var nav = destinoDom.el;
    var a = document.createElement('a');
    a.setAttribute('data-modulo', 'geoprospector');
    a.textContent = 'Prospeccion';

    // En .header-nav hereda los estilos de la pagina. En los demas
    // contenedores hay que darle el aspecto a mano para que no salga como
    // un enlace azul suelto.
    if (!destinoDom.esNav) {
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

    if (destino) {
      a.href = destino;
      a.target = '_blank';
      a.rel = 'noopener';
      a.title = esLocal
        ? 'GeoProspector (corriendo en este computador)'
        : 'GeoProspector - prospeccion por zonas';
    } else {
      // Aun no publicado: se muestra apagado en vez de dar un enlace roto.
      a.href = '#';
      a.style.opacity = '.45';
      a.style.cursor = 'not-allowed';
      a.title = 'GeoProspector aun no esta publicado';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        alert(
          'GeoProspector todavia no esta publicado.\n\n' +
          'Por ahora se abre desde el computador donde se esta construyendo.'
        );
      });
    }

    nav.appendChild(a);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', crearEnlace);
  } else {
    crearEnlace();
  }
})();
