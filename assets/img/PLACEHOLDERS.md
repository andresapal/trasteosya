# 📸 Guía de imágenes — Trasteos Ya (v2)

Renombra cada foto del chat con el nombre EXACTO de esta tabla y guárdala en `assets/img/`.

## 🏷️ Marca

| Nombre del archivo | Qué guardar | Por qué |
|--------------------|-------------|---------|
| `logo.png` | **El logo real Trasteos Ya** (la primera imagen que me mandaste al inicio del chat — TRASTEOS rojo + YA en círculo azul con líneas) | Imagen principal del navbar y footer |
| `favicon.png` | El logo recortado o el círculo "YA" solo · 192×192 px | Icono del tab del navegador |

## 🎬 Carrusel del home (6 archivos · banner con Ken Burns + fade)

Aparecen en el hero del `index.html`. Rotan automáticamente cada ~5 segundos con zoom + difuminado.

| Nombre del archivo | Qué guardar |
|--------------------|-------------|
| `carousel-1.jpg` | Foto #4 (camión rojo descargando en casa de ladrillo con bici) |
| `carousel-2.jpg` | Foto #6 (3 operarios + camión + jardín premium) |
| `carousel-3.jpg` | Foto #13 (operario cargando cajas FRAGIL Grupo Phoenix) |
| `carousel-4.jpg` | Foto #10 (muebles envueltos en burbuja con vista cerros) |
| `carousel-5.jpg` | Foto #11 (sala apartamento con sofás envueltos) |
| `carousel-6.jpg` | Foto #3 (operarios uniformados frente casa ladrillo) |

## 🎯 Heroes de páginas internas (7 archivos)

| Nombre del archivo | Qué guardar | Página |
|--------------------|-------------|--------|
| `hero-hogar.jpg` | Foto #4 (camión rojo en casa de ladrillo) | hogar.html |
| `hero-oficina.jpg` | Foto #1 (operario espaldas con TRASTEOSYA.COM, banderas) | oficina.html |
| `hero-industrial.jpg` | Foto #13 (cajas FRAGIL Grupo Phoenix) | industrial.html |
| `hero-empaque.jpg` | Foto #10 (muebles envueltos vista cerros) | empaque.html |
| `hero-bodegaje.jpg` | Foto #12 (vinipel rosado, volumen empacado) | bodegaje.html |
| `hero-quienes-somos.jpg` | Foto #3 (operarios casa ladrillo) | quienes-somos.html |

## 🖼️ Galería del home · "Trabajos reales · 15 años en imágenes" (6 archivos)

| Nombre del archivo | Qué guardar |
|--------------------|-------------|
| `galeria-1.jpg` | Foto #2 (escritorio banderas Colombia + EE.UU.) |
| `galeria-2.jpg` | Foto #5 (Fitness Formula 4 en la calle) |
| `galeria-3.jpg` | Foto #7 (2 operarios armando cama) |
| `galeria-4.jpg` | Foto #9 (oficina ejecutiva mueble chino + iMac) |
| `galeria-5.jpg` | Foto #11 (sala apartamento sillones envueltos) |
| `galeria-6.jpg` | Foto #18 (Suzuki SX4 plateado en camión azul) |

## 🚗 Transporte de vehículos · sección en `industrial.html` (2 archivos)

| Nombre del archivo | Qué guardar |
|--------------------|-------------|
| `industrial-vehiculo-1.jpg` | Foto #8 (Ford Escape rojo en camión rojo) |
| `industrial-vehiculo-2.jpg` | Foto #18 (Suzuki SX4 plateado — la misma de `galeria-6.jpg`, guárdala con ambos nombres) |

## 🚫 Lo que NO se usa más

- ~~`hero-home.jpg`~~ — ya no se usa, el home tiene **carrusel**
- ~~`logo.svg`~~ — reemplazado por `logo.png` real
- ~~`hero-instalaciones.jpg`~~ — la página `instalaciones.html` ya no existe (instalación se vende solo con mudanza)
- ~~Fotos #14, #15, #16, #17~~ — descartadas (repetidas o composiciones con logo viejo)

## 📊 Total a guardar: **21 archivos**

(2 marca · 6 carrusel · 6 heroes · 6 galería · 2 vehículos · *menos las que se duplican con otro nombre*)

## 💡 Cómo guardarlas (rápido)

1. Abre el chat de Claude
2. Click derecho en la foto → "Guardar imagen como…"
3. Carpeta: `C:\Users\Andres\Proyecto\Claude\trasteos-ya\assets\img\`
4. Pega el nombre exacto de la tabla

## 🎨 Tip: optimizar pesos

Para que el sitio cargue rápido, las fotos heroes/carrusel deben pesar **< 250 KB c/u**. Si pesan más:
- Ve a https://squoosh.app
- Sube tu foto → barra "Compress to" → JPG calidad 78 → descarga
- 2 minutos por foto, vale la pena
