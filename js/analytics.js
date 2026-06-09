/* ============================================
   TRASTEOS YA — Analytics (GA4 + eventos custom)
   ============================================ */

(function () {
  'use strict';

  var GA_ID = 'G-FCW2QP78S4';

  /* ---------- 1. Cargar gtag.js (async) ---------- */
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  (document.head || document.documentElement).appendChild(s);

  /* ---------- 2. Init dataLayer ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure'
  });

  /* ---------- 3. Eventos custom ---------- */
  function setupEvents() {

    // Click en cualquier link/boton
    document.addEventListener('click', function (e) {
      var t = e.target.closest('a, button');
      if (!t) return;

      var href = (t.getAttribute('href') || '').toLowerCase();
      var dataWa = t.getAttribute('data-wa');
      var text = (t.textContent || '').trim().toLowerCase();

      // WhatsApp clicks
      if (href.indexOf('wa.me') >= 0 || href.indexOf('whatsapp.com') >= 0 || dataWa !== null) {
        gtag('event', 'whatsapp_click', {
          event_category: 'engagement',
          event_label: dataWa || 'wa-link',
          source_page: window.location.pathname
        });
      }

      // Teléfono clicks
      if (href.indexOf('tel:') === 0) {
        gtag('event', 'phone_click', {
          event_category: 'engagement',
          event_label: href.replace('tel:', ''),
          source_page: window.location.pathname
        });
      }

      // Cotizar clicks (alta intención)
      if ((text.indexOf('cotizar') >= 0 || text.indexOf('cotización') >= 0 ||
           href.indexOf('cotizar') >= 0) && href.indexOf('cotizador') < 0) {
        gtag('event', 'cta_cotizar_click', {
          event_category: 'conversion',
          event_label: text.slice(0, 50),
          source_page: window.location.pathname
        });
      }

      // Cotizador interactivo (operador)
      if (href.indexOf('cotizador.html') >= 0) {
        gtag('event', 'cotizador_open', {
          event_category: 'tool',
          event_label: 'cotizador-interactivo'
        });
      }

      // Click en redes sociales
      if (href.indexOf('instagram.com') >= 0) gtag('event', 'social_click', { event_label: 'instagram' });
      if (href.indexOf('facebook.com') >= 0)  gtag('event', 'social_click', { event_label: 'facebook' });
      if (href.indexOf('linkedin.com') >= 0)  gtag('event', 'social_click', { event_label: 'linkedin' });
      if (href.indexOf('x.com') >= 0 || href.indexOf('twitter.com') >= 0) {
        gtag('event', 'social_click', { event_label: 'x_twitter' });
      }
    });

    // Form submits (cotización express)
    document.querySelectorAll('form.ty-form').forEach(function (form) {
      form.addEventListener('submit', function () {
        var source = form.getAttribute('data-source') || 'unknown';
        gtag('event', 'form_submit', {
          event_category: 'conversion',
          event_label: source,
          source_page: window.location.pathname,
          value: 1
        });
        // Evento de conversión "generate_lead" (estándar de GA4)
        gtag('event', 'generate_lead', {
          currency: 'COP',
          value: 1
        });
      });
    });

    // Scroll depth (25, 50, 75, 100%)
    var maxScroll = 0;
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        var pct = Math.round((window.scrollY / docHeight) * 100);
        var bucket = Math.floor(pct / 25) * 25;
        if (bucket > maxScroll && bucket <= 100) {
          maxScroll = bucket;
          gtag('event', 'scroll_depth', {
            event_category: 'engagement',
            event_label: bucket + '%',
            value: bucket
          });
        }
      }, 300);
    });

    // Tiempo activo en página (cada 30 seg)
    var seconds = 0;
    var active = true;
    document.addEventListener('visibilitychange', function () { active = !document.hidden; });
    setInterval(function () {
      if (!active) return;
      seconds += 30;
      if (seconds === 30 || seconds === 90 || seconds === 180) {
        gtag('event', 'time_on_page', {
          event_category: 'engagement',
          event_label: seconds + 's',
          value: seconds
        });
      }
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEvents);
  } else {
    setupEvents();
  }
})();
