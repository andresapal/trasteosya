const SHEET_ID = '13FbV3MKhv9VNSU3-pmraexJdyphmVHw5189ibnYI5-Q';
const API_KEY = 'TrasteosYa-2026-Backup';
const PDF_FOLDER_ID = '1C6x_RXTn7ObA5erFrN-wRP7Wf7rEWG6T'; // Drive: PDFs de cotizaciones del cotizador web
const PDF_MAX_B64 = 4 * 1024 * 1024; // ~3 MB de PDF; la API key es pública, así que se acota lo que se sube

function _getSheet(year){
  var ss = SpreadsheetApp.openById(SHEET_ID);
  year = year || new Date().getFullYear().toString();
  var name = 'Cotizaciones ' + year;
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var legacy = ss.getSheetByName('Cotizaciones');
    if (legacy) { legacy.setName(name); sheet = legacy; }
  }
  if (!sheet) sheet = ss.getSheetByName(name) || ss.getSheets()[0];
  return sheet;
}

function _normHdr(h){return String(h).replace(/\s+/g,' ').trim().toUpperCase();}

function _findHeaderRow(sheet){
  var rng = sheet.getRange(1,1,Math.min(5,sheet.getLastRow()||1),sheet.getLastColumn()).getValues();
  for (var r=0;r<rng.length;r++)
    if (rng[r].some(function(c){return String(c).toUpperCase().indexOf('CLIENTE')>=0;})) return r+1;
  return 1;
}

function _json(obj){return ContentService.createTextOutput(JSON.stringify(obj))
  .setMimeType(ContentService.MimeType.JSON);}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.apikey !== API_KEY) return _json({ok:false,error:'auth'});
    if (data.type === 'cotizacion') return _guardarCotizacion(data);
    if (data.type === 'update_estado') return _actualizarEstado(data);
    if (data.type === 'delete_cotizacion') return _eliminarCotizacion(data);
    if (data.type === 'consecutivo') return _nuevoConsecutivo();
    if (data.type === 'cotizacion_pdf') return _guardarPdfCotizacion(data);
    if (data.type === 'notificar') return _notificar(data);
    return _json({ok:false,error:'type'});
  } catch(err) { return _json({ok:false,error:String(err)}); }
}

// Avisos al operador por Telegram / WhatsApp (CallMeBot). Las páginas ya no llevan tokens: viven en
// Propiedades del script (Configuración del proyecto): TG_TOKEN, TG_CHAT, CMB_PHONE, CMB_KEY
const NOTIFY_MAX_DIA = 300; // tope diario: la API key de esta URL es pública
function _notificar(data) {
  var text = String(data.text || '').slice(0, 3500);
  var canal = data.canal;
  if (!text || (canal !== 'tg' && canal !== 'wa')) return _json({ok:false, error:'params'});
  var props = PropertiesService.getScriptProperties();

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var key = 'NOTIF_' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyMMdd');
    var n = (parseInt(props.getProperty(key), 10) || 0) + 1;
    if (n > NOTIFY_MAX_DIA) return _json({ok:false, error:'limit'});
    props.setProperty(key, String(n));
  } finally { lock.releaseLock(); }

  if (canal === 'tg') {
    var token = props.getProperty('TG_TOKEN'), chat = props.getProperty('TG_CHAT');
    if (!token || !chat) return _json({ok:false, error:'config'});
    var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    var r = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json', muteHttpExceptions:true,
      payload: JSON.stringify({chat_id:chat, text:text, parse_mode:'Markdown'})});
    if (r.getResponseCode() === 400) // Markdown mal formado: se reenvía como texto plano
      r = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({chat_id:chat, text:text})});
    return _json({ok: r.getResponseCode() === 200});
  }
  var phone = props.getProperty('CMB_PHONE'), apikey = props.getProperty('CMB_KEY');
  if (!phone || !apikey) return _json({ok:false, error:'config'});
  var w = UrlFetchApp.fetch('https://api.callmebot.com/whatsapp.php?phone=' + phone +
    '&text=' + encodeURIComponent(text) + '&apikey=' + apikey, {muteHttpExceptions:true});
  return _json({ok: w.getResponseCode() === 200});
}

// Prueba desde el editor: debe llegar "Prueba de notificación" a tu Telegram (necesita las Propiedades del script)
function probarNotificacion() {
  Logger.log(_notificar({canal:'tg', text:'Prueba de notificación · Cotizaciones Backend'}).getContent());
}

// Ejecutar UNA vez desde el editor para autorizar el permiso de Drive (no necesita datos)
function autorizarDrive() {
  Logger.log('Carpeta OK: ' + DriveApp.getFolderById(PDF_FOLDER_ID).getName());
}

// Consecutivo interno COTYddmmyy-NNN: contador por día (hora Bogotá), con bloqueo para que no se repita
function _nuevoConsecutivo() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var dia = Utilities.formatDate(new Date(), 'America/Bogota', 'ddMMyy');
    var props = PropertiesService.getScriptProperties();
    var key = 'COTY_' + dia;
    var n = (parseInt(props.getProperty(key), 10) || 0) + 1;
    props.setProperty(key, String(n));
    return _json({ok:true, doc:'COTY' + dia + '-' + ('00' + n).slice(-3)});
  } finally { lock.releaseLock(); }
}

// Guarda el PDF de la cotización en la carpeta de Drive y devuelve un enlace de solo lectura
function _guardarPdfCotizacion(data) {
  var b64 = String(data.pdf_base64 || '');
  if (!b64 || b64.length > PDF_MAX_B64) return _json({ok:false, error:'pdf size'});
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length < 5 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF')
    return _json({ok:false, error:'pdf format'});
  var name = String(data.filename || (data.meta && data.meta.doc) || 'cotizacion').replace(/[^\w .\-]/g, '_').slice(0, 120);
  if (!/\.pdf$/i.test(name)) name += '.pdf';
  var file = DriveApp.getFolderById(PDF_FOLDER_ID).createFile(Utilities.newBlob(bytes, 'application/pdf', name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return _json({ok:true, id:file.getId(), url:'https://drive.google.com/file/d/' + file.getId() + '/view'});
}

function _eliminarCotizacion(data) {
  if (!data.meta) return _json({ok:false, error:'no meta'});
  var ss = SpreadsheetApp.openById('13FbV3MKhv9VNSU3-pmraexJdyphmVHw5189ibnYI5-Q');
  var ws = ss.getSheetByName('Cotizaciones') || ss.getSheets()[0];
  var rows = ws.getDataRange().getValues();
  var deleted = 0;
  for (var r = rows.length - 1; r >= 1; r--) {
    var rowCliente = String(rows[r][0] || '').trim().toUpperCase();
    var rowFecha = String(rows[r][1] || '').substring(0, 10);
    if (rowCliente === String(data.meta.cliente || '').trim().toUpperCase() &&
        rowFecha === String(data.meta.fecha || '').substring(0, 10)) {
      ws.deleteRow(r + 1);
      deleted++;
    }
  }
  return _json({ok:true, deleted:deleted});
}

function _guardarCotizacion(data) {
  const m = data.meta || {};
  const f = m.fecha || Utilities.formatDate(new Date(),'America/Bogota','yyyy-MM-dd');
  const year = f.substring(0,4);
  const sheet = _getSheet(year);
  const hdrRow = _findHeaderRow(sheet);
  const headers = sheet.getRange(hdrRow,1,1,sheet.getLastColumn()).getValues()[0].map(_normHdr);
  const vals = _buildValues(data);

  var clienteName = String(m.cliente||'').toUpperCase().trim();
  if (clienteName) {
    var cCol = headers.indexOf('CLIENTE');
    var eCol = headers.indexOf('ESTADO');
    if (cCol >= 0 && eCol >= 0) {
      var rows = sheet.getDataRange().getValues();
      for (var i = rows.length - 1; i > hdrRow - 1; i--) {
        var rc = String(rows[i][cCol]||'').toUpperCase().trim();
        var re = String(rows[i][eCol]||'').toUpperCase().trim();
        if (rc === clienteName && (re === 'COTIZADO' || re === '' || re === 'COT' || re === 'PENDING')) {
          var row = headers.map(function(h){return vals[h]!==undefined?vals[h]:'';});
          sheet.getRange(i+1,1,1,row.length).setValues([row]);
          return _json({ok:true,updated:true,cliente:clienteName});
        }
      }
    }
  }

  var row = headers.map(function(h){return vals[h]!==undefined?vals[h]:'';});
  sheet.appendRow(row);
  return _json({ok:true,cliente:clienteName});
}

function _actualizarEstado(data) {
  const m = data.meta || data;
  const year = m.year || new Date().getFullYear().toString();
  const sheet = _getSheet(year);
  const hdrRow = _findHeaderRow(sheet);
  var eCol = 1;
  var rows = sheet.getDataRange().getValues();
  var headers = rows[hdrRow-1].map(_normHdr);
  var estadoIdx = headers.indexOf('ESTADO');
  if (estadoIdx >= 0) eCol = estadoIdx;

  var targetCliente = String(m.cliente||'').toUpperCase().trim();
  var targetFecha = String(m.fecha||'').substring(0,10);
  var cCol = headers.indexOf('CLIENTE');

  for (var i = rows.length - 1; i >= hdrRow; i--) {
    var rc = String(rows[i][cCol]||'').toUpperCase().trim();
    var rawF = rows[i][headers.indexOf('FECHA')]||'';
    var rf = (rawF && typeof rawF.getTime==='function') ? Utilities.formatDate(rawF,'America/Bogota','yyyy-MM-dd') : String(rawF).substring(0,10);
    if (rc === targetCliente && (!targetFecha || rf === targetFecha)) {
      sheet.getRange(i+1, eCol+1).setValue(m.estado || 'VENDIDO');
      return _json({ok:true});
    }
  }
  return _json({ok:false,error:'not found'});
}

function doGet(e) {
  try {
    if ((e.parameter.apikey||'') !== API_KEY) return _json({ok:false,error:'auth'});
    if ((e.parameter.action||'') !== 'cotizaciones') return _json({ok:false,error:'action'});
    var year = e.parameter.year || new Date().getFullYear().toString();
    const sheet = _getSheet(year);
    const lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
    const hdrRow = _findHeaderRow(sheet);
    if (lastRow <= hdrRow) return _json({ok:true,cotizaciones:[]});
    const headers = sheet.getRange(hdrRow,1,1,lastCol).getValues()[0].map(_normHdr);
    const rows = sheet.getRange(hdrRow+1,1,lastRow-hdrRow,lastCol).getValues();
    const idxCli = headers.indexOf('CLIENTE');
    const cots = rows.filter(function(r){return idxCli>=0 && r[idxCli];})
      .map(function(r){
        var o={};
        headers.forEach(function(h,i){if(h && o[h]===undefined)o[h]=r[i];});
        o.ESTADO = String(r[1]||'').trim();
        return o;
      });
    return _json({ok:true,cotizaciones:cots});
  } catch(err) { return _json({ok:false,error:String(err)}); }
}

function _buildValues(data){
  const m = data.meta||{}, items = m.items||[];
  var b = {trans:0,emp:0,vi:0,bu:0,ca:0,cr:0,co:0,it:0,nv:0,se:0,tv:0,re:0,cu:0,mu:0,
    bo:0,cm:0,es:0,pa:0,fa_v:0,
    ct:0,ce:0,cvi:0,cbu:0,cca:0,ccr:0,cco:0,cit:0,cnv:0,cse:0,ctv:0,cre:0,ccu:0,cmu:0,
    cbo:0,ccm:0,ces:0,cpa:0,cfa:0,cci:0,cte:0,coe:0,cd:0};
  items.forEach(function(it){
    var l=String(it.l||'').toLowerCase(), v=+it.v||0, c=+it.c||0, cat=String(it.cat||'').toLowerCase();
    if(cat==='trasteo'){b.trans+=v;b.ct+=c;}
    else if(cat==='empaque'){b.emp+=v;b.ce+=c;
      if(l.indexOf('vinipel')>=0){b.vi+=v;b.cvi+=c;}
      else if(l.indexOf('burbuja')>=0){b.bu+=v;b.cbu+=c;}
      else if(l.indexOf('caja')>=0){b.ca+=v;b.cca+=c;}
      else if(l.indexOf('craft')>=0){b.cr+=v;b.ccr+=c;}
      else if(l.indexOf('carton')>=0||l.indexOf('corrugado')>=0){b.co+=v;b.cco+=c;}
      else if(l.indexOf('cinta')>=0){b.cci+=c;}
      else if(l.indexOf('transporte')>=0){b.cte+=c;}
      else if(l.indexOf('empacador')>=0||l.indexOf('operario')>=0){b.coe+=c;}
    }
    else if(cat==='inst'){b.it+=v;b.cit+=c;
      if(l.indexOf('nevecon')>=0||l.indexOf('nevera')>=0){b.nv+=v;b.cnv+=c;}
      else if(l.indexOf('secadora')>=0||l.indexOf('lavadora')>=0){b.se+=v;b.cse+=c;}
      else if(l.indexOf(' tv')>=0||l.indexOf('televisor')>=0){b.tv+=v;b.ctv+=c;}
      else if(l.indexOf('repisa')>=0){b.re+=v;b.cre+=c;}
      else if(l.indexOf('cuadro')>=0){b.cu+=v;b.ccu+=c;}
      else{b.mu+=v;b.cmu+=c;}
    }
    else if(cat==='desempaque'){b.cd+=c;}
    else if(cat==='adicionales'){
      if(l.indexOf('bodegaje')>=0){b.bo+=v;b.cbo+=c;}
      else if(l.indexOf('caminad')>=0){b.cm+=v;b.ccm+=c;}
      else if(l.indexOf('escalera')>=0){b.es+=v;b.ces+=c;}
      else if(l.indexOf('parada')>=0){b.pa+=v;b.cpa+=c;}
      else if(l.indexOf('fachada')>=0||l.indexOf('vacio')>=0||l.indexOf('vacío')>=0){b.fa_v+=v;b.cfa+=c;}
    }
  });
  const totalCosto = m.costo || (b.ct+b.ce+b.cit+b.cbo+b.ccm+b.ces+b.cpa+b.cfa+b.cci+b.cte+b.coe+b.cd);
  const f = m.fecha || Utilities.formatDate(new Date(),'America/Bogota','yyyy-MM-dd');
  const hora = m.hora || Utilities.formatDate(new Date(),'America/Bogota','HH:mm');
  const mes = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][parseInt(String(f).substring(5,7),10)-1]||'';
  return {
    'DOC':m.doc||'',
    'FECHA':f,'MES':mes,'CLIENTE':String(m.cliente||'').toUpperCase(),
    'ASESOR':m.asesor||'',
    'SERVICIO':m.tipo||'','ESTADO':m.estado||'COTIZADO',
    'HORA':hora,'TELEFONO':m.telefono||'','FUENTE':m.fuente||'',
    'INGRESO TOTAL':m.total||0,'INGRESO':m.total||0,
    'ING TRANSPORTE':b.trans,'ING EMPAQUE':b.emp,
    'ING VINIPEL':b.vi,'ING BURBUJA':b.bu,'ING CAJAS':b.ca,'ING CRAFT':b.cr,'ING CARTON CORRUGADO':b.co,
    'ING INSTALACIONES TOTAL':b.it,
    'ING INSTALACION NEVECON':b.nv,'ING INSTALACION SECADORA':b.se,'ING INSTALACION TVS':b.tv,
    'ING INSTALACION REPISAS':b.re,'ING INSTALACION CUADROS':b.cu,
    'ING INSTALACIONES MUEBLES/OTROS':b.mu,'ING INSTALACION MUEBLES/OTROS':b.mu,
    'ING BODEGAJE':b.bo,'ING CAMINADOS':b.cm,'ING ESCALERAS':b.es,'ING PARADAS ADICIONAL':b.pa,
    'INGRESO FACHADA':b.fa_v,
    'COSTO TOTAL':totalCosto,
    'COSTO TRASTEO':b.ct,
    'COSTO TOTAL EMPAQUE-':b.ce,'COSTO TOTAL EMPAQUE':b.ce,
    'COSTO VINIPEL':b.cvi,'COSTO BURBUJA':b.cbu,'COSTO CAJAS':b.cca,'COSTO CRAFT':b.ccr,'COSTO CARTON CORRUGADO':b.cco,
    'COSTO TOTAL INSTALACIONES':b.cit,
    'COSTO INST NEVECON':b.cnv,'COSTO INST SECADORA':b.cse,'COSTO INST TV':b.ctv,
    'COSTO INSTALACION REPISAS':b.cre,'COSTO INSTALACION CUADROS':b.ccu,
    'COSTO INSTALACION MUEBLES/OTROS':b.cmu,
    'COSTO BODEGAJE':b.cbo,'COSTO CAMINADO':b.ccm,'COSTO ESCALERAS':b.ces,
    'COSTO PARADA ADICIONAL':b.cpa,'COSTO FACHADA O VACIO':b.cfa,
    'COSTO CINTAS':b.cci,'COSTO TRANSPORTE ENVIO EMPAQUE':b.cte,'COSTO OPERARIOS EMPAQUE':b.coe,
    'COSTO DESEMPAQUE':b.cd,
    'VLR DCTO':m.descuento||0
  };
}
