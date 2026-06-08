# Trasteos Ya — Sitio web

Sitio web estático, marca-bloqueada, listo para desplegar en Netlify o Vercel.

- **Stack:** HTML + CSS + Vanilla JS (sin framework, sin build step)
- **Tipografía:** Lexend (headings) + Source Sans 3 (body) — Google Fonts
- **Marca:** Rojo `#E30613` + Azul `#003DA5` (extraída del logo)
- **Lead pipeline:** Web3Forms → Email + Google Sheets + WhatsApp al `+573143095194`
- **Cotizador interno:** `cotizador.html` (operador-only, `noindex`)
- **Cotizador express público:** sección `#cotizador` en home y páginas de servicio

---

## 📁 Estructura

```
trasteos-ya/
├── index.html                  Home — el showcase
├── gracias.html                Post-submit
├── hogar.html / oficina.html / industrial.html / empaque.html / bodegaje.html / instalaciones.html
├── trans-ya-app.html           Landing app
├── quienes-somos.html
├── contacto.html
├── cotizador.html              ← Herramienta interna del operador (noindex)
├── css/
│   ├── tokens.css              Variables CSS del MASTER.md
│   └── components.css          Componentes (botones, cards, hero, etc)
├── js/
│   ├── whatsapp.js             Genera URLs wa.me con mensaje contextual
│   ├── main.js                 Nav móvil, reveals, FAQ, counters
│   └── form-handler.js         Web3Forms + Sheets webhook
├── assets/
│   ├── img/                    Imágenes (ver checklist abajo)
│   ├── icons/                  SVG sueltos si hace falta
│   └── og/                     Open Graph
├── design-system/trasteos-ya/
│   └── MASTER.md               ← Fuente de verdad del sistema visual
├── netlify.toml                Config Netlify
├── vercel.json                 Config Vercel
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## 🖼️ Imágenes requeridas (asset checklist)

Coloca los archivos en `assets/img/` con estos nombres exactos. Si tienes versiones .webp, mejor (más livianas).

| Archivo | Uso | Tamaño recomendado |
|---------|-----|--------------------|
| `logo.png` (o `.svg`) | Logo principal, navbar, footer | 800×260 px transparente |
| `logo-blanco.png` | Logo para fondo oscuro (footer) | 800×260 px transparente |
| `favicon.png` | Favicon | 192×192 px cuadrado |
| `hero-mudanza-familiar.webp` | Hero de la home | 1200×900 px |
| `sala-bogota.webp` | Hero alternativo / Quiénes somos | 1280×720 px |
| `instalacion-nevecon.webp` | Instalaciones servicio | 1200×800 px |
| `empaque-fragiles.webp` | Empaque servicio | 1200×800 px |
| `equipo-uniformado.webp` | Quiénes somos | 1200×800 px |
| `og/trasteosya-og.jpg` | Open Graph (compartir en redes) | 1200×630 px |

Si entregas el original en JPG o PNG, también funciona — solo asegúrate de que el nombre coincida.

---

## 🚀 Deploy

### Opción A — Netlify (recomendada para arrancar)

1. Crea cuenta gratis en [netlify.com](https://netlify.com)
2. Arrastra la carpeta `trasteos-ya/` completa al dashboard de Netlify
3. Listo. Te da una URL tipo `https://trasteos-ya-xxxx.netlify.app`
4. Para dominio propio: Settings → Domain management → Add custom domain

Alternativa por línea de comandos:
```bash
npx netlify-cli deploy --prod --dir .
```

### Opción B — Vercel

1. Sube la carpeta a GitHub
2. Importa el repo en [vercel.com](https://vercel.com)
3. Deploy automático en cada `git push`

### Opción C — GitHub Pages

1. Sube a un repo público
2. Settings → Pages → Source: `main` branch, root folder
3. Disponible en `https://<usuario>.github.io/<repo>/`

---

## ⚙️ Configuración antes de salir a producción

### 1. Web3Forms (formularios → email)

1. Ve a [web3forms.com](https://web3forms.com), regístrate con `andresapal@gmail.com` (email del operador actual)
2. Crea un "Access Key" — copia el UUID que te dan
3. Abre `js/form-handler.js` y reemplaza:
   ```js
   WEB3FORMS_KEY: 'REEMPLAZAR_CON_TU_ACCESS_KEY',
   ```
4. Todos los leads llegarán automáticamente a `andresapal@gmail.com` (cambiar luego al email definitivo del operador en el dashboard de Web3Forms)

### 2. Google Sheets webhook (opcional pero recomendado)

1. Crea una Google Sheet con columnas: `timestamp, source, nombre, telefono, email, servicio, origen, destino, tamano, fecha, detalles`
2. Extensions → Apps Script → pega:
   ```javascript
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
     const data = JSON.parse(e.postData.contents);
     sheet.appendRow([
       new Date(), data.source, data.nombre, data.telefono, data.email,
       data.servicio, data.origen, data.destino, data.tamano, data.fecha, data.detalles
     ]);
     return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Deploy → New deployment → Web app → Execute as: *me*, Access: *Anyone*
4. Copia la URL `/exec` y pégala en `js/form-handler.js`:
   ```js
   SHEETS_WEBHOOK: 'https://script.google.com/macros/s/.../exec',
   ```

### 3. WhatsApp

Ya está cableado al `+573143095194`. Si el número cambia, edita `js/whatsapp.js` línea 7.

### 4. Imágenes Open Graph

Diseña una imagen 1200×630 px con el logo + claim ("15 años moviendo Bogotá") y guárdala como `assets/og/trasteosya-og.jpg`.

### 5. Schema.org

En `index.html` actualiza el bloque JSON-LD con la URL real (`https://trasteosya.com`) y el NIT cuando lo tengas.

---

## 📝 Cómo editar contenido

**Sin desarrollador:**
- Todos los textos están directamente en los archivos `.html`
- Abre con cualquier editor (VS Code, Sublime, o el Bloc de notas)
- Busca el texto, cámbialo, guarda, sube a Netlify (drag & drop)

**Servicios y precios:**
- Los precios de referencia del cotizador interno viven en `cotizador.html` líneas 493-525 (constantes `TRASTEO`, `MATS`, `INST`, `BOD`)
- Para ajustarlos, edita esas líneas; el cálculo se actualiza solo

---

## 🎨 Sistema de diseño

La fuente de verdad visual está en `design-system/trasteos-ya/MASTER.md`. Si quieres cambiar colores, fuentes o espacios, primero edita ese archivo y luego replica el cambio en `css/tokens.css`.

---

## 🔒 Cotizador interno

El archivo `cotizador.html` es la herramienta de uso del operador (toggle de costos, márgenes, PDFs). Está marcado `noindex,nofollow` y excluido de `robots.txt` — no aparecerá en Google. Compartir la URL directamente con el equipo:

```
https://trasteosya.com/cotizador.html
```

Si quieres protección con contraseña: subir el archivo a una subcarpeta y configurar Basic Auth en Netlify (`_headers` + plan Pro) o Vercel.

---

## 📈 Próximos pasos sugeridos (Fase 2)

1. **WhatsApp Business API** con bot auto-responder (protocolo de bienvenida automático)
2. **Blog** para SEO local Bogotá ("cómo cotizar una mudanza", "qué empacar primero", etc.)
3. **Reseñas Google** embebidas dinámicamente
4. **A/B testing** del cotizador express con herramientas como Plausible o GA4
5. **Trans Ya App** — formularios de registro de conductor y empresa cargadora
6. **CRM integration** — HubSpot Free + Zapier

---

## 🆘 Soporte

Sistema construido sobre el skill `ui-ux-pro-max` de Claude. Para iterar:
1. Abre la conversación con Claude
2. Comparte qué quieres cambiar
3. Pega el archivo a editar
