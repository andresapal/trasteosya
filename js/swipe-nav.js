(function(){
  'use strict';
  var pages=[
    {path:'/cotizar.html',label:'Cotizador público'},
    {path:'/cotizador.html',label:'Cotizador'},
    {path:'/orden-servicio.html',label:'Orden de Servicio'},
    {path:'/kpis.html',label:'KPIs'}
  ];

  var currentIdx=-1;
  var loc=location.pathname;
  for(var i=0;i<pages.length;i++){
    if(loc.indexOf(pages[i].path.replace('/',''))!==-1||(loc==='/'&&i===0)){
      currentIdx=i;break;
    }
  }
  if(currentIdx===-1)return;

  var startX=0,startY=0,startTime=0;
  var indicator=null;

  function createIndicator(){
    if(indicator)return;
    indicator=document.createElement('div');
    indicator.style.cssText='position:fixed;top:50%;z-index:9000;padding:10px 18px;border-radius:12px;background:rgba(27,62,140,.9);backdrop-filter:blur(12px);color:#fff;font-size:13px;font-weight:600;font-family:system-ui,sans-serif;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.2);white-space:nowrap';
    document.body.appendChild(indicator);
  }

  function showHint(dir,label){
    createIndicator();
    indicator.textContent=(dir==='left'?'← ':'→ ')+label;
    indicator.style[dir==='left'?'left':'right']='16px';
    indicator.style[dir==='left'?'right':'left']='auto';
    indicator.style.transform='translateY(-50%) translateX('+(dir==='left'?'-20':'20')+'px)';
    indicator.style.opacity='1';
    setTimeout(function(){indicator.style.transform='translateY(-50%) translateX(0)';},10);
  }

  function hideHint(){
    if(indicator){indicator.style.opacity='0';}
  }

  document.addEventListener('touchstart',function(e){
    if(e.touches.length!==1)return;
    startX=e.touches[0].clientX;
    startY=e.touches[0].clientY;
    startTime=Date.now();
  },{passive:true});

  document.addEventListener('touchmove',function(e){
    if(!startX)return;
    var dx=e.touches[0].clientX-startX;
    var dy=e.touches[0].clientY-startY;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5){
      if(dx>0&&currentIdx>0)showHint('left',pages[currentIdx-1].label);
      else if(dx<0&&currentIdx<pages.length-1)showHint('right',pages[currentIdx+1].label);
    }
  },{passive:true});

  document.addEventListener('touchend',function(e){
    if(!startX)return;
    var dx=e.changedTouches[0].clientX-startX;
    var dy=e.changedTouches[0].clientY-startY;
    var dt=Date.now()-startTime;
    hideHint();
    if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.5&&dt<600){
      if(dx>0&&currentIdx>0){
        location.href=pages[currentIdx-1].path;
      }else if(dx<0&&currentIdx<pages.length-1){
        location.href=pages[currentIdx+1].path;
      }
    }
    startX=0;
  },{passive:true});

  // Page dots indicator
  var dots=document.createElement('div');
  dots.style.cssText='position:fixed;bottom:4px;left:50%;transform:translateX(-50%);z-index:196;display:flex;gap:5px;padding:4px 8px;border-radius:10px;background:rgba(0,0,0,.06)';
  for(var d=0;d<pages.length;d++){
    var dot=document.createElement('div');
    dot.style.cssText='width:6px;height:6px;border-radius:50%;background:'+(d===currentIdx?'#1B3E8C':'rgba(27,62,140,.2)')+';transition:background .2s';
    dots.appendChild(dot);
  }
  document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(dots);});
})();
