import {useRef,useState} from 'preact/hooks';
import {prepareClientImport,confirmClientImport,getClientImport} from './api';
import {hasAutomaticPending} from './sync-journal';
import {money} from './operations-model';
export interface ImportView {
 id:string|null;fechaCorte:string;estado:string;
 clientes:{codigo:string;nombre:string;direccion:string;telefono:string;observaciones:string;saldo:number;envases12:number;envases20:number;maquinas:number}[];
 abonos:{codigo:string;plan:string;mes:string;importe:number;incluidos12:number;consumidos12:number;incluidos20:number;consumidos20:number}[];
 errores:{hoja:string;fila:number;mensaje:string}[];
}
export function ClientImport({username,busy,setWorking}:{username:string;busy:boolean;setWorking:(v:boolean)=>void}) {
 const key='agua.importacion.v1.'+username;
 const [visible,setVisible]=useState(false),[file,setFile]=useState<File|null>(null),[cutoff,setCutoff]=useState(''),[view,setView]=useState<ImportView|null>(null),[error,setError]=useState(''),[accepted,setAccepted]=useState(false),[pending,setPending]=useState(()=>localStorage.getItem(key));
 const running=useRef(false);
 async function execute(task:()=>Promise<void>) {if(busy||running.current)return;running.current=true;setWorking(true);setError('');try{if(hasAutomaticPending(username))throw Error('Sincronizá las operaciones pendientes antes de importar.');await task();}catch(e){setError((e as Error).message);}finally{running.current=false;setWorking(false);}}
 async function prepare(){await execute(async()=>{
  if(!file||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Seleccioná un archivo .xlsx.');
  if(!file.size||file.size>2_000_000)throw Error('El archivo debe pesar como máximo 2 MB.');
  if(!cutoff)throw Error('Indicá la fecha de corte de los saldos y tenencias.');
  setView(null);setAccepted(false);
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const result=await prepareClientImport(btoa(binary),cutoff);
  if(result.id){localStorage.setItem(key,result.id);setPending(result.id);}
  setView(result);
 });}
 async function recover(){await execute(async()=>{if(!pending)return;setAccepted(false);setView(await getClientImport(pending));});}
 async function confirm(){await execute(async()=>{
  if(!view?.id||!accepted||view.errores.length||view.estado!=='PREPARADA')return;
  try{setView(await confirmClientImport(view.id));setAccepted(false);}catch(e){throw Error((e as Error).message+' Usá Consultar resultado antes de intentar otra importación.');}
 });}
 function reset(){localStorage.removeItem(key);setPending(null);setView(null);setAccepted(false);setFile(null);setError('');}
 return <section class="panel"><div class="section-heading"><h2>Administración · Importar clientes</h2><button class="secondary" disabled={busy} onClick={()=>setVisible(!visible)}>{visible?'Ocultar importador':'Importar Excel'}</button></div>{visible&&<>
 <p>Carga inicial de clientes nuevos, saldos, envases, máquinas y abonos. No genera ventas, cobros ni movimientos de stock de fábrica.</p>
 <p class="muted">Hojas requeridas: clientes, saldos, envases y maquinas. Abonos es opcional. Cada cliente debe tener una fila de saldo, envases y máquinas, con ceros explícitos cuando corresponda. Máximo 1000 clientes / 2 MB.</p>
 {error&&<p class="error" role="alert">{error}</p>}
 {pending&&<div class="notice"><p>Importación guardada: {pending}</p><button class="secondary" disabled={busy} onClick={()=>void recover()}>Consultar resultado</button></div>}
 {!pending&&<form onSubmit={e=>{e.preventDefault();void prepare();}}><fieldset class="form-wrapper" disabled={busy}><label>Archivo Excel<input aria-label="Archivo de clientes" type="file" accept=".xlsx" onChange={e=>{setFile(e.currentTarget.files?.[0]??null);setView(null);}}/></label><label>Fecha de corte<input aria-label="Fecha de corte" type="date" required value={cutoff} onInput={e=>{setCutoff(e.currentTarget.value);setView(null);}}/></label><button class="primary">Validar y ver vista previa</button></fieldset></form>}
 {view&&<>
 <h3>{view.estado==='CONFIRMADA'?'Importación confirmada':'Vista previa'} · {view.fechaCorte}</h3>
 {view.estado==='CONFIRMADA'&&<p class="notice" role="status">Se importaron {view.clientes.length} clientes. Actualizá las consultas y los datos de reparto antes de operar con ellos.</p>}
 {!!view.errores.length&&<><p class="error">Corregí estos errores en el Excel. No se importó ningún cliente.</p><ul>{view.errores.map((e,i)=><li key={i}>{e.hoja}{e.fila?' · fila '+e.fila:''}: {e.mensaje}</li>)}</ul></>}
 <p>{view.clientes.length} clientes · Deuda inicial: {money(view.clientes.reduce((s,c)=>s+Math.max(c.saldo,0),0))} · A favor: {money(view.clientes.reduce((s,c)=>s+Math.max(-c.saldo,0),0))}</p>
 {view.clientes.map(c=><article class="abono" key={c.codigo}><b>{c.codigo} · {c.nombre}</b><p>{c.direccion} · {c.telefono}</p>{c.observaciones&&<p>{c.observaciones}</p>}<p>Saldo: {money(c.saldo)} · Envases de 12: {c.envases12} · De 20: {c.envases20} · Máquinas: {c.maquinas}</p>{view.abonos.filter(a=>a.codigo===c.codigo).map(a=><p key={a.plan}>{a.plan} · {a.mes} · Importe histórico {money(a.importe)} · Cupo 12: {a.consumidos12}/{a.incluidos12} · Cupo 20: {a.consumidos20}/{a.incluidos20}</p>)}</article>)}
 {view.id&&view.estado==='PREPARADA'&&!view.errores.length&&<><label><input type="checkbox" checked={accepted} disabled={busy} onChange={e=>setAccepted(e.currentTarget.checked)}/> Revisé los datos. Los saldos incluyen la deuda de abonos y todas las cantidades corresponden a la fecha de corte.</label><button class="primary" disabled={busy||!accepted} onClick={()=>void confirm()}>Confirmar importación</button></>}
 </>}
 {pending&&view&&<button class="ghost" disabled={busy} onClick={()=>{if(view.estado==='CONFIRMADA'||window.confirm('¿Descartar esta vista previa? Si hubo un error al confirmar, consultá primero el resultado.'))reset();}}>Preparar otro archivo</button>}
 </>}</section>;
}
