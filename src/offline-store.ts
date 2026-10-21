import type { Snapshot, Caja } from './types';
export const OFFLINE_KEY = 'agua.offline.copy.v1';
interface Envelope { version: 1; username: string; savedAt: string; salt: string; iv: string; ciphertext: string; }
export interface OfflineCopy { username: string; savedAt: string; data: Snapshot; caja: Caja; }
const encode = (v: Uint8Array) => btoa(Array.from(v, b => String.fromCharCode(b)).join(''));
const decode = (v: string) => Uint8Array.from(atob(v), c => c.charCodeAt(0));
async function key(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'}, material, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
}
export function metadata(storage: Storage = localStorage): Pick<Envelope,'username'|'savedAt'> | null {
  const raw = storage.getItem(OFFLINE_KEY);
  if (!raw) return null;
  const e = JSON.parse(raw);
  if(e.version!==1 || typeof e.username!=='string' || !Number.isFinite(Date.parse(e.savedAt)) || !e.salt || !e.iv || !e.ciphertext)
    throw new Error('La copia local no se puede leer. Volvé a prepararla con conexión.');
  return {username:e.username,savedAt:e.savedAt};
}
export async function saveCopy(copy: OfflineCopy, pin: string, storage: Storage = localStorage) {
  if(!/^\d{6,12}$/.test(pin)) throw new Error('Elegí un PIN de 6 a 12 números para proteger esta copia.');
  if(copy.data.versionFormato!==1 || copy.data.jornada.estado!=='ABIERTA') throw new Error('Prepará una jornada abierta.');
  const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(pin,salt),new TextEncoder().encode(JSON.stringify(copy)));
  const e: Envelope={version:1,username:copy.username,savedAt:copy.savedAt,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(encrypted))};
  // Una única escritura: si no hay espacio, se conserva la copia anterior.
  storage.setItem(OFFLINE_KEY,JSON.stringify(e));
}
export async function openCopy(pin: string, storage: Storage = localStorage): Promise<OfflineCopy> {
  const m=metadata(storage);
  if(!m) throw new Error('Primero prepará una jornada con conexión.');
  try {
    const e: Envelope=JSON.parse(storage.getItem(OFFLINE_KEY)!);
    const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv)},await key(pin,decode(e.salt)),decode(e.ciphertext));
    const copy: OfflineCopy=JSON.parse(new TextDecoder().decode(bytes));
    if(copy.data.versionFormato!==1 || copy.username!==m.username || copy.savedAt!==m.savedAt) throw new Error();
    return copy;
  } catch { throw new Error('PIN incorrecto o copia dañada. No se modificaron los datos guardados.'); }
}
export function removeCopy(storage: Storage = localStorage) { storage.removeItem(OFFLINE_KEY); }
