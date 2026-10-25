import {useEffect,useState} from "preact/hooks";
import type {ComponentChildren} from 'preact';
import logo from './assets/logo-santos.png';
export const pages:Record<string,{title:string;description:string}>={
 inicio:{title:'El negocio, en un solo lugar',description:'Elegí qué necesitás hacer. Cada operación tiene su espacio.'},
 reparto:{title:'Repartos',description:'Prepará la camioneta, registrá entregas y controlá la caja del día.'},
 clientes:{title:'Clientes',description:'Buscá una cuenta, consultá sus movimientos o agregá un cliente.'},
 fabrica:{title:'Stock y producción',description:'Consultá las existencias de fábrica y registrá ingresos o llenados.'},
 reportes:{title:'Reportes',description:'Consultá un período y descargá la información en Excel.'},
 gastos:{title:'Gastos',description:'Registrá gastos generales y organizá sus categorías.'},
 admin:{title:'Administración',description:'Camionetas, equipo de reparto, precios, planes e importación.'},
};
const paths:Record<string,ComponentChildren>={
 inicio:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
 reparto:<><path d="M2 5h12v12H2zM14 9h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
 clientes:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/></>,
 fabrica:<><path d="m12 2 9 5-9 5-9-5zM3 7v10l9 5 9-5V7M12 12v10M7 4l10 6"/></>,
 reportes:<><path d="M4 3v18h17M8 16v-4M13 16V7M18 16V4"/></>,
 gastos:<><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M15 14h3M6 5V3h12"/></>,
 admin:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></>,
};
export function Icon({name}:{name:string}){return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]??paths.inicio}</svg>;}
export function Sidebar({area,admin,busy,open,navigate}:{area:string;admin:boolean;busy:boolean;open:boolean;navigate:(s:string)=>void}){
 const [mobile,setMobile]=useState(()=>window.matchMedia?.('(max-width:900px)').matches??false);
 useEffect(()=>{const mq=window.matchMedia?.('(max-width:900px)');if(!mq)return;const update=()=>setMobile(mq.matches);mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);
 const items=admin?['inicio','reparto','clientes','fabrica','gastos','reportes','admin']:['reparto','clientes'];
 return <aside id="sidebar" inert={mobile&&!open} aria-hidden={mobile&&!open?true:undefined} class={'sidebar '+(open?'is-open':'')}><div class="sidebar-brand"><img src={logo} alt="Agua de los Santos"/><span>GESTIÓN DE LA EMBOTELLADORA</span></div><div class="nav-caption">{admin?'TU NEGOCIO':'TU TRABAJO'}</div><nav class="main-nav" aria-label="Navegación principal">{items.map(value=><button key={value} disabled={busy} aria-current={area===value?'page':undefined} class={area===value?'active':''} onClick={()=>navigate(value)}><Icon name={value}/><span>{value==='inicio'?'Inicio':pages[value].title}</span><span class="nav-chevron" aria-hidden="true"/></button>)}</nav><div class="sidebar-bottom"><span class="brand-dot"/> Agua de los Santos<small>Gestión de reparto y administración</small></div></aside>;
}
export function ViewTabs({value,onChange,items,busy,label}:{value:string;onChange:(s:string)=>void;items:string[][];busy:boolean;label:string}){return <nav class="view-tabs" aria-label={label}>{items.map(([key,title])=><button key={key} disabled={busy} class={value===key?'active':''} aria-current={value===key?'page':undefined} onClick={()=>onChange(key)}>{title}</button>)}</nav>;}
export function Start({username,busy,navigate}:{username:string;busy:boolean;navigate:(s:string)=>void}){return <>
 <section class="welcome"><div><span class="eyebrow">AGUA DE LOS SANTOS</span><h2>Hola, {username}.</h2><p>Todo listo para organizar el próximo reparto.</p><button class="primary" disabled={busy} onClick={()=>navigate('reparto')}>Ir a repartos <span aria-hidden="true">→</span></button></div><div class="welcome-mark" aria-hidden="true"><Icon name="reparto"/><span>Cada entrega cuenta.</span></div></section>
 <div class="quick-grid">{[['clientes','Cuentas de clientes','Buscar clientes, consultar deudas y registrar altas.'],['fabrica','Stock de fábrica','Revisar bidones disponibles y registrar producción.'],['reportes','Resultados del negocio','Ventas, cobranzas, gastos y cierres por período.']].map(([key,title,description])=><button class="quick-card" disabled={busy} onClick={()=>navigate(key)}><span class="quick-icon"><Icon name={key}/></span><b>{title}</b><span>{description}</span><small>Abrir sección →</small></button>)}</div>
 <section class="panel start-guide"><div><span class="eyebrow">EL CIRCUITO DIARIO</span><h2>Del primer bidón al cierre de caja</h2></div><ol><li><b>Preparar</b><span>Iniciá un reparto y cargá la camioneta.</span></li><li><b>Repartir</b><span>Elegí el cliente y registrá entrega o cobro.</span></li><li><b>Finalizar</b><span>Devolvé el stock y contá el efectivo.</span></li></ol></section>
 </>;}
