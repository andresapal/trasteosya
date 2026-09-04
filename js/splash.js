/* ============================================
   TRASTEOS YA — Splash Screen (una vez por sesion)
   ============================================
   Usa sessionStorage: el splash se muestra SOLO la primera
   vez que el usuario abre cualquier pagina admin en esa sesion.
   Si ya se mostro (ej: entro por KPI), al pasar a cotizador
   no se vuelve a mostrar.
   Incluye chime sintetico tipo Apple TV (Web Audio API).
   ============================================ */

(function(){
  'use strict';
  var KEY = 'ty_splash_shown';
  var el  = document.getElementById('tySplash');
  if(!el) return;

  // Ya se mostro en esta sesion? -> ocultar de inmediato
  try {
    if(sessionStorage.getItem(KEY) === '1'){
      el.classList.add('tys-hide');
      return;
    }
  } catch(e){ /* sessionStorage no disponible, mostrar igual */ }

  // Marcar como mostrado
  try { sessionStorage.setItem(KEY, '1'); } catch(e){}

  // ── Chime sintetico (acorde suave tipo Apple TV) ──
  function playChime(){
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      var ctx = new AC();
      var now = ctx.currentTime;

      // Acorde: C5 + E5 + G5 (do mayor, brillante y corto)
      var freqs = [523.25, 659.25, 783.99];
      var master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.18, now + 0.08);  // attack suave
      master.gain.linearRampToValueAtTime(0.12, now + 0.4);   // sustain
      master.gain.exponentialRampToValueAtTime(0.001, now + 1.6); // decay largo
      master.connect(ctx.destination);

      freqs.forEach(function(f, i){
        // Onda principal (sine, limpia)
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;

        // Gain individual (las agudas mas suaves)
        var g = ctx.createGain();
        g.gain.value = i === 0 ? 1.0 : (i === 1 ? 0.7 : 0.5);
        osc.connect(g);
        g.connect(master);

        osc.start(now + (i * 0.04));  // ligero stagger entre notas
        osc.stop(now + 1.8);

        // Armónico sutil (una octava arriba, muy bajo)
        var harm = ctx.createOscillator();
        harm.type = 'sine';
        harm.frequency.value = f * 2;
        var hg = ctx.createGain();
        hg.gain.value = 0.08;
        harm.connect(hg);
        hg.connect(master);
        harm.start(now + (i * 0.04));
        harm.stop(now + 1.2);
      });

      // Cerrar contexto despues
      setTimeout(function(){ ctx.close(); }, 2500);
    } catch(e){ /* silencioso si el navegador bloquea autoplay */ }
  }

  // Reproducir al momento del zoom del logo (200ms despues de cargar)
  setTimeout(playChime, 200);

  // Click para saltar
  el.addEventListener('click', function(){
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(function(){ el.style.display = 'none'; }, 320);
  });

  // Fallback: ocultar a los 3.8s por si la animacion no dispara
  setTimeout(function(){ if(el) el.style.display = 'none'; }, 3800);
})();
