/* ============================================
   TRASTEOS YA — Splash Screen (una vez por sesion)
   ============================================
   Usa sessionStorage: el splash se muestra SOLO la primera
   vez que el usuario abre cualquier pagina admin en esa sesion.
   Si ya se mostro (ej: entro por KPI), al pasar a cotizador
   no se vuelve a mostrar.
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

  // Click para saltar
  el.addEventListener('click', function(){
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(function(){ el.style.display = 'none'; }, 320);
  });

  // Fallback: ocultar a los 3.8s por si la animacion no dispara
  setTimeout(function(){ if(el) el.style.display = 'none'; }, 3800);
})();
