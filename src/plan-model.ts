import {cents} from './operations-model.ts';
import type {Producto} from './types';
export interface PlanRecord {id:string;nombre:string;precio:number;activo:boolean;version:number;items:{productoId:string;cantidad:number}[]}
export function planBody(name:string,price:string,active:boolean,quantities:Record<string,string>,products:Producto[],version:number|null){
 const nombre=name.trim();if(!nombre||nombre.length>150)throw Error('Indicá un nombre de entre 1 y 150 caracteres.');
 const items=[];for(const [productoId,text] of Object.entries(quantities)){
 if(!text.trim()||text==='0')continue;
 if(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text))||Number(text)>2147483647)throw Error('Los cupos deben ser cantidades enteras positivas.');
 if(Number(text)===0)continue;
 if(!products.some(p=>p.id===productoId&&p.tipo==='BIDON'&&p.activo))throw Error('El plan contiene un producto no disponible. Revisá sus cupos.');
 items.push({productoId,cantidad:Number(text)});
 }
 if(!items.length||items.length>100)throw Error('Incluí al menos un tipo de bidón con cantidad mayor que cero.');
 return {nombre,precio:cents(price)/100,activo:active,version,items};
}
