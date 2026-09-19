/**
 * VAPI Webhook — Trasteos Ya (MarIAna IA)
 *
 * FLUJO DE VENTA POR LLAMADA:
 *   buscar_cliente → cotizar_mudanza (varias veces, va armando) → registrar_cotizacion → confirmar_servicio
 *   (+ escalar_a_asesor)
 *
 * REUTILIZA LO QUE YA EXISTE (no duplica tarifas ni reglas):
 *   - Tarifas: js/cotizador-core.js + lo que se guarde en tarifas.html (pestaña TARIFAS)
 *   - Cotización: COT_SHEET_URL type 'cotizacion' → hoja Cotizaciones
 *   - Vendido: COT_SHEET_URL type 'update_estado' (lo mismo que hace finanzas.html)
 *   - Orden de Servicio: BACKUP_URL type 'orden' → hoja Ordenes, número OSTY igual que orden-servicio.html
 *   - Cuenta de Cobro: finanzas.html, solo si el cliente la pidió
 *
 * SOBRE LA HOJA COTIZACIONES:
 *   Su script no tiene borrado, así que la cotización se arma en la pestaña "MarIAna"
 *   y se escribe UNA SOLA FILA en Cotizaciones cuando la cotización queda cerrada.
 *   Lo único que se escribe directo en esa hoja es el nombre del asesor (MarIAna)
 *   en la fila que acabamos de crear, porque el script ignora ese campo.
 *
 * SOLO COTIZA URBANO. Nacional (expreso o compartido) tiene valores abiertos → asesor humano.
 *
 * Desplegar: Implementar → Gestionar implementaciones → editar → Nueva versión (misma URL)
 *   Execute as: Me · Who has access: Anyone
 * Cuenta: aaparicio.trasteosyabackup1@gmail.com
 */

// ── Configuración ──
// Secretos en Propiedades del script (Configuración del proyecto): TG_TOKEN, TG_CHAT, CMB_PHONE, CMB_KEY
var TG_TOKEN  = PropertiesService.getScriptProperties().getProperty('TG_TOKEN');
var TG_CHAT   = PropertiesService.getScriptProperties().getProperty('TG_CHAT');
var CMB_PHONE = PropertiesService.getScriptProperties().getProperty('CMB_PHONE');
var CMB_KEY   = PropertiesService.getScriptProperties().getProperty('CMB_KEY');
var FABIAN_PHONE = '573165206865';

var COT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyjGtM-cK7N2sPmKjGowZ2an5dabCTMU_Ah2vHb8YFSqTM0K9L-CRewXpF1ApNxRdxL/exec';
var BACKUP_URL    = 'https://script.google.com/macros/s/AKfycbytFjQC4osp6QNdCyALI5DGLCMtomQ_DYGqa56MQkGJoykyZcJIPiA1JVyrJ2Smj3ST-w/exec';
var CONTACTS_URL  = 'https://script.google.com/macros/s/AKfycbz4gG8fs_mAq9z9dcIhhqB9GUOFehc4_jW0Wd77RxPMIEmmshcXHlAVb39cML6hdGKM/exec';
var BACKUP_APIKEY = 'TrasteosYa-2026-Backup';

var CORE_URL           = 'https://trasteosya.online/js/cotizador-core.js';
var COT_SPREADSHEET_ID = '13FbV3MKhv9VNSU3-pmraexJdyphmVHw5189ibnYI5-Q';
var COTIZACIONES_NAME  = 'Cotizaciones';
var LEDGER_NAME        = 'MarIAna';
var TARIFAS_NAME       = 'TARIFAS';
var OS_URL             = 'https://trasteosya.online/orden-servicio.html';
var TZ                 = 'America/Bogota';
var FUENTE             = 'MarIAna IA';
var ASESOR             = 'MarIAna';

var LEDGER_HEADERS = [
  'CallId', 'Creado', 'Actualizado', 'Canal', 'Cliente', 'Telefono', 'Estado',
  'IdCotizacion', 'FechaCotizacion', 'Tamano', 'Origen', 'Destino', 'Empaque', 'Total', 'Costo', 'Utilidad',
  'EnSheet', 'FechaServicio', 'HoraServicio', 'DirOrigen', 'DirDestino', 'Documento', 'Email',
  'NumeroOS', 'CuentaCobro', 'Detalle'
];
var LEDGER_TEXT = ['Telefono', 'IdCotizacion', 'FechaCotizacion', 'FechaServicio', 'HoraServicio', 'Documento', 'NumeroOS', 'CuentaCobro'];

var TOOLS = {
  buscar_cliente:       buscarCliente,
  cotizar_mudanza:      cotizarMudanza,
  registrar_cotizacion: registrarCotizacionTool,
  confirmar_servicio:   confirmarServicio,
  escalar_a_asesor:     escalarDesdeLlamada
};

// ── Entry points ──
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (body.message) {
      var m = body.message;
      if (m.toolCallList || m.toolCalls) return json(vapiToolCalls(m));
      if (m.type === 'end-of-call-report' || (m.type === 'status-update' && m.status === 'ended')) {
        return json(cerrarLlamada((m.call && m.call.id) || ''));
      }
      return json({ ok: true });
    }

    var action = body.action || '';
    var data   = body.data || body;
    var ctx    = { callId: data.callId || data.call_id || '', telefono: '', canal: 'api' };

    if (action === 'guardar_tarifas') {
      return json(body.apikey === BACKUP_APIKEY ? guardarTarifas(body.tarifas) : { ok: false, error: 'Unauthorized' });
    }
    if (action === 'vincular_cdc') {
      return json(body.apikey === BACKUP_APIKEY ? vincularCdc(body) : { ok: false, error: 'Unauthorized' });
    }
    if (TOOLS[action]) return json(runTool(action, data, ctx));
    if (data.nombre && data.motivo) return json(escalarAAsesor(data));
    return json({ ok: false, error: 'Acción no reconocida' });

  } catch (err) {
    return json({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.action) return json({ ok: true, service: 'Trasteos Ya - MarIAna IA Webhook' });
  if (p.apikey !== BACKUP_APIKEY) return json({ ok: false, error: 'Unauthorized' });

  // tarifas.html y los cotizadores
  if (p.action === 'tarifas') {
    var t = tarifasGuardadas();
    return json({ ok: true, tarifas: t.tarifas, actualizado: t.actualizado });
  }

  // finanzas.html: servicios donde el cliente PIDIÓ cuenta de cobro
  if (p.action === 'pendientes_cdc') {
    var pend = ledgerRows().filter(function (r) {
      return r.Estado === 'VENDIDO' && r.CuentaCobro === 'SOLICITADA';
    }).map(function (r) {
      return { callId: r.CallId, cliente: r.Cliente, fecha: r.FechaCotizacion, documento: r.Documento,
               total: Number(r.Total) || 0, origen: r.Origen, destino: r.Destino, numeroOS: r.NumeroOS };
    });
    return json({ ok: true, pendientes: pend });
  }

  // orden-servicio.html?mariana=ID
  if (p.action === 'llamada') {
    var r = ledgerFind(function (x) { return x.CallId === p.id; });
    if (!r) return json({ ok: false, error: 'No encontrada' });
    var out = {};
    LEDGER_HEADERS.forEach(function (h) { if (h !== 'Detalle') out[h] = r[h]; });
    var det = parseDetalle(r);
    out.empaque = det.empaque || {};
    out.vehiculo = det.vehiculo || '';
    out.operarios = det.operarios || 0;
    out.ciudadOrigenOS = ciudadOS(r.Origen);
    out.ciudadDestinoOS = ciudadOS(r.Destino);
    return json({ ok: true, llamada: out });
  }

  return json({ ok: false, error: 'action' });
}

// ── Vapi ──
function vapiToolCalls(msg) {
  var call = msg.call || {};
  var ctx = { callId: call.id || '', telefono: (call.customer && call.customer.number) || '', canal: call.type || '' };
  var list = msg.toolCallList || msg.toolCalls || [];
  var results = list.map(function (tc) {
    var fnc = tc['function'] || {};
    var args = fnc.arguments || tc.arguments || {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }
    return { toolCallId: tc.id, result: JSON.stringify(runTool(fnc.name || tc.name, args, ctx)) };
  });
  return { results: results };
}

function runTool(name, args, ctx) {
  var fn = TOOLS[name];
  if (!fn) return { ok: false, error: 'Herramienta desconocida: ' + name };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return fn(args || {}, ctx);
  } catch (err) {
    sendTelegram('ERROR MarIAna IA (' + name + ')\n' + err + '\nLlamada: ' + (ctx.callId || '-'));
    return { ok: false, error: 'No se pudo completar. Ofrezca comunicarlo con un asesor.' };
  } finally {
    lock.releaseLock();
  }
}

// ── 1. Buscar cliente ──
function buscarCliente(a, ctx) {
  var tel = normTel(a.telefono || ctx.telefono);
  if (!tel) return { encontrado: false, pedir_telefono: true };

  var previo = ledgerFind(function (r) { return normTel(r.Telefono) === tel; });
  if (previo) {
    return { encontrado: true, nombre: previo.Cliente, telefono: tel,
      ultimo_servicio: { fecha: previo.FechaCotizacion, total: Number(previo.Total) || 0, estado: previo.Estado,
                         tamano: previo.Tamano, origen: previo.Origen, destino: previo.Destino } };
  }
  try {
    var d = JSON.parse(UrlFetchApp.fetch(CONTACTS_URL, { muteHttpExceptions: true }).getContentText());
    var c = (d.contacts || []).filter(function (x) { return normTel(x.p) === tel; })[0];
    if (c && c.n) return { encontrado: true, nombre: String(c.n).trim(), telefono: tel, cliente_anterior: true };
  } catch (e) {}
  return { encontrado: false, telefono: tel };
}

// ── 2. Cotizar (se llama varias veces; solo escribe en la pestaña MarIAna) ──
function cotizarMudanza(a, ctx) {
  var core = loadCore();
  var q = core.cotizarInterno(a);

  if (q.nacional) return { ok: false, nacional: true,
    indicacion: 'El trasteo nacional (expreso o compartido) lo cotiza un asesor. Use escalar_a_asesor con tipo nacional.' };
  if (q.fueraCobertura) return { ok: false, fuera_cobertura: true,
    indicacion: 'Ciudad fuera de cobertura urbana. Use escalar_a_asesor con tipo nacional.' };
  if (q.requiereVisita) return { ok: false, requiere_visita: true, motivo: q.motivo,
    indicacion: 'Eso se cotiza con visita. Use escalar_a_asesor con tipo general.' };

  var nombre = String(a.nombre || '').trim();
  var tel = normTel(a.telefono || ctx.telefono);
  var rec = recLlamada(ctx, tel);
  if (rec.Estado === 'VENDIDO') {
    return { ok: false, ya_confirmado: true, numero_os: rec.NumeroOS,
             indicacion: 'Este servicio ya está confirmado. Para cambios use escalar_a_asesor.' };
  }

  if (nombre) rec.Cliente = nombre.toUpperCase();
  if (tel) rec.Telefono = tel;
  rec.Canal = ctx.canal || rec.Canal || '';
  rec.Estado = rec.Estado || 'EN COTIZACION';
  rec.FechaCotizacion = rec.FechaCotizacion || hoy();
  rec.Tamano = q.tamano ? core.TRASTEO[q.tamano].l : '';
  rec.Origen = q.origen; rec.Destino = q.destino;
  rec.Empaque = (a.empaque && a.empaque.tipo) || 'ninguno';
  rec.Total = q.total; rec.Costo = q.costo; rec.Utilidad = q.utilidad;
  rec.Detalle = JSON.stringify({ input: a, lines: q.lines, empaque: empaqueOS(q.lines),
    vehiculo: q.vehiculo, operarios: q.operarios });
  ledgerSave(rec);

  var faltan = q.faltan.slice();
  if (!rec.Cliente) faltan.push('nombre');
  if (!rec.Telefono) faltan.push('telefono');

  var nombres = { trasteo: 'Trasteo', empaque: 'Empaque', inst: 'Instalaciones', desempaque: 'Desempaque', adicionales: 'Otros servicios', bodegaje: 'Bodegaje' };
  var grupos = {};
  q.lines.forEach(function (l) { if (l.v > 0) { var k = nombres[l.cat] || 'Otros servicios'; grupos[k] = (grupos[k] || 0) + l.v; } });

  return {
    ok: faltan.length === 0,
    faltan: faltan,
    total: q.total,
    total_texto: cop(q.total),
    incluye: Object.keys(grupos).map(function (k) { return { concepto: k, valor: grupos[k] }; }),
    detalle: q.lines.filter(function (l) { return !l.noV; }).map(function (l) { return l.l; }),
    valores_estimados: q.lines.some(function (l) { return l.est; }),
    indicacion: faltan.length ? 'Siga preguntando lo que aparece en faltan. No diga el precio todavía.'
                              : 'Puede decir el total y preguntar si desea separar la fecha.'
  };
}

// ── 3. Registrar la cotización en el Sheet (una sola vez por llamada) ──
function registrarCotizacionTool(a, ctx) {
  var rec = recLlamada(ctx, normTel(a.telefono || ctx.telefono), true);
  if (!rec) return { ok: false, indicacion: 'Primero cotice con cotizar_mudanza.' };
  var r = registrarEnSheet(rec);
  return r.ok ? { ok: true, id_cotizacion: rec.IdCotizacion, ya_registrada: r.ya, total: Number(rec.Total) || 0,
                  indicacion: 'La cotización queda guardada. Despídase con amabilidad.' }
              : { ok: false, error: r.error };
}

function registrarEnSheet(rec) {
  if (rec.EnSheet) return { ok: true, ya: true };
  if (!rec.Cliente || !Number(rec.Total)) return { ok: false, error: 'Cotización incompleta' };

  var lines = parseDetalle(rec).lines || [];
  var idCot = rec.IdCotizacion || ('MIA-' + Utilities.formatDate(new Date(), TZ, 'yyMMdd-HHmmss'));
  var meta = {
    cliente: rec.Cliente, telefono: rec.Telefono, fecha: rec.FechaCotizacion, hora: ahora(),
    // SERVICIO = el servicio cotizado; MarIAna es el ASESOR, no el canal
    tipo: rec.Tamano ? ('Trasteo Urbano ' + rec.Tamano) : 'Mudanza',
    estado: 'COTIZADO', fuente: FUENTE, asesor: ASESOR, doc: idCot,
    origen: rec.Origen, destino: rec.Destino,
    total: Number(rec.Total) || 0, subtotal: Number(rec.Total) || 0, descuento: 0,
    costo: Number(rec.Costo) || 0, utilidad: Number(rec.Utilidad) || 0,
    items: lines.map(function (l) { return { cat: l.cat, l: l.l, v: l.v, c: l.c || 0, qty: l.qty, cu: l.cu || 0, vu: l.vu || 0, noV: !!l.noV }; })
  };
  var resp = postJson(COT_SHEET_URL, { type: 'cotizacion', apikey: BACKUP_APIKEY, meta: meta });
  if (resp.code >= 400 || (resp.body && resp.body.ok === false)) return { ok: false, error: resp.text.substring(0, 200) };

  rec.IdCotizacion = idCot;
  rec.EnSheet = hoy() + ' ' + ahora();
  if (rec.Estado === 'EN COTIZACION') rec.Estado = 'COTIZADO';
  ledgerSave(rec);

  escribirAsesor(rec);   // el script del Sheet ignora el campo asesor: se escribe la celda

  sendTelegram('--- COTIZACIÓN (MarIAna IA) ---\n\n' +
    'Cliente: ' + rec.Cliente + '\nTel: ' + rec.Telefono + '\n' +
    (rec.Tamano || '') + ' · ' + rec.Origen + ' -> ' + rec.Destino + '\n' +
    'Empaque: ' + rec.Empaque + '\nTotal: ' + cop(rec.Total) + ' · Utilidad: ' + cop(rec.Utilidad) + '\nId: ' + idCot);
  return { ok: true, ya: false };
}

// Escribe "MarIAna" en la columna ASESOR de la fila recién creada
function escribirAsesor(rec) {
  try {
    var sh = cotizacionesSheet();
    if (!sh) return false;
    var values = sh.getDataRange().getValues();
    var head = values[0].map(function (h) { return String(h).trim().toUpperCase(); });
    var iAsesor = head.indexOf('ASESOR'), iCli = head.indexOf('CLIENTE'), iFecha = head.indexOf('FECHA');
    if (iAsesor < 0 || iCli < 0) return false;
    for (var i = values.length - 1; i > 0; i--) {
      if (String(values[i][iCli]).trim().toUpperCase() !== rec.Cliente) continue;
      if (iFecha >= 0 && fechaTexto(values[i][iFecha]) !== rec.FechaCotizacion) continue;
      if (String(values[i][iAsesor]).trim()) return true;
      sh.getRange(i + 1, iAsesor + 1).setValue(ASESOR);
      return true;
    }
  } catch (e) { sendTelegram('MarIAna: no se pudo escribir el asesor. ' + e); }
  return false;
}

// Si la llamada terminó y la cotización nunca se registró, se registra sola
function cerrarLlamada(callId) {
  if (!callId) return { ok: true };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var rec = ledgerFind(function (r) { return r.CallId === callId; });
    if (!rec || rec.EnSheet || !Number(rec.Total)) return { ok: true };
    registrarEnSheet(rec);
    return { ok: true, registrada: true };
  } catch (e) {
    return { ok: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ── 4. Cliente acepta → VENDIDO + Orden de Servicio ──
function confirmarServicio(a, ctx) {
  var rec = recLlamada(ctx, normTel(a.telefono || ctx.telefono), true);
  if (!rec) return { ok: false, indicacion: 'Primero cotice con cotizar_mudanza.' };
  if (rec.NumeroOS) {
    return { ok: true, ya_registrado: true, numero_os: rec.NumeroOS, fecha_servicio: rec.FechaServicio,
             hora_cargue: rec.HoraServicio, total: Number(rec.Total) || 0, total_texto: cop(rec.Total) };
  }

  var fechaServ = String(a.fecha_servicio || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaServ)) return { ok: false, faltan: ['fecha_servicio (AAAA-MM-DD)'] };
  if (fechaServ < hoy()) return { ok: false, indicacion: 'Esa fecha ya pasó. Pida otra fecha.' };
  var faltan = [];
  if (!a.direccion_origen) faltan.push('direccion_origen');
  if (!a.direccion_destino) faltan.push('direccion_destino');
  if (faltan.length) return { ok: false, faltan: faltan };
  var hora = /^\d{1,2}:\d{2}$/.test(a.hora_cargue || '') ? ('0' + a.hora_cargue).slice(-5) : '08:00';

  var reg = registrarEnSheet(rec);
  if (!reg.ok) return { ok: false, error: reg.error };

  postJson(COT_SHEET_URL, { type: 'update_estado', apikey: BACKUP_APIKEY,
    meta: { cliente: rec.Cliente, fecha: rec.FechaCotizacion, estado: 'VENDIDO', year: String(rec.FechaCotizacion).substring(0, 4) } });

  var det = parseDetalle(rec);
  var mat = det.empaque || {};
  var numeroOS = genOS(fechaServ, rec.Cliente);
  var resp = postJson(BACKUP_URL, { type: 'orden', apikey: BACKUP_APIKEY, meta: {
    numeroOS: numeroOS, cliente: rec.Cliente, telefono: rec.Telefono, fecha: hoy(),
    cargueFecha: fechaServ, cargueHora: hora,
    conductor: '', placa: '', tipoVehiculo: det.vehiculo || '', numOperarios: det.operarios || 0,
    ciudadOrigen: ciudadOS(rec.Origen), ciudadDestino: ciudadOS(rec.Destino),
    dirOrigen: a.direccion_origen, dirDestino: a.direccion_destino,
    empaque: { craft: mat.craft || 0, vinipel: mat.vinipel || 0, burbuja: mat.burbuja || 0, cajas: mat.cajas || 0 },
    empacadores: 0, valor: Number(rec.Total) || 0, costo: Number(rec.Costo) || 0
  } });
  if (!resp.body || resp.body.success !== true) throw new Error('No se pudo crear la OS: ' + resp.text.substring(0, 200));

  rec.Estado = 'VENDIDO';
  rec.FechaServicio = fechaServ;
  rec.HoraServicio = hora;
  rec.DirOrigen = a.direccion_origen;
  rec.DirDestino = a.direccion_destino;
  rec.Documento = a.documento || '';
  rec.Email = a.email || '';
  rec.NumeroOS = numeroOS;
  rec.CuentaCobro = a.cuenta_cobro ? 'SOLICITADA' : 'NO SOLICITADA';
  ledgerSave(rec);

  var aviso = '--- SERVICIO CONFIRMADO (MarIAna IA) ---\n\n' +
              'Cliente: ' + rec.Cliente + '\nTel: ' + rec.Telefono + '\n' +
              'OS: ' + numeroOS + '\nFecha: ' + fechaServ + ' ' + hora + '\n' +
              'De: ' + rec.Origen + ' - ' + a.direccion_origen + '\n' +
              'A: ' + rec.Destino + ' - ' + a.direccion_destino + '\n' +
              'Total: ' + cop(rec.Total) + ' · Utilidad: ' + cop(rec.Utilidad) + '\n' +
              (a.cuenta_cobro ? 'CUENTA DE COBRO: la pidió el cliente\n' : '') + '\n' +
              'Completar OS (conductor, placa, operarios):\n' + OS_URL + '?mariana=' + encodeURIComponent(rec.CallId);
  sendTelegram(aviso);
  sendWhatsApp(aviso);

  return { ok: true, numero_os: numeroOS, fecha_servicio: fechaServ, hora_cargue: hora,
           total: Number(rec.Total) || 0, total_texto: cop(rec.Total),
           indicacion: 'Confirme la fecha y diga que un asesor le escribirá por WhatsApp para el anticipo y los detalles.' };
}

// ── 5. finanzas.html informa el número de Cuenta de Cobro ──
function vincularCdc(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var rec = ledgerFind(function (r) { return r.CallId === b.callId; });
    if (!rec) return { ok: false, error: 'Llamada no encontrada' };
    if (String(rec.CuentaCobro).indexOf('CTY') === 0) return { ok: true, numero: rec.CuentaCobro, ya_vinculada: true };
    rec.CuentaCobro = String(b.numero || '');
    ledgerSave(rec);
    return { ok: true, numero: rec.CuentaCobro };
  } finally {
    lock.releaseLock();
  }
}

// ── 6. Escalar a asesor ──
function escalarDesdeLlamada(a, ctx) {
  var d = {};
  Object.keys(a).forEach(function (k) { d[k] = a[k]; });
  d.telefono = d.telefono || normTel(ctx.telefono) || '';
  if (ctx.callId) d.resumen = (d.resumen ? d.resumen + '\n' : '') + 'Llamada: ' + ctx.callId;
  return escalarAAsesor(d);
}

function escalarAAsesor(d) {
  var nombre   = d.nombre   || 'No indicado';
  var telefono = d.telefono || 'No indicado';
  var tipo     = d.tipo     || 'general';
  var motivo   = d.motivo   || 'Cliente solicita asesor humano';
  var resumen  = d.resumen  || '';
  var etiqueta = tipo === 'seguro' ? 'SEGURO' : (tipo === 'nacional' ? 'NACIONAL' : 'ESCALAMIENTO');

  var msg = '--- ALERTA MARIANA IA ---\n' + etiqueta + '\n\n' +
            'Cliente: ' + nombre + '\nTeléfono: ' + telefono + '\n' +
            'Tipo: ' + tipo + '\nMotivo: ' + motivo + '\n';
  if (resumen) msg += '\nResumen conversación:\n' + resumen + '\n';
  msg += '\nAcción requerida: contactar al cliente';
  if (tipo === 'nacional') msg += '\n\n>> Nacional: definir expreso o compartido y cotizar a mano';
  if (tipo === 'seguro') msg += '\n\n>> Redirigir a Fabián de Asegúralo';

  sendTelegram(msg);
  sendWhatsApp(msg);
  if (tipo === 'seguro') sendWhatsAppTo(FABIAN_PHONE, msg);

  return { ok: true, message: 'Alerta enviada al equipo de Trasteos Ya. Un asesor contactará al cliente pronto.' };
}

// ── Tarifas (tarifas.html) ──
function tarifasGuardadas() {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('ty_tarifas');
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  var out = { tarifas: null, actualizado: '' };
  try {
    var ss = SpreadsheetApp.openById(COT_SPREADSHEET_ID);
    var sh = ss.getSheetByName(TARIFAS_NAME);
    if (sh && sh.getLastRow() > 1) {
      var fila = sh.getRange(sh.getLastRow(), 1, 1, 2).getValues()[0];
      out.actualizado = fila[0] instanceof Date ? Utilities.formatDate(fila[0], TZ, 'yyyy-MM-dd HH:mm') : String(fila[0]);
      out.tarifas = JSON.parse(fila[1]);
    }
  } catch (e) {}
  cache.put('ty_tarifas', JSON.stringify(out), 300);
  return out;
}

function guardarTarifas(tarifas) {
  if (!tarifas || typeof tarifas !== 'object' || !tarifas.trasteo || !tarifas.materiales) {
    return { ok: false, error: 'Tarifas incompletas' };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var ss = SpreadsheetApp.openById(COT_SPREADSHEET_ID);
    var sh = ss.getSheetByName(TARIFAS_NAME);
    if (!sh) {
      sh = ss.insertSheet(TARIFAS_NAME, ss.getSheets().length);
      sh.appendRow(['Actualizado', 'JSON']);
      sh.getRange(1, 1, 1, 2).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    var cuando = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    sh.appendRow([cuando, JSON.stringify(tarifas)]);   // queda el historial: cada guardado es una fila
    CacheService.getScriptCache().remove('ty_tarifas');
    _core = null;
    sendTelegram('--- TARIFAS ACTUALIZADAS ---\n\nDesde tarifas.html · ' + cuando +
      '\nTrasteo mediano: ' + cop(tarifas.trasteo.mediano.v) + '\nCajas: ' + cop(tarifas.materiales.cajas.v));
    return { ok: true, actualizado: cuando };
  } catch (e) {
    return { ok: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ── Cotizador compartido con las tarifas guardadas aplicadas ──
var _core = null;
function loadCore() {
  if (_core) return _core;
  var cache = CacheService.getScriptCache();
  var code = cache.get('ty_cotizador_core');
  if (!code) {
    var r = UrlFetchApp.fetch(CORE_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
    code = r.getContentText();
    if (r.getResponseCode() !== 200 || code.indexOf('TYCotizador') < 0) throw new Error('No se pudo cargar cotizador-core.js');
    cache.put('ty_cotizador_core', code, 600);
  }
  var root = {};
  new Function('globalThis', 'module', code)(root, undefined);
  _core = root.TYCotizador;
  var t = tarifasGuardadas();
  if (t.tarifas) _core.aplicar(t.tarifas);
  return _core;
}

function empaqueOS(lines) {
  var out = { craft: 0, vinipel: 0, burbuja: 0, cajas: 0 };
  lines.forEach(function (l) {
    if (l.cat !== 'empaque') return;
    var n = l.l.toLowerCase();
    if (n.indexOf('craft') >= 0) out.craft += l.qty || 0;
    else if (n.indexOf('vinipel') >= 0) out.vinipel += l.qty || 0;
    else if (n.indexOf('burbuja') >= 0) out.burbuja += l.qty || 0;
    else if (n.indexOf('caja') >= 0) out.cajas += l.qty || 0;
  });
  return out;
}

// ── Hojas ──
function cotizacionesSheet() {
  var ss = SpreadsheetApp.openById(COT_SPREADSHEET_ID);
  return ss.getSheetByName(COTIZACIONES_NAME) || ss.getSheets()[0];
}

function ledgerSheet() {
  var ss = SpreadsheetApp.openById(COT_SPREADSHEET_ID);
  var sh = ss.getSheetByName(LEDGER_NAME);
  if (!sh) {
    sh = ss.insertSheet(LEDGER_NAME, ss.getSheets().length); // al final: no altera la hoja Cotizaciones
    sh.appendRow(LEDGER_HEADERS);
    sh.getRange(1, 1, 1, LEDGER_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ledgerRows() {
  var values = ledgerSheet().getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < LEDGER_HEADERS.length; j++) {
      var v = values[i][j];
      o[LEDGER_HEADERS[j]] = v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm') : (v === null || v === undefined ? '' : v);
    }
    o.Telefono = String(o.Telefono);
    rows.push(o);
  }
  return rows;
}

function ledgerFind(pred) {
  var rows = ledgerRows();
  for (var i = rows.length - 1; i >= 0; i--) if (pred(rows[i])) return rows[i];
  return null;
}

function ledgerSave(rec) {
  var sh = ledgerSheet();
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  rec.Creado = rec.Creado || now;
  rec.Actualizado = now;
  var row = LEDGER_HEADERS.map(function (h) {
    var v = rec[h] === undefined || rec[h] === null ? '' : rec[h];
    return (LEDGER_TEXT.indexOf(h) >= 0 && v !== '') ? "'" + v : v;
  });
  if (rec._row) sh.getRange(rec._row, 1, 1, row.length).setValues([row]);
  else { sh.appendRow(row); rec._row = sh.getLastRow(); }
  return rec;
}

function recLlamada(ctx, tel, soloExistente) {
  var callKey = ctx.callId || ('SIN-ID-' + (tel || 'x') + '-' + hoy());
  var rec = ledgerFind(function (r) { return r.CallId === callKey; });
  if (!rec && tel) rec = ledgerFind(function (r) { return normTel(r.Telefono) === tel && r.FechaCotizacion === hoy() && r.Estado !== 'VENDIDO'; });
  if (!rec && !soloExistente) rec = { CallId: callKey };
  return rec || null;
}

function parseDetalle(rec) {
  try { return JSON.parse(rec.Detalle || '{}'); } catch (e) { return {}; }
}

// NO se llama sola. Solo existe por si algun dia se necesita, corriendola a mano desde el editor.
// Regla de Andres: todos los registros quedan.
function limpiarFilasPrueba() {
  try {
    var sh = cotizacionesSheet();
    var values = sh.getDataRange().getValues();
    var iCli = values[0].map(function (h) { return String(h).trim().toUpperCase(); }).indexOf('CLIENTE');
    if (iCli < 0) return 0;
    var borradas = 0;
    for (var i = values.length - 1; i > 0; i--) {
      if (String(values[i][iCli]).trim().toUpperCase().indexOf('PRUEBA MARIANA') === 0) {
        sh.deleteRow(i + 1);
        borradas++;
      }
    }
    return borradas;
  } catch (e) { return 0; }
}

// Montaje: crea las pestañas y limpia las filas de prueba. Correr una vez desde el editor.
function configurarMarIAna() {
  ledgerSheet();
  var borradas = limpiarFilasPrueba();
  Logger.log('Pestaña MarIAna lista. Filas de prueba borradas: ' + borradas);
  return borradas;
}

// ── Utilidades ──
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function postJson(url, payload) {
  var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true });
  var text = r.getContentText(), body = null;
  try { body = JSON.parse(text); } catch (e) {}
  return { code: r.getResponseCode(), body: body, text: text };
}

function hoy()   { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function ahora() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }

function fechaTexto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v || '').substring(0, 10);
}

function normTel(t) {
  var d = String(t || '').replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('57') === 0) d = d.substring(2);
  return d.length >= 7 ? d : '';
}

function cop(n) {
  return '$ ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function ciudadOS(c) {
  return String(c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

var MESES_OS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
function genOS(f, cli) {
  var p = f.split('-').map(Number);
  var base = 'OSTY' + ('0' + (p[0] % 100)).slice(-2) + MESES_OS[(p[1] || 1) - 1] + ('0' + p[2]).slice(-2);
  var nombre = String(cli || '').trim().replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, ' ').trim();
  return nombre ? base + ' ' + nombre : base;
}

// ── Telegram ──
function sendTelegram(text) {
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ chat_id: TG_CHAT, text: text }), muteHttpExceptions: true });
  } catch (e) {}
}

// ── WhatsApp CallMeBot ──
function sendWhatsApp(text) { sendWhatsAppTo(CMB_PHONE, text); }

function sendWhatsAppTo(phone, text) {
  try {
    UrlFetchApp.fetch('https://api.callmebot.com/whatsapp.php?phone=' + phone +
      '&text=' + encodeURIComponent(text) + '&apikey=' + CMB_KEY, { muteHttpExceptions: true });
  } catch (e) {}
}

// Prueba desde el editor: debe llegar un mensaje a tu Telegram y otro a tu WhatsApp.
// El resultado de Telegram queda en el Registro de ejecución (200 = enviado).
function probarNotificacion() {
  if (!TG_TOKEN || !TG_CHAT) {
    Logger.log('Faltan las propiedades TG_TOKEN / TG_CHAT en Configuración del proyecto');
    return;
  }
  var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: TG_CHAT, text: 'Prueba de notificación · MarIAna (vapi-webhook)' }) });
  Logger.log('Telegram: ' + r.getResponseCode() + ' ' + r.getContentText().substring(0, 120));
  sendWhatsApp('Prueba de notificación · MarIAna (vapi-webhook)');
}
