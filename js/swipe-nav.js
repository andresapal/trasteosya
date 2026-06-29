(function(){
  'use strict';
  var pages=[
    {path:'/cotizador.html',label:'Cotizador'},
    {path:'/orden-servicio.html',label:'Orden de Servicio'},
    {path:'/kpis.html',label:'KPI General'},
    {path:'/kpi-empresa.html',label:'KPI Empresa'},
    {path:'/campanas.html',label:'Campanas'},
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

  document.addEventListener('DOMContentLoaded',function(){
    var nav=document.createElement('div');
    nav.className='swipe-nav-dots';
    nav.style.cssText='position:fixed;bottom:4px;left:50%;transform:translateX(-50%);z-index:196;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:10px;background:rgba(0,0,0,.06)';

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
