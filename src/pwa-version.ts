declare const __APP_VERSION__: string;
// Evita abrir la cola nueva bajo un shell viejo que podría reaparecer al quedar offline.
export async function requireCurrentShell(){
 const controller=navigator.serviceWorker?.controller;if(!controller)return;
 const version=await new Promise<string|null>(resolve=>{
  const channel=new MessageChannel();
  const finish=(v:string|null)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(v)};
  const timer=setTimeout(()=>finish(null),2000);
  channel.port1.onmessage=e=>finish(e.data);
  controller.postMessage('AGUA_VERSION',[channel.port2]);
 });
 if(version!==__APP_VERSION__)throw Error('Hay una actualización pendiente. Cerrá todas las pestañas y ventanas de AGUA y volvé a abrirla con conexión. No borres el almacenamiento.');
}
