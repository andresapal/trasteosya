/**
 * Enlace del ERP hacia modulos que viven fuera de este sitio.
 *
 * Hoy solo GeoProspector (prospeccion comercial por zonas). Aparece en el menu
 * hamburguesa de Campanas (js/org-menu.js), dentro de la seccion de esa pagina.
 * Ya no se inyecta un boton suelto en el encabezado.
 *
 * ─────────────────────────────────────────────────────────────
 *  SI ALGUN DIA CAMBIA LA DIRECCION DEL MODULO, EDITA SOLO ESTA LINEA:
 * ─────────────────────────────────────────────────────────────
 */
var GEOPROSPECTOR_URL = 'https://geoprospector.vercel.app/prospeccion/nueva';

(function () {
  'use strict';

  // Solo se carga en campanas.html
  window.TY_ORG_EXTRAS = (window.TY_ORG_EXTRAS || []).concat([{
    title: 'Campañas',
    items: [{
      label: 'Prospección',
      href: GEOPROSPECTOR_URL,
      external: true
    }]
  }]);
})();
