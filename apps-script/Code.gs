/* ============================================
   TRASTEOS YA — Apps Script (Backup + KPI API)

   FUNCIONES:
   - POST: recibe órdenes y cotizaciones, guarda PDF en Drive + datos en Sheet
   - GET:  devuelve datos de órdenes como JSON para alimentar el dashboard KPI
   - SCAN: detecta PDFs nuevos, lee su contenido (OCR) y extrae todos los campos

   REQUISITO: Activar servicio "Drive API" en el editor
   (Panel izquierdo → Servicios → + → Drive API → Agregar)

   INSTALACION:
   1. Ir a https://script.google.com → Nuevo proyecto
   2. Pegar este código completo (reemplazar todo)
   3. Activar Drive API (ver REQUISITO arriba)
   4. Menú Implementar → Nueva implementación → App web
   5. Ejecutar como: Yo / Acceso: Cualquier persona
   6. Ejecutar instalarEscaneoAutomatico() una vez
   ============================================ */

// === CONFIGURACION ===
var API_KEY = 'TrasteosYa-2026-Backup';
var ORDENES_FOLDER_ID = '1afPdUsq1MraUEn_nCgjtEVQZVnQvqs-c';
var SPREADSHEET_NAME = 'TrasteoYa-KPI-Data';

// === HELPERS ===
function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  var folder = DriveApp.getFolderById(ORDENES_FOLDER_ID);
  var files = folder.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  var ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch(e) {}
  return ss;
}

function getSheet(ss, name, headers) {
  var sheet = null;
  try { sheet = ss.getSheetByName(name); } catch(e) {}
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

var ORDEN_HEADERS = [
  'Timestamp', 'NumeroOS', 'Cliente', 'Telefono',
  'Fecha', 'CargueFecha', 'CargueHora',
  'Conductor', 'Placa', 'TipoVehiculo', 'NumOperarios',
  'CiudadOrigen', 'CiudadDestino', 'DirOrigen', 'DirDestino',
  'Emp_Craft', 'Emp_Vinipel', 'Emp_Burbuja', 'Emp_Cajas', 'Empacadores',
  'Valor', 'Costo', 'ArchivoURL'
];

var COT_HEADERS = [
  'Timestamp', 'Cliente', 'Email', 'Telefono',
  'Servicio', 'Origen', 'Destino', 'Notas',
  'Fuente', 'Asesor', 'Ingreso', 'Costo', 'Utilidad', 'Margen',
  'Estado', 'Seguimiento'
];

// === POST: Recibir datos ===
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.apikey !== API_KEY) {
      return jsonResp({ success: false, error: 'Unauthorized' });
    }
    if (data.type === 'orden') {
      return guardarOrden(data);
    } else if (data.type === 'cotizacion') {
      return guardarCotizacion(data);
    }
    return jsonResp({ success: false, error: 'Tipo desconocido' });
  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

function guardarOrden(data) {
  var ss = getSpreadsheet();
  var sheet = getSheet(ss, 'Ordenes', ORDEN_HEADERS);
  var meta = data.meta || {};
  var emp = meta.empaque || {};

  var fileUrl = '';
  if (data.pdf_base64 && data.filename) {
    try {
      var folder = DriveApp.getFolderById(ORDENES_FOLDER_ID);
      var blob = Utilities.newBlob(
        Utilities.base64Decode(data.pdf_base64),
        'application/pdf',
        data.filename
      );
      var existing = folder.getFilesByName(data.filename);
      if (existing.hasNext()) {
        existing.next().setTrashed(true);
      }
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    } catch (e) {}
  }

  var numOS = meta.numeroOS || '';
  var rows = sheet.getDataRange().getValues();
  var existingRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] === numOS && numOS !== '') {
      existingRow = i + 1;
      break;
    }
  }

  var valorExist = '', costoExist = '';
  if (existingRow > 0) {
    valorExist = rows[existingRow - 1][20] || '';
    costoExist = rows[existingRow - 1][21] || '';
  }

  var rowData = [
    new Date(), numOS, meta.cliente || '', meta.telefono || '',
    meta.fecha || '', meta.cargueFecha || '', meta.cargueHora || '',
    meta.conductor || '', meta.placa || '', meta.tipoVehiculo || '',
    meta.numOperarios || 0,
    meta.ciudadOrigen || '', meta.ciudadDestino || '',
    meta.dirOrigen || '', meta.dirDestino || '',
    emp.craft || 0, emp.vinipel || 0, emp.burbuja || 0, emp.cajas || 0,
    meta.empacadores || 0, valorExist, costoExist, fileUrl
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return jsonResp({ success: true, file: fileUrl });
}

function guardarCotizacion(data) {
  var ss = getSpreadsheet();
  var sheet = getSheet(ss, 'Cotizaciones', COT_HEADERS);
  var rowData = [
    new Date(), data.cliente || '', data.email || '', data.telefono || '',
    data.servicio || '', data.origen || '', data.destino || '', data.notas || '',
    data.fuente || 'web', data.asesor || '', data.ingreso || 0,
    data.cto_total || 0, data.utilidad || 0, data.uti || 0, 'Pendiente', ''
  ];
  sheet.appendRow(rowData);
  return jsonResp({ success: true });
}

// === GET: Devolver datos para KPI ===
function doGet(e) {
  try {
    var params = e.parameter || {};
    if (params.apikey !== API_KEY) {
      return jsonResp({ success: false, error: 'Unauthorized' });
    }
    var action = params.action || '';
    if (action === 'ordenes') return getOrdenes();
    if (action === 'cotizaciones') return getCotizaciones();
    if (action === 'resumen') return getResumen();
    return jsonResp({ success: true, actions: ['ordenes', 'cotizaciones', 'resumen'] });
  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

function sheetToJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        obj[headers[j]] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      } else {
        obj[headers[j]] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

function getOrdenes() {
  var ss = getSpreadsheet();
  var sheet;
  try { sheet = ss.getSheetByName('Ordenes'); } catch(e) {}
  if (!sheet) return jsonResp({ success: true, ordenes: [] });
  return jsonResp({ success: true, ordenes: sheetToJson(sheet) });
}

function getCotizaciones() {
  var ss = getSpreadsheet();
  var sheet;
  try { sheet = ss.getSheetByName('Cotizaciones'); } catch(e) {}
  if (!sheet) return jsonResp({ success: true, cotizaciones: [] });
  return jsonResp({ success: true, cotizaciones: sheetToJson(sheet) });
}

function getResumen() {
  var ordenes = [], cotizaciones = [];
  var ss = getSpreadsheet();
  try { var sO = ss.getSheetByName('Ordenes'); if (sO) ordenes = sheetToJson(sO); } catch(e) {}
  try { var sC = ss.getSheetByName('Cotizaciones'); if (sC) cotizaciones = sheetToJson(sC); } catch(e) {}
  return jsonResp({
    success: true, ordenes: ordenes, cotizaciones: cotizaciones,
    totalOrdenes: ordenes.length, totalCotizaciones: cotizaciones.length
  });
}

// ============================================================
// === ESCANEO AUTOMATICO DE PDFs CON OCR =====================
// ============================================================

var MESES = {
  'ENE':'01','FEB':'02','MAR':'03','ABR':'04','MAY':'05','JUN':'06',
  'JUL':'07','AGO':'08','SEP':'09','OCT':'10','NOV':'11','DIC':'12'
};
var MESES_LARGO = {
  'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06',
  'julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'
};

// Extraer texto de un PDF usando OCR de Google Drive
function extraerTextoPDF(file) {
  try {
    var blob = file.getBlob();
    var resource = { title: 'temp_ocr_' + Date.now(), mimeType: MimeType.GOOGLE_DOCS };
    var docFile = Drive.Files.copy(resource, file.getId(), { ocr: true, ocrLanguage: 'es' });
    var doc = DocumentApp.openById(docFile.id);
    var texto = doc.getBody().getText();
    Drive.Files.remove(docFile.id);
    return texto;
  } catch (e) {
    try {
      var blob2 = file.getBlob();
      var resource2 = { title: 'temp_ocr_' + Date.now() };
      var inserted = Drive.Files.insert(resource2, blob2, { ocr: true, ocrLanguage: 'es', convert: true });
      var doc2 = DocumentApp.openById(inserted.id);
      var texto2 = doc2.getBody().getText();
      Drive.Files.remove(inserted.id);
      return texto2;
    } catch (e2) {
      return '';
    }
  }
}

// Buscar un valor despues de una etiqueta en el texto
function buscar(texto, patron, grupo) {
  var m = texto.match(patron);
  return m ? (m[grupo || 1] || '').trim() : '';
}

// Parsear numero de OS del nombre del archivo
function parseNombreOS(filename) {
  var name = filename.replace(/\.pdf$/i, '').trim();
  var match = name.match(/^(OSTY(\d{2})([A-Z]{3})(\d{2}))\s+(.+)$/i);
  if (!match) return null;
  var os = match[1].toUpperCase();
  var dia = match[2];
  var mesStr = match[3].toUpperCase();
  var anio = '20' + match[4];
  var cliente = match[5].trim();
  var mes = MESES[mesStr];
  if (!mes) return null;
  var fecha = anio + '-' + mes + '-' + dia;
  return { os: os, cliente: cliente, fecha: fecha };
}

// Parsear fecha larga tipo "Jueves, 29 de mayo de 2026"
function parseFechaLarga(txt) {
  if (!txt) return '';
  var m = txt.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (!m) return '';
  var dia = ('0' + m[1]).slice(-2);
  var mesNombre = m[2].toLowerCase();
  var mes = MESES_LARGO[mesNombre] || '';
  if (!mes) return '';
  return m[3] + '-' + mes + '-' + dia;
}

// Extraer datos de un PDF de Orden de Servicio usando OCR
function extraerDatosOrdenPDF(file) {
  var info = parseNombreOS(file.getName());
  var resultado = {
    os: info ? info.os : '',
    cliente: info ? info.cliente : '',
    telefono: '',
    fecha: info ? info.fecha : '',
    cargueFecha: '',
    cargueHora: '',
    conductor: '',
    placa: '',
    tipoVehiculo: '',
    numOperarios: 0,
    ciudadOrigen: '',
    ciudadDestino: '',
    dirOrigen: '',
    dirDestino: '',
    craft: 0, vinipel: 0, burbuja: 0, cajas: 0,
    empacadores: 0
  };

  var texto = extraerTextoPDF(file);
  if (!texto) return resultado;

  // Numero OS del contenido
  var osMatch = texto.match(/OSTY\d{2}[A-Z]{3}\d{2}/i);
  if (osMatch) resultado.os = osMatch[0].toUpperCase();

  // Cliente
  var cli = buscar(texto, /Cliente\s+([^\n]+)/i);
  if (cli && cli !== '—') resultado.cliente = cli;

  // Telefono
  var tel = buscar(texto, /Tel[eé]fono\s+([\d\s\-\+]+)/i);
  if (tel && tel !== '—') resultado.telefono = tel.replace(/\s/g, '');

  // Fecha de cargue (formato largo)
  var fechaBloque = texto.match(/FECHA\s+Y\s+HORA\s+DE\s+CARGUE[\s\S]*?Fecha\s+([^\n]+)/i);
  if (fechaBloque) {
    var fl = parseFechaLarga(fechaBloque[1]);
    if (fl) resultado.cargueFecha = fl;
  }

  // Hora
  var hora = buscar(texto, /Hora\s+(\d{1,2}:\d{2})/i);
  if (hora) resultado.cargueHora = hora;

  // Conductor
  var cond = buscar(texto, /Conductor\s+([^\n]+)/i);
  if (cond && cond !== '—') resultado.conductor = cond;

  // Placa
  var placa = buscar(texto, /Placa\s+([^\n\s]+)/i);
  if (placa && placa !== '—') resultado.placa = placa;

  // Tipo vehiculo y # operarios
  var tipoOp = buscar(texto, /Tipo\s*\/?\s*#?\s*Op\.?\s+([^\n]+)/i);
  if (tipoOp) {
    var partes = tipoOp.split(/\s*[·\-]\s*/);
    if (partes[0] && partes[0] !== '—') resultado.tipoVehiculo = partes[0].trim();
    if (partes[1]) resultado.numOperarios = parseInt(partes[1], 10) || 0;
  }

  // Ciudades y direcciones (RECOGIDA / ENTREGA)
  var recogida = texto.match(/RECOGIDA[^\n]*\n\s*([^\n]+)[\s\S]*?Direcci[oó]n\s+([^\n]+)/i);
  if (recogida) {
    resultado.ciudadOrigen = recogida[1].trim();
    resultado.dirOrigen = recogida[2].trim();
  }

  var entrega = texto.match(/ENTREGA[^\n]*\n\s*([^\n]+)[\s\S]*?Direcci[oó]n\s+([^\n]+)/i);
  if (entrega) {
    resultado.ciudadDestino = entrega[1].trim();
    resultado.dirDestino = entrega[2].trim();
  }

  // Empaque
  var craftM = texto.match(/Papel\s+craft\s+(\d+)/i);
  if (craftM) resultado.craft = parseInt(craftM[1], 10) || 0;

  var vinipelM = texto.match(/Vinipel\s+(\d+)/i);
  if (vinipelM) resultado.vinipel = parseInt(vinipelM[1], 10) || 0;

  var burbujaM = texto.match(/Burbuja\s+(\d+)/i);
  if (burbujaM) resultado.burbuja = parseInt(burbujaM[1], 10) || 0;

  var cajasM = texto.match(/Cajas\s+(\d+)/i);
  if (cajasM) resultado.cajas = parseInt(cajasM[1], 10) || 0;

  // Empacadores: contar filas con fondo oscuro (marcadas con "E" en el PDF)
  var empMatch = texto.match(/\bE\b\s+\d+\s+/g);
  if (empMatch) resultado.empacadores = empMatch.length;

  // Usar fecha del OS si no se encontro fecha de cargue
  if (!resultado.cargueFecha && resultado.fecha) resultado.cargueFecha = resultado.fecha;
  if (!resultado.fecha && resultado.cargueFecha) resultado.fecha = resultado.cargueFecha;

  return resultado;
}

// Extraer datos de un PDF de Cotizacion interna
function extraerDatosCotizacionPDF(file) {
  var resultado = {
    cliente: '',
    fecha: '',
    ingreso: 0,
    costo: 0,
    utilidad: 0,
    margen: 0
  };

  var texto = extraerTextoPDF(file);
  if (!texto) return resultado;

  var cli = buscar(texto, /Cliente:\s*([^\n]+)/i);
  if (cli) resultado.cliente = cli;

  var fec = buscar(texto, /Fecha:\s*([^\n]+)/i);
  if (fec) resultado.fecha = fec;

  // Buscar TOTALES — formato: numeros con $ y puntos
  var montos = texto.match(/\$\s*([\d\.,]+)/g);
  if (montos && montos.length >= 2) {
    var nums = montos.map(function(m) {
      return parseInt(m.replace(/[\$\s\.]/g, '').replace(',', ''), 10) || 0;
    });
    // En la fila TOTALES: valor venta total, costo total
    // Los dos ultimos grandes suelen ser ingreso y costo
    if (nums.length >= 2) {
      resultado.ingreso = nums[nums.length - 2] || 0;
      resultado.costo = nums[nums.length - 1] || 0;
    }
  }

  // Utilidad neta
  var utilM = texto.match(/Utilidad\s+neta\s+[\-\$\s]*([\d\.,]+)/i);
  if (utilM) resultado.utilidad = parseInt(utilM[1].replace(/[\.\s]/g, ''), 10) || 0;

  // Gran total
  var totalM = texto.match(/Gran\s+total[^\n]*[\$\s]*([\d\.,]+)/i);
  if (totalM) resultado.ingreso = parseInt(totalM[1].replace(/[\.\s]/g, ''), 10) || 0;

  return resultado;
}

// === FUNCION PRINCIPAL DE ESCANEO ===
function escanearPDFs() {
  var ss = getSpreadsheet();
  var sheetOrd = getSheet(ss, 'Ordenes', ORDEN_HEADERS);
  var sheetCot = getSheet(ss, 'Cotizaciones', COT_HEADERS);

  // Cargar OS existentes para evitar duplicados
  var rowsOrd = sheetOrd.getDataRange().getValues();
  var osExistentes = {};
  for (var i = 1; i < rowsOrd.length; i++) {
    if (rowsOrd[i][1]) osExistentes[rowsOrd[i][1].toString().toUpperCase()] = i + 1;
  }

  // Cargar cotizaciones existentes (por nombre de archivo)
  var rowsCot = sheetCot.getDataRange().getValues();
  var cotExistentes = {};
  for (var c = 1; c < rowsCot.length; c++) {
    var cotKey = (rowsCot[c][1] || '').toString().toUpperCase() + '|' + (rowsCot[c][0] || '').toString();
    cotExistentes[cotKey] = true;
  }

  var nuevos = 0;
  var rootFolder = DriveApp.getFolderById(ORDENES_FOLDER_ID);

  function procesarOrdenPDF(file) {
    var nombreTest = file.getName().toUpperCase();
    if (nombreTest.indexOf('OSTY') !== 0) return false;

    var infoNombre = parseNombreOS(file.getName());
    var osNum = infoNombre ? infoNombre.os : '';

    // Si no pudimos sacar el OS del nombre, intentar del contenido despues
    if (!osNum) {
      var textoRapido = file.getName().match(/OSTY\d{2}[A-Z]{3}\d{2}/i);
      if (textoRapido) osNum = textoRapido[0].toUpperCase();
    }

    if (osNum && osExistentes[osNum]) return false;

    // Extraer datos completos via OCR
    var datos = extraerDatosOrdenPDF(file);
    if (!datos.os && !osNum) return false;
    var finalOS = datos.os || osNum;
    if (osExistentes[finalOS]) return false;

    var rowData = [
      file.getDateCreated(),
      finalOS,
      datos.cliente,
      datos.telefono,
      datos.fecha,
      datos.cargueFecha,
      datos.cargueHora,
      datos.conductor,
      datos.placa,
      datos.tipoVehiculo,
      datos.numOperarios,
      datos.ciudadOrigen,
      datos.ciudadDestino,
      datos.dirOrigen,
      datos.dirDestino,
      datos.craft,
      datos.vinipel,
      datos.burbuja,
      datos.cajas,
      datos.empacadores,
      '', '',
      file.getUrl()
    ];

    sheetOrd.appendRow(rowData);
    osExistentes[finalOS] = true;
    nuevos++;
    return true;
  }

  function procesarCotizacionPDF(file) {
    var nombreTest = file.getName().toLowerCase();
    if (nombreTest.indexOf('cotizacion_interna') === -1 &&
        nombreTest.indexOf('cotización_interna') === -1 &&
        nombreTest.indexOf('cotizacion interna') === -1) return false;

    var datos = extraerDatosCotizacionPDF(file);
    if (!datos.cliente) return false;

    var rowData = [
      file.getDateCreated(),
      datos.cliente,
      '', '',
      'Trasteo', '', '', '',
      'pdf', '',
      datos.ingreso,
      datos.costo,
      datos.utilidad,
      datos.ingreso > 0 ? Math.round((datos.utilidad / datos.ingreso) * 100) : 0,
      'Ejecutado', ''
    ];

    sheetCot.appendRow(rowData);
    nuevos++;
    return true;
  }

  function scanFolder(folder) {
    var pdfs = folder.getFilesByType('application/pdf');
    while (pdfs.hasNext()) {
      var file = pdfs.next();
      if (!procesarOrdenPDF(file)) {
        procesarCotizacionPDF(file);
      }
    }
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      scanFolder(subfolders.next());
    }
  }

  scanFolder(rootFolder);
  Logger.log('Escaneo completado: ' + nuevos + ' archivos nuevos procesados');
  return nuevos;
}

// Vincular valor/costo de cotizacion a la orden correspondiente
function vincularCotizacionesAOrdenes() {
  var ss = getSpreadsheet();
  var sheetOrd, sheetCot;
  try { sheetOrd = ss.getSheetByName('Ordenes'); } catch(e) { return; }
  try { sheetCot = ss.getSheetByName('Cotizaciones'); } catch(e) { return; }
  if (!sheetOrd || !sheetCot) return;

  var ordenes = sheetOrd.getDataRange().getValues();
  var cotizaciones = sheetCot.getDataRange().getValues();

  for (var i = 1; i < ordenes.length; i++) {
    var clienteOS = (ordenes[i][2] || '').toString().toUpperCase().trim();
    var fechaOS = (ordenes[i][4] || '').toString().substring(0, 10);
    var valorActual = ordenes[i][20];
    var costoActual = ordenes[i][21];

    if (valorActual || costoActual) continue;

    for (var j = 1; j < cotizaciones.length; j++) {
      var clienteCot = (cotizaciones[j][1] || '').toString().toUpperCase().trim();
      if (clienteOS && clienteOS === clienteCot) {
        var ingreso = cotizaciones[j][10] || 0;
        var costo = cotizaciones[j][11] || 0;
        if (ingreso || costo) {
          sheetOrd.getRange(i + 1, 21).setValue(ingreso);
          sheetOrd.getRange(i + 1, 22).setValue(costo);
          break;
        }
      }
    }
  }
}

// === TRIGGER AUTOMATICO ===
function instalarEscaneoAutomatico() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'escanearPDFs') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('escanearPDFs')
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log('Trigger instalado: escanearPDFs cada 10 minutos');
}

// Ejecutar escaneo manual + vincular cotizaciones
function escaneoCompleto() {
  var nuevos = escanearPDFs();
  vincularCotizacionesAOrdenes();
  Logger.log('Escaneo completo: ' + nuevos + ' nuevos. Cotizaciones vinculadas.');
  return nuevos;
}
