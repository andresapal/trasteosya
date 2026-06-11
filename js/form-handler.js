/* ============================================
   TRASTEOS YA — Form handler (v3)
   Email al operador + auto-respuesta al cliente + Telegram push + WhatsApp push
   ============================================ */

(function () {
  'use strict';

  /* ---------- CONFIG (rellena las 3 claves) ---------- */
  const CONFIG = {
    // 1) Web3Forms · gratis 250 envios/mes · https://web3forms.com
    WEB3FORMS_KEY: '4955ca45-48c4-4ef2-9c0b-da17741a1d2c',

    // 2) Telegram bot · gratis e instantaneo · ver README.md seccion "Telegram bot"
    TELEGRAM_BOT_TOKEN: '8815751812:AAEGlCiQAZKSamRUfD5r0lmzjLTRAaFcdqw',
    TELEGRAM_CHAT_ID:   '1081707115',

    // 3) CallMeBot WhatsApp · gratis · push directo al WhatsApp del operador
    CALLMEBOT_APIKEY: '9452184',
    CALLMEBOT_PHONE:  '573143095194', // formato: 57 (Colombia) + 10 digitos sin +

    // 4) Backup en Google Drive (Apps Script Web App)
    BACKUP_URL: 'https://script.google.com/macros/s/AKfycbyiiC0VRDbAnmOtznqvgM3NxHdtjdnofPqQENWcCwRJbASHB0RgvzQ-OnEwPWXaT2NpAQ/exec',
    BACKUP_APIKEY: 'TrasteosYa-2026-Backup',

    // 5) Google Sheets webhook (opcional · legacy)
    SHEETS_WEBHOOK: '',

    THANK_YOU_URL: 'gracias.html',
    OPEN_WA_AFTER_SUBMIT: true,

    // Mensaje de auto-respuesta enviado por email al cliente
    CLIENT_AUTOREPLY_SUBJECT: 'Recibimos tu solicitud · Trasteos Ya',
    CLIENT_AUTOREPLY_BODY:
      '¡Hola!\n\n' +
      'Te has contactado con Trasteos Ya. Tu solicitud de cotización ya está en nuestras manos ' +
      'y un coordinador te responderá por WhatsApp en menos de 15 minutos hábiles.\n\n' +
      'Mientras tanto, si tienes algo urgente, escríbenos al 314 309 5194.\n\n' +
      '¡Gracias por confiar en nosotros!\n' +
      '— Equipo Trasteos Ya · 15 años moviendo Bogotá\n' +
      '🌐 https://trasteosya.online'
  };

  function getPhone() {
    return (window.TY_WhatsApp && window.TY_WhatsApp.phone) || '573143095194';
  }

  /* ---------- WhatsApp link generador (cliente, post-submit) ---------- */
  function buildWaUrl(data) {
    const lines = ['Acabo de enviar una cotización por el sitio web.', ''];
    if (data.nombre)   lines.push('Nombre: ' + data.nombre);
    if (data.email)    lines.push('Email: ' + data.email);
    if (data.servicio) lines.push('Servicio: ' + data.servicio);
    if (data.origen)   lines.push('Origen: ' + data.origen);
    if (data.destino)  lines.push('Destino: ' + data.destino);
    if (data.tamano)   lines.push('Tamaño: ' + data.tamano);
    if (data.fecha)    lines.push('Fecha estimada: ' + data.fecha);
    if (data.detalles) lines.push('Detalles: ' + data.detalles);
    lines.push('', '¡Quedo atento a su respuesta!', '', '— Trasteos Ya · trasteosya.online');
    return 'https://wa.me/' + getPhone() + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  function setLoading(form, loading) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Enviando…';
      btn.disabled = true;
    } else {
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      btn.disabled = false;
    }
  }

  function showError(form, message) {
    let box = form.querySelector('.form-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'padding:12px 14px;background:var(--brand-red-soft);color:var(--brand-red-dark);border-radius:var(--radius-md);margin-bottom:var(--space-md);font-size:14px;';
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = message;
  }

  /* ---------- Telegram push al operador ---------- */
  async function postTelegram(data, source) {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    try {
      const lines = [
        '🔔 *Nueva cotización · Trasteos Ya*',
        '',
        '📋 *Origen:* ' + source,
        '👤 *Nombre:* ' + (data.nombre || '-'),
        '📱 *WhatsApp:* ' + (data.telefono || '-'),
        '📧 *Email:* ' + (data.email || '-'),
        '🛒 *Servicio:* ' + (data.servicio || '-'),
        '📍 *Ruta:* ' + (data.origen || '-') + ' → ' + (data.destino || '-'),
        '📦 *Tamaño:* ' + (data.tamano || '-'),
        '📅 *Fecha:* ' + (data.fecha || '-'),
        '💬 *Detalles:* ' + (data.detalles || '-'),
        '',
        '⏰ ' + new Date().toLocaleString('es-CO'),
        '🌐 https://trasteosya.online'
      ];
      const url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.TELEGRAM_CHAT_ID,
          text: lines.join('\n'),
          parse_mode: 'Markdown'
        })
      });
    } catch (e) { /* silent */ }
  }

  /* ---------- WhatsApp push al operador (via CallMeBot) ---------- */
  async function postWhatsApp(data, source) {
    if (!CONFIG.CALLMEBOT_APIKEY || !CONFIG.CALLMEBOT_PHONE) return;
    try {
      const lines = [
        '🔔 *Nueva cotización · Trasteos Ya*',
        '',
        '📋 Origen: ' + source,
        '👤 ' + (data.nombre || '-'),
        '📱 ' + (data.telefono || '-'),
        '📧 ' + (data.email || '-'),
        '🛒 ' + (data.servicio || '-'),
        '📍 ' + (data.origen || '-') + ' → ' + (data.destino || '-'),
        '📦 ' + (data.tamano || '-'),
        '📅 ' + (data.fecha || '-'),
        '💬 ' + (data.detalles || '-'),
        '',
        '⏰ ' + new Date().toLocaleString('es-CO'),
        '🌐 https://trasteosya.online'
      ];
      const text = encodeURIComponent(lines.join('\n'));
      const url = 'https://api.callmebot.com/whatsapp.php' +
                  '?phone=' + CONFIG.CALLMEBOT_PHONE +
                  '&text=' + text +
                  '&apikey=' + CONFIG.CALLMEBOT_APIKEY;
      await fetch(url, { method: 'GET', mode: 'no-cors' });
    } catch (e) { /* silent */ }
  }

  /* ---------- Backup en Google Drive · Sheet "Cotizaciones 2026" ---------- */
  async function postBackup(data, source) {
    if (!CONFIG.BACKUP_URL) return;
    try {
      // Combinar notas con info adicional del form
      const notasArr = [];
      if (data.tamano)   notasArr.push('Tamaño: ' + data.tamano);
      if (data.fecha)    notasArr.push('Fecha: ' + data.fecha);
      if (data.detalles) notasArr.push(data.detalles);
      if (data.perfil)   notasArr.push('Perfil: ' + data.perfil);

      const payload = {
        type:     'cotizacion',
        apikey:   CONFIG.BACKUP_APIKEY,
        cliente:  data.nombre || '',
        email:    data.email || '',
        telefono: data.telefono || '',
        servicio: data.servicio || '',
        origen:   data.origen || '',
        destino:  data.destino || '',
        notas:    notasArr.join(' · '),
        fuente:   source || 'web',
        asesor:   'Sitio web',
        // Los siguientes campos solo los llena el cotizador interactivo
        ingreso: 0, cto_total: 0, utilidad: 0, uti: 0
      };
      await fetch(CONFIG.BACKUP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
    } catch (e) { /* silent */ }
  }

  /* ---------- Sheets webhook (opcional · legacy) ---------- */
  async function postSheets(data, source) {
    if (!CONFIG.SHEETS_WEBHOOK) return Promise.resolve();
    try {
      await fetch(CONFIG.SHEETS_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, data, {
          source: source,
          timestamp: new Date().toISOString()
        }))
      });
    } catch (e) { /* silent */ }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(form, true);

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const source = form.dataset.source || 'web';

    // Web3Forms config
    if (!fd.get('access_key') || fd.get('access_key') === 'REEMPLAZAR_CON_TU_ACCESS_KEY') {
      fd.set('access_key', CONFIG.WEB3FORMS_KEY);
    }
    fd.set('_source', source);
    fd.set('subject', '🔔 Nueva cotización · ' + source + ' · ' + (data.nombre || 'cliente'));
    fd.set('from_name', 'Sitio web Trasteos Ya');

    // Auto-respuesta al cliente (Web3Forms la envia al email del cliente)
    if (data.email) {
      fd.set('_replyto', data.email);
      fd.set('_autoresponse', CONFIG.CLIENT_AUTOREPLY_BODY);
      fd.set('_autoresponse_subject', CONFIG.CLIENT_AUTOREPLY_SUBJECT);
    }

    // Dispara Telegram + WhatsApp + Backup + Sheets en paralelo (no bloqueante)
    postTelegram(data, source);
    postWhatsApp(data, source);
    postBackup(data, source);
    postSheets(data, source);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: fd
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.success) throw new Error(res.message || 'Error al enviar');

        // Abre WhatsApp pre-llenado al operador (cliente da 1 tap para enviar)
        if (CONFIG.OPEN_WA_AFTER_SUBMIT) {
          window.open(buildWaUrl(data), '_blank', 'noopener,noreferrer');
        }
        window.location.href = CONFIG.THANK_YOU_URL + '?source=' + encodeURIComponent(source);
      })
      .catch(function (err) {
        setLoading(form, false);
        showError(form, 'Hubo un problema al enviar. Intenta de nuevo o contáctanos por WhatsApp al 314 309 5194.');
        console.error(err);
      });
  }

  function init() {
    document.querySelectorAll('form.ty-form').forEach(function (form) {
      if (!form.querySelector('[name="access_key"]')) {
        const k = document.createElement('input');
        k.type = 'hidden';
        k.name = 'access_key';
        k.value = CONFIG.WEB3FORMS_KEY;
        form.appendChild(k);
      }
      if (!form.querySelector('[name="botcheck"]')) {
        const hp = document.createElement('input');
        hp.type = 'checkbox';
        hp.name = 'botcheck';
        hp.style.cssText = 'position:absolute;left:-9999px;';
        hp.setAttribute('tabindex', '-1');
        hp.setAttribute('autocomplete', 'off');
        form.appendChild(hp);
      }
      form.addEventListener('submit', handleSubmit);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TY_Forms = { config: CONFIG };
})();
