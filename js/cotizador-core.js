/* ============================================
   TRASTEOS YA — BASE ÚNICA DE TARIFAS
   Valores de venta y costo en un solo lugar. Se editan en tarifas.html
   y quedan guardados en la pestaña TARIFAS del Sheet; MarIAna los toma de ahí.

   La usan:
   - cotizador.html          → interno, el preciso
   - cotizadorparati.html    → estimado rápido para el cliente
   - apps-script/vapi-webhook.gs → MarIAna (modelo del cotizador interno)
   ============================================ */
(function(root){
'use strict';

/* ========= TARIFAS BASE =========
   costo (c) y venta (v). Lo que edites en tarifas.html manda sobre esto. */
const DEFAULTS={
  trasteo:{
    pequeno:{c:420000,v:580000},
    mediano:{c:570000,v:730000},
    grande:{c:710000,v:870000}
  },
  materiales:{
    vinipel:{c:30000,v:130000},   // material: rollo suelto (empaque grande/full)
    burbuja:{c:70000,v:160000},
    cajas:{c:6000,v:14000},
    craft:{c:30000,v:40000},
    carton:{c:160000,v:210000}
  },
  empaque:{
    expressDia:{c:80000,v:130000},  // empaque básico del mismo día: rollo 30.000 + labor 50.000
    empacadorDia:{c:100000,v:130000},
    cinta:{c:7500,v:0},
    transporte:{c:30000,v:0}
  },
  instalaciones:{
    nevecon:{c:100000,v:120000},
    secadora:{c:80000,v:90000},
    tv:{c:80000,v:90000},
    repisaP:{c:25000,v:30000},
    repisaG:{c:35000,v:45000},
    cuadroP:{c:6000,v:8000},
    cuadroG:{c:12000,v:14000}
  },
  desempaque:{c:100000,v:120000},   // por operario y día
  bodegaje:{
    m10:{c:280000,v:350000},
    m20:{c:410000,v:550000},
    m30:{c:550000,v:700000},
    m40:{c:600000,v:800000}
  },
  adicionales:{
    // modo: "fijo" (un solo valor) o "operario" (se multiplica por los operarios del camión)
    caminado:{modo:'fijo',fijo:{c:0,v:100000},operario:{c:25000,v:35000}},
    escaleras:{modo:'fijo',fijo:{c:80000,v:{3:120000,4:150000,5:180000}},operario:{c:25000,v:40000}},
    parada:{modo:'fijo',fijo:{c:100000,v:140000}},
    fachada:{modo:'visita',fijo:{c:0,v:0}}
  },
  recargoMunicipio:{c:100000,v:140000},   // Chía, Cajicá, Cota, Madrid
  utilidadMinima:160000
};

/* Valores del Excel 2026 que no coinciden con los de arriba. Solo se muestran
   como sugerencia en tarifas.html; no se aplican solos. */
const SUGERIDO_EXCEL={
  instalaciones:{secadora:{c:70000,v:85000},tv:{c:70000,v:85000}}
};

const TARIFAS=JSON.parse(JSON.stringify(DEFAULTS));
let _meta={origen:'valores base',actualizado:''};

/* ========= ETIQUETAS (no se editan) ========= */
const TRASTEO_INFO={
  pequeno:{l:"Pequeño",vehiculo:"NHR 16 m³",operarios:2,vivienda:"Apartaestudio menor a 60 m²"},
  mediano:{l:"Mediano",vehiculo:"Turbo 28 m³",operarios:3,vivienda:"Apartamento mediano de 60 a 85 m²"},
  grande:{l:"Grande",vehiculo:"Sencillo 45 m³",operarios:4,vivienda:"Apartamento familiar mayor a 85 m² o casa"}
};
const MAT_INFO={vinipel:{l:"Vinipel",unit:"rollos"},burbuja:{l:"Burbuja",unit:"rollos"},
  cajas:{l:"Cajas",unit:"unidades"},craft:{l:"Craft",unit:"rollos"},carton:{l:"Cartón corrugado",unit:"rollos"}};
const INST_INFO={nevecon:{l:"Nevecón"},secadora:{l:"Secadora"},tv:{l:"TV"},
  repisaP:{l:"Repisas pequeñas"},repisaG:{l:"Repisas grandes"},cuadroP:{l:"Cuadros pequeños"},cuadroG:{l:"Cuadros grandes"}};
const BOD_INFO={m10:{l:"10 m³"},m20:{l:"20 m³"},m30:{l:"30 m³"},m40:{l:"40 m³"}};
const ADIC_INFO={caminado:{l:"Caminado"},escaleras:{l:"Escaleras"},fachada:{l:"Manipulación fachada"},parada:{l:"Parada adicional"}};

/* ========= TABLAS QUE USAN LAS PÁGINAS =========
   Son los mismos objetos siempre: al guardar tarifas nuevas se actualizan por dentro,
   así las páginas que ya las tomaron siguen funcionando. */
const TRASTEO={},MATS={},INST={},BOD={},CAMION={},MAT={},INSTP={},BOD_CLIENTE={},ESCALERA={},CAMINADO={v:0};
const ADIC=[{k:"caminado",l:ADIC_INFO.caminado.l},{k:"escaleras",l:ADIC_INFO.escaleras.l},
  {k:"fachada",l:ADIC_INFO.fachada.l},{k:"parada",l:ADIC_INFO.parada.l}];
let CERCANA_SURCHARGE={c:0,v:0};

function sincronizar(){
  Object.keys(TRASTEO_INFO).forEach(k=>{
    TRASTEO[k]=Object.assign(TRASTEO[k]||{},TRASTEO_INFO[k],TARIFAS.trasteo[k]);
    CAMION[k]=Object.assign(CAMION[k]||{},{l:'Camión '+TRASTEO_INFO[k].l.toLowerCase()},TARIFAS.trasteo[k]);
  });
  Object.keys(MAT_INFO).forEach(k=>{
    MATS[k]=Object.assign(MATS[k]||{},MAT_INFO[k],TARIFAS.materiales[k]);
    if(k!=='carton')MAT[k]=MATS[k];
  });
  Object.keys(INST_INFO).forEach(k=>{
    INST[k]=Object.assign(INST[k]||{},INST_INFO[k],TARIFAS.instalaciones[k]);
    if(k==='nevecon'||k==='secadora'||k==='tv')INSTP[k]=INST[k];
  });
  Object.keys(BOD_INFO).forEach(k=>{
    BOD[k]=Object.assign(BOD[k]||{},BOD_INFO[k],TARIFAS.bodegaje[k]);
    if(k!=='m40')BOD_CLIENTE[k]=BOD[k];
  });
  const esc=TARIFAS.adicionales.escaleras;
  [3,4,5].forEach(p=>{ESCALERA[p]=esc.modo==='operario'?esc.operario.v:esc.fijo.v[p];});
  CAMINADO.v=TARIFAS.adicionales.caminado.modo==='operario'?TARIFAS.adicionales.caminado.operario.v:TARIFAS.adicionales.caminado.fijo.v;
  CERCANA_SURCHARGE.c=TARIFAS.recargoMunicipio.c;
  CERCANA_SURCHARGE.v=TARIFAS.recargoMunicipio.v;
}

/* Aplica las tarifas guardadas encima de las base */
function aplicar(over){
  if(!over||typeof over!=='object')return TARIFAS;
  (function mezclar(dest,src){
    Object.keys(src).forEach(k=>{
      if(src[k]&&typeof src[k]==='object'&&!Array.isArray(src[k])){
        if(!dest[k]||typeof dest[k]!=='object')dest[k]={};
        mezclar(dest[k],src[k]);
      }else if(src[k]!==undefined&&src[k]!==null&&src[k]!==''){
        dest[k]=src[k];
      }
    });
  })(TARIFAS,over);
  sincronizar();
  return TARIFAS;
}
function restaurarBase(){
  const base=JSON.parse(JSON.stringify(DEFAULTS));
  Object.keys(base).forEach(k=>{TARIFAS[k]=base[k];});
  sincronizar();
  return TARIFAS;
}
function exportar(){return JSON.parse(JSON.stringify(TARIFAS));}
function meta(){return _meta;}

/* Descarga las tarifas guardadas (navegador). Si falla, quedan las base. */
function cargarTarifas(url,apikey){
  if(typeof fetch!=='function')return Promise.resolve(TARIFAS);
  return fetch(url+'?action=tarifas&apikey='+encodeURIComponent(apikey||''),{redirect:'follow'})
    .then(r=>r.json())
    .then(d=>{
      if(d&&d.ok&&d.tarifas){aplicar(d.tarifas);_meta={origen:'tarifas.html',actualizado:d.actualizado||''};}
      return TARIFAS;
    })
    .catch(()=>TARIFAS);
}

sincronizar();

/* ============================================
   COTIZADOR RÁPIDO (cotizadorparati.html)
   ============================================ */
const VIV_LABEL={pequeno:'Apartaestudio o pequeño',mediano:'Apartamento mediano',familiar:'Apartamento familiar',casa:'Casa'};
const VIV_CAMION={pequeno:'pequeno',mediano:'mediano',familiar:'grande',casa:'grande'};
const CERCANAS={'Chía':1,'Cajicá':1,'Cota':1,'Madrid':1};

function empDefaults(vivienda,tipo){
  const chico=(vivienda==='pequeno'||vivienda==='mediano');
  if(tipo==='express'){return {vinipel:chico?2:3};}
  return chico?{cajas:20,vinipel:2,burbuja:1,craft:1}:{cajas:45,vinipel:5,burbuja:2,craft:1};
}

function buildLines(S){
  const lines=[];
  const ck=VIV_CAMION[S.vivienda];
  const muni=CERCANAS[S.origen]?S.origen:(CERCANAS[S.destino]?S.destino:null);
  if(ck){
    const c=CAMION[ck];
    let v=c.v,cost=c.c;
    if(muni){v+=CERCANA_SURCHARGE.v;cost+=CERCANA_SURCHARGE.c;}
    lines.push({cat:'trasteo',l:'Trasteo — '+c.l+' - Destino '+S.destino,detail:VIV_LABEL[S.vivienda]+' · '+S.origen+' → '+S.destino,v:v,c:cost,qty:1});
  }
  if(S.camionExtra){const c=CAMION.pequeno;lines.push({cat:'trasteo',l:'Camión adicional (pequeño)',detail:'Carga extra',v:c.v,c:c.c,qty:1});}
  Object.keys(S.empaque.mat).forEach(k=>{
    const q=S.empaque.mat[k]||0;
    if(q>0&&MAT[k]){
      // Empaque del mismo día: el rollo lleva la labor incluida (tarifa aparte del material)
      const t=(S.empaque.tipo==='express'&&k==='vinipel')?TARIFAS.empaque.expressDia:MAT[k];
      lines.push({cat:'empaque',l:MAT[k].l+' × '+q,detail:S.empaque.tipo==='express'?'Empaque express':'Empaque full',v:t.v*q,c:t.c*q,qty:q});
    }
  });
  ['nevecon','secadora','tv'].forEach(k=>{
    const q=S.inst[k]||0;if(q>0){lines.push({cat:'inst',l:INSTP[k].l+' × '+q,detail:'Instalación',v:INSTP[k].v*q,c:INSTP[k].c*q,qty:q});}
  });
  if(S.caminado){lines.push({cat:'adicionales',l:'Caminado largo',detail:'Valor estimado',v:CAMINADO.v,c:0,qty:1,est:true});}
  if(!S.ascensor&&S.pisos){
    let vEsc=ESCALERA[S.pisos]||ESCALERA[3];
    const cajas=S.empaque.mat.cajas||0;
    if(cajas>45)vEsc+=60000;else if(cajas>=20)vEsc+=30000;
    lines.push({cat:'adicionales',l:'Escaleras (piso '+S.pisos+(S.pisos>=5?'+':'')+')',detail:'Valor estimado — ajustable según lugar',v:vEsc,c:0,qty:1,est:true});
  }
  if(S.bodegaje&&S.bodSize&&BOD_CLIENTE[S.bodSize]){const b=BOD_CLIENTE[S.bodSize];lines.push({cat:'bodegaje',l:'Bodegaje '+b.l,detail:'Almacenamiento mensual',v:b.v,c:b.c,qty:1});}
  return lines;
}

/* ============================================
   MODELO DEL COTIZADOR INTERNO (lo usa MarIAna)
   Solo trasteo URBANO. Nacional (expreso o compartido) tiene
   valores abiertos: lo cotiza un asesor humano.
   ============================================ */
const CIUDAD_NORM={bogota:'Bogotá',chia:'Chía',cajica:'Cajicá',cota:'Cota',madrid:'Madrid'};
function normCiudad(x){
  const k=String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]/g,'');
  return CIUDAD_NORM[k]||null;
}
function sinTildes(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');}
function num(x){return Math.max(0,parseInt(x,10)||0);}

function valorAdicional(k,operarios){
  const a=TARIFAS.adicionales[k];
  if(!a)return{c:0,v:0};
  if(a.modo==='operario')return{c:a.operario.c*operarios,v:a.operario.v*operarios};
  return{c:a.fijo.c,v:a.fijo.v};
}

function cotizarInterno(d){
  d=d||{};
  const lines=[],faltan=[];
  const tipoServicio=String(d.tipo_servicio||'urbano').toLowerCase();
  if(tipoServicio!=='urbano')return{ok:false,nacional:true,tipo_servicio:tipoServicio};

  const origen=normCiudad(d.origen||'Bogotá'),destino=normCiudad(d.destino||'Bogotá');
  if((d.origen&&!origen)||(d.destino&&!destino))return{ok:false,fueraCobertura:true};

  // 1. Trasteo
  const tam=TRASTEO[d.tamano]?d.tamano:null;
  if(!tam)faltan.push('tamano');
  const operarios=tam?TRASTEO[tam].operarios:2;
  if(tam){
    const t=TRASTEO[tam],qty=Math.max(1,num(d.camiones)||1);
    const muni=CERCANAS[origen]?origen:(CERCANAS[destino]?destino:null);
    let v=t.v*qty,c=t.c*qty;
    if(muni){v+=CERCANA_SURCHARGE.v;c+=CERCANA_SURCHARGE.c;}
    lines.push({cat:'trasteo',l:'Trasteo Urbano '+t.l+(qty>1?' × '+qty:''),
      detail:t.vehiculo+' · '+t.operarios+' operarios · '+origen+' → '+destino,v:v,c:c,qty:qty,cu:t.c,vu:t.v});
  }

  // 2. Empaque
  const emp=d.empaque||{},tipoEmp=emp.tipo||'ninguno';
  if(tipoEmp==='express'){
    const r=num(emp.rollos)||(tam?(tam==='grande'?3:2):0);
    const t=TARIFAS.empaque.expressDia;
    if(r>0)lines.push({cat:'empaque',l:'Vinipel × '+r,detail:'Empaque del mismo día',
      v:t.v*r,c:t.c*r,qty:r,cu:t.c,vu:t.v});
  }else if(tipoEmp==='full'){
    const mats=emp.materiales||empDefaults(tam==='grande'?'familiar':(tam||'mediano'),'full');
    Object.keys(MATS).forEach(k=>{
      const q=num(mats[k]);
      if(q>0)lines.push({cat:'empaque',l:MATS[k].l+' × '+q,detail:'Empaque full',
        v:MATS[k].v*q,c:MATS[k].c*q,qty:q,cu:MATS[k].c,vu:MATS[k].v});
    });
    const empacadores=num(emp.empacadores)||2;
    const dias=num(emp.dias)||(num(mats.cajas)>=45?2:1);
    lines.push({cat:'empaque',l:'Empacadores ('+empacadores+'×'+dias+'d)',detail:'Solo costo',
      v:0,c:TARIFAS.empaque.empacadorDia.c*empacadores*dias,noV:true,qty:empacadores*dias,cu:TARIFAS.empaque.empacadorDia.c,vu:0});
    lines.push({cat:'empaque',l:'Transporte × 1',detail:'Materiales de empaque, solo costo',
      v:0,c:TARIFAS.empaque.transporte.c,noV:true,qty:1,cu:TARIFAS.empaque.transporte.c,vu:0});
    const cintas=num(emp.cintas);
    if(cintas>0)lines.push({cat:'empaque',l:'Cintas × '+cintas,detail:'Solo costo',
      v:0,c:TARIFAS.empaque.cinta.c*cintas,noV:true,qty:cintas,cu:TARIFAS.empaque.cinta.c,vu:0});
  }

  // 3. Instalaciones (etiqueta sin tilde: así la reconoce el Sheet)
  const inst=d.instalaciones||{};
  Object.keys(INST).forEach(k=>{
    const q=num(inst[k]);
    if(q>0)lines.push({cat:'inst',l:sinTildes(INST[k].l)+' x '+q,detail:'Instalación',
      v:INST[k].v*q,c:INST[k].c*q,qty:q,cu:INST[k].c,vu:INST[k].v});
  });

  // 4. Desempaque (por operario y día)
  const des=d.desempaque||{},desOp=num(des.operarios),desDias=Math.max(1,num(des.dias)||1);
  if(desOp>0)lines.push({cat:'desempaque',l:'Desempaque '+desOp+' op × '+desDias+' día(s)',
    v:TARIFAS.desempaque.v*desOp*desDias,c:TARIFAS.desempaque.c*desOp*desDias,
    qty:desOp*desDias,cu:TARIFAS.desempaque.c,vu:TARIFAS.desempaque.v});

  // 5. Bodegaje
  if(BOD[d.bodegaje]){const b=BOD[d.bodegaje];
    lines.push({cat:'bodegaje',l:'Bodegaje '+b.l,detail:'Almacenamiento mensual',v:b.v,c:b.c,qty:1,cu:b.c,vu:b.v});}

  // 6. Adicionales
  const ad=d.adicionales||{};
  if(ad.caminado){
    const q=Math.max(1,num(ad.caminado)||1),t=valorAdicional('caminado',operarios);
    lines.push({cat:'adicionales',l:'Caminado × '+q,detail:'Más de 50 metros',
      v:t.v*q,c:t.c*q,qty:q,cu:t.c,vu:t.v,est:true});
  }
  const piso=num(ad.pisos_sin_ascensor);
  if(piso>=3){
    const p=Math.min(piso,5),esc=TARIFAS.adicionales.escaleras;
    const v=esc.modo==='operario'?esc.operario.v*operarios:esc.fijo.v[p];
    const c=esc.modo==='operario'?esc.operario.c*operarios:esc.fijo.c;
    lines.push({cat:'adicionales',l:'Escaleras (piso '+p+(p>=5?'+':'')+')',detail:'Desde tercer piso',
      v:v,c:c,qty:1,cu:c,vu:v,est:true});
  }
  const paradas=num(ad.paradas);
  if(paradas>0){const t=valorAdicional('parada',operarios);
    lines.push({cat:'adicionales',l:'Parada adicional × '+paradas,v:t.v*paradas,c:t.c*paradas,qty:paradas,cu:t.c,vu:t.v});}
  if(ad.fachada)return{ok:false,requiereVisita:true,motivo:'Manipulación por fachada'};

  const total=lines.reduce((a,l)=>a+l.v,0),costo=lines.reduce((a,l)=>a+(l.c||0),0);
  return{ok:faltan.length===0,faltan:faltan,origen:origen,destino:destino,tamano:tam,
    vehiculo:tam?TRASTEO[tam].vehiculo:'',operarios:operarios,
    lines:lines,total:total,costo:costo,utilidad:total-costo,
    utilidadBaja:faltan.length===0&&(total-costo)<TARIFAS.utilidadMinima};
}

const api={TARIFAS,DEFAULTS,SUGERIDO_EXCEL,TRASTEO_INFO,MAT_INFO,INST_INFO,BOD_INFO,ADIC_INFO,
  TRASTEO,MATS,INST,BOD,ADIC,CAMION,MAT,INSTP,BOD_CLIENTE,CAMINADO,ESCALERA,
  VIV_LABEL,VIV_CAMION,CERCANAS,
  get CERCANA_SURCHARGE(){return CERCANA_SURCHARGE;},
  get UTILIDAD_MINIMA(){return TARIFAS.utilidadMinima;},
  aplicar,restaurarBase,exportar,meta,cargarTarifas,sincronizar,
  empDefaults,buildLines,normCiudad,cotizarInterno,valorAdicional};
root.TYCotizador=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
