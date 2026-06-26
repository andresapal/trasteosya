#!/usr/bin/env python3
"""
TRASTEOS YA — Importador de datos desde archivos XLS y PDF

USO:
  python import_data.py

Lee archivos de ./data/{año}/, extrae datos de servicios,
genera ./output/servicios.json y actualiza ./database.db

Reglas:
  - Si existe XLS y PDF del mismo OST → usa XLS
  - Si solo existe PDF → usa PDF
  - No inserta OST duplicados
  - Log completo en ./logs/import.log
"""

import os
import re
import json
import sqlite3
import logging
import sys
from pathlib import Path
from datetime import datetime

# ============================================================
# DEPENDENCIAS OPCIONALES
# ============================================================

try:
    import pdfplumber
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    import openpyxl
    HAS_XLSX = True
except ImportError:
    HAS_XLSX = False

try:
    import xlrd
    HAS_XLS = True
except ImportError:
    HAS_XLS = False

# ============================================================
# CONFIGURACION
# ============================================================

BASE_DIR = Path(__file__).parent
DATA_DIR = Path(r"C:\Users\Andres\TrasteosYa\2. OPERACIONES\1. ORDENES")
OUTPUT_DIR = BASE_DIR / "output"
LOGS_DIR = BASE_DIR / "logs"
DB_PATH = BASE_DIR / "database.db"
JSON_PATH = OUTPUT_DIR / "servicios.json"

MESES = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
}

MESES_LARGO = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
}

# ============================================================
# LOGGING
# ============================================================

def setup_logging():
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / "import.log"

    logger = logging.getLogger("import")
    logger.setLevel(logging.DEBUG)

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))

    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter("%(message)s"))

    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger

log = setup_logging()

# ============================================================
# BASE DE DATOS SQLite
# ============================================================

def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS servicios (
            ost TEXT PRIMARY KEY,
            fecha TEXT,
            cliente TEXT,
            telefono TEXT,
            origen_ciudad TEXT,
            destino_ciudad TEXT,
            origen_direccion TEXT,
            destino_direccion TEXT,
            vehiculo TEXT,
            operarios INTEGER DEFAULT 0,
            empaque_tipo TEXT,
            mat_craft INTEGER DEFAULT 0,
            mat_vinipel INTEGER DEFAULT 0,
            mat_burbuja INTEGER DEFAULT 0,
            mat_cajas INTEGER DEFAULT 0,
            empacadores INTEGER DEFAULT 0,
            valor REAL DEFAULT 0,
            costo REAL DEFAULT 0,
            utilidad REAL DEFAULT 0,
            margen REAL DEFAULT 0,
            items TEXT,
            archivo_origen TEXT,
            anno INTEGER,
            importado_en TEXT
        )
    """)
    conn.commit()
    return conn


def ost_exists(conn, ost):
    row = conn.execute("SELECT 1 FROM servicios WHERE ost = ?", (ost,)).fetchone()
    return row is not None


def insert_servicio(conn, data):
    conn.execute("""
        INSERT INTO servicios (
            ost, fecha, cliente, telefono,
            origen_ciudad, destino_ciudad, origen_direccion, destino_direccion,
            vehiculo, operarios, empaque_tipo,
            mat_craft, mat_vinipel, mat_burbuja, mat_cajas, empacadores,
            valor, costo, utilidad, margen,
            items, archivo_origen, anno, importado_en
        ) VALUES (
            :ost, :fecha, :cliente, :telefono,
            :origen_ciudad, :destino_ciudad, :origen_direccion, :destino_direccion,
            :vehiculo, :operarios, :empaque_tipo,
            :mat_craft, :mat_vinipel, :mat_burbuja, :mat_cajas, :empacadores,
            :valor, :costo, :utilidad, :margen,
            :items, :archivo_origen, :anno, :importado_en
        )
    """, data)
    conn.commit()

# ============================================================
# PARSEO DE NOMBRES DE ARCHIVO
# ============================================================

def parse_ost_filename(filename):
    """Extrae OST, cliente y fecha del nombre del archivo.
    Formatos soportados:
      - OSTY29MAY26 NOMBRE APELLIDO.pdf  (DDmmmYY)
      - OSTY2024JUN14 NOMBRE.pdf          (YYYYmmmDD)
      - OSTY26JUN25-NOMBRE-APELLIDO.pdf   (con guiones)
    """
    name = re.sub(r'\.(pdf|xlsx?|xls)$', '', filename, flags=re.IGNORECASE).strip()

    # Formato nuevo: OSTY + 2dig + 3let + 2dig (DDmmmYY)
    m2 = re.match(r'^(OSTY(\d{2})([A-Z]{3})(\d{2}))[\s\-]+(.+)$', name, re.IGNORECASE)
    if m2:
        os_code = m2.group(1).upper()
        dia = m2.group(2)
        mes_str = m2.group(3).upper()
        anio = '20' + m2.group(4)
        cliente = m2.group(5).replace('-', ' ').strip()
        mes = MESES.get(mes_str)
        if mes:
            return {'ost': os_code, 'cliente': cliente, 'fecha': f"{anio}-{mes}-{dia}"}

    # Formato viejo: OSTY + 4dig(año) + 2-4let(mes) + espacio? + 1-2dig(día) + sufijo?
    m4 = re.match(r'^(OSTY(\d{4})\s*([A-Z]{2,4})\s*(\d{1,2}))[A-Z0-9]*[\s\-]+(.+)$', name, re.IGNORECASE)
    if m4:
        anio = m4.group(2)
        mes_raw = m4.group(3).upper()
        # Corregir typos: JJUL→JUL
        mes_raw = re.sub(r'^([A-Z])\1+', r'\1', mes_raw)
        if len(mes_raw) > 3:
            mes_raw = mes_raw[:3]
        if mes_raw == 'OC':
            mes_raw = 'OCT'
        mes = MESES.get(mes_raw)
        if mes:
            dia = m4.group(4).zfill(2)
            os_code = m4.group(1).upper().replace(' ', '')
            cliente = m4.group(5).replace('-', ' ').strip()
            return {'ost': os_code, 'cliente': cliente, 'fecha': f"{anio}-{mes}-{dia}"}

    return None


def parse_fecha_larga(txt):
    """Parsea 'Jueves, 29 de mayo de 2026' → '2026-05-29'"""
    m = re.search(r'(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})', txt, re.IGNORECASE)
    if not m:
        return ''
    dia = m.group(1).zfill(2)
    mes = MESES_LARGO.get(m.group(2).lower(), '')
    if not mes:
        return ''
    return f"{m.group(3)}-{mes}-{dia}"

# ============================================================
# EXTRACCION DE PDF
# ============================================================

def extraer_texto_pdf(filepath):
    """Extrae texto completo del PDF usando pdfplumber."""
    if not HAS_PDF:
        return ''
    try:
        text_parts = []
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return '\n'.join(text_parts)
    except Exception as e:
        log.warning(f"  Error leyendo PDF {filepath}: {e}")
        return ''


def buscar(texto, patron, grupo=1):
    m = re.search(patron, texto, re.IGNORECASE)
    return m.group(grupo).strip() if m else ''


def extraer_datos_pdf(filepath, year_folder):
    """Extrae todos los campos de un PDF de Orden de Servicio."""
    filename = os.path.basename(filepath)
    info = parse_ost_filename(filename)

    data = {
        'ost': info['ost'] if info else '',
        'fecha': info['fecha'] if info else '',
        'cliente': info['cliente'] if info else '',
        'telefono': '',
        'origen_ciudad': '',
        'destino_ciudad': '',
        'origen_direccion': '',
        'destino_direccion': '',
        'vehiculo': '',
        'operarios': 0,
        'empaque_tipo': '',
        'mat_craft': 0,
        'mat_vinipel': 0,
        'mat_burbuja': 0,
        'mat_cajas': 0,
        'empacadores': 0,
        'valor': 0,
        'costo': 0,
        'utilidad': 0,
        'margen': 0,
        'items': '',
        'archivo_origen': str(filepath),
        'anno': int(year_folder) if year_folder.isdigit() else 0,
        'importado_en': datetime.now().isoformat()
    }

    texto = extraer_texto_pdf(filepath)
    if not texto:
        log.debug(f"  Sin texto extraido de {filename}")
        return data

    # OST del contenido
    ost_m = re.search(r'OSTY\d{2,4}[A-Z]{2,4}\s*\d{1,2}', texto, re.IGNORECASE)
    if ost_m:
        data['ost'] = ost_m.group(0).upper().replace(' ', '')

    # Cliente (solo sobreescribir si el OCR da un nombre real, no un encabezado)
    cli = buscar(texto, r'Cliente\s+([^\n]+)')
    headers_falsos = ['FECHA', 'HORA', 'CARGUE', 'DATOS', 'VEHICULO', 'OPERACION', 'SERVICIO', 'RECOGIDA', 'ENTREGA']
    if cli and cli != '—' and not any(h in cli.upper() for h in headers_falsos):
        data['cliente'] = cli

    # Telefono
    tel = buscar(texto, r'Tel[eé]fono\s+([\d\s\-\+]+)')
    if tel and tel != '—':
        data['telefono'] = re.sub(r'\s', '', tel)

    # Fecha de cargue
    fecha_bloque = re.search(r'FECHA\s+Y\s+HORA\s+DE\s+CARGUE[\s\S]*?Fecha\s+([^\n]+)', texto, re.IGNORECASE)
    if fecha_bloque:
        fl = parse_fecha_larga(fecha_bloque.group(1))
        if fl:
            data['fecha'] = fl

    # Hora (guardar como parte de items por ahora)
    hora = buscar(texto, r'Hora\s+(\d{1,2}:\d{2})')

    # Conductor
    conductor = buscar(texto, r'Conductor\s+([^\n]+)')

    # Placa
    placa = buscar(texto, r'Placa\s+([^\n\s]+)')

    # Tipo vehiculo y operarios
    tipo_op = buscar(texto, r'Tipo\s*/?\s*#?\s*Op\.?\s+([^\n]+)')
    if tipo_op:
        partes = re.split(r'\s*[·\-]\s*', tipo_op)
        if partes[0] and partes[0] != '—':
            data['vehiculo'] = partes[0].strip()
        if len(partes) > 1:
            try:
                data['operarios'] = int(partes[1])
            except ValueError:
                pass

    # Ciudades y direcciones (RECOGIDA / ENTREGA)
    recogida = re.search(r'RECOGIDA[^\n]*\n\s*([^\n]+)[\s\S]*?Direcci[oó]n\s+([^\n]+)', texto, re.IGNORECASE)
    if recogida:
        ciudad_r = recogida.group(1).strip()
        dir_r = recogida.group(2).strip()
        if re.match(r'(?i)direcci[oó]n|calle|carrera|diagonal|transversal|conjunto|avenida', ciudad_r):
            data['origen_direccion'] = ciudad_r
        else:
            data['origen_ciudad'] = ciudad_r
            data['origen_direccion'] = dir_r

    entrega = re.search(r'ENTREGA[^\n]*\n\s*([^\n]+)[\s\S]*?Direcci[oó]n\s+([^\n]+)', texto, re.IGNORECASE)
    if entrega:
        ciudad_e = entrega.group(1).strip()
        dir_e = entrega.group(2).strip()
        if re.match(r'(?i)direcci[oó]n|calle|carrera|diagonal|transversal|conjunto|avenida', ciudad_e):
            data['destino_direccion'] = ciudad_e
        else:
            data['destino_ciudad'] = ciudad_e
            data['destino_direccion'] = dir_e

    # Materiales de empaque
    craft_m = re.search(r'Papel\s+craft\s+(\d+)', texto, re.IGNORECASE)
    if craft_m:
        data['mat_craft'] = int(craft_m.group(1))

    vinipel_m = re.search(r'Vinipel\s+(\d+)', texto, re.IGNORECASE)
    if vinipel_m:
        data['mat_vinipel'] = int(vinipel_m.group(1))

    burbuja_m = re.search(r'Burbuja\s+(\d+)', texto, re.IGNORECASE)
    if burbuja_m:
        data['mat_burbuja'] = int(burbuja_m.group(1))

    cajas_m = re.search(r'Cajas\s+(\d+)', texto, re.IGNORECASE)
    if cajas_m:
        data['mat_cajas'] = int(cajas_m.group(1))

    # Clasificar empaque
    total_mat = data['mat_craft'] + data['mat_burbuja'] + data['mat_cajas']
    if total_mat == 0 and data['mat_vinipel'] > 0:
        data['empaque_tipo'] = 'Básico'
    elif data['mat_cajas'] > 0 and data['mat_cajas'] <= 25:
        data['empaque_tipo'] = 'Semicompleto'
    elif data['mat_cajas'] > 25 or (data['mat_cajas'] > 0 and (data['mat_burbuja'] > 0 or data['mat_craft'] > 0)):
        data['empaque_tipo'] = 'Full'
    elif total_mat > 0:
        data['empaque_tipo'] = 'Semicompleto'

    # Items: consolidar detalles extra
    items_list = []
    if hora:
        items_list.append(f"Hora: {hora}")
    if conductor and conductor != '—':
        items_list.append(f"Conductor: {conductor}")
    if placa and placa != '—':
        items_list.append(f"Placa: {placa}")
    if data['mat_craft']:
        items_list.append(f"Craft: {data['mat_craft']}")
    if data['mat_vinipel']:
        items_list.append(f"Vinipel: {data['mat_vinipel']}")
    if data['mat_burbuja']:
        items_list.append(f"Burbuja: {data['mat_burbuja']}")
    if data['mat_cajas']:
        items_list.append(f"Cajas: {data['mat_cajas']}")
    data['items'] = '; '.join(items_list)

    return data

# ============================================================
# EXTRACCION DE XLS/XLSX
# ============================================================

def cell_val(ws, row, col, default=''):
    """Lee celda de xlrd sheet (0-indexed). Devuelve string limpio."""
    try:
        v = ws.cell_value(row, col)
        if isinstance(v, float) and v == int(v):
            v = int(v)
        return str(v).strip() if v else default
    except Exception:
        return default


def cell_num(ws, row, col):
    """Lee celda numerica de xlrd sheet."""
    try:
        v = ws.cell_value(row, col)
        if isinstance(v, (int, float)):
            return v
        return 0
    except Exception:
        return 0


def xlrd_date(ws, row, col, wb):
    """Convierte fecha serial de Excel a YYYY-MM-DD."""
    try:
        v = ws.cell_value(row, col)
        if isinstance(v, float) and v > 40000:
            dt = xlrd.xldate_as_tuple(v, wb.datemode)
            return f"{dt[0]}-{str(dt[1]).zfill(2)}-{str(dt[2]).zfill(2)}"
        return str(v).strip()
    except Exception:
        return ''


def buscar_celda(ws, texto_buscar, max_rows=None):
    """Busca una celda que contenga texto_buscar y devuelve (row, col)."""
    limit = max_rows or ws.nrows
    for r in range(limit):
        for c in range(ws.ncols):
            val = str(ws.cell_value(r, c)).strip().lower()
            if texto_buscar.lower() in val:
                return (r, c)
    return None


def extraer_datos_xls(filepath, year_folder):
    """Extrae datos de un archivo XLS (Orden de Servicio Trasteos Ya).

    Estructura conocida del XLS:
      [1,6]=OSTY2024ABR27 (OS number)
      [5,5]=Conductor, [6,5]=Placa
      [7,1]=Cliente, [8,1]=Contacto
      [9,4]=Fecha serial, [11,4]=Ciudad origen, [11,6]=Ciudad destino
      [19,1]=Ciudad recogida, [20,1]=Direccion recogida
      [23,1]=Fecha serial, [24,1]=Hora
      [26,1]=Telefono
      [31,1]=Ciudad entrega, [32,1]=Direccion entrega
      [56-60]=Empaque (craft, vinipel/pelex, burbuja, cajas)
      [14-17]=Tipos vehiculo (marcados con cantidad)
      Items en columnas [4,5] filas 20+
    """
    filename = os.path.basename(filepath)
    info = parse_ost_filename(filename)
    ext = Path(filepath).suffix.lower()

    data = {
        'ost': info['ost'] if info else '',
        'fecha': info['fecha'] if info else '',
        'cliente': info['cliente'] if info else '',
        'telefono': '',
        'origen_ciudad': '',
        'destino_ciudad': '',
        'origen_direccion': '',
        'destino_direccion': '',
        'vehiculo': '',
        'operarios': 0,
        'empaque_tipo': '',
        'mat_craft': 0,
        'mat_vinipel': 0,
        'mat_burbuja': 0,
        'mat_cajas': 0,
        'empacadores': 0,
        'valor': 0,
        'costo': 0,
        'utilidad': 0,
        'margen': 0,
        'items': '',
        'archivo_origen': str(filepath),
        'anno': int(year_folder) if year_folder.isdigit() else 0,
        'importado_en': datetime.now().isoformat()
    }

    try:
        if ext == '.xlsx':
            if not HAS_XLSX:
                log.warning(f"  openpyxl no disponible para .xlsx")
                return data
            wb_ox = openpyxl.load_workbook(filepath, data_only=True)
            ws_ox = wb_ox.active
            log.debug(f"  XLSX abierto con openpyxl")
            wb_ox.close()
            return data

        if not HAS_XLS:
            log.warning(f"  xlrd no disponible para .xls")
            return data

        wb = xlrd.open_workbook(filepath)
        ws = wb.sheet_by_index(0)

        # OST: [1,6]
        ost_val = cell_val(ws, 1, 6)
        if ost_val and 'OSTY' in ost_val.upper():
            data['ost'] = ost_val.upper().replace(' ', '')

        # Cliente: [7,1]
        cliente = cell_val(ws, 7, 1)
        if cliente and 'cliente' not in cliente.lower():
            data['cliente'] = cliente

        # Conductor: [5,5]
        conductor = cell_val(ws, 5, 5)
        # Placa: [6,5]
        placa = cell_val(ws, 6, 5)

        # Fecha: [9,4] o [23,1] (serial de Excel)
        fecha = xlrd_date(ws, 9, 4, wb)
        if fecha:
            data['fecha'] = fecha
        else:
            fecha2 = xlrd_date(ws, 23, 1, wb)
            if fecha2:
                data['fecha'] = fecha2

        # Hora: [24,1] — puede ser serial de Excel (0.333 = 8:00) o texto
        hora_raw = ws.cell_value(24, 1) if ws.nrows > 24 else ''
        hora = ''
        if isinstance(hora_raw, float) and 0 < hora_raw < 1:
            total_mins = int(hora_raw * 24 * 60)
            h = total_mins // 60
            m = total_mins % 60
            hora = f"{h}:{str(m).zfill(2)}"
        elif hora_raw:
            hora = str(hora_raw).strip()

        # Telefono: [26,1]
        telefono = cell_val(ws, 26, 1)
        if telefono and telefono != 'N/A':
            data['telefono'] = telefono.replace(' ', '')

        # Ciudades: [11,4]=Origen, [11,6]=Destino
        data['origen_ciudad'] = cell_val(ws, 11, 4)
        data['destino_ciudad'] = cell_val(ws, 11, 6)

        # Direccion recogida: [20,1]
        data['origen_direccion'] = cell_val(ws, 20, 1)
        # Direccion entrega: [32,1]
        data['destino_direccion'] = cell_val(ws, 32, 1)

        # Vehiculo: la lista en filas 14-17 es solo referencia, no tiene seleccion marcada
        # Se deja vacio — el dato se puede completar desde el PDF si existe
        data['vehiculo'] = ''

        # Operarios: contar nombres en columna 9 (I), filas 8-12
        # Formato: [8,8]=cedula [8,9]=nombre | [9,8]=cedula [9,9]=nombre
        op_count = 0
        for r in range(8, 13):
            nombre = cell_val(ws, r, 9)
            if nombre and nombre not in ('NOMBRE', 'N/A', 'ASIGNANDO', '', 'OPERARIOS/ EMPACADORES TRASTEOS YA', 'OPERARIOS:'):
                op_count += 1
        data['operarios'] = op_count

        # Empaque: filas 56-60
        pos_emp = buscar_celda(ws, 'SERVICIO EMPAQUE')
        if pos_emp:
            emp_start = pos_emp[0] + 1
            for r in range(emp_start, min(emp_start + 5, ws.nrows)):
                label = cell_val(ws, r, 0).lower()
                qty = int(cell_num(ws, r, 3)) if cell_num(ws, r, 3) else 0
                if 'craf' in label:
                    data['mat_craft'] = qty
                elif 'pelex' in label or 'vinipel' in label:
                    data['mat_vinipel'] = qty
                elif 'burbuja' in label:
                    data['mat_burbuja'] = qty
                elif 'caja' in label:
                    data['mat_cajas'] = qty

        # Clasificar empaque
        total_mat = data['mat_craft'] + data['mat_burbuja'] + data['mat_cajas']
        if total_mat == 0 and data['mat_vinipel'] > 0:
            data['empaque_tipo'] = 'Básico'
        elif data['mat_cajas'] > 0 and data['mat_cajas'] <= 25:
            data['empaque_tipo'] = 'Semicompleto'
        elif data['mat_cajas'] > 25 or (data['mat_cajas'] > 0 and (data['mat_burbuja'] > 0 or data['mat_craft'] > 0)):
            data['empaque_tipo'] = 'Full'
        elif total_mat > 0:
            data['empaque_tipo'] = 'Semicompleto'

        # Items: columnas 4-5, filas 20-55 (Q + DESCRIPCION)
        items_list = []
        for r in range(19, min(56, ws.nrows)):
            qty = cell_num(ws, r, 4)
            desc = cell_val(ws, r, 5)
            if qty and desc:
                items_list.append(f"{int(qty)}x {desc}")

        # Agregar detalles extra
        if conductor and conductor != '—' and conductor != 'N/A':
            items_list.append(f"Conductor: {conductor}")
        if placa and placa != '—' and placa != 'N/A':
            items_list.append(f"Placa: {placa}")
        if hora:
            items_list.append(f"Hora: {hora}")

        data['items'] = '; '.join(items_list)

    except Exception as e:
        log.warning(f"  Error leyendo XLS {filepath}: {e}")

    return data

# ============================================================
# LOGICA PRINCIPAL
# ============================================================

def scan_data_folder():
    """Escanea ./data/ y devuelve archivos agrupados por OST."""
    archivos = {}  # ost -> {'xls': path, 'pdf': path}

    if not DATA_DIR.exists():
        log.error(f"La carpeta {DATA_DIR} no existe.")
        return {}

    for year_dir in sorted(DATA_DIR.iterdir()):
        if not year_dir.is_dir():
            continue
        year = year_dir.name

        for f in year_dir.iterdir():
            if not f.is_file():
                continue
            ext = f.suffix.lower()
            if ext not in ('.pdf', '.xls', '.xlsx'):
                continue

            info = parse_ost_filename(f.name)
            if not info:
                # Intentar extraer OST del nombre con regex flexible
                m = re.search(r'OSTY\d{2,4}[A-Z]{2,4}\s*\d{1,2}', f.name, re.IGNORECASE)
                if m:
                    ost_key = m.group(0).upper().replace(' ', '')
                else:
                    log.warning(f"  No se pudo identificar OST en: {f.name}")
                    ost_key = f"UNKNOWN_{f.stem}"
            else:
                ost_key = info['ost']

            if ost_key not in archivos:
                archivos[ost_key] = {'xls': None, 'pdf': None, 'year': year}

            if ext in ('.xls', '.xlsx'):
                archivos[ost_key]['xls'] = str(f)
            elif ext == '.pdf':
                archivos[ost_key]['pdf'] = str(f)

    return archivos


def main():
    log.info("=" * 60)
    log.info("TRASTEOS YA — Importador de datos")
    log.info(f"Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info("=" * 60)

    # Verificar dependencias
    missing = []
    if not HAS_PDF:
        missing.append("pdfplumber")
    if not HAS_XLS:
        missing.append("xlrd")
    if not HAS_XLSX:
        missing.append("openpyxl")
    if missing:
        log.error(f"Faltan dependencias: {', '.join(missing)}")
        log.error(f"Ejecuta: pip install {' '.join(missing)}")
        sys.exit(1)

    # Inicializar DB
    conn = init_db()
    log.info(f"Base de datos: {DB_PATH}")

    # Escanear archivos
    archivos = scan_data_folder()
    total = len(archivos)
    log.info(f"Archivos encontrados: {total} OSTs unicos")

    if total == 0:
        log.info("No hay archivos para procesar. Copia tus PDFs/XLS en ./data/{año}/")
        conn.close()
        return

    # Procesar archivos
    nuevos = 0
    duplicados = 0
    errores = 0
    servicios = []

    for ost_key, files in sorted(archivos.items()):
        year = files['year']

        # Regla: Si existe XLS y PDF del mismo OST, usar XLS
        if files['xls']:
            log.info(f"[XLS] {os.path.basename(files['xls'])}")
            data = extraer_datos_xls(files['xls'], year)
            if not data:
                log.warning(f"  No se pudo extraer datos del XLS")
                errores += 1
                continue
        elif files['pdf']:
            log.info(f"[PDF] {os.path.basename(files['pdf'])}")
            data = extraer_datos_pdf(files['pdf'], year)
        else:
            continue

        # Validar OST
        if not data['ost']:
            log.warning(f"  Sin OST identificable, se usa clave: {ost_key}")
            data['ost'] = ost_key

        # Verificar duplicados
        if ost_exists(conn, data['ost']):
            log.debug(f"  Duplicado: {data['ost']} — omitido")
            duplicados += 1
            continue

        # Insertar en DB
        try:
            insert_servicio(conn, data)
            nuevos += 1
            servicios.append(data)
            log.info(f"  ✓ {data['ost']} | {data['cliente']} | {data['fecha']} | {data['vehiculo']}")
        except Exception as e:
            log.error(f"  Error insertando {data['ost']}: {e}")
            errores += 1

    # Generar JSON
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Leer todos los servicios de la DB (no solo los nuevos)
    cursor = conn.execute("SELECT * FROM servicios ORDER BY fecha DESC")
    columns = [desc[0] for desc in cursor.description]
    all_servicios = []
    for row in cursor:
        obj = dict(zip(columns, row))
        all_servicios.append(obj)

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_servicios, f, ensure_ascii=False, indent=2)

    conn.close()

    # Resumen
    log.info("")
    log.info("=" * 60)
    log.info("RESUMEN")
    log.info("=" * 60)
    log.info(f"  Archivos escaneados:  {total}")
    log.info(f"  Nuevos importados:    {nuevos}")
    log.info(f"  Duplicados omitidos:  {duplicados}")
    log.info(f"  Errores:              {errores}")
    log.info(f"  Total en base datos:  {len(all_servicios)}")
    log.info(f"  JSON generado:        {JSON_PATH}")
    log.info(f"  Base de datos:        {DB_PATH}")
    log.info(f"  Log:                  {LOGS_DIR / 'import.log'}")
    log.info("=" * 60)


if __name__ == '__main__':
    main()
