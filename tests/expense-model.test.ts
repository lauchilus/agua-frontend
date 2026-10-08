import test from 'node:test';import assert from 'node:assert/strict';
import {expense} from '../src/expense-model.ts';
const categories=[{id:'c',nombre:'Nafta',activo:true,version:0}];
const draft={categoriaId:'c',fecha:'2026-10-08',descripcion:' Nafta ',medio:'EFECTIVO',importe:'2000,50',referencia:''};
test('gasto valida monto exacto, categoría, medio, fecha y longitudes',()=>{
 assert.equal(expense(categories,draft).importe,2000.5);assert.equal(expense(categories,draft).descripcion,'Nafta');assert.equal(expense(categories,draft).referencia,null);
 for(const change of [{importe:'0'},{importe:'-1'},{importe:'1.234,00'},{descripcion:' '},{fecha:'2026-02-30'},{medio:'OTRO'},{referencia:'x'.repeat(101)}])assert.throws(()=>expense(categories,{...draft,...change}));
 assert.throws(()=>expense([{...categories[0],activo:false}],draft));
});
