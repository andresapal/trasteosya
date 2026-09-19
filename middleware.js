/**
 * Puerta de acceso de Trasteos Ya (Vercel Routing Middleware).
 *
 * Protege en el SERVIDOR las paginas internas y los archivos de datos (/output/*): sin una
 * sesion valida no se entrega nada. El PIN de js/access-gate.js solo se validaba en el navegador.
 *
 * Como funciona
 *   - Un solo login para todo lo interno (correo + contrasena), recordado 30 dias por dispositivo.
 *   - Sesion = cookie firmada (HMAC-SHA256), HttpOnly, Secure, SameSite=Lax.
 *   - Al entrar se marca tambien ty_ok=1 (solo una bandera legible por JS) para que access-gate.js
 *     no pida ademas el PIN. La bandera no da acceso a nada: el servidor solo mira ty_session.
 *
 * Variables de entorno (Vercel > Settings > Environment Variables). Sin AUTH_ENABLED=1 NO hace nada:
 *   AUTH_ENABLED     "1" para activar la puerta
 *   ADMIN_EMAIL      correo del administrador
 *   ADMIN_PASSWORD   contrasena del administrador (usa una larga)
 *   SESSION_SECRET   texto aleatorio de 32+ caracteres (cambiarlo cierra todas las sesiones)
 *
 * Limitaciones conocidas: un solo usuario (administrador) por ahora; no hay contador de intentos
 * (cada fallo espera 0,8 s; conviene ademas una regla de limite de peticiones en Vercel Firewall).
 */
export const config = {
  matcher: [
    '/cotizador', '/cotizador.html',
    '/orden-servicio', '/orden-servicio.html',
    '/kpis', '/kpis.html',
    '/kpi-empresa', '/kpi-empresa.html',
    '/campanas', '/campanas.html',
    '/finanzas', '/finanzas.html',
    '/tarifas', '/tarifas.html',
    '/servicios', '/servicios.html',
    '/usuarios', '/usuarios.html',
    '/output', '/output/:path*',
    '/acceso', '/salir'
  ]
};

const COOKIE = 'ty_session';
const FLAG = 'ty_ok';
const DIAS = 30;
const enc = new TextEncoder();
const HEADERS_BASE = {
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin'
};
const RUTA_INTERNA = /^\/(cotizador|orden-servicio|kpis|kpi-empresa|campanas|finanzas|tarifas|servicios|usuarios)(\.html)?$/;

/* ---------- utilidades ---------- */
function b64u(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uBytes(str) {
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  var bin = atob(str), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function llave(secret, usos) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usos);
}
async function firmar(secret, texto) {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await llave(secret, ['sign']), enc.encode(texto)));
}
// Compara dos textos en tiempo constante (se comparan sus firmas, que siempre miden lo mismo)
async function iguales(secret, a, b) {
  var x = await firmar(secret, 'cmp:' + a), y = await firmar(secret, 'cmp:' + b), d = 0;
  for (var i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function crearSesion(secret, email, ms) {
  var payload = b64u(enc.encode(JSON.stringify({ e: email, r: 'admin', x: Date.now() + ms })));
  return payload + '.' + b64u(await firmar(secret, payload));
}
async function leerSesion(secret, token) {
  try {
    if (!token) return null;
    var i = token.indexOf('.');
    if (i < 1) return null;
    var payload = token.slice(0, i), sig = token.slice(i + 1);
    var ok = await crypto.subtle.verify('HMAC', await llave(secret, ['verify']), b64uBytes(sig), enc.encode(payload));
    if (!ok) return null;
    var data = JSON.parse(new TextDecoder().decode(b64uBytes(payload)));
    if (!data || typeof data.x !== 'number' || data.x < Date.now() || typeof data.e !== 'string') return null;
    return data;
  } catch (e) { return null; }
}
function leerCookie(request, nombre) {
  var h = request.headers.get('cookie') || '';
  var partes = h.split(';');
  for (var i = 0; i < partes.length; i++) {
    var k = partes[i].indexOf('=');
    if (k > 0 && partes[i].slice(0, k).trim() === nombre) return partes[i].slice(k + 1).trim();
  }
  return '';
}
// Solo se vuelve a una pagina interna del propio sitio (evita redirecciones a otros sitios)
function destinoSeguro(n) {
  n = String(n || '');
  var q = n.indexOf('?'), ruta = q === -1 ? n : n.slice(0, q), consulta = q === -1 ? '' : n.slice(q + 1);
  if (!RUTA_INTERNA.test(ruta)) return '/kpi-empresa';
  return /^[A-Za-z0-9_=&.%\-]*$/.test(consulta) && consulta ? ruta + '?' + consulta : ruta;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
function pasar() { return new Response(null, { headers: { 'x-middleware-next': '1' } }); }
function pagina(cuerpo, status, extra) {
  var h = new Headers(Object.assign({ 'content-type': 'text/html; charset=utf-8' }, HEADERS_BASE, extra || {}));
  return new Response(cuerpo, { status: status || 200, headers: h });
}
function dormir(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ---------- pantallas ---------- */
function formulario(next, error) {
  return pagina(
    '<!DOCTYPE html><html lang="es-CO"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><title>Acceso - Trasteos Ya</title>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;' +
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;background:linear-gradient(135deg,#001236,#0A1845 50%,#001236)}' +
    '.c{width:100%;max-width:380px;background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 20px 50px rgba(0,0,0,.4)}' +
    '.c img{height:38px;display:block;margin:0 auto 14px}h1{font-size:18px;text-align:center;color:#0A1845}p{font-size:13px;color:#64748b;text-align:center;margin:4px 0 18px}' +
    'label{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#64748b;margin:12px 0 5px}' +
    'input[type=email],input[type=password]{width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:15px}' +
    'input:focus{outline:none;border-color:#003DA5}.r{display:flex;align-items:center;gap:8px;margin:14px 0;font-size:13px;color:#334155}' +
    'button{width:100%;padding:13px;border:0;border-radius:9px;background:#003DA5;color:#fff;font-size:15px;font-weight:700;cursor:pointer}' +
    '.e{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:9px;padding:10px 12px;font-size:13px;margin-bottom:6px}</style></head><body>' +
    '<form class="c" method="POST" action="/acceso"><img src="/assets/img/logo.png" alt="Trasteos Ya"><h1>Herramientas internas</h1>' +
    '<p>Inicia sesión para continuar</p>' + (error ? '<div class="e" role="alert">' + esc(error) + '</div>' : '') +
    '<input type="hidden" name="next" value="' + esc(next) + '">' +
    '<label for="c">Correo</label><input id="c" name="correo" type="email" autocomplete="username" required autofocus>' +
    '<label for="k">Contraseña</label><input id="k" name="clave" type="password" autocomplete="current-password" required>' +
    '<div class="r"><input id="m" name="recordar" type="checkbox" value="1" checked><label for="m" style="margin:0;text-transform:none;letter-spacing:0;font-size:13px;font-weight:400">Recordar este dispositivo ' + DIAS + ' días</label></div>' +
    '<button type="submit">Entrar</button></form></body></html>',
    error ? 401 : 200
  );
}
function mensaje(titulo, texto, status) {
  return pagina('<!DOCTYPE html><html lang="es-CO"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">' +
    '<title>' + esc(titulo) + '</title></head><body style="font-family:system-ui;padding:32px;max-width:520px;margin:auto"><h1 style="font-size:20px">' + esc(titulo) + '</h1><p style="margin-top:10px;color:#475569">' + esc(texto) + '</p></body></html>', status);
}
function atributosCookie(maxAge, httpOnly) {
  return '; Path=/; Secure; SameSite=Lax' + (httpOnly ? '; HttpOnly' : '') + (maxAge === undefined ? '' : '; Max-Age=' + maxAge);
}

/* ---------- flujo ---------- */
async function iniciarSesion(request, env) {
  var f;
  try { f = await request.formData(); } catch (e) { return formulario('/kpi-empresa', 'No se pudo leer el formulario.'); }
  var correo = String(f.get('correo') || '').trim(), clave = String(f.get('clave') || ''), next = destinoSeguro(f.get('next'));
  var recordar = f.get('recordar') === '1';
  var okCorreo = await iguales(env.SESSION_SECRET, correo.toLowerCase(), env.ADMIN_EMAIL.toLowerCase());
  var okClave = await iguales(env.SESSION_SECRET, clave, env.ADMIN_PASSWORD);
  if (!(okCorreo && okClave)) {
    await dormir(800);
    return formulario(next, 'Correo o contraseña incorrectos.');
  }
  var ms = recordar ? DIAS * 864e5 : 12 * 36e5;
  var token = await crearSesion(env.SESSION_SECRET, env.ADMIN_EMAIL.toLowerCase(), ms);
  var age = recordar ? Math.round(ms / 1000) : undefined;
  var r = pagina('<!DOCTYPE html><meta charset="UTF-8"><title>Entrando…</title><script>try{localStorage.setItem("ty_operator","1")}catch(e){}location.replace(' +
    JSON.stringify(next).replace(/</g, '\\u003c') + ')</script><noscript><a href="' + esc(next) + '">Continuar</a></noscript>');
  r.headers.append('set-cookie', COOKIE + '=' + token + atributosCookie(age, true));
  r.headers.append('set-cookie', FLAG + '=1' + atributosCookie(age, false));
  return r;
}
function cerrarSesion() {
  var r = pagina('<!DOCTYPE html><meta charset="UTF-8"><title>Saliendo…</title><script>try{localStorage.removeItem("ty_operator")}catch(e){}location.replace("/index.html")</script>');
  r.headers.append('set-cookie', COOKIE + '=' + atributosCookie(0, true));
  r.headers.append('set-cookie', FLAG + '=' + atributosCookie(0, false));
  return r;
}

export default async function middleware(request) {
  var url = new URL(request.url), p = url.pathname;

  var env = { AUTH_ENABLED: process.env.AUTH_ENABLED, ADMIN_EMAIL: process.env.ADMIN_EMAIL, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, SESSION_SECRET: process.env.SESSION_SECRET };

  // Apagada: no se toca nada (el sitio se comporta como antes)
  if (env.AUTH_ENABLED !== '1') return pasar();

  // Encendida pero mal configurada: se niega (nunca se deja abierto por error)
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return mensaje('Falta configurar el acceso', 'La puerta de acceso está activada pero faltan datos en Vercel (ADMIN_EMAIL, ADMIN_PASSWORD o SESSION_SECRET de 32+ caracteres).', 503);
  }

  if (p === '/acceso') {
    if (request.method === 'POST') return iniciarSesion(request, env);
    return formulario(destinoSeguro(url.searchParams.get('next')));
  }
  if (p === '/salir') return cerrarSesion();

  // Paginas y datos internos: se exige sesion valida
  var ses = await leerSesion(env.SESSION_SECRET, leerCookie(request, COOKIE));
  if (ses && ses.e === env.ADMIN_EMAIL.toLowerCase()) return pasar();

  if (p === '/output' || p.indexOf('/output/') === 0) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: Object.assign({ 'content-type': 'application/json' }, HEADERS_BASE) });
  }
  return new Response(null, { status: 302, headers: { location: '/acceso?next=' + encodeURIComponent(p + url.search), 'cache-control': 'no-store' } });
}
