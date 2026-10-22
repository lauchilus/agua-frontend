import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir=new URL('../dist/',import.meta.url);
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const assets=(await readdir(new URL('assets/',dir))).map(n=>'/assets/'+n);
const urls=['/','/index.html','/manifest.webmanifest','/icon-192.png','/icon-512.png',...assets];
const hash=createHash('sha256');for(const u of urls)hash.update(await readFile(new URL(u==='/'?'index.html':u.slice(1),dir)));
const cache='agua-shell-'+hash.digest('hex').slice(0,16);
await writeFile(new URL('sw.js',dir),`const CACHE=${JSON.stringify(cache)}, URLS=${JSON.stringify(urls)};
self.addEventListener('message',event=>{if(event.data==='AGUA_VERSION')event.ports[0]?.postMessage(${JSON.stringify(version)});});
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('agua-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'&&url.pathname==='/'){
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match('/index.html'))||fetch(event.request)));return;
 }
 if(URLS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});
`);
console.log('App preparada para consulta offline:',cache);
