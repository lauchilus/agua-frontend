import type {Snapshot,Cliente} from './types';
export function machine(data:Snapshot,client:Cliente,productId:string,delivered:string,returned:string){
 if(data.jornada.estado!=='ABIERTA')throw Error('Seleccioná una jornada abierta.');
 const p=data.productos.find(p=>p.id===productId&&p.tipo==='MAQUINA');if(!p)throw Error('Elegí una máquina.');
 const quantity=(text:string)=>{if(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text))||Number(text)>2147483647)throw Error('Las cantidades deben ser enteros de cero o más.');return Number(text);};
 const entregadas=quantity(delivered),retiradas=quantity(returned);
 if(!entregadas&&!retiradas)throw Error('Indicá una entrega o un retiro.');
 if(entregadas&&(!client.activo||!p.activo))throw Error('La entrega requiere cliente y producto activos.');
 if(entregadas&&!client.tieneAbonoRegistrado)throw Error('El cliente debe tener un abono registrado para recibir máquinas.');
 const stock=data.stockJornada.find(s=>s.productoId===productId&&s.estado==='DISPONIBLE')?.cantidad??0;
 const held=data.maquinasClientes.find(s=>s.clienteId===client.id&&s.productoId===productId)?.cantidad??0;
 if(entregadas>stock)throw Error('No hay suficientes máquinas cargadas en la jornada.');
 if(retiradas>held)throw Error('El retiro supera las máquinas que tiene el cliente.');
 return {body:{clienteId:client.id,productoId:productId,entregadas,retiradas},saldoCliente:held+entregadas-retiradas,saldoJornada:stock-entregadas+retiradas};
}
