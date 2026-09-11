// ============ MOTOR INTELIGENTE DE SELECCIÓN DE VEHÍCULO ============
// Trasteos Ya — Autoaprendizaje + Cotización Preliminar
// Fuentes: TRASTEO, INST, MATS, BOD, ADIC (cotizador.html)

(function(){
'use strict';

// ── Vehículos y capacidades oficiales ──
const VEHICULOS={
  carry:{nombre:'Carry',capacidad:6,operarios:1,costo:160000,apto:['objetos pequeños','cajas','documentos']},
  luv:{nombre:'Luv',capacidad:10,operarios:1,costo:160000,apto:['apartaestudio pequeño','pocas cajas','individual']},
  nhr:{nombre:'NHR',capacidad:16,operarios:2,costo:250000,apto:['apartaestudio','<60m²','pocas cosas','soltero']},
  turbo:{nombre:'Turbo',capacidad:28,operarios:3,costo:320000,apto:['apto mediano','60-85m²','pareja','familia pequeña']},
  sencillo:{nombre:'Sencillo',capacidad:45,operarios:4,costo:380000,apto:['apto grande','>85m²','casa','familia']}
};

// ── Volúmenes estimados por tipo de objeto (m³) ──
const VOL_REF={
  // Muebles grandes
  'cama doble':1.8,'cama sencilla':1.2,'cama':1.5,'camarote':2.0,
  'armario':1.5,'closet':1.5,'ropero':1.5,'guardarropa':1.5,
  'comedor':1.8,'mesa comedor':1.2,'sillas comedor':0.3,
  'sofá':2.0,'sofa':2.0,'mueble sala':1.8,'sala':3.5,
  'biblioteca':1.5,'librero':1.2,'escritorio':1.0,
  'mesa':0.8,'mesa de noche':0.3,'nochero':0.3,
  'tocador':0.8,'peinador':0.8,
  // Electrodomésticos
  'nevera':1.5,'nevecón':2.0,'nevecon':2.0,
  'lavadora':0.8,'secadora':0.7,
  'estufa':0.6,'horno':0.3,
  'tv':0.2,'televisor':0.2,
  'aire acondicionado':0.5,'ventilador':0.2,
  'microondas':0.1,
  // Cajas y otros
  'caja':0.06,'cajas':0.06,
  'maleta':0.15,'bolsa':0.08,
  'bicicleta':0.5,'bici':0.5,
  'colchón':1.0,'colchon':1.0,
  'piano':2.5,
  'espejo':0.3,'cuadro':0.1,
  'lámpara':0.1,'lampara':0.1,
  'tapete':0.2,'alfombra':0.3,
  'silla':0.3,'poltrona':0.8,'mecedora':0.6
};

// ── Historial de aprendizaje (localStorage) ──
const HIST_KEY='mi_historial';
function getHistorial(){try{return JSON.parse(localStorage.getItem(HIST_KEY))||[];}catch(e){return[];}}
function saveHistorial(h){try{localStorage.setItem(HIST_KEY,JSON.stringify(h));}catch(e){}}

// ── Parsear texto de WhatsApp ──
function parsearWhatsApp(texto){
  const result={
    cliente:'',telefono:'',
    origen:'',destino:'',fecha:'',
    inventario:[],
    condicionantes:[],
    observaciones:'',
    textoOriginal:texto
  };
  if(!texto)return result;
  const t=texto.toLowerCase();
  const lineas=texto.split('\n').map(l=>l.trim()).filter(l=>l);

  // Detectar nombre (líneas con "nombre:", "cliente:", "soy", "me llamo")
  for(const l of lineas){
    const ll=l.toLowerCase();
    if(/nombre\s*[:=]/i.test(l))result.cliente=l.replace(/nombre\s*[:=]\s*/i,'').trim().toUpperCase();
    else if(/cliente\s*[:=]/i.test(l))result.cliente=l.replace(/cliente\s*[:=]\s*/i,'').trim().toUpperCase();
    else if(/me llamo|soy\s/i.test(l)&&!result.cliente){
      const m=l.match(/(?:me llamo|soy)\s+(.+)/i);
      if(m)result.cliente=m[1].replace(/[,.].*$/,'').trim().toUpperCase();
    }
  }

  // Detectar teléfono
  const telMatch=texto.match(/(?:tel[eéf]fono|cel|whatsapp|wa|número|numero|contacto)\s*[:=]?\s*(\+?\d[\d\s\-]{6,})/i);
  if(telMatch)result.telefono=telMatch[1].replace(/[\s\-]/g,'');
  else{const tel2=texto.match(/\b(3\d{9})\b/);if(tel2)result.telefono=tel2[1];}

  // Detectar origen/destino — patrón "De X a Y" primero (sin cruzar líneas)
  const deAMatch=texto.match(/\bde\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ ]{2,30}?)\s+(?:a|para|hacia)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ ]{2,30})\s*$/im);
  if(deAMatch){
    result.origen=deAMatch[1].trim();
    result.destino=deAMatch[2].trim();
  }else{
    const deMatch=texto.match(/(?:desde|salgo de|dirección actual|direccion actual|origen)\s*[:=]?\s*([^\n,]{3,40})/i);
    if(deMatch)result.origen=deMatch[1].trim();
    const aMatch=texto.match(/(?:me mudo a|voy para|nueva dirección|nueva direccion|destino)\s*[:=]?\s*([^\n,]{3,40})/i);
    if(aMatch)result.destino=aMatch[1].trim();
  }

  // Detectar fecha
  const fechaMatch=texto.match(/(?:fecha|día|dia|cuando|para el|el día|el dia|mudarme el)\s*[:=]?\s*(\d{1,2}\s+de\s+\w+(?:\s+de\s+\d{4})?|\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4})/i);
  if(fechaMatch)result.fecha=fechaMatch[1].trim();

  // Detectar inventario
  const items=[];
  for(const l of lineas){
    // Patrones: "2 camas", "1 nevera", "nevera", "30 cajas", etc.
    const itemMatch=l.match(/(\d+)\s+(.+)/i);
    if(itemMatch){
      const cant=parseInt(itemMatch[1]);
      const desc=itemMatch[2].replace(/[-–•·]\s*/,'').trim().toLowerCase();
      if(cant>0&&cant<500&&desc.length>1&&!/nombre|cliente|tel|cel|dir|fecha|de:|a:|origen|destino|octubre|noviembre|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|sin ascensor|piso\s|escaler|mudarme|necesito|numero|whatsapp/i.test(desc)){
        items.push({cantidad:cant,descripcion:desc,volumen:estimarVolumen(desc,cant)});
      }
    }else{
      // Líneas sin número al inicio (asume 1)
      const desc=l.replace(/^[-–•·]\s*/,'').trim().toLowerCase();
      for(const [key,vol] of Object.entries(VOL_REF)){
        if(desc.includes(key)&&desc.length<60){
          items.push({cantidad:1,descripcion:desc,volumen:vol});
          break;
        }
      }
    }
  }
  result.inventario=items;

  // Detectar condicionantes
  if(/escaler/i.test(t))result.condicionantes.push('escaleras');
  if(/ascensor/i.test(t))result.condicionantes.push('ascensor');
  if(/piso\s*(\d+)/i.test(t)){const p=t.match(/piso\s*(\d+)/i);result.condicionantes.push('piso '+p[1]);}
  if(/caminad|caminar|lejos/i.test(t))result.condicionantes.push('caminado');
  if(/fachada/i.test(t))result.condicionantes.push('fachada');
  if(/segundo viaje|2do viaje|doble viaje/i.test(t))result.condicionantes.push('segundo viaje');
  if(/nacional|otra ciudad|interciudad/i.test(t))result.condicionantes.push('nacional');
  if(/parqueo|parquear|no hay donde/i.test(t))result.condicionantes.push('restricción parqueo');
  if(/piano|caja fuerte|pecera|delicad/i.test(t))result.condicionantes.push('elementos especiales');
  if(/bodega/i.test(t))result.condicionantes.push('bodegaje');

  // Observaciones: todo lo que no se parseó bien
  const obs=lineas.filter(l=>{
    const ll=l.toLowerCase();
    return ll.length>10&&!/^\d+\s/.test(l)&&!/nombre|cliente|tel|fecha|origen|destino|de:|a:/i.test(ll);
  });
  if(obs.length)result.observaciones=obs.join(' | ');

  return result;
}

function estimarVolumen(desc,cant){
  const d=desc.toLowerCase();
  for(const [key,vol] of Object.entries(VOL_REF)){
    if(d.includes(key))return vol*cant;
  }
  return 0.1*cant; // default conservador
}

// ── Motor de decisión ──
function decidirVehiculo(inventario,condicionantes){
  let volTotal=0;
  let tieneEspeciales=false;
  let tieneElectro=false;
  let tieneMuebles=false;

  for(const item of inventario){
    volTotal+=item.volumen||0;
    const d=item.descripcion.toLowerCase();
    if(/piano|pecera|caja fuerte|vidrio|espejo gran/i.test(d))tieneEspeciales=true;
    if(/nevera|nevecón|nevecon|lavadora|secadora|estufa/i.test(d))tieneElectro=true;
    if(/cama|armario|closet|sofá|sofa|comedor|sala|biblioteca|escritorio/i.test(d))tieneMuebles=true;
  }

  // Margen de seguridad 20%
  const volConMargen=volTotal*1.2;

  // Buscar histórico similar
  const historico=buscarHistoricoSimilar(volTotal,inventario.length);

  // Determinar vehículo
  let recomendado='';
  let confianza='ALTA';
  let motivo='';
  let alternativa='';

  if(condicionantes.includes('nacional')){
    recomendado='sencillo';
    motivo='Servicio nacional requiere evaluación con asesor';
    confianza='BAJA';
  }else if(volConMargen<=10){
    recomendado='nhr';
    motivo='Volumen estimado '+volTotal.toFixed(1)+' m³ (con margen: '+volConMargen.toFixed(1)+' m³) cabe en NHR (16 m³)';
    if(volConMargen<=6&&!tieneMuebles&&!tieneElectro){
      alternativa='Luv podría servir si no hay muebles grandes';
    }
  }else if(volConMargen<=16){
    recomendado='nhr';
    motivo='Volumen estimado '+volTotal.toFixed(1)+' m³ (con margen: '+volConMargen.toFixed(1)+' m³) cabe en NHR (16 m³)';
    if(volConMargen>13){
      confianza='MEDIA';
      motivo+=' — cercano al límite, podría requerir Turbo';
      alternativa='turbo';
    }
  }else if(volConMargen<=28){
    recomendado='turbo';
    motivo='Volumen estimado '+volTotal.toFixed(1)+' m³ (con margen: '+volConMargen.toFixed(1)+' m³) requiere Turbo (28 m³)';
    if(volConMargen>24){
      confianza='MEDIA';
      motivo+=' — cercano al límite, podría requerir Sencillo';
      alternativa='sencillo';
    }
  }else if(volConMargen<=45){
    recomendado='sencillo';
    motivo='Volumen estimado '+volTotal.toFixed(1)+' m³ (con margen: '+volConMargen.toFixed(1)+' m³) requiere Sencillo (45 m³)';
  }else{
    recomendado='sencillo';
    confianza='BAJA';
    motivo='Volumen estimado '+volTotal.toFixed(1)+' m³ excede Sencillo (45 m³). Posible segundo viaje o múltiples camiones.';
  }

  if(tieneEspeciales&&confianza==='ALTA')confianza='MEDIA';

  // Si hay histórico similar, validar
  if(historico){
    if(historico.vehiculoConfirmado&&historico.vehiculoConfirmado!==recomendado){
      motivo+=' | Antecedente histórico similar usó '+historico.vehiculoConfirmado;
      confianza='MEDIA';
    }
  }

  // Mapear a tipo de trasteo
  let tipoTrasteo='mediano';
  if(recomendado==='nhr'||recomendado==='luv'||recomendado==='carry')tipoTrasteo='pequeno';
  else if(recomendado==='turbo')tipoTrasteo='mediano';
  else if(recomendado==='sencillo')tipoTrasteo='grande';

  return{
    vehiculoRecomendado:recomendado,
    vehiculoNombre:VEHICULOS[recomendado]?VEHICULOS[recomendado].nombre:recomendado,
    tipoTrasteo:tipoTrasteo,
    volumenEstimado:volTotal,
    volumenConMargen:volConMargen,
    confianza:confianza,
    motivo:motivo,
    alternativa:alternativa,
    tieneEspeciales:tieneEspeciales,
    historico:historico
  };
}

function buscarHistoricoSimilar(vol,numItems){
  const hist=getHistorial();
  if(!hist.length)return null;
  // Buscar servicio con volumen similar (±30%) y cantidad similar (±5 items)
  for(const h of hist){
    if(Math.abs(h.volumenEstimado-vol)<=vol*0.3&&Math.abs(h.numItems-numItems)<=5){
      return h;
    }
  }
  return null;
}

// ── Generar cotización preliminar ──
function generarCotizacionPreliminar(datos,decision){
  const tipo=decision.tipoTrasteo;
  const tarifa=TRASTEO[tipo];
  let items=[];
  let totalVenta=0;
  let totalCosto=0;

  // Trasteo base
  items.push({cat:'trasteo',desc:'Trasteo Urbano '+tarifa.l,costo:tarifa.c,venta:tarifa.v});
  totalVenta+=tarifa.v;
  totalCosto+=tarifa.c;

  // Detectar instalaciones del inventario
  for(const item of datos.inventario){
    const d=item.descripcion.toLowerCase();
    if(/nevec[oó]n|nevecon/i.test(d)){
      items.push({cat:'instalacion',desc:'Instalación Nevecón',costo:INST.nevecon.c,venta:INST.nevecon.v});
      totalVenta+=INST.nevecon.v;totalCosto+=INST.nevecon.c;
    }
    if(/secadora/i.test(d)){
      items.push({cat:'instalacion',desc:'Instalación Secadora',costo:INST.secadora.c,venta:INST.secadora.v});
      totalVenta+=INST.secadora.v;totalCosto+=INST.secadora.c;
    }
    if(/tv|televisor/i.test(d)){
      items.push({cat:'instalacion',desc:'Instalación TV',costo:INST.tv.c,venta:INST.tv.v});
      totalVenta+=INST.tv.v;totalCosto+=INST.tv.c;
    }
  }

  // Condicionantes → adicionales
  if(datos.condicionantes.includes('escaleras')){
    items.push({cat:'adicional',desc:'Escaleras (desde)',costo:60000,venta:80000});
    totalVenta+=80000;totalCosto+=60000;
  }
  if(datos.condicionantes.includes('caminado')){
    const ops=VEHICULOS[decision.vehiculoRecomendado]?VEHICULOS[decision.vehiculoRecomendado].operarios:2;
    const c=25000*ops;const v=35000*ops;
    items.push({cat:'adicional',desc:'Caminado ('+ops+' op.)',costo:c,venta:v});
    totalVenta+=v;totalCosto+=c;
  }
  if(datos.condicionantes.includes('fachada')){
    items.push({cat:'adicional',desc:'Manipulación fachada (sujeto a visita)',costo:0,venta:0});
  }

  return{items,totalVenta,totalCosto,utilidad:totalVenta-totalCosto};
}

// ── Registrar en historial de aprendizaje ──
function registrarDecision(datos,decision,cotizacion,correccion){
  const registro={
    fecha:new Date().toISOString(),
    cliente:datos.cliente,
    inventarioResumen:datos.inventario.map(i=>i.cantidad+' '+i.descripcion).join(', '),
    numItems:datos.inventario.length,
    volumenEstimado:decision.volumenEstimado,
    condicionantes:datos.condicionantes,
    vehiculoRecomendado:decision.vehiculoRecomendado,
    confianza:decision.confianza,
    vehiculoConfirmado:correccion||decision.vehiculoRecomendado,
    corregido:!!correccion&&correccion!==decision.vehiculoRecomendado,
    totalVenta:cotizacion.totalVenta,
    textoOriginal:datos.textoOriginal
  };
  const hist=getHistorial();
  hist.unshift(registro);
  if(hist.length>200)hist.length=200;
  saveHistorial(hist);
  return registro;
}

// ── UI ──
function abrirMotor(){
  document.getElementById('motorOverlay').style.display='flex';
  document.getElementById('motorTexto').value='';
  document.getElementById('motorResultado').innerHTML='';
  document.getElementById('motorTexto').focus();
}
function cerrarMotor(){document.getElementById('motorOverlay').style.display='none';}

function analizarMotor(){
  const texto=document.getElementById('motorTexto').value.trim();
  if(!texto){alert('Pega el texto del WhatsApp');return;}

  const datos=parsearWhatsApp(texto);
  const decision=decidirVehiculo(datos.inventario,datos.condicionantes);
  const cotizacion=generarCotizacionPreliminar(datos,decision);

  // Guardar en window para cargar después
  window._motorDatos=datos;
  window._motorDecision=decision;
  window._motorCotizacion=cotizacion;

  renderResultado(datos,decision,cotizacion);
}

function renderResultado(datos,decision,cotizacion){
  const el=document.getElementById('motorResultado');
  const confColor=decision.confianza==='ALTA'?'#15803d':decision.confianza==='MEDIA'?'#b45309':'#dc2626';
  const confBg=decision.confianza==='ALTA'?'#dcfce7':decision.confianza==='MEDIA'?'#fef3c7':'#fee2e2';

  let validacionHTML='';
  if(decision.confianza==='BAJA'){
    validacionHTML=`<div style="background:#fee2e2;border:1px solid #fca5a5;padding:10px;border-radius:8px;margin:8px 0;font-size:13px">
      <b>Requiere validación:</b> ${decision.motivo}
    </div>`;
  }else if(decision.confianza==='MEDIA'&&decision.alternativa){
    validacionHTML=`<div style="background:#fef3c7;border:1px solid #fcd34d;padding:10px;border-radius:8px;margin:8px 0;font-size:13px">
      <b>Revisar:</b> ${decision.motivo}
    </div>`;
  }

  let itemsHTML=cotizacion.items.map(i=>`
    <tr>
      <td style="padding:4px 8px;font-size:13px">${i.desc}</td>
      <td style="padding:4px 8px;text-align:right;font-size:13px">${i.venta?COP(i.venta):'Pendiente'}</td>
    </tr>
  `).join('');

  // Opciones de vehículo para corrección
  const vOpts=Object.keys(VEHICULOS).map(k=>`<option value="${k}" ${k===decision.vehiculoRecomendado?'selected':''}>${VEHICULOS[k].nombre} (${VEHICULOS[k].capacidad} m³)</option>`).join('');

  el.innerHTML=`
    <div style="margin-top:12px">
      <!-- Datos detectados -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#334155">Datos detectados</div>
        ${datos.cliente?'<div style="font-size:13px"><b>Cliente:</b> '+datos.cliente+'</div>':''}
        ${datos.telefono?'<div style="font-size:13px"><b>Tel:</b> '+datos.telefono+'</div>':''}
        ${datos.origen?'<div style="font-size:13px"><b>Origen:</b> '+datos.origen+'</div>':''}
        ${datos.destino?'<div style="font-size:13px"><b>Destino:</b> '+datos.destino+'</div>':''}
        ${datos.fecha?'<div style="font-size:13px"><b>Fecha:</b> '+datos.fecha+'</div>':''}
      </div>

      <!-- Inventario -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#334155">Inventario (${datos.inventario.length} items) — Vol. estimado: ${decision.volumenEstimado.toFixed(1)} m³</div>
        ${datos.inventario.length?datos.inventario.map(i=>'<span style="display:inline-block;background:#e8edfb;color:#1e3a8a;padding:2px 8px;border-radius:4px;font-size:12px;margin:2px">'+i.cantidad+' '+i.descripcion+'</span>').join(''):'<div style="font-size:12px;color:#94a3b8">No se detectaron items específicos</div>'}
        ${datos.condicionantes.length?'<div style="margin-top:6px">'+datos.condicionantes.map(c=>'<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;margin:2px">'+c+'</span>').join('')+'</div>':''}
      </div>

      <!-- Recomendación -->
      <div style="background:${confBg};border:1px solid ${confColor}33;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-weight:700;font-size:16px;color:${confColor}">${decision.vehiculoNombre}</span>
          <span style="background:${confColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${decision.confianza}</span>
        </div>
        <div style="font-size:12px;color:#475569">${decision.motivo}</div>
      </div>

      ${validacionHTML}

      <!-- Corrección -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#334155">Corrección (si aplica)</div>
        <select id="motorCorreccion" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px" onchange="corregirMotor()">
          ${vOpts}
        </select>
      </div>

      <!-- Cotización preliminar -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#334155">Cotización preliminar</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid #e2e8f0"><th style="text-align:left;padding:4px 8px;font-size:12px;color:#64748b">Concepto</th><th style="text-align:right;padding:4px 8px;font-size:12px;color:#64748b">Venta</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
          <tfoot><tr style="border-top:2px solid #1e3a8a"><td style="padding:6px 8px;font-weight:700;font-size:14px">TOTAL</td><td style="padding:6px 8px;text-align:right;font-weight:700;font-size:14px;color:#1e3a8a">${COP(cotizacion.totalVenta)}</td></tr></tfoot>
        </table>
      </div>

      <!-- Botones -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="cargarAlCotizador()" style="flex:1;padding:10px;background:#003DA5;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Cargar al cotizador</button>
        <button onclick="registrarYCerrar()" style="flex:1;padding:10px;background:#15803d;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Registrar</button>
      </div>
      ${datos.observaciones?'<div style="margin-top:8px;font-size:11px;color:#94a3b8"><b>Obs:</b> '+datos.observaciones+'</div>':''}
    </div>
  `;
}

function corregirMotor(){
  const nuevoVehiculo=document.getElementById('motorCorreccion').value;
  const datos=window._motorDatos;
  if(!datos)return;

  // Recalcular con nuevo vehículo
  let tipoTrasteo='mediano';
  if(nuevoVehiculo==='nhr'||nuevoVehiculo==='luv'||nuevoVehiculo==='carry')tipoTrasteo='pequeno';
  else if(nuevoVehiculo==='turbo')tipoTrasteo='mediano';
  else if(nuevoVehiculo==='sencillo')tipoTrasteo='grande';

  window._motorDecision.vehiculoRecomendado=nuevoVehiculo;
  window._motorDecision.vehiculoNombre=VEHICULOS[nuevoVehiculo].nombre;
  window._motorDecision.tipoTrasteo=tipoTrasteo;

  const cotizacion=generarCotizacionPreliminar(datos,window._motorDecision);
  window._motorCotizacion=cotizacion;
  renderResultado(datos,window._motorDecision,cotizacion);
  // Mantener la selección del dropdown
  setTimeout(()=>{
    const sel=document.getElementById('motorCorreccion');
    if(sel)sel.value=nuevoVehiculo;
  },50);
}

function cargarAlCotizador(){
  const datos=window._motorDatos;
  const decision=window._motorDecision;
  if(!datos||!decision)return;

  // Registrar primero
  const correccion=document.getElementById('motorCorreccion')?document.getElementById('motorCorreccion').value:null;
  registrarDecision(datos,decision,window._motorCotizacion,correccion);

  // Llenar datos del cotizador
  if(datos.cliente){const c=document.getElementById('cliente');if(c){c.value=datos.cliente;}}
  if(datos.fecha){const f=document.getElementById('fecha');if(f)f.value=datos.fecha;}

  // Activar módulo trasteo y seleccionar tamaño
  const tipo=decision.tipoTrasteo;
  if(typeof state!=='undefined'){
    state.trasteoQty={pequeno:0,mediano:0,grande:0};
    state.trasteoQty[tipo]=1;
    state.mods.trasteo=true;
    state.cobertura='urbano';
  }

  // Detectar instalaciones y activar
  let hayInst=false;
  for(const item of datos.inventario){
    const d=item.descripcion.toLowerCase();
    if(/nevec[oó]n|nevecon/i.test(d)){
      const el=document.getElementById('inst-nevecon');if(el)el.checked=true;hayInst=true;
    }
    if(/secadora/i.test(d)){
      const el=document.getElementById('inst-secadora');if(el)el.checked=true;hayInst=true;
    }
    if(/tv|televisor/i.test(d)){
      const el=document.getElementById('inst-tv');if(el)el.checked=true;hayInst=true;
    }
  }
  if(hayInst&&typeof state!=='undefined')state.mods.inst=true;

  // Recalcular
  if(typeof recalc==='function')recalc();
  if(typeof buildStaticUI==='function')buildStaticUI();

  cerrarMotor();
  alert('Cotización cargada. Revisa y ajusta los módulos.');
}

function registrarYCerrar(){
  const datos=window._motorDatos;
  const decision=window._motorDecision;
  if(!datos||!decision)return;
  const correccion=document.getElementById('motorCorreccion')?document.getElementById('motorCorreccion').value:null;
  registrarDecision(datos,decision,window._motorCotizacion,correccion);
  cerrarMotor();
}

function verHistorialMotor(){
  const hist=getHistorial();
  const el=document.getElementById('motorResultado');
  if(!hist.length){el.innerHTML='<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">Sin registros de aprendizaje</p>';return;}

  let html='<div style="margin-top:12px">';
  html+='<div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#334155">Aprendizaje ('+hist.length+' registros)</div>';

  for(const h of hist.slice(0,20)){
    const corr=h.corregido?'<span style="color:#dc2626;font-size:11px"> (corregido: '+h.vehiculoRecomendado+' → '+h.vehiculoConfirmado+')</span>':'';
    html+=`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:6px;font-size:12px">
      <div><b>${h.cliente||'Sin nombre'}</b> — ${new Date(h.fecha).toLocaleDateString('es-CO')}${corr}</div>
      <div style="color:#64748b">${h.inventarioResumen.substring(0,100)}${h.inventarioResumen.length>100?'...':''}</div>
      <div>Vol: ${h.volumenEstimado.toFixed(1)} m³ | Vehículo: <b>${h.vehiculoConfirmado}</b> | ${COP(h.totalVenta)}</div>
    </div>`;
  }
  html+='</div>';
  el.innerHTML=html;
}

// Exponer funciones globalmente
window.abrirMotor=abrirMotor;
window.cerrarMotor=cerrarMotor;
window.analizarMotor=analizarMotor;
window.corregirMotor=corregirMotor;
window.cargarAlCotizador=cargarAlCotizador;
window.registrarYCerrar=registrarYCerrar;
window.verHistorialMotor=verHistorialMotor;

})();
