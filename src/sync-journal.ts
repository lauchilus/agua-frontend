import {operationId,project,type LocalView} from './sync-model.ts';
import type {Operation} from './operations-model.ts';
export const journalKey=(user:string)=>'agua.sync.v1.'+user;
export interface Entry {id:string;operation:Operation;clienteNombre:string;total:number;createdAt:string;status:'pending'|'confirmed'|'rejected'|'omitted';message?:string}
export interface Journal {version:1;base:LocalView|null;entries:Entry[];excluded:Entry[]}
interface Envelope {version:1;salt:string;iv:string;payload:string;pending:number}
const enc=(b:Uint8Array)=>btoa(Array.from(b,n=>String.fromCharCode(n)).join(''));
const dec=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function hasAutomaticPending(user:string):boolean {
 try{const raw=localStorage.getItem(journalKey(user));if(!raw)return false;const e=JSON.parse(raw);return e.version!==1||!Number.isInteger(e.pending)||e.pending!==0;}catch{return true;}
}
export class JournalStore {
 readonly user:string;private key:CryptoKey;private salt:Uint8Array<ArrayBuffer>;private storage:Storage;
 private constructor(user:string,key:CryptoKey,salt:Uint8Array<ArrayBuffer>,storage:Storage){this.user=user;this.key=key;this.salt=salt;this.storage=storage;}
 static async open(user:string,password:string,storage:Storage=localStorage){
  const raw=storage.getItem(journalKey(user));const envelope:Envelope|null=raw?JSON.parse(raw):null;
  if(envelope&&(envelope.version!==1||!envelope.salt))throw Error('Formato de respaldo desconocido. No se borraron los pendientes.');
  const salt=envelope?dec(envelope.salt):crypto.getRandomValues(new Uint8Array(16));
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const store=new JournalStore(user,key,salt,storage);await store.read();return store;
 }
 async read():Promise<Journal>{
  const raw=this.storage.getItem(journalKey(this.user));if(!raw)return {version:1,base:null,entries:[],excluded:[]};
  try{
   const e:Envelope=JSON.parse(raw);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:dec(e.iv),additionalData:new TextEncoder().encode(this.user)},this.key,dec(e.payload));
   const j:Journal=JSON.parse(new TextDecoder().decode(plain));
   if(j.version!==1||!Array.isArray(j.entries)||!Array.isArray(j.excluded)||j.entries.some(e=>!['pending','confirmed','rejected','omitted'].includes(e.status)||e.id!==operationId(e.operation))||new Set(j.entries.map(e=>e.id)).size!==j.entries.length||e.pending!==j.entries.length)throw Error();
   return j;
  }catch{throw Error('No se pudo abrir el respaldo automático con esta contraseña. Si cambió, necesitaremos recuperar los pendientes con la anterior. No borres los datos del navegador.');}
 }
 async write(j:Journal){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const payload=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(this.user)},this.key,new TextEncoder().encode(JSON.stringify(j)));
  const e:Envelope={version:1,salt:enc(this.salt),iv:enc(iv),payload:enc(new Uint8Array(payload)),pending:j.entries.length};
  try{this.storage.setItem(journalKey(this.user),JSON.stringify(e));}catch{throw Error('No se pudo guardar en el dispositivo. No se enviaron operaciones nuevas; liberá espacio sin borrar los datos de AGUA.');}
 }
}
export function localView(j:Journal):LocalView|null {
 if(!j.base)return null;
 return j.entries.filter(e=>e.status!=='omitted').reduce((v,e)=>project(v,e.operation),j.base);
}
