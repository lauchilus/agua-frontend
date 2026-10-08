import test from "node:test";
import assert from "node:assert/strict";
import {closing} from "../src/journey-model.ts";
const preview:any={jornada:{estado:"ABIERTA"},caja:{efectivoEsperado:25000},stockADevolver:[]};
test("cierre requiere motivo por faltante o sobrante y admite stock vacío",()=>{
 assert.throws(()=>closing(preview,"24500",""),/motivo/);
 assert.throws(()=>closing(preview,"26000","  "),/motivo/);
 assert.equal(closing(preview,"24500"," Faltante de prueba ").motivoDiferencia,"Faltante de prueba");
 assert.deepEqual(closing(preview,"25000",""),{efectivoContado:25000,motivoDiferencia:null,devoluciones:[]});
 assert.throws(()=>closing(preview,"-1","test"));
 assert.throws(()=>closing({...preview,jornada:{estado:"CERRADA"}},"25000",""),/cerrada/);
});
