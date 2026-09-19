/* ============================================================
   TENANT — Multi-marca para el ERP de mudanzas
   ============================================================
   Detecta ?marca=XXXX en la URL (o localStorage) y configura
   window.TENANT con nombre, colores, logo, APIs y notificaciones.

   - "ty"   = Trasteos Ya (produccion, default)
   - "demo" = Demo CRM Mudanzas (marca blanca para vender)

   Para agregar un nuevo cliente: copiar el bloque "demo" con su
   propia config y listo.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var marca = params.get('marca');
  var isDemoPortal = window.location.pathname.indexOf('demo-crm') !== -1;

  // Si viene en URL, guardar en sessionStorage (dura solo la pestaña)
  if (marca) {
    try { sessionStorage.setItem('ty_marca', marca); } catch (e) {}
    try { localStorage.removeItem('ty_marca'); } catch (e) {}
  } else if (isDemoPortal) {
    marca = 'demo';
    try { sessionStorage.setItem('ty_marca', 'demo'); } catch (e) {}
  } else {
    try { marca = sessionStorage.getItem('ty_marca'); } catch (e) {}
  }

  if (!marca) marca = 'ty';

  // ─── TENANTS ──────────────────────────────────────────────
  var TENANTS = {

    ty: {
      id: 'ty',
      nombre: 'Trasteos Ya',
      tagline: 'Tu mudanza, nuestra prioridad',
      logo: 'assets/img/logo.png',
      domain: 'trasteosya.online',
      whatsapp: '573143095194',
      telefono: '314 309 5194',
      colors: {
        brand:      '#003DA5',
        brand2:     '#E30613',
        brandLight: '#e8edfb',
        headerBorder: '#003DA5'
      },
      pin: 'QEFuZHJlczI0MDUq',          // access-gate PIN (base64)
      notify: {
        // TG_TOKEN y CMB_KEY viven en el servidor (Apps Script, Propiedades del script)
        TG_CHAT:   '1081707115',
        CMB_PHONE: '573143095194',
        W3F_KEY:   '4955ca45-48c4-4ef2-9c0b-da17741a1d2c',
        EMAIL_TO:  'aaparicio.trasteosyabackup1@gmail.com'
      },
      apis: {
        CONTACTS_URL:  'https://script.google.com/macros/s/AKfycbz4gG8fs_mAq9z9dcIhhqB9GUOFehc4_jW0Wd77RxPMIEmmshcXHlAVb39cML6hdGKM/exec',
        BACKUP_URL:    'https://script.google.com/macros/s/AKfycbytFjQC4osp6QNdCyALI5DGLCMtomQ_DYGqa56MQkGJoykyZcJIPiA1JVyrJ2Smj3ST-w/exec',
        COT_SHEET_URL: 'https://script.google.com/macros/s/AKfycbyjGtM-cK7N2sPmKjGowZ2an5dabCTMU_Ah2vHb8YFSqTM0K9L-CRewXpF1ApNxRdxL/exec',
        BACKUP_APIKEY: 'TrasteosYa-2026-Backup'
      },
      footerMsg: 'Gracias por confiar en Trasteos Ya',
      isDemo: false
    },

    demo: {
      id: 'demo',
      nombre: 'CRM Mudanzas',
      tagline: 'Sistema inteligente para empresas de mudanzas',
      logo: null,  // se genera SVG dinamico
      domain: 'crmmudanzas.com',
      whatsapp: '57300XXXXXXX',
      telefono: '300 XXX XXXX',
      colors: {
        brand:      '#0D7377',
        brand2:     '#EA580C',
        brandLight: '#E0F2F1',
        headerBorder: '#0D7377'
      },
      pin: 'MDAwMA==',                    // "0000"
      notify: null,                       // desactivado en demo
      apis: null,                         // desactivado en demo
      footerMsg: 'Gracias por confiar en nosotros',
      isDemo: true
    }

  };

  window.TENANT = TENANTS[marca] || TENANTS.ty;
  window.TENANT._allTenants = TENANTS;

  // Logo SVG para el demo (camion generico profesional)
  if (window.TENANT.isDemo && !window.TENANT.logo) {
    window.TENANT.logo = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none">' +
      '<rect width="200" height="60" rx="8" fill="#0D7377"/>' +
      '<path d="M20 38V22h18l8 8v8H20z" fill="#fff" opacity=".9"/>' +
      '<rect x="46" y="28" width="6" height="10" rx="1" fill="#fff" opacity=".7"/>' +
      '<circle cx="26" cy="40" r="4" fill="#EA580C"/>' +
      '<circle cx="40" cy="40" r="4" fill="#EA580C"/>' +
      '<circle cx="26" cy="40" r="1.5" fill="#fff"/>' +
      '<circle cx="40" cy="40" r="1.5" fill="#fff"/>' +
      '<text x="62" y="32" font-family="system-ui,sans-serif" font-weight="700" font-size="14" fill="#fff">CRM</text>' +
      '<text x="62" y="46" font-family="system-ui,sans-serif" font-weight="500" font-size="10" fill="#fff" opacity=".8">Mudanzas</text>' +
      '</svg>'
    );
  }

})();
