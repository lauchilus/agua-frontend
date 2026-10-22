import {JournalStore,localView,type Journal,type Entry} from './sync-journal.ts';
import {operationId,customerId,project,type LocalView} from './sync-model.ts';
import type {Operation} from './operations-model';
export interface SyncDeps {
 send:(id:string,op:Operation)=>Promise<{completo:boolean;confirmadas:number;resultados:{estado:string;mensaje:string|null;respuesta:{id:string}|null}[]}>;
 fresh:(id:string)=>Promise<LocalView>;
 online:()=>boolean;
 now:()=>number;
}
export class SyncEngine {
 journal:Journal; working=false; message=''; authRequired=false; nextAttempt=0; private failures=0; private closed=false; private listeners=new Set<()=>void>();
 private store:JournalStore;private deps:SyncDeps;readonly release:()=>void;
 private constructor(store:JournalStore,j:Journal,deps:SyncDeps,release:()=>void){this.store=store;this.deps=deps;this.release=()=>{this.closed=true;this.listeners.clear();release();};this.journal=j;}
 static async open(store:JournalStore,deps:SyncDeps,release=()=>{}){return new SyncEngine(store,await store.read(),deps,release);}
 subscribe(fn:()=>void){this.listeners.add(fn);return ()=>{this.listeners.delete(fn)};}
 private emit(){this.listeners.forEach(f=>f());}
 get pending(){return this.journal.entries.length;}
 get rejected(){return this.journal.entries.find(e=>e.status==='rejected');}
 get refreshOnly(){return this.pending>0&&this.journal.entries.every(e=>['confirmed','omitted'].includes(e.status));}
 view(){return localView(this.journal);}
 get canAppend(){return !this.closed&&!this.working&&!this.authRequired&&!this.rejected&&!this.refreshOnly&&!this.journal.entries.some(e=>e.status==='omitted');}
 private async commit(j:Journal){await this.store.write(j);this.journal=j;this.emit();}
 private async exclusive(task:()=>Promise<void>){
  if(this.closed)throw Error('La sesión se cerró.');
  if(this.working)throw Error('Hay una operación en curso.');
  this.working=true;this.emit();try{await task();}finally{this.working=false;this.emit();}
 }
 async replaceBase(base:LocalView){await this.exclusive(async()=>{
  if(this.pending)throw Error('Primero sincronizá los pendientes antes de cambiar o actualizar la jornada.');
  if(base.data.versionFormato!==1)throw Error('Formato de jornada no compatible.');
  await this.commit({...this.journal,base});
 });}
 async append(op:Operation,total:number,jornadaId:string){
  if(!this.canAppend)throw Error('Primero resolvé el conflicto o la actualización pendiente.');
  await this.exclusive(async()=>{
   for(const prefix of ['agua.pending.v1.','agua.jornada.pending.v1.','agua.clients.pending.v1.','agua.factory.pending.v1.'])if(localStorage.getItem(prefix+this.store.user))throw Error('Primero resolvé la solicitud pendiente anterior.');
   const v=this.view();if(!v||v.data.jornada.id!==jornadaId)throw Error('La jornada seleccionada cambió.');
   if(this.journal.entries.some(e=>e.id===operationId(op)))throw Error('La operación ya está guardada.');
   project(v,op); // Revalida contra el stock y los cupos que incluyen toda la cola.
   const e:Entry={id:operationId(op),operation:op,total,clienteNombre:v.data.clientes.find(c=>c.id===customerId(op))!.nombre,createdAt:new Date(this.deps.now()).toISOString(),status:'pending'};
   await this.commit({...this.journal,entries:[...this.journal.entries,e]});
   this.message='Guardada en el dispositivo. Pendiente de confirmación del servidor.';
  });
 }
 async sync(force=false){
  if(this.closed||this.working||!this.pending||this.rejected||this.authRequired||!this.deps.online()||(!force&&this.deps.now()<this.nextAttempt))return;
  await this.exclusive(async()=>{
   try{
    for(let i=0;i<this.journal.entries.length;i++){
     const e=this.journal.entries[i];if(e.status!=='pending')continue;
     const result=await this.deps.send(this.journal.base!.data.jornada.id,e.operation),r=result.resultados?.[0];
     if(result.completo&&result.confirmadas===1&&r?.estado==='CONFIRMADA'&&r.respuesta?.id===e.id){
      const entries=this.journal.entries.map((x,n)=>n===i?{...x,status:'confirmed' as const}:x);await this.commit({...this.journal,entries});
     }else if(result.confirmadas===0&&r&&['CONFLICTO','RECHAZADA'].includes(r.estado)){
      await this.reject(i,r.mensaje??'El servidor rechazó la operación.');return;
     }else throw Error('No se obtuvo una confirmación válida. Se conserva el mismo identificador para reintentar.');
    }
    const base=await this.deps.fresh(this.journal.base!.data.jornada.id);
    if(base.data.versionFormato!==1||base.data.jornada.id!==this.journal.base!.data.jornada.id)throw Error('Respuesta de jornada no válida.');
    await this.commit({...this.journal,base,entries:[]});this.failures=0;this.nextAttempt=0;this.message='Al día. Todas las operaciones fueron confirmadas.';
   }catch(error){
    const e=error as Error&{status?:number};
    if(e.status===401||e.status===403){this.authRequired=true;this.message='La sesión o los permisos requieren revisión. Volvé a ingresar con el mismo usuario. Los pendientes están guardados.';}
    else if([400,409,422].includes(e.status??0)&&this.journal.entries.some(x=>x.status==='pending')){
     await this.reject(this.journal.entries.findIndex(x=>x.status==='pending'),e.message);
    }else{this.failures++;this.nextAttempt=this.deps.now()+Math.min(60000,5000*2**Math.min(this.failures-1,4));this.message=e.message.startsWith('No se pudo guardar')?e.message:this.refreshOnly?'Operaciones confirmadas. Falta actualizar los datos; se reintentará automáticamente.':'Sin confirmación del servidor. Los pendientes están guardados y se reintentarán automáticamente.';}
   }
  });
 }
 private async reject(index:number,message:string){await this.commit({...this.journal,entries:this.journal.entries.map((e,n)=>n===index?{...e,status:'rejected' as const,message}:e)});this.message='Revisar operación. La sincronización se detuvo sin enviar las siguientes.';}
 async retryRejected(){await this.exclusive(async()=>{await this.commit({...this.journal,entries:this.journal.entries.map(e=>e.status==='rejected'?{...e,status:'pending' as const}:e)});this.nextAttempt=0;});await this.sync(true);}
 async excludeRejected(){await this.exclusive(async()=>{
  const r=this.rejected;if(!r)return;
  // Se conserva una copia para revisión; jamás se excluye un resultado incierto.
  await this.commit({...this.journal,entries:this.journal.entries.map(e=>e.id===r.id?{...e,status:'omitted' as const}:e),excluded:[...this.journal.excluded,r]});
 });await this.sync(true);}
}
export async function claimSession(username:string):Promise<()=>void>{
 return new Promise((resolve,reject)=>{
  void navigator.locks.request('agua-reparto-'+username,{ifAvailable:true},async lock=>{
   if(!lock){reject(Error('AGUA ya está abierta con este usuario en otra pestaña. Cerrala antes de continuar.'));return;}
   await new Promise<void>(release=>resolve(release));
  }).catch(reject);
 });
}
