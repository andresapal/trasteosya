(function(){
  'use strict';
  var pages=[
    {path:'/cotizador.html',label:'Cotizador'},
    {path:'/orden-servicio.html',label:'Orden de Servicio'},
    {path:'/kpis.html',label:'KPIs'},
    {path:'/servicios.html',label:'Servicios'}
  ];

  var currentIdx=-1;
  var loc=location.pathname;
  for(var i=0;i<pages.length;i++){
    if(loc.indexOf(pages[i].path.replace('/',''))!==-1){
      currentIdx=i;break;
    }
  }
  if(currentIdx===-1)return;

  function saveBeforeNav(){
    if(loc.indexOf('cotizador.html')!==-1){
      try{
        var fields={};
        var inputs=document.querySelectorAll('input[id],select[id],textarea[id]');
        inputs.forEach(function(el){fields[el.id]=el.value;});
        sessionStorage.setItem('ty_cot_form',JSON.stringify(fields));
      }catch(e){}
    }
  }

  function goTo(idx){
    if(idx<0||idx>=pages.length||idx===currentIdx)return;
    saveBeforeNav();
    location.href=pages[idx].path;
  }

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
      if(dx>0&&currentIdx>0) goTo(currentIdx-1);
      else if(dx<0&&currentIdx<pages.length-1) goTo(currentIdx+1);
    }
    startX=0;
  },{passive:true});

  // Page dots + prev/next arrows
  document.addEventListener('DOMContentLoaded',function(){
    var nav=document.createElement('div');
    var hasBottomBar=!!document.querySelector('.os-bottom-panel');
    nav.style.cssText='position:fixed;bottom:'+(hasBottomBar?'52px':'4px')+';left:50%;transform:translateX(-50%);z-index:196;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:10px;background:rgba(0,0,0,.06)';

    if(currentIdx>0){
      var prev=document.createElement('div');
      prev.textContent='◀';
      prev.style.cssText='cursor:pointer;font-size:10px;color:#1B3E8C;padding:2px 4px';
      prev.onclick=function(){goTo(currentIdx-1);};
      nav.appendChild(prev);
    }

    for(var d=0;d<pages.length;d++){
      var dot=document.createElement('div');
      dot.style.cssText='width:6px;height:6px;border-radius:50%;background:'+(d===currentIdx?'#1B3E8C':'rgba(27,62,140,.2)')+';transition:background .2s';
      nav.appendChild(dot);
    }

    if(currentIdx<pages.length-1){
      var next=document.createElement('div');
      next.textContent='▶';
      next.style.cssText='cursor:pointer;font-size:10px;color:#1B3E8C;padding:2px 4px';
      next.onclick=function(){goTo(currentIdx+1);};
      nav.appendChild(next);
    }

    document.body.appendChild(nav);

    // Restore cotizador form data
    if(loc.indexOf('cotizador.html')!==-1){
      try{
        var saved=JSON.parse(sessionStorage.getItem('ty_cot_form')||'{}');
        Object.keys(saved).forEach(function(id){
          var el=document.getElementById(id);
          if(el&&!el.value&&saved[id])el.value=saved[id];
        });
      }catch(e){}
    }
  });
})();
