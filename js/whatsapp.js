/* ============================================
   TRASTEOS YA — WhatsApp Generator
   Genera enlaces wa.me con mensaje contextual.
   ============================================ */

(function () {
  'use strict';

  const PHONE = '573143095194'; // Trasteos Ya WhatsApp

  /**
   * Mensajes contextuales por origen.
   * El equipo recibe el mensaje y responde con el protocolo de bienvenida humano.
   */
  const MESSAGES = {
    'general':       'Hola Trasteos Ya, me interesa información sobre sus servicios.',
    'home-hero':     'Hola Trasteos Ya, vi su sitio web y me interesa cotizar un servicio.',
    'home-cta':      'Hola Trasteos Ya, quiero más información de sus servicios. ¡Quedo atento!',
    'hogar':         'Hola, necesito una mudanza de hogar. ¿Me ayudan con la cotización?',
    'oficina':       'Hola, requiero servicio de mudanza corporativa para mi oficina.',
    'industrial':    'Hola, necesito mudanza industrial / transporte de mercancía.',
    'empaque':       'Hola, requiero servicio de empaque profesional.',
    'bodegaje':      'Hola, me interesa el servicio de bodegaje. ¿Me cuentan?',
    'trans-ya':      'Hola, quiero información sobre Trans Ya App y cómo registrarme.',
    'contacto':      'Hola Trasteos Ya, quiero ponerme en contacto con el equipo.',
    'cobertura':     'Hola, quiero saber si cubren mi zona / ciudad.',
    'urgente':       'Hola Trasteos Ya, NECESITO un servicio URGENTE. ¿Me pueden atender?'
  };

  /**
   * Construye una URL wa.me con mensaje pre-llenado.
   * @param {string} key - clave del mensaje (ver MESSAGES)
   * @param {object} [extra] - { nombre, origen, destino, servicio, fecha }
   */
  function buildUrl(key, extra) {
    let msg = MESSAGES[key] || MESSAGES.general;

    if (extra && Object.keys(extra).length) {
      const lines = [msg, ''];
      if (extra.nombre)   lines.push('Nombre: ' + extra.nombre);
      if (extra.servicio) lines.push('Servicio: ' + extra.servicio);
      if (extra.origen)   lines.push('Origen: ' + extra.origen);
      if (extra.destino)  lines.push('Destino: ' + extra.destino);
      if (extra.fecha)    lines.push('Fecha estimada: ' + extra.fecha);
      if (extra.detalles) lines.push('Detalles: ' + extra.detalles);
      msg = lines.join('\n');
    }

    return 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg);
  }

  /**
   * Cablea todos los enlaces con data-wa="<key>" para que abran WhatsApp.
   */
  function wireLinks() {
    document.querySelectorAll('[data-wa]').forEach(function (el) {
      const key = el.getAttribute('data-wa') || 'general';
      el.setAttribute('href', buildUrl(key));
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    });
  }

  // Expone API global
  window.TY_WhatsApp = {
    phone: PHONE,
    messages: MESSAGES,
    buildUrl: buildUrl,
    wireLinks: wireLinks
  };

  // Auto-cablea al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireLinks);
  } else {
    wireLinks();
  }
})();
