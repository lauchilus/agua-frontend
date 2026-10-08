import {cents} from './operations-model.ts';
export interface Category {id:string;nombre:string;activo:boolean;version:number}
export interface ExpenseDraft {categoriaId:string;fecha:string;descripcion:string;medio:string;importe:string;referencia:string}
export function todayArgentina(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function emptyExpense():ExpenseDraft{return {categoriaId:'',fecha:todayArgentina(),descripcion:'',medio:'EFECTIVO',importe:'',referencia:''};}
export function expense(categories:Category[],draft:ExpenseDraft){
 if(!categories.some(c=>c.id===draft.categoriaId&&c.activo))throw Error('Elegí una categoría activa.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.fecha)||!Number.isFinite(Date.parse(draft.fecha))||new Date(draft.fecha).toISOString().slice(0,10)!==draft.fecha)throw Error('Indicá una fecha válida.');
 const descripcion=draft.descripcion.trim(),referencia=draft.referencia.trim();
 if(!descripcion||descripcion.length>500)throw Error('Indicá una descripción de hasta 500 caracteres.');
 if(referencia.length>100)throw Error('La referencia admite hasta 100 caracteres.');
 if(!['EFECTIVO','TRANSFERENCIA','MERCADO_PAGO'].includes(draft.medio))throw Error('Elegí un medio de pago válido.');
 const importe=cents(draft.importe)/100;if(importe<=0)throw Error('El importe debe ser mayor que cero.');
 return {categoriaId:draft.categoriaId,fecha:draft.fecha,descripcion,medio:draft.medio,importe,referencia:referencia||null};
}
