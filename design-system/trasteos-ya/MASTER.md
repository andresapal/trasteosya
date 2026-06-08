# Design System Master File — Trasteos Ya

> **LOGIC:** When building a specific page, first check `design-system/trasteos-ya/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Trasteos Ya
**Category:** B2B+B2C Service — Mudanzas · Empaque · Bodegaje · Instalaciones · App Trans Ya
**Brand Origin:** Bogotá, Colombia · 15 años · 5.000+ trasteos · Cobertura urbana, regional y nacional
**Language:** Español (Colombia / Latam)
**Stack:** HTML + Tailwind CSS + Alpine.js (estático, sin CMS)

---

## Brand Lock (Overrides Algorithm)

El skill recomendó paleta navy + sky blue ("Trust & Authority"). **Sobrescribimos solo la paleta** con la marca real extraída del logo Trasteos Ya. Mantenemos el Pattern (Enterprise Gateway) y la filosofía (Trust & Authority) porque encajan perfecto con una empresa líder de 15 años.

| Brand asset | Origen | Aplicación |
|-------------|--------|------------|
| Rojo Trasteos | Logo "TRASTEOS" | CTAs primarios (urgencia/acción) |
| Azul Trasteos | Logo "YA" + swoosh | CTAs secundarios, headings, footer |
| Líneas de velocidad | Logo motion-blur | Microinteracciones, separadores |
| Blanco | Fondo del logo | Stage limpio, respiración |

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Uso |
|------|-----|--------------|-----|
| Brand Red | `#E30613` | `--brand-red` | CTA primario, urgencia, "TRASTEOS" wordmark |
| Brand Red Dark | `#B0050F` | `--brand-red-dark` | Hover de CTA primario, énfasis profundo |
| Brand Red Soft | `#FEE2E2` | `--brand-red-soft` | Backgrounds suaves de alerta/highlight |
| Brand Blue | `#003DA5` | `--brand-blue` | Headings, CTA secundario, trust badges |
| Brand Blue Dark | `#001E5C` | `--brand-blue-dark` | Footer, navbar oscuro, depth |
| Brand Blue Light | `#3B82F6` | `--brand-blue-light` | Hover de azul, swoosh accents |
| Background | `#FFFFFF` | `--bg` | Página |
| Surface | `#F8FAFC` | `--surface` | Cards, secciones alternas |
| Surface Alt | `#F1F5F9` | `--surface-alt` | Hover de rows, separadores suaves |
| Border | `#E2E8F0` | `--border` | Bordes de cards, divisores |
| Text Primary | `#0F172A` | `--text` | Body text |
| Text Muted | `#475569` | `--text-muted` | Captions, metadata |
| Success | `#16A34A` | `--success` | Confirmaciones (cotización enviada) |
| Warning | `#F59E0B` | `--warning` | Atención (cobertura limitada) |

**Jerarquía de CTAs:**

- **Primario** (rojo sólido) → "Cotizar ahora", "Hablar por WhatsApp", "Solicitar servicio". Solo UNO por sección visible.
- **Secundario** (azul sólido) → "Ver servicios", "Cómo funciona".
- **Terciario** (azul outline) → "Saber más", "Ver detalles".
- **Texto link** (azul subrayado on hover) → enlaces inline.

### Typography

- **Heading:** Lexend (300–700) — diseñada específicamente para mejorar legibilidad, alto contraste, peso visual.
- **Body:** Source Sans 3 (300–700) — workhorse de Adobe, abierta, sin fricción.
- **Mood:** corporate, trustworthy, accessible, readable, professional, clean.

```css
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
```

**Escala tipográfica (mobile-first):**

| Token | Mobile | Desktop | Uso |
|-------|--------|---------|-----|
| `--text-xs` | 12px | 12px | Captions, labels |
| `--text-sm` | 14px | 14px | Metadata |
| `--text-base` | 16px | 16px | Body (mínimo en mobile) |
| `--text-lg` | 18px | 18px | Body destacado |
| `--text-xl` | 20px | 24px | Subtítulos de sección |
| `--text-2xl` | 24px | 32px | Títulos de card |
| `--text-3xl` | 30px | 40px | H2 secciones |
| `--text-4xl` | 36px | 56px | H1 hero |
| `--text-5xl` | 42px | 72px | Hero claim destacado |

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps |
| `--space-sm` | 8px | Icon gaps |
| `--space-md` | 16px | Standard padding |
| `--space-lg` | 24px | Section padding |
| `--space-xl` | 32px | Large gaps |
| `--space-2xl` | 48px | Section margins |
| `--space-3xl` | 64px | Hero padding |
| `--space-4xl` | 96px | Hero vertical breathing |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.06)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(15,23,42,0.08)` | Cards default |
| `--shadow-lg` | `0 12px 28px rgba(15,23,42,0.12)` | Cards hover, dropdowns |
| `--shadow-xl` | `0 24px 48px rgba(15,23,42,0.16)` | Hero featured, modals |
| `--shadow-red` | `0 8px 24px rgba(227,6,19,0.25)` | CTA primario hover (red glow) |
| `--shadow-blue` | `0 8px 24px rgba(0,61,165,0.25)` | CTA secundario hover (blue glow) |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Inputs, chips |
| `--radius-md` | 10px | Buttons |
| `--radius-lg` | 16px | Cards |
| `--radius-xl` | 24px | Hero cards, modals |
| `--radius-full` | 9999px | Pills, avatars |

---

## Component Specs

### Buttons

```css
/* Primary — Brand Red (urgencia, conversión) */
.btn-primary {
  background: var(--brand-red);
  color: #ffffff;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-family: 'Lexend', sans-serif;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.01em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: var(--shadow-md);
}
.btn-primary:hover {
  background: var(--brand-red-dark);
  box-shadow: var(--shadow-red);
  transform: translateY(-1px);
}
.btn-primary:active { transform: translateY(0); }
.btn-primary:focus-visible {
  outline: 3px solid var(--brand-red-soft);
  outline-offset: 2px;
}

/* Secondary — Brand Blue */
.btn-secondary {
  background: var(--brand-blue);
  color: #ffffff;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-secondary:hover {
  background: var(--brand-blue-dark);
  box-shadow: var(--shadow-blue);
  transform: translateY(-1px);
}

/* Tertiary — Outline Blue */
.btn-outline {
  background: transparent;
  color: var(--brand-blue);
  border: 2px solid var(--brand-blue);
  padding: 12px 26px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-outline:hover {
  background: var(--brand-blue);
  color: #ffffff;
}

/* WhatsApp — variante especial verde, conserva familia */
.btn-whatsapp {
  background: #25D366;
  color: #ffffff;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-whatsapp:hover {
  background: #1FB955;
  box-shadow: 0 8px 24px rgba(37, 211, 102, 0.3);
  transform: translateY(-1px);
}
```

### Cards (Services / Trust)

```css
.card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-sm);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
  border-color: var(--brand-blue-light);
}
/* Card destacada con accent rojo en hover */
.card--accent::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: linear-gradient(90deg, var(--brand-red) 0%, var(--brand-blue) 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 300ms ease;
}
.card--accent:hover::before { transform: scaleX(1); }
```

### Inputs (Cotizador / Contacto)

```css
.input, .textarea, .select {
  width: 100%;
  padding: 14px 16px;
  background: #ffffff;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 16px;
  color: var(--text);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.input:hover { border-color: #94A3B8; }
.input:focus {
  border-color: var(--brand-blue);
  outline: none;
  box-shadow: 0 0 0 4px rgba(0, 61, 165, 0.12);
}
.input--error {
  border-color: var(--brand-red);
  background: var(--brand-red-soft);
}
.input--error:focus {
  box-shadow: 0 0 0 4px rgba(227, 6, 19, 0.12);
}

.label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 6px;
}
.helper {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}
```

### Trust Badges & Stats

```css
.stat {
  text-align: center;
  padding: 24px;
}
.stat__number {
  font-family: 'Lexend', sans-serif;
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 700;
  color: var(--brand-blue);
  line-height: 1;
  background: linear-gradient(135deg, var(--brand-blue) 0%, var(--brand-blue-light) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat__label {
  font-size: 16px;
  color: var(--text-muted);
  margin-top: 8px;
  font-weight: 500;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
}
.modal {
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-xl);
  max-width: 560px;
  width: 92%;
}
```

---

## Style Guidelines

**Skill Style:** Trust & Authority
**Pattern:** Enterprise Gateway

**Conversion Strategy:**
- Hero con video o imagen fuerte + claim de 15 años / 5.000+ trasteos
- Selector de servicios visible (Hogar / Oficina / Industrial)
- Cotizador rápido como sección principal (no oculto)
- Logos de clientes corporativos para validación
- Testimonios con métricas (no genéricos)
- Cobertura visualizada en mapa Bogotá → nacional
- CTA flotante de WhatsApp en mobile (no obstruye contenido)

**Section Order (Home):**
1. **Hero** — Logo + claim + 2 CTAs (Cotizar | WhatsApp) + foto mudanza familiar
2. **Trust strip** — 4 stats: 15 años · 5.000+ trasteos · Cobertura nacional · 100% asegurado
3. **Servicios** — Bento grid 6 servicios (Hogar, Oficina, Industrial, Empaque, Bodegaje, Instalaciones)
4. **Cotizador rápido** — 3 pasos, callback al WhatsApp con detalle
5. **Cómo trabajamos** — proceso 4 pasos (Cotización → Inspección → Mudanza → Instalación)
6. **Trans Ya App** — banner promocional con badges Play/App Store
7. **Testimonios** — slider con foto + nombre + métrica
8. **Cobertura** — mapa Bogotá + lista nacional
9. **FAQ** — 8-10 preguntas frecuentes
10. **CTA final** — banner WhatsApp + cotizador
11. **Footer** — logo + menú + redes + contacto + legal

**Effects propios de marca:**
- Líneas de velocidad sutiles en separadores (motion-blur del logo)
- Reveal on scroll para stats y cards (Intersection Observer)
- Gradient lateral rojo→azul en cards destacadas
- Floating WhatsApp button con pulse animation suave
- Smooth scroll entre secciones del cotizador

---

## Imagery Rules

- **Fotos reales del equipo** — uniformes azules visibles (las imágenes que mandó el cliente son perfectas).
- **Bogotá presente** — al menos 2 fotos con paisaje urbano de Bogotá reconocible.
- **Watermark interno** — las imágenes ya traen `@trasteosya.com` / logos. Conservar.
- **NO stock genérico de cajas o moving guys gringos**.
- **Formato preferido**: WebP con fallback JPG. Lazy loading nativo (`loading="lazy"`).
- **Aspect ratios consistentes** — 16:9 para heroes, 4:3 para cards de servicio, 1:1 para avatars de testimonio.

---

## Voz y Tono (Copywriting)

- **Tú implícito, no "usted"** — directo, cercano (Colombia urbana). "Te llevamos", "lo coordinamos", "ya estamos".
- **Verbos de acción** — Mudamos, empacamos, instalamos, guardamos. Sin pasiva.
- **Cifras concretas** — "5.000+ trasteos", "15 años", "100% asegurado", "respuesta en menos de 15 min".
- **Sin jerga corporativa hueca** — nada de "soluciones logísticas integrales 360°".
- **CTA verbal directo** — "Cotizar ahora", "Hablar con un asesor", "Pedir tu mudanza".

---

## Anti-Patterns (Do NOT Use)

- ❌ Playful / cartoon design — no encaja con el oficio
- ❌ AI purple/pink gradients
- ❌ Hidden credentials (escondiendo años de experiencia)
- ❌ **Emojis como icons** — usar SVG (Lucide o Heroicons)
- ❌ **Missing cursor:pointer** en elementos clickables
- ❌ Layout-shifting hovers (`scale` que mueve contenido vecino)
- ❌ Low contrast text (mantener 4.5:1 mínimo)
- ❌ Glass cards transparentes en light mode (`bg-white/10`)
- ❌ Stock photos genéricas de cajas o moving guys gringos
- ❌ "Solicite una cotización" en lugar de "Cotiza ya"
- ❌ Hero sin foto del equipo real
- ❌ Cotizador escondido detrás de 3 clics

---

## WhatsApp Protocol (CRITICAL)

Todos los CTAs WhatsApp apuntan a `https://wa.me/573143095194` con `?text=` pre-llenado según el contexto:

| CTA origen | Mensaje pre-llenado |
|------------|---------------------|
| Hero "Hablar por WhatsApp" | `Hola Trasteos Ya, me interesa información sobre sus servicios de mudanza.` |
| Servicio Hogar | `Hola, necesito una mudanza de hogar. ¿Me ayudan con una cotización?` |
| Servicio Oficina | `Hola, requiero servicio de mudanza corporativa para mi oficina.` |
| Servicio Industrial | `Hola, necesito mudanza industrial / transporte de mercancía.` |
| Servicio Empaque | `Hola, requiero servicio de empaque profesional.` |
| Servicio Bodegaje | `Hola, me interesa el servicio de bodegaje. ¿Pueden enviarme tarifas?` |
| Servicio Instalaciones | `Hola, necesito instalación de electrodomésticos (nevecón / secadora / TV).` |
| Trans Ya App | `Hola, quiero información sobre Trans Ya App y cómo registrarme.` |
| Cotizador completado | `Hola Trasteos Ya, acabo de enviar una cotización en la web. Mis datos: [nombre] · Origen: [origen] · Destino: [destino] · Servicio: [tipo]. ¡Quedo atento!` |

El equipo de Trasteos Ya recibe el mensaje y responde con el **protocolo de bienvenida humano** (saludo, presentación del asesor, confirmación del servicio solicitado, siguiente paso). El protocolo lo construye Trasteos Ya internamente.

---

## Leads Flow

```
Formulario web (cotizador / contacto / Trans Ya registro)
        │
        ▼
   Web3Forms API (POST)
        │
        ├──► Email al operador
        ├──► Append row Google Sheets (vía Apps Script webhook)
        └──► Confirmación al usuario en pantalla + invitación a WhatsApp
```

Cada formulario incluye un campo oculto `_source` para trazabilidad (`cotizador-home`, `contacto-hogar`, etc).

---

## Pre-Delivery Checklist

Antes de entregar cada página verifica:

- [ ] Logo Trasteos Ya correcto en navbar
- [ ] Paleta rojo/azul respetada (no slate/sky default)
- [ ] Fuentes Lexend + Source Sans 3 cargando
- [ ] CTAs WhatsApp con mensaje pre-llenado correcto al `573143095194`
- [ ] No emojis como icons (SVG only)
- [ ] `cursor-pointer` en todo clickable
- [ ] Transiciones 150–300ms en hovers
- [ ] Text contrast 4.5:1 mínimo
- [ ] Focus states visibles para teclado
- [ ] `prefers-reduced-motion` respetado en animaciones
- [ ] Responsive a 375px, 768px, 1024px, 1440px sin scroll horizontal
- [ ] Navbar floating no oculta contenido
- [ ] Imágenes con `loading="lazy"` y `alt` descriptivo
- [ ] Schema.org `MovingCompany` markup en home
- [ ] OG tags + favicon configurados
- [ ] Sticky WhatsApp button visible en mobile
