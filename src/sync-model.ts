import type {Snapshot,Caja,Tenencia} from './types';
import {delivery,payments,type Operation} from './operations-model.ts';
import {machine} from './machine-model.ts';
export interface LocalView {data:Snapshot;caja:Caja}
export const operationId=(op:Operation)=>op.tipo==='ENTREGA'?op.entrega.operacionId:op.tipo==='COBRO'?op.cobro.operacionId:op.maquina.operacionId;
export const customerId=(op:Operation)=>op.tipo==='ENTREGA'?op.entrega.clienteId:op.tipo==='COBRO'?op.cobro.clienteId:op.maquina.clienteId;
const sum=(a:number,b:number)=>{
 const x=Math.round(a*100),y=Math.round(b*100);
 if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||!Number.isSafeInteger(x+y))throw Error('El importe supera la precisión admitida en el dispositivo.');
 return (x+y)/100;
};
export function project(view:LocalView,op:Operation):LocalView {
 const v:LocalView=JSON.parse(JSON.stringify(view)),d=v.data,c=d.clientes.find(c=>c.id===customerId(op));
 if(!c||d.jornada.estado!=='ABIERTA')throw Error('La jornada o el cliente ya no están disponibles.');
 const stock=(id:string,state:string,delta:number)=>{let s=d.stockJornada.find(s=>s.productoId===id&&s.estado===state);if(!s){s={productoId:id,estado:state,cantidad:0};d.stockJornada.push(s);}s.cantidad+=delta;if(s.cantidad<0)throw Error('Stock local insuficiente.');};
 const held=(rows:Tenencia[],id:string,delta:number)=>{let r=rows.find(t=>t.clienteId===c.id&&t.productoId===id);if(!r){r={clienteId:c.id,productoId:id,cantidad:0};rows.push(r);}r.cantidad+=delta;if(r.cantidad<0)throw Error('La devolución supera la tenencia local.');};
 if(op.tipo==='COBRO'){
  if(!c.activo)throw Error('El cliente está inactivo.');
  if(op.cobro.pagos.some(p=>!['EFECTIVO','TRANSFERENCIA','MERCADO_PAGO'].includes(p.medio)))throw Error('Medio de pago no válido.');
  const calc=payments(op.cobro.pagos.map(p=>({medio:p.medio,importe:String(p.importe),referencia:p.referencia??''})));
  c.saldo=sum(c.saldo,-calc.total);v.caja.totalCobrado=sum(v.caja.totalCobrado,calc.total);
  for(const p of calc.pagos){const field=p.medio==='EFECTIVO'?'ingresosEfectivo':p.medio==='TRANSFERENCIA'?'ingresosTransferencia':'ingresosMercadoPago';v.caja[field]=sum(v.caja[field],p.importe);if(p.medio==='EFECTIVO')v.caja.efectivoEsperado=sum(v.caja.efectivoEsperado,p.importe);}
 }else if(op.tipo==='MAQUINA'){
  const m=op.maquina;machine(d,c,m.productoId,String(m.entregadas),String(m.retiradas));
  stock(m.productoId,'DISPONIBLE',m.retiradas-m.entregadas);held(d.maquinasClientes,m.productoId,m.entregadas-m.retiradas);
 }else{
  const r=op.entrega;
  const calc=delivery(d,c,r.items.map(i=>({productoId:i.productoId,entregados:String(i.entregados),vacios:String(i.devueltosVacios),danados:String(i.devueltosDanados),precio:i.precioExcepcional===undefined?'':String(i.precioExcepcional),motivo:i.motivoPrecio??''})),r.abono?.planId??'');
  if(JSON.stringify(calc.items)!==JSON.stringify(r.items)||JSON.stringify(calc.expected)!==JSON.stringify(op.esperadoEntrega.items)||calc.total!==op.esperadoEntrega.total||JSON.stringify(calc.abono??null)!==JSON.stringify(r.abono??null))throw Error('Los datos cambiaron. Revisá nuevamente la entrega.');
  if(r.abono){
   const plan=d.planesAbono.find(p=>p.id===r.abono!.planId)!;const id='local-'+r.operacionId;
   d.abonosClientes.push({id,clienteId:c.id,planId:plan.id,planNombre:plan.nombre,periodo:r.abono.periodo,importe:plan.precio});c.tieneAbonoRegistrado=true;
   for(const i of d.itemsPlanesAbono.filter(i=>i.planId===plan.id))d.cuposAbono.push({abonoId:id,productoId:i.productoId,incluidos:i.cantidad,consumidos:0,disponibles:i.cantidad});
  }
  const ids=new Set(d.abonosClientes.filter(a=>a.clienteId===c.id&&a.periodo===d.periodo).map(a=>a.id));
  for(const i of r.items){
   const bidon=d.productos.find(p=>p.id===i.productoId)!.tipo==='BIDON';
   stock(i.productoId,bidon?'LLENO':'DISPONIBLE',-i.entregados);
   if(bidon){held(d.envasesClientes,i.productoId,i.entregados-i.devueltosVacios-i.devueltosDanados);stock(i.productoId,'VACIO',i.devueltosVacios);stock(i.productoId,'DANADO',i.devueltosDanados);}
   let remaining=calc.expected.find(e=>e.productoId===i.productoId)!.incluidosAbono;
   for(const cup of d.cuposAbono.filter(k=>ids.has(k.abonoId)&&k.productoId===i.productoId)){const used=Math.min(cup.disponibles,remaining);cup.disponibles-=used;cup.consumidos+=used;remaining-=used;}
   if(remaining)throw Error('Cupo local inconsistente.');
  }
  c.saldo=sum(c.saldo,calc.total);
 }
 return v;
}
