import {useEffect,useRef,useState} from 'preact/hooks';
import type {Snapshot,Cliente} from './types';
import type {SyncEngine} from './sync-engine';
import type {Operation} from './operations-model';
import {money} from './operations-model';
import {OperationForm} from './Operations';
import {MachineForm} from './MachineForm';
export function AutoOperations({engine,data,client,externalBusy}:{engine:SyncEngine;data:Snapshot|null;client:Cliente|null;externalBusy:boolean}){
 const [,render]=useState(0),[error,setError]=useState(''),[revision,setRevision]=useState(0),[editing,setEditing]=useState(false);
 const busyRef=useRef(externalBusy),editingRef=useRef(false);busyRef.current=externalBusy;editingRef.current=editing;
 useEffect(()=>engine.subscribe(()=>render(n=>n+1)),[engine]);
 useEffect(()=>{setEditing(false);setRevision(n=>n+1);},[client?.id]);
 useEffect(()=>{
  const tick=()=>{if(!busyRef.current&&!editingRef.current)void engine.sync().catch(e=>setError((e as Error).message));};
  const reconnect=()=>{if(!busyRef.current&&!editingRef.current)void engine.sync(true).catch(e=>setError((e as Error).message));};
  const timer=window.setInterval(tick,5000);window.addEventListener('online',reconnect);document.addEventListener('visibilitychange',tick);tick();
  return()=>{clearInterval(timer);window.removeEventListener('online',reconnect);document.removeEventListener('visibilitychange',tick);};
 },[engine]);
 async function submit(op:Operation,total:number){
  if(!data||externalBusy)return;setError('');
  try{await engine.append(op,total,data.jornada.id);setEditing(false);editingRef.current=false;setRevision(n=>n+1);await engine.sync();}catch(e){setError((e as Error).message);}
 }
 const pending=engine.journal.entries,blocked=!engine.canAppend||externalBusy;
 return <section class="panel operations auto-operations"><span class="eyebrow">RESPALDO Y SINCRONIZACIÓN AUTOMÁTICOS</span>
 <h2>{engine.rejected?'Revisar operación':engine.authRequired?'Volvé a ingresar':engine.working?'Sincronizando…':engine.refreshOnly?'Confirmadas · falta actualizar':pending.length?`${navigator.onLine?'Por sincronizar':'Sin conexión'} · ${pending.filter(e=>e.status==='pending').length} pendientes`:'Al día'}</h2>
 <p role="status">{engine.message||'Las entregas y cobros se guardan antes de enviarse.'}</p>{error&&<p role="alert" class="error">{error}</p>}
 {pending.length>0&&<><p class="notice">Los saldos, el stock y los cupos mostrados incluyen operaciones locales. El cierre queda bloqueado hasta confirmar todas y actualizar la jornada.</p>
 <details><summary>Ver operaciones guardadas ({pending.length})</summary>{pending.map(e=><div class="row" key={e.id}><span>{e.clienteNombre} · {e.operation.tipo} · {money(e.total)}<small>{e.status} · {e.id}</small>{e.message&&<small>{e.message}</small>}<details><summary>Detalle de la solicitud</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">{JSON.stringify(e.operation,null,2)}</pre></details></span></div>)}</details>
 {engine.rejected?<><p>El servidor rechazó esa operación sin registrarla. Podés resolver la causa y reintentar los mismos datos, o excluir ese rechazo. Las operaciones posteriores se conservarán y se comprobarán al enviarlas.</p><button class="secondary" disabled={engine.working||externalBusy} onClick={()=>void engine.retryRejected().catch(e=>setError(e.message))}>Reintentar operación rechazada</button><button class="ghost" disabled={engine.working||externalBusy} onClick={()=>{if(window.confirm('¿Excluir esta operación rechazada? No se registró en el servidor. Se conservará para revisión; si hubo una entrega o cobro real, deberás registrarlo correctamente.'))void engine.excludeRejected().catch(e=>setError(e.message));}}>Excluir operación rechazada</button></>:<button class="secondary" disabled={externalBusy||engine.working||engine.authRequired||editing} onClick={()=>void engine.sync(true).catch(e=>setError(e.message))}>Sincronizar ahora</button>}
 </>}
 {engine.journal.excluded.length>0&&<details><summary>Operaciones excluidas para revisión ({engine.journal.excluded.length})</summary><p>No están registradas en el servidor.</p>{engine.journal.excluded.map(e=><pre key={e.id} style="white-space:pre-wrap;overflow-wrap:anywhere">{JSON.stringify(e,null,2)}</pre>)}</details>}
 {editing&&<p class="muted">Terminá o cancelá el borrador para permitir la sincronización automática. <button class="ghost" disabled={externalBusy||engine.working} onClick={()=>{setEditing(false);setRevision(n=>n+1);}}>Cancelar borrador</button></p>}
 {data&&client&&data.jornada.estado==='ABIERTA'&&<div onInput={()=>setEditing(true)} onChange={()=>setEditing(true)}>
 {client.activo?<OperationForm key={client.id+'-'+revision} data={data} client={client} busy={blocked} submit={submit}/>:<p>Cliente inactivo. Solo permite retirar máquinas.</p>}
 <MachineForm key={client.id+'-machines-'+revision} data={data} client={client} busy={blocked} submit={submit}/></div>}
 </section>;
}
