const SU='https://cgsbrbwfsenidwrjekyk.supabase.co';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnc2JyYndmc2VuaWR3cmpla3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTcxMTQsImV4cCI6MjA5NDI3MzExNH0.awEZdfKi353WGDmag0qFhAGR1eXXZtoLZSnVkb4NG74';
const TB='cotizaciones';
const CAMPOS=new Set(['estado','pago_inicial','pago_inicial_medio','pago_final','pago_final_medio','courier','tracking','fecha_estimada','nota_interna']);
const sb=supabase.createClient(SU,SK,{auth:{detectSessionInUrl:false,storageKey:'cp-admin'}});
let data=[],filter='all',expanded=null,_session=null;

function showMsg(id,txt){
  ['msg-info','msg-err','msg-ok'].forEach(x=>{document.getElementById(x).style.display='none';});
  const el=document.getElementById(id);
  el.textContent=txt;
  el.style.display='block';
}

function showAlert(txt,isErr){
  const a=document.getElementById('abar');
  a.textContent=txt;
  a.className='abar '+(isErr?'err':'ok');
  a.style.display='block';
  setTimeout(()=>a.style.display='none',4000);
}

document.getElementById('btnLogin').addEventListener('click',async function(){
  const email=document.getElementById('email').value.trim();
  const pwd=document.getElementById('pwd').value;
  if(!email||!pwd){showMsg('msg-err','Completa email y contraseña');return;}
  this.textContent='Ingresando...';this.disabled=true;
  const{data:d,error}=await sb.auth.signInWithPassword({email,password:pwd});
  this.textContent='Ingresar al Panel';this.disabled=false;
  if(error){showMsg('msg-err','Credenciales incorrectas');return;}
  _session=d.session;
  document.getElementById('login').style.display='none';
  document.getElementById('app').style.display='block';
  load();
});

document.getElementById('pwd').addEventListener('keydown',function(e){
  if(e.key==='Enter') document.getElementById('btnLogin').click();
});

(async()=>{
  const{data:{session}}=await sb.auth.getSession();
  if(session){
    _session=session;
    document.getElementById('login').style.display='none';
    document.getElementById('app').style.display='block';
    load();
  }
})();

sb.auth.onAuthStateChange((event,session)=>{
  if(event==='TOKEN_REFRESHED'&&session){
    _session=session;
  } else if(event==='SIGNED_OUT'||!session){
    _session=null;
    data=[];
    document.getElementById('tbody').innerHTML='';
    document.getElementById('card-list').innerHTML='';
    document.getElementById('login').style.display='flex';
    document.getElementById('app').style.display='none';
    showMsg('msg-info','Sesión expirada. Inicia sesión de nuevo.');
  }
});

async function doLogout(){
  await sb.auth.signOut();
  _session=null;
  data=[];expanded=null;
  document.getElementById('tbody').innerHTML='';
  document.getElementById('card-list').innerHTML='';
  document.getElementById('login').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('email').value='';
  document.getElementById('pwd').value='';
  showMsg('msg-info','Sesión cerrada');
}

async function api(method,path,body){
  const token=_session?.access_token;
  const opts={method,headers:{
    'apikey':SK,'Authorization':'Bearer '+token,'Content-Type':'application/json',
    'Prefer':method==='POST'?'return=representation':'return=minimal'
  }};
  if(body) opts.body=JSON.stringify(body);
  const r=await fetch(SU+'/rest/v1/'+path,opts);
  const txt=await r.text();
  if(!r.ok) throw new Error('HTTP '+r.status+': '+txt.slice(0,200));
  if(r.status===204||!txt) return null;
  return JSON.parse(txt);
}

async function load(){
  const sync=document.getElementById('sync');
  sync.textContent='⟳ Cargando...';
  sync.style.color='var(--gt)';
  try{
    data=await api('GET',TB+'?order=created_at.desc&limit=500')||[];
    sync.style.color='#4caf50';
    sync.textContent='● Conectado ('+data.length+' registros)';
    render();
  }catch(e){
    sync.style.color='#ff6666';
    sync.textContent='⚠ Error';
    document.getElementById('tbl-status').textContent='Error al cargar datos';
    document.getElementById('tbl-status').style.display='block';
    console.error(e);
  }
}

function sf(f,el){filter=f;document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');render();}

function getFiltered(){
  if(filter==='all') return data;
  if(['web','whatsapp','instagram'].includes(filter)) return data.filter(d=>d.fuente===filter);
  return data.filter(d=>d.estado===filter);
}

function esc(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function sid(id){const n=parseInt(id);return(Number.isInteger(n)&&n>0)?n:null;}
function b(cls,txt){return '<span class="badge '+cls+'">'+txt+'</span>';}
function bfuente(f){return f==='whatsapp'?b('bwa','📱 WA'):f==='instagram'?b('big','📸 IG'):b('bweb','🌐 Web');}
function bestado(s){
  const m={
    pendiente:      ['bpenv','⏳ Pendiente'],
    cotizacion_enviada:['benv','✉ Cot. enviada'],
    confirmado:     ['bpag','✅ Confirmado'],
    en_camino:      ['btra','🚢 En camino'],
    listo_entrega:  ['blis','📦 Listo entrega'],
    entregado:      ['bent','🏁 Entregado'],
    cancelado:      ['bnopag','❌ Cancelado']
  };
  const v=m[s]||['bsp','⏳ Pendiente']; return b(v[0],v[1]);
}
function bpago(s){return s==='pagado'?b('bpag','✓ Pagado'):b('bnopag','⏳ Pendiente');}
function fdate(d){try{return new Date(d).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit'});}catch(e){return '';}}

function sel(field,id,val,opts){
  return '<select class="inl" data-id="'+id+'" data-field="'+field+'">'+
    opts.map(o=>'<option value="'+o[0]+'"'+(val===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
}

function detailHTML(q){
  return '<tr id="det-'+q.id+'"><td colspan="10" style="padding:16px 20px;background:rgba(204,0,0,.03)">'
    +'<div class="drow"><div class="dfull"><div class="dlabel">Estado del pedido</div>'
    +sel('estado',sid(q.id),q.estado||'pendiente',[
      ['pendiente','⏳ Pendiente'],
      ['cotizacion_enviada','✉ Cotización enviada'],
      ['confirmado','✅ Confirmado (50% pagado)'],
      ['en_camino','🚢 En camino'],
      ['listo_entrega','📦 Listo para entrega'],
      ['entregado','🏁 Entregado'],
      ['cancelado','❌ Cancelado']
    ])
    +'</div></div>'
    +'<div class="drow"><div><div class="dlabel">Pago inicial 50%</div>'
    +sel('pago_inicial',sid(q.id),q.pago_inicial,[['pendiente','⏳ Pendiente'],['pagado','✓ Pagado']])
    +sel('pago_inicial_medio',sid(q.id),q.pago_inicial_medio||'',[['','Medio...'],['transferencia','🏦 Transferencia'],['flow','Flow']])
    +'</div><div><div class="dlabel">Saldo final 50%</div>'
    +sel('pago_final',sid(q.id),q.pago_final,[['pendiente','⏳ Pendiente'],['pagado','✓ Pagado']])
    +sel('pago_final_medio',sid(q.id),q.pago_final_medio||'',[['','Medio...'],['transferencia','🏦 Transferencia'],['flow','Flow']])
    +'</div></div>'
    +'<div class="drow"><div><div class="dlabel">Courier</div>'
    +sel('courier',sid(q.id),q.courier||'',[['','Sin asignar'],['Chile Express','Chile Express'],['Starken','Starken'],['Retiro en Santiago','Retiro Santiago'],['Otro','Otro']])
    +'</div><div><div class="dlabel">N° Tracking</div>'
    +'<input class="inl" value="'+esc(q.tracking||'')+'" placeholder="Número seguimiento" data-id="'+sid(q.id)+'" data-field="tracking"></div></div>'
    +'<div class="drow"><div><div class="dlabel">Fecha estimada</div>'
    +'<input class="inl" type="date" value="'+esc(q.fecha_estimada||'')+'" data-id="'+sid(q.id)+'" data-field="fecha_estimada"></div>'
    +'<div><div class="dlabel">Repuesto</div><div style="font-size:13px;color:#ccc;line-height:1.5">'+esc(q.repuesto)+'</div></div></div>'
    +'<div class="drow"><div class="dfull"><div class="dlabel">Nota interna</div>'
    +'<textarea class="inl" data-id="'+sid(q.id)+'" data-field="nota_interna">'+esc(q.nota_interna||'')+'</textarea></div></div>'
    +'</td></tr>';
}

function cardHTML(q){
  const isExp=expanded===q.id;
  return '<div style="background:var(--g);border:1px solid var(--b);border-radius:4px;margin-bottom:10px;overflow:hidden;">'
    +'<div style="padding:14px 16px;cursor:pointer;" data-action="toggleExp" data-id="'+sid(q.id)+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
    +'<div style="font-weight:700;font-size:15px;">'+esc(q.nombre)+'</div>'
    +'<div style="font-size:11px;color:var(--gt)">'+fdate(q.created_at)+'</div></div>'
    +'<div style="font-size:13px;color:var(--gt);margin-bottom:8px;">'+esc(q.marca||'')+' '+esc(q.modelo||'')+' '+esc(q.anio||'')+'</div>'
    +'<div style="font-size:13px;color:#ccc;margin-bottom:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(q.repuesto)+'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
    +bestado(q.estado)+bfuente(q.fuente)
    +'<div style="margin-left:auto;font-size:12px;color:var(--gt)">'+(isExp?'▲':'▼')+'</div>'
    +'</div></div>'
    +(isExp?'<div style="border-top:1px solid var(--b);padding:14px 16px;">'
      +'<div style="margin-bottom:12px;"><div class="dlabel">Estado</div>'
      +sel('estado',sid(q.id),q.estado||'pendiente',[
        ['pendiente','⏳ Pendiente'],
        ['cotizacion_enviada','✉ Cotización enviada'],
        ['confirmado','✅ Confirmado (50% pagado)'],
        ['en_camino','🚢 En camino'],
        ['listo_entrega','📦 Listo para entrega'],
        ['entregado','🏁 Entregado'],
        ['cancelado','❌ Cancelado']
      ])+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
      +'<div><div class="dlabel">50% inicial</div>'+sel('pago_inicial',sid(q.id),q.pago_inicial,[['pendiente','⏳ Pendiente'],['pagado','✓ Pagado']])+'</div>'
      +'<div><div class="dlabel">Saldo final</div>'+sel('pago_final',sid(q.id),q.pago_final,[['pendiente','⏳ Pendiente'],['pagado','✓ Pagado']])+'</div>'
      +'</div>'
      +(q.telefono?'<div style="margin-bottom:8px;font-size:13px;color:#aaa;">📱 <span style="color:#aaa;">'+esc(q.telefono)+'</span></div>':'')
      +(q.email?'<div style="margin-bottom:8px;font-size:13px;color:#aaa;">✉ <span style="color:#aaa;">'+esc(q.email)+'</span></div>':'')
      +'<div style="margin-bottom:12px;"><div class="dlabel">Nota interna</div>'
      +'<textarea class="inl" data-id="'+sid(q.id)+'" data-field="nota_interna">'+esc(q.nota_interna||'')+'</textarea></div>'
      +'<button class="br bdel" data-action="del" data-id="'+sid(q.id)+'" style="width:100%;margin-top:4px;">✕ Eliminar cotización</button>'
      +'</div>':'')
    +'</div>';
}

function render(){
  const rows=getFiltered();
  document.getElementById('s0').textContent=data.length;
  document.getElementById('s1').textContent=data.filter(d=>d.estado==='pendiente').length;
  document.getElementById('s2').textContent=data.filter(d=>d.estado==='cotizacion_enviada').length;
  document.getElementById('s3').textContent=data.filter(d=>d.estado==='en_camino').length;
  document.getElementById('s4').textContent=data.filter(d=>d.estado==='entregado').length;
  const tbl=document.getElementById('tbl');
  const cards=document.getElementById('card-list');
  const status=document.getElementById('tbl-status');
  if(!rows.length){status.textContent='Sin resultados para este filtro';status.style.display='block';tbl.style.display='none';cards.innerHTML='';return;}
  status.style.display='none';tbl.style.display='table';
  cards.innerHTML=rows.map(q=>cardHTML(q)).join('');
  document.getElementById('tbody').innerHTML=rows.map(q=>{
    const isExp=expanded===q.id;
    const row='<tr style="'+(isExp?'background:rgba(204,0,0,.04)':'')+'">'
      +'<td style="color:var(--gt);font-size:12px">#'+esc(String(q.id))+'</td>'
      +'<td style="white-space:nowrap;color:var(--gt)">'+fdate(q.created_at)+'</td>'
      +'<td><div style="font-weight:600">'+esc(q.nombre)+'</div>'
      +(q.telefono?'<div style="font-size:12px;color:var(--gt)">'+esc(q.telefono)+'</div>':'')
      +(q.email?'<div style="font-size:12px;color:var(--gt)">'+esc(q.email)+'</div>':'')+'</td>'
      +'<td><div style="font-weight:600">'+esc(q.marca||'')+' '+esc(q.modelo||'')+'</div>'
      +'<div style="font-size:12px;color:var(--gt)">'+esc(q.anio||'')+(q.vin?' · '+esc(q.vin):'')+'</div></td>'
      +'<td><div style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(q.repuesto)+'">'+esc(q.repuesto)+'</div></td>'
      +'<td>'+bfuente(q.fuente)+'</td><td>'+bestado(q.estado)+'</td>'
      +'<td>'+bpago(q.pago_inicial)+'</td><td>'+bpago(q.pago_final)+'</td>'
      +'<td><button class="br" data-action="toggleExp" data-id="'+sid(q.id)+'">'+(isExp?'▲ Cerrar':'▼ Ver detalle')+'</button>'
      +'<button class="br bdel" data-action="del" data-id="'+sid(q.id)+'">✕ Eliminar</button></td></tr>';
    return row+(isExp?detailHTML(q):'');
  }).join('');
}

function toggleExp(id){expanded=expanded===id?null:id;render();}

async function upd(id,field,value){
  if(!CAMPOS.has(field)){showAlert('Campo no permitido',true);return;}
  try{
    await api('PATCH',TB+'?id=eq.'+id,{[field]:value});
    const item=data.find(d=>d.id===id);
    if(item) item[field]=value;
    render();showAlert('✓ Guardado',false);
  }catch(e){showAlert('Error al guardar',true);}
}

async function del(id){
  if(!id){showAlert('ID inválido',true);return;}
  if(!confirm('¿Eliminar esta cotización?\n\nEsta acción es permanente e irreversible.')) return;
  if(!confirm('¿Confirmas que deseas eliminar permanentemente?')) return;
  try{
    await api('DELETE',TB+'?id=eq.'+id);
    data=data.filter(d=>d.id!==id);
    if(expanded===id) expanded=null;
    render();showAlert('Cotización eliminada',false);
  }catch(e){showAlert('Error al eliminar',true);}
}

function setSrc(s,el){
  document.getElementById('fsrc').value=s;
  document.querySelectorAll('.sbtn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
}
function openM(){document.getElementById('modal').classList.add('show');}
function closeM(){
  document.getElementById('modal').classList.remove('show');
  ['fn','ft','fe','fm','fmo','fa','fv','fr','fni'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('ftp').value='';
  document.getElementById('fsrc').value='web';
  document.querySelectorAll('.sbtn').forEach(b=>b.classList.remove('on'));
  document.querySelector('.sbtn').classList.add('on');
}

async function saveNew(){
  const nombre=document.getElementById('fn').value.trim();
  const repuesto=document.getElementById('fr').value.trim();
  if(!nombre||!repuesto){alert('Nombre y repuesto son obligatorios');return;}
  const btn=document.getElementById('btnSave');
  btn.textContent='Guardando...';btn.disabled=true;
  try{
    const result=await api('POST',TB,{
      nombre,repuesto,
      telefono:document.getElementById('ft').value.trim()||null,
      email:document.getElementById('fe').value.trim()||null,
      marca:document.getElementById('fm').value.trim()||null,
      modelo:document.getElementById('fmo').value.trim()||null,
      anio:document.getElementById('fa').value.trim()||null,
      vin:document.getElementById('fv').value.trim()||null,
      tipo_vehiculo:document.getElementById('ftp').value||null,
      nota_interna:document.getElementById('fni').value.trim()||null,
      fuente:document.getElementById('fsrc').value,
      estado:'pendiente',
      pago_inicial:'pendiente',pago_final:'pendiente'
    });
    const created=Array.isArray(result)?result[0]:result;
    if(created) data.unshift(created);
    closeM();render();showAlert('✓ Cotización guardada',false);
  }catch(e){showAlert('Error al guardar cotización',false);}
  btn.textContent='Guardar cotización';btn.disabled=false;
}

function handleActionClick(e){
  const el=e.target.closest('[data-action]');
  if(!el) return;
  const safeId=sid(el.dataset.id);
  if(el.dataset.action==='toggleExp') toggleExp(safeId);
  else if(el.dataset.action==='del') del(safeId);
}

function handleFieldChange(e){
  const el=e.target;
  if(!el.dataset.field||!el.dataset.id) return;
  if(el.tagName==='SELECT'||(el.tagName==='INPUT'&&el.type==='date')){
    upd(sid(el.dataset.id),el.dataset.field,el.value);
  }
}

function handleFieldBlur(e){
  const el=e.target;
  if(!el.dataset.field||!el.dataset.id) return;
  if((el.tagName==='INPUT'&&el.type!=='date')||el.tagName==='TEXTAREA'){
    upd(sid(el.dataset.id),el.dataset.field,el.value);
  }
}

function setupEvents(){
  document.querySelector('.btnout').addEventListener('click',doLogout);
  document.querySelector('.toolbar').addEventListener('click',e=>{
    const chip=e.target.closest('[data-filter]');
    if(chip){sf(chip.dataset.filter,chip);return;}
    if(e.target.closest('.btnn')) openM();
  });
  document.querySelector('.srctabs').addEventListener('click',e=>{
    const btn=e.target.closest('[data-src]');
    if(btn) setSrc(btn.dataset.src,btn);
  });
  document.querySelector('.btncanc').addEventListener('click',closeM);
  document.getElementById('btnSave').addEventListener('click',saveNew);
  ['tbody','card-list'].forEach(id=>{
    const el=document.getElementById(id);
    el.addEventListener('click',handleActionClick);
    el.addEventListener('change',handleFieldChange);
    el.addEventListener('focusout',handleFieldBlur);
  });
}

setupEvents();

setInterval(()=>{
  const a=document.activeElement;
  const editando=a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.tagName==='SELECT');
  if(!editando) load();
},60000);
