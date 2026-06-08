/* ============================================
   TRASTEOS YA — Mapa de cobertura (Leaflet)
   Tiles: CartoDB Voyager · sin API key
   ============================================ */

(function () {
  'use strict';
  if (typeof L === 'undefined') return;
  const el = document.getElementById('coverage-map');
  if (!el) return;

  const map = L.map(el, {
    center: [4.8, -74.0],
    zoom: 6,
    minZoom: 5,
    maxZoom: 11,
    zoomControl: true,
    scrollWheelZoom: false,
    doubleClickZoom: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  const bogotaIcon = L.divIcon({
    className: 'ty-marker ty-marker--main',
    html: '<span class="ty-marker__pulse"></span><span class="ty-marker__dot"></span><span class="ty-marker__label">Bogotá</span>',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
  function cityIcon(name) {
    return L.divIcon({
      className: 'ty-marker',
      html: '<span class="ty-marker__dot ty-marker__dot--blue"></span><span class="ty-marker__label ty-marker__label--small">' + name + '</span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  const cities = [
    { name: 'Medellín',      coords: [6.2476, -75.5658] },
    { name: 'Cali',          coords: [3.4516, -76.5320] },
    { name: 'Barranquilla',  coords: [10.9685, -74.7813] },
    { name: 'Cartagena',     coords: [10.3910, -75.4794] },
    { name: 'Bucaramanga',   coords: [7.1254, -73.1198] },
    { name: 'Pereira',       coords: [4.8133, -75.6961] },
    { name: 'Ibagué',        coords: [4.4389, -75.2322] },
    { name: 'Villavicencio', coords: [4.1420, -73.6266] }
  ];

  const bogota = [4.7110, -74.0721];

  // Lineas dashed desde Bogotá a cada ciudad
  cities.forEach(c => {
    L.polyline([bogota, c.coords], {
      color: '#E30613',
      weight: 2.5,
      opacity: 0.50,
      dashArray: '6 8',
      lineCap: 'round'
    }).addTo(map);
    L.marker(c.coords, { icon: cityIcon(c.name), title: c.name })
      .addTo(map)
      .bindTooltip('Trasteos Ya · ' + c.name, { direction: 'top', offset: [0, -10] });
  });

  // Bogotá al final para que quede encima
  L.marker(bogota, { icon: bogotaIcon, title: 'Bogotá · sede principal', zIndexOffset: 1000 })
    .addTo(map)
    .bindTooltip('Bogotá · Sede principal', { direction: 'top', offset: [0, -16] });

  // Habilitar scroll wheel solo cuando el mouse entra al mapa (UX)
  el.addEventListener('mouseenter', () => map.scrollWheelZoom.enable());
  el.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  // Asegurar render correcto post-load
  setTimeout(() => map.invalidateSize(), 300);
})();
