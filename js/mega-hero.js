/* ============================================
   TRASTEOS YA — Mega Hero Slider + Counters
   ============================================ */

(function () {
  'use strict';

  const root = document.querySelector('.mega-hero');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.mega-hero__slide'));
  const navs   = Array.from(root.querySelectorAll('.mega-hero__nav button'));
  const INTERVAL = 6000;
  let current = 0;
  let timer = null;

  function activate(idx) {
    idx = ((idx % slides.length) + slides.length) % slides.length;
    if (idx === current && slides[current].classList.contains('is-active')) return;
    slides.forEach(s => s.classList.remove('is-active'));
    navs.forEach(n => n.classList.remove('is-active'));
    slides[idx].classList.add('is-active');
    if (navs[idx]) navs[idx].classList.add('is-active');
    current = idx;
  }

  function next() { activate(current + 1); }

  function start() { stop(); timer = setInterval(next, INTERVAL); }
  function stop()  { if (timer) { clearInterval(timer); timer = null; } }

  navs.forEach((btn, i) => {
    btn.addEventListener('click', () => { activate(i); start(); });
  });

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  // Pausar cuando el tab no esta visible (ahorra recursos)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // Init
  activate(0);
  start();

  // ============ COUNTERS ============
  const counters = root.querySelectorAll('.mega-stat__num[data-counter]');
  const fmt = new Intl.NumberFormat('es-CO');

  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter || '0');
    const suffix = el.dataset.suffix || '';
    const isInt  = target % 1 === 0;
    const duration = 1800;
    const startT = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - startT) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = target * eased;
      el.textContent = (isInt ? fmt.format(Math.round(v)) : v.toFixed(1)) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Trigger contadores cuando el hero entre en viewport (IntersectionObserver)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          counters.forEach(animateCounter);
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    io.observe(root);
  } else {
    setTimeout(() => counters.forEach(animateCounter), 600);
  }

  // ============ PARALLAX SUTIL ============
  // El fondo se mueve ligeramente con el scroll
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    let raf = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const offset = Math.max(-40, Math.min(40, rect.top * 0.08));
          slides.forEach(s => {
            const bg = s.querySelector('.mega-hero__bg');
            if (bg) bg.style.setProperty('--parallax-y', offset + 'px');
          });
        }
        raf = null;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
