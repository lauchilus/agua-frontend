import {containersReport,accountsReport,adminJourneys,clientMovements,type ExpenseReport} from './api';
import type {AccountsFilter} from './AccountsReport';
import type {JourneyFilter} from './JourneyHistory';
import type {TableExport} from './report-xlsx';

export async function allPages<P extends {contenido:unknown[];pagina:number;totalPaginas:number;totalElementos:number}>(fetchPage:(page:number)=>Promise<P>,id:(row:P['contenido'][number])=>string):Promise<{first:P;rows:P['contenido']}>{
 const first=await fetchPage(0),rows=[...first.contenido];
 if(first.pagina!==0)throw Error('Respuesta de paginación inválida.');
 for(let p=1;p<first.totalPaginas;p++){const next=await fetchPage(p);if(next.pagina!==p||next.totalElementos!==first.totalElementos||next.totalPaginas!==first.totalPaginas)throw Error('El reporte cambió durante la descarga. Volvé a consultar e intentá nuevamente.');rows.push(...next.contenido);}
 if(rows.length!==first.totalElementos||new Set(rows.map(id)).size!==rows.length)throw Error('No se pudo obtener el reporte completo. Volvé a intentarlo.');
 return {first,rows};
}
const generated=()=>new Date().toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour12:false});
const stamp=(s:string|null)=>s?new Date(s).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour12:false}):'';
const note=()=>['Generado en Buenos Aires: '+generated(),'Importes en ARS. Datos consultados al descargar.'];
export async function exportAccounts(f:AccountsFilter):Promise<TableExport>{
 const {first,rows}=await allPages(p=>accountsReport(f,p),(r)=>r.clienteId);
 return {title:'AGUA · Cuentas de clientes',notes:[...note(),'Búsqueda: '+(f.busqueda.trim()||'Todas')+'; situación: '+f.situacion+'; activos: '+(f.activo||'Todos'),'Saldos actuales. Positivo: deuda; negativo: saldo a favor.','Clientes: '+first.totales.cantidadClientes+'; deuda ARS: '+first.totales.totalDeuda+'; a favor ARS: '+first.totales.totalAFavor],headers:['Nombre','Teléfono','Activo','Situación','Saldo (ARS)','ID cliente'],rows:rows.map(c=>[c.nombre,c.telefono,c.activo?'Sí':'No',c.situacion,c.saldo,c.clienteId])};
}
export async function exportJourneys(f:JourneyFilter):Promise<TableExport>{
 const {rows}=await allPages(p=>adminJourneys(f,p),(r)=>r.jornadaId);
 return {title:'AGUA · Historial de jornadas',notes:[...note(),'Desde '+f.desde+' hasta '+f.hasta+'; fecha por '+f.fechaPor+'; estado '+(f.estado||'TODAS'),'Cierre en horario de Buenos Aires. Diferencia negativa: faltante; positiva: sobrante.'],headers:['Fecha jornada','Camioneta','Patente','Repartidor','Estado','Cierre (Buenos Aires)','Esperado (ARS)','Contado (ARS)','Diferencia (ARS)','ID jornada'],rows:rows.map(j=>[j.fecha,j.camionetaNombre,j.patente,j.repartidorNombre,j.estado,stamp(j.cerradaEn),j.efectivoEsperado,j.efectivoContado,j.diferencia,j.jornadaId])};
}
export function exportExpenses(r:ExpenseReport):TableExport{return {title:'AGUA · Gastos por categoría',notes:['Desde '+r.desde+' hasta '+r.hasta,'Exporta la consulta mostrada. Generado en Buenos Aires: '+generated(),'Importes en ARS. Categorías con sus nombres actuales.','Total (ARS): '+r.total],headers:['Categoría','Ámbito','Medio','Cantidad de gastos','Importe (ARS)'],rows:r.filas.map(x=>[x.categoriaNombreActual,x.ambito,x.medio,x.cantidadGastos,x.importe])};}
export async function exportClient(id:string,name:string,desde:string,hasta:string):Promise<TableExport>{
 const {first,rows}=await allPages(p=>clientMovements(id,desde,hasta,p),(r)=>r.operacionId);
 return {title:'AGUA · Movimientos de '+name,notes:[...note(),'Cliente ID: '+id,'Desde '+desde+' hasta '+hasta,'Saldo actual (ARS): '+first.saldoActual+'; no es saldo histórico de cierre.','Los cobros reducen deuda y figuran con signo negativo.'],headers:['Fecha (Buenos Aires)','Tipo','Importe (ARS)','Saldo resultante (ARS)','ID operación','ID jornada'],rows:rows.map(m=>[stamp(m.creadoEn),m.tipo,m.importe,m.saldoResultante,m.operacionId,m.jornadaId])};
}

export async function exportContainers(f:import('./ContainersReport').ContainersFilter):Promise<TableExport>{
 const {first,rows}=await allPages(p=>containersReport(f,p),r=>r.clienteId+':'+r.productoId);
 return {title:'AGUA · Envases en clientes',notes:[...note(),'Tenencias actuales mayores a cero. Una fila por cliente y producto.','Búsqueda: '+(f.busqueda.trim()||'Todas')+'; producto ID: '+(f.productoId||'Todos')+'; activos: '+(f.activo||'Todos'),'Clientes: '+first.totales.cantidadClientes+'; envases: '+first.totales.cantidadEnvases],headers:['Cliente','Teléfono','Activo','Producto','Código','Cantidad de envases','ID cliente','ID producto'],rows:rows.map(c=>[c.clienteNombre,c.telefono,c.activo?'Sí':'No',c.productoNombre,c.codigo,c.cantidad,c.clienteId,c.productoId])};
}
