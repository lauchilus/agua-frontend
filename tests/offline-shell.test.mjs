import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {webcrypto} from 'node:crypto';
const dist=new URL('../dist/',import.meta.url);
test('service worker abre la aplicación sin red y nunca cachea ni intercepta la API',async()=>{
 const handlers={},entries=new Map(),cache={addAll:async urls=>{for(const u of urls)entries.set(u,{body:u})},match:async u=>entries.get(u)};
 vm.runInNewContext(readFileSync(new URL('sw.js',dist),'utf8'),{self:{location:{origin:'http://localhost'},addEventListener:(n,f)=>handlers[n]=f},caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},URL,fetch:async()=>{throw new Error('offline')}});
 let install;handlers.install({waitUntil:p=>install=p});await install;
 assert.ok(entries.has('/index.html'));assert.ok(![...entries.keys()].some(k=>k.startsWith('/api/')));
 let response;handlers.fetch({request:{url:'http://localhost/',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.deepEqual(await response,{body:'/index.html'});
 for(const path of ['/api/v1/auth/me','/api/v1/jornadas/j/datos-offline']){
  let intercepted=false;handlers.fetch({request:{url:'http://localhost'+path,method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
});
test('pantalla de ingreso abre copia local con PIN sin llamadas a la API',async()=>{
 const w=new JSDOM('<div id="app"></div>',{url:'http://localhost:4173',runScripts:'outside-only',pretendToBeVisual:true}).window;
 try {
 Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 let calls=0;w.fetch=()=>{calls++;throw new Error('Sin conexión')};
 const data={username:'rep',savedAt:'2026-10-21T12:00:00Z',data:{versionFormato:1,jornada:{fecha:'2026-10-21',estado:'ABIERTA'},stockJornada:[],productos:[],clientes:[{id:'c',nombre:'Cliente offline',direccion:'Calle 123',telefono:'123',saldo:1500}],envasesClientes:[],maquinasClientes:[],abonosClientes:[],cuposAbono:[]},caja:{efectivoEsperado:1000}};
 const salt=webcrypto.getRandomValues(new Uint8Array(16)),iv=webcrypto.getRandomValues(new Uint8Array(12));
 const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode('123456'),'PBKDF2',false,['deriveKey']);
 const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
 const encrypted=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));
 w.localStorage.setItem('agua.offline.copy.v1',JSON.stringify({version:1,username:'rep',savedAt:data.savedAt,salt:Buffer.from(salt).toString('base64'),iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(encrypted).toString('base64')}));
 const html=readFileSync(new URL('index.html',dist),'utf8'),asset=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];w.eval(readFileSync(new URL(asset.slice(1),dist),'utf8'));
 const input=w.document.querySelector('.offline-reader input');input.value='123456';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 await new Promise(r=>setTimeout(r,40));w.document.querySelector('.offline-reader form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 for(let n=0;n<30&&!w.document.querySelector('.offline-client');n++)await new Promise(r=>setTimeout(r,30));
 assert.match(w.document.querySelector('.offline-reader').textContent,/Cliente offline/);
 w.document.querySelector('.offline-client').click();await new Promise(r=>setTimeout(r,30));
 assert.match(w.document.querySelector('.offline-reader').textContent,/Saldo al descargar/);assert.equal(calls,0);
 assert.equal(w.document.querySelector('.offline-reader input[type=password]'),null);
 }finally{w.close();}
});
