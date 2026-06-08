/* ============================================
   TRASTEOS YA — Global behaviors
   ============================================ */

(function () {
  'use strict';

  /* ---------- Mobile nav toggle ---------- */
  function initNav() {
    const burger = document.querySelector('.nav__burger');
    const mobile = document.querySelector('.nav__mobile');
    if (!burger || !mobile) return;

    burger.addEventListener('click', function () {
      const isOpen = burger.classList.toggle('is-open');
      mobile.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Cierra el menú al hacer clic en un enlace
    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('is-open');
        mobile.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Counter animation for stats ---------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    const fmt = new Intl.NumberFormat('es-CO');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-counter'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1500;
        const start = performance.now();
        function tick(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
          el.textContent = fmt.format(Math.round(target * eased)) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    document.querySelectorAll('.faq__item').forEach(function (item) {
      const q = item.querySelector('.faq__q');
      if (!q) return;
      q.addEventListener('click', function () {
        const open = item.getAttribute('aria-expanded') === 'true';
        item.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  /* ---------- Active nav link by URL ---------- */
  function initActiveLink() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav__link, .nav__mobile-link').forEach(function (a) {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (!href) return;
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('nav__link--active');
      }
    });
  }

  /* ---------- Year in footer ---------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- Smooth scroll for in-page anchors ---------- */
  function initAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const nav = document.querySelector('.nav');
        const offset = nav ? nav.offsetHeight + 16 : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ---------- Mega menu click toggle (mobile/touch) ---------- */
  function initMegaToggle() {
    document.querySelectorAll('.nav__mega').forEach(function (m) {
      const trigger = m.querySelector('.nav__link');
      if (!trigger) return;
      trigger.addEventListener('click', function (e) {
        // Solo intercepta si es touch o si el href es #servicios (ancla en home)
        const href = trigger.getAttribute('href') || '';
        if (href === '#servicios' || href === '#') {
          e.preventDefault();
          m.classList.toggle('is-open');
        }
      });
      // Cerrar cuando se hace click fuera
      document.addEventListener('click', function (e) {
        if (!m.contains(e.target)) m.classList.remove('is-open');
      });
    });
  }

  /* ---------- bfcache restore: re-aplicar reveal por si quedo en blanco ---------- */
  function initBfcacheRestore() {
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        document.querySelectorAll('[data-reveal]').forEach(function (el) {
          el.classList.add('is-visible');
        });
      }
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initNav();
    initReveal();
    initCounters();
    initFaq();
    initActiveLink();
    initYear();
    initAnchorScroll();
    initMegaToggle();
    initBfcacheRestore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
