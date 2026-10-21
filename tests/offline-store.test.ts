import test from 'node:test';
import assert from 'node:assert/strict';
import {saveCopy,openCopy,metadata,removeCopy,OFFLINE_KEY} from '../src/offline-store.ts';
const storage=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)},removeItem:(k:string)=>{m.delete(k)}} as Storage};
const copy:any={username:'repartidor1',savedAt:'2026-10-21T12:00:00Z',data:{versionFormato:1,jornada:{id:'j',estado:'ABIERTA'},clientes:[{nombre:'Cliente privado',saldo:4000}]},caja:{efectivoEsperado:25000}};
test('copia protegida: PIN correcto recupera datos; incorrecto no modifica almacenamiento',async()=>{
 const s=storage();await saveCopy(copy,'123456',s);const raw=s.getItem(OFFLINE_KEY)!;
 assert.ok(!raw.includes('Cliente privado'));assert.ok(!raw.includes('123456'));assert.ok(!raw.includes('25000'));
 assert.deepEqual(metadata(s),{username:copy.username,savedAt:copy.savedAt});
 await assert.rejects(openCopy('654321',s),/PIN incorrecto/);assert.equal(s.getItem(OFFLINE_KEY),raw);
 assert.deepEqual(await openCopy('123456',s),copy);
});
test('cuota llena conserva copia anterior y borrar copia no toca operaciones pendientes',async()=>{
 const s=storage();await saveCopy(copy,'123456',s);const raw=s.getItem(OFFLINE_KEY);
 const full={...s,setItem:()=>{throw new Error('Sin espacio')}} as Storage;
 await assert.rejects(saveCopy({...copy,username:'otro'},'987654',full));assert.equal(s.getItem(OFFLINE_KEY),raw);
 s.setItem('agua.pending.v1.repartidor1','operacion');removeCopy(s);assert.equal(metadata(s),null);assert.equal(s.getItem('agua.pending.v1.repartidor1'),'operacion');
});
test('rechaza PIN corto, formato incompatible y jornada cerrada',async()=>{
 const s=storage();await assert.rejects(saveCopy(copy,'123',s));
 await assert.rejects(saveCopy({...copy,data:{...copy.data,versionFormato:2}},'123456',s));
 await assert.rejects(saveCopy({...copy,data:{...copy.data,jornada:{estado:'CERRADA'}}},'123456',s));
 assert.equal(metadata(s),null);
});
