import {useState} from 'preact/hooks';
import {cash,download} from './api';
import {metadata,openCopy,saveCopy,removeCopy,type OfflineCopy} from './offline-store';
import {money} from './operations-model';
const stamp=(v:string)=>new Date(v).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'});
export function PrepareOffline({username,jornadaId,busy,setWorking}:{username:string;jornadaId:string;busy:boolean;setWorking:(b:boolean)=>void}) {
 const [pin,setPin]=useState(''),[repeat,setRepeat]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 async function prepare(e:Event) {
  e.preventDefault();if(busy||saving)return;
  setMessage('');if(pin!==repeat){setMessage('Los PIN no coinciden.');return;}
  if(!/^\d{6,12}$/.test(pin)){setMessage('Elegí un PIN de 6 a 12 números.');return;}
  setSaving(true);setWorking(true);
  try {
   if(!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('Usá HTTPS o localhost y la versión compilada para preparar la consulta offline.');
   const registration=await navigator.serviceWorker.getRegistration('/');
   if(!registration?.active) throw new Error('La aplicación todavía no está preparada. Usá npm.cmd run build y npm.cmd run preview, abrí localhost:4173 y recargá.');
   const data=await download(jornadaId), caja=await cash(jornadaId);
   await saveCopy({username,savedAt:new Date().toISOString(),data,caja},pin);
   setPin('');setRepeat('');setMessage('Copia protegida guardada. Desde la pantalla de ingreso podés abrir Consultar copia sin conexión con tu PIN. Volvé a prepararla después de registrar operaciones.');
  }catch(e){setMessage((e as Error).message);}finally{setSaving(false);setWorking(false);}
 }
 return <section class="panel offline-prepare"><h2>Preparar consulta sin conexión</h2><p class="muted">Guardá una copia de esta jornada para consultar clientes, saldos, envases y stock. Esta etapa es solo de consulta; las entregas y cobros requieren conexión.</p><p class="muted">Usá tu dispositivo personal. El PIN protege los datos guardados. Se reemplaza la copia anterior de este navegador; las operaciones pendientes se conservan.</p><form onSubmit={prepare}><fieldset class="form-wrapper" disabled={busy||saving}><label>PIN de la copia<input type="password" inputMode="numeric" autoComplete="new-password" minLength={6} maxLength={12} required value={pin} onInput={e=>setPin(e.currentTarget.value)}/></label><label>Repetir PIN<input type="password" inputMode="numeric" autoComplete="new-password" minLength={6} maxLength={12} required value={repeat} onInput={e=>setRepeat(e.currentTarget.value)}/></label><button class="secondary">{saving?'Preparando…':'Guardar copia para consultar offline'}</button></fieldset></form>{message&&<p role="status">{message}</p>}</section>;
}
export function OfflineReader() {
 const [copy,setCopy]=useState<OfflineCopy|null>(null),[pin,setPin]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[selected,setSelected]=useState(''),[revision,setRevision]=useState(0);
 let info:ReturnType<typeof metadata>=null,storageError='';try{info=metadata();}catch{storageError='No se pudo leer la copia local. Preparala de nuevo con conexión.';}void revision;
 async function unlock(e:Event){e.preventDefault();if(busy)return;setBusy(true);setError('');try{setCopy(await openCopy(pin));}catch(e){setError((e as Error).message);}finally{setPin('');setBusy(false);}}
 const data=copy?.data,client=data?.clientes.find(c=>c.id===selected),product=(id:string)=>data?.productos.find(p=>p.id===id)?.nombre??'Producto';
 return <section class="panel offline-reader"><h2>Consultar copia sin conexión</h2>{!info&&!storageError&&<p class="muted">Ingresá con conexión, seleccioná una jornada abierta y prepará la copia antes de salir.</p>}{storageError&&<p role="alert">{storageError}</p>}{info&&!copy&&<><p>Copia de {info.username} · {stamp(info.savedAt)}</p><form onSubmit={unlock}><label>PIN de la copia<input type="password" inputMode="numeric" autoComplete="off" value={pin} onInput={e=>setPin(e.currentTarget.value)} required disabled={busy}/></label><button class="secondary" disabled={busy}>{busy?'Abriendo…':'Abrir copia guardada'}</button></form></>}{error&&<p role="alert">{error}</p>}{copy&&data&&<>
 <p class="notice">Solo consulta · Copia guardada el {stamp(copy.savedAt)}. Puede haber cambios posteriores. No registra operaciones ni confirma el estado actual del servidor.</p>
 <button class="secondary" onClick={()=>{setCopy(null);setSelected('');setSearch('');}}>Bloquear copia</button>
 <h3>Jornada del {data.jornada.fecha} · {data.jornada.estado} al descargar</h3><p>Efectivo esperado al descargar: {money(copy.caja.efectivoEsperado)}</p>
 <h3>Stock descargado</h3>{data.stockJornada.map(s=><div class="row" key={s.productoId+s.estado}><span>{product(s.productoId)} · {s.estado}</span><b>{s.cantidad}</b></div>)}
 <label>Buscar en clientes guardados<input type="search" value={search} onInput={e=>setSearch(e.currentTarget.value)}/></label>
 {data.clientes.filter(c=>(c.nombre+' '+c.direccion+' '+c.telefono).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(c=><button class="secondary offline-client" key={c.id} onClick={()=>setSelected(c.id)}>{c.nombre} · {c.direccion}</button>)}
 {client&&<section><h3>{client.nombre}</h3><p>{client.direccion} · {client.telefono}</p><p>{client.observaciones}</p><p>Saldo al descargar: {money(client.saldo)} (positivo: deuda; negativo: a favor)</p><h3>Envases y máquinas</h3>{[...data.envasesClientes,...data.maquinasClientes].filter(t=>t.clienteId===client.id).map(t=><div class="row" key={t.productoId}><span>{product(t.productoId)}</span><b>{t.cantidad}</b></div>)}<h3>Abonos del período descargado</h3>{data.abonosClientes.filter(a=>a.clienteId===client.id).map(a=><div key={a.id}><b>{a.planNombre} · {a.periodo}</b>{data.cuposAbono.filter(c=>c.abonoId===a.id).map(c=><p key={c.productoId}>{product(c.productoId)}: {c.disponibles} disponibles de {c.incluidos}</p>)}</div>)}</section>}
 <button class="ghost" onClick={()=>{try{removeCopy();setCopy(null);setRevision(n=>n+1);setSelected('');}catch{setError('No se pudo eliminar la copia.');}}}>Eliminar esta copia del dispositivo</button>
 </>}</section>;
}
