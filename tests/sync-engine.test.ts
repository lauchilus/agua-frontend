import test from 'node:test';import assert from 'node:assert/strict';
import {SyncEngine} from '../src/sync-engine.ts';import {JournalStore,journalKey,hasAutomaticPending} from '../src/sync-journal.ts';
import {project,operationId} from '../src/sync-model.ts';import {delivery} from '../src/operations-model.ts';
const copy=(v:any)=>JSON.parse(JSON.stringify(v));
function fixture():any{return {data:{versionFormato:1,generadoEn:'2026-10-21T12:00:00Z',periodo:'2026-10-01',jornada:{id:'j',estado:'ABIERTA',fecha:'2026-10-21'},productos:[{id:'p',tipo:'BIDON',nombre:'Bidón',codigo:'BIDON_20',activo:true,precioVenta:5000,version:1},{id:'copa',tipo:'COPA',nombre:'Copa',activo:true,precioVenta:0,version:0},{id:'m',tipo:'MAQUINA',nombre:'Máquina',activo:true,precioVenta:0,version:0}],stockJornada:[{productoId:'p',estado:'LLENO',cantidad:6},{productoId:'copa',estado:'DISPONIBLE',cantidad:2},{productoId:'m',estado:'DISPONIBLE',cantidad:1}],clientes:[{id:'c',nombre:'Cliente',activo:true,saldo:0,tieneAbonoRegistrado:false}],envasesClientes:[],maquinasClientes:[],planesAbono:[{id:'plan',nombre:'Cuatro',precio:18000,version:0,activo:true}],itemsPlanesAbono:[{planId:'plan',productoId:'p',cantidad:4}],abonosClientes:[],cuposAbono:[],preciosClientes:[]},caja:{estado:'ABIERTA',efectivoInicial:1000,totalCobrado:0,totalGastado:0,efectivoEsperado:1000,ingresosEfectivo:0,ingresosTransferencia:0,ingresosMercadoPago:0}};}
function request(view:any,n:number,id:string,plan='',pid='p'):any{const c=delivery(view.data,view.data.clientes[0],[{productoId:pid,entregados:String(n),vacios:'0',danados:'0',precio:'',motivo:''}],plan);return {tipo:'ENTREGA',entrega:{operacionId:id,clienteId:'c',items:c.items,...(c.abono?{abono:c.abono}:{})},esperadoEntrega:{total:c.total,items:c.expected}};}
const payment=(id='pay'):any=>({tipo:'COBRO',cobro:{operacionId:id,clienteId:'c',pagos:[{medio:'EFECTIVO',importe:1000}]}});
async function setup(){
 const map=new Map<string,string>();let full=false;
 const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{if(full)throw Error('quota');map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}} as Storage;
 Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
 const state={online:false,clock:0,server:fixture(),calls:[] as string[],lost:false,refreshFail:false,auth:false,reject:false,receipts:new Set<string>()};
 const deps={online:()=>state.online,now:()=>state.clock,fresh:async()=>{if(state.refreshFail)throw Error('GET failed');return copy(state.server);},send:async(_j:string,op:any)=>{
  const id=operationId(op);state.calls.push(id);if(state.auth)throw Object.assign(Error('Unauthorized'),{status:401});
  if(state.reject)return {completo:false,confirmadas:0,resultados:[{estado:'CONFLICTO',mensaje:'Precio cambió',respuesta:null}]};
  if(!state.receipts.has(id)){state.server=project(state.server,op);state.receipts.add(id);}
  if(state.lost){state.lost=false;throw Error('Lost acknowledgement');}
  return {completo:true,confirmadas:1,resultados:[{estado:'CONFIRMADA',mensaje:null,respuesta:{id}}]};
 }};
 const store=await JournalStore.open('rep','secret-password',storage),engine=await SyncEngine.open(store,deps);await engine.replaceBase(fixture());
 return {engine,state,store,storage,deps,full:()=>full=true};
}
test('cola offline descuenta stock/cupo y deuda; cobra mixto; no comparte cupo con copas',async()=>{
 const {engine,state}=await setup();let op=request(engine.view(),2,'one','plan');await engine.append(op,18000,'j');
 op=request(engine.view(),3,'two');assert.equal(op.esperadoEntrega.total,5000);await engine.append(op,5000,'j');
 op=request(engine.view(),1,'cup','','copa');await engine.append(op,0,'j');await engine.append(payment(),1000,'j');
 const v=engine.view()!;assert.equal(v.data.stockJornada[0].cantidad,1);assert.equal(v.data.cuposAbono[0].disponibles,0);assert.equal(v.data.clientes[0].saldo,22000);assert.equal(v.caja.efectivoEsperado,2000);assert.equal(v.data.envasesClientes.length,1);
 assert.throws(()=>request(v,2,'excess'),/Stock/);assert.equal(state.calls.length,0);assert.equal(hasAutomaticPending('rep'),true);
 state.online=true;await engine.sync();assert.deepEqual(state.calls,['one','two','cup','pay']);assert.equal(engine.pending,0);assert.equal(state.server.data.clientes[0].saldo,22000);assert.equal(hasAutomaticPending('rep'),false);
});
test('respuesta perdida y recarga del navegador conservan UUID sin duplicar',async()=>{
 const {engine,state,storage,deps}=await setup();await engine.append(request(engine.view(),1,'one'),5000,'j');state.online=true;state.lost=true;await engine.sync();
 assert.equal(engine.pending,1);assert.equal(state.server.data.stockJornada[0].cantidad,5);
 const restored=await SyncEngine.open(await JournalStore.open('rep','secret-password',storage),deps);await restored.sync(true);
 assert.deepEqual(state.calls,['one','one']);assert.equal(restored.pending,0);assert.equal(state.server.data.stockJornada[0].cantidad,5);
});
test('confirmada con refresco fallido solo reintenta GET; no duplica POST',async()=>{
 const {engine,state}=await setup();await engine.append(payment(),1000,'j');state.online=true;state.refreshFail=true;await engine.sync();assert.equal(engine.refreshOnly,true);assert.equal(engine.canAppend,false);
 state.refreshFail=false;await engine.sync(true);assert.deepEqual(state.calls,['pay']);assert.equal(engine.pending,0);
});
test('conflicto detiene cola y exclusión explícita conserva historial',async()=>{
 const {engine,state}=await setup();await engine.append(request(engine.view(),1,'one'),5000,'j');await engine.append(payment(),1000,'j');state.online=true;state.reject=true;await engine.sync();assert.deepEqual(state.calls,['one']);assert.equal(engine.canAppend,false);
 await engine.sync(true);assert.equal(state.calls.length,1);state.reject=false;await engine.excludeRejected();assert.deepEqual(state.calls,['one','pay']);assert.equal(engine.journal.excluded[0].id,'one');assert.equal(engine.pending,0);assert.equal(state.server.data.clientes[0].saldo,-1000);
});
test('401 pausa sin perder pendientes; nuevo ingreso permite retomar',async()=>{
 const {engine,state,store,deps}=await setup();await engine.append(payment(),1000,'j');state.online=true;state.auth=true;await engine.sync();assert.equal(engine.authRequired,true);await engine.sync(true);assert.equal(state.calls.length,1);
 state.auth=false;const next=await SyncEngine.open(store,deps);await next.sync();assert.equal(next.pending,0);
});
test('almacenamiento lleno no acepta operación ni la envía; datos cifrados y contraseña no guardada',async()=>{
 const {engine,state,storage,full}=await setup();const before=storage.getItem(journalKey('rep'))!;assert.ok(!before.includes('Cliente'));assert.ok(!before.includes('secret-password'));
 full();await assert.rejects(engine.append(payment(),1000,'j'),/guardar/);assert.equal(engine.pending,0);assert.equal(state.calls.length,0);assert.equal(storage.getItem(journalKey('rep')),before);
 await assert.rejects(JournalStore.open('rep','incorrecta',storage),/respaldo/);
});
test('no cambia jornada con pendientes y máquinas actualizan tenencia local',async()=>{
 const {engine}=await setup();await engine.append(request(engine.view(),1,'abono','plan'),18000,'j');const op:any={tipo:'MAQUINA',maquina:{operacionId:'m1',clienteId:'c',productoId:'m',entregadas:1,retiradas:0}};await engine.append(op,0,'j');assert.equal(engine.view()!.data.maquinasClientes[0].cantidad,1);assert.equal(engine.view()!.data.clientes[0].saldo,18000);await assert.rejects(engine.replaceBase(fixture()),/pendientes/);
});
test('backoff evita reintentos continuos y revisión de saldos usa centavos',async()=>{
 const {engine,state}=await setup();await engine.append(payment(),1000,'j');state.online=true;state.lost=true;await engine.sync();assert.equal(engine.nextAttempt,5000);await engine.sync();assert.equal(state.calls.length,1);state.clock=5000;await engine.sync();assert.equal(engine.pending,0);
 const op:any={tipo:'COBRO',cobro:{operacionId:'tiny',clienteId:'c',pagos:[{medio:'EFECTIVO',importe:0.1},{medio:'TRANSFERENCIA',importe:0.2}]}};const v=project(fixture(),op);assert.equal(v.data.clientes[0].saldo,-0.3);assert.equal(v.caja.totalCobrado,0.3);
});

test('dos confirmaciones simultáneas no crean operaciones duplicadas',async()=>{
 const {engine}=await setup();const results=await Promise.allSettled([engine.append(payment('one'),1000,'j'),engine.append(payment('two'),1000,'j')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(engine.pending,1);
});
test('cerrar sesión detiene reintentos sin borrar la cola',async()=>{
 const {engine,state}=await setup();await engine.append(payment(),1000,'j');engine.release();state.online=true;await engine.sync(true);assert.equal(state.calls.length,0);assert.equal(engine.pending,1);assert.equal(engine.canAppend,false);
});
test('cola parcialmente confirmada retoma desde pendiente, sin reenviar la primera',async()=>{
 const {engine,state,store,deps}=await setup();await engine.append(request(engine.view(),1,'one'),5000,'j');await engine.append(payment('two'),1000,'j');
 const send=deps.send;let firstTwo=true;deps.send=async(j,op)=>{if(operationId(op)==='two'&&firstTwo){state.lost=true;firstTwo=false;}return send(j,op)};
 state.online=true;await engine.sync();assert.deepEqual(engine.journal.entries.map(e=>e.status),['confirmed','pending']);assert.equal(engine.view()!.data.clientes[0].saldo,4000);
 const next=await SyncEngine.open(store,deps);await next.sync();assert.deepEqual(state.calls,['one','two','two']);assert.equal(state.server.data.clientes[0].saldo,4000);assert.equal(next.pending,0);
});
