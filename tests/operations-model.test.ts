import test from "node:test";
import assert from "node:assert/strict";
import { cents, delivery, payments } from "../src/operations-model.ts";
const client = {
  id: "c",
  nombre: "Cliente",
  direccion: "D",
  telefono: "T",
  observaciones: null,
  activo: true,
  saldo: 3000,
  tieneAbonoRegistrado: true,
};
const fixture = () => ({
  versionFormato: 1,
  generadoEn: "2026-10-07T12:00:00Z",
  zonaHoraria: "America/Argentina/Buenos_Aires",
  periodo: "2026-10-01",
  jornada: {
    id: "j",
    fecha: "2026-10-07",
    estado: "ABIERTA",
    efectivoInicial: 24000,
  },
  clientes: [client],
  productos: [
    {
      id: "p",
      tipo: "BIDON",
      codigo: "BIDON_12",
      nombre: "Bidón",
      precioVenta: 3500,
      activo: true,
      version: 1,
    },
  ],
  stockJornada: [{ productoId: "p", estado: "LLENO", cantidad: 10 }],
  envasesClientes: [{ clienteId: "c", productoId: "p", cantidad: 2 }],
  maquinasClientes: [],
  preciosClientes: [],
  planesAbono: [
    { id: "plan", nombre: "Plan", precio: 12000, activo: true, version: 2 },
  ],
  itemsPlanesAbono: [{ planId: "plan", productoId: "p", cantidad: 4 }],
  abonosClientes: [],
  cuposAbono: [],
});
const row = (n = "1") => ({
  productoId: "p",
  entregados: n,
  vacios: "0",
  danados: "0",
  precio: "",
  motivo: "",
});
test("importes exactos con coma o punto; rechaza negativos y miles", () => {
  assert.equal(cents("0,10"), 10);
  assert.equal(cents("3500.50"), 350050);
  for (const s of ["-1", "1.000,50", "abc", "1.234"])
    assert.throws(() => cents(s));
});
test("entrega normal y devolución sin cargo", () => {
  const d = fixture();
  assert.equal(delivery(d, client, [row("2")], "").total, 7000);
  const r = delivery(d, client, [{ ...row("0"), vacios: "1" }], "");
  assert.equal(r.total, 0);
  assert.equal(r.expected[0].precioUnitario, null);
  assert.equal(r.items[0].precioVersion, undefined);
});
test("abono nuevo: cargo completo, incluidos y excedentes", () => {
  const r = delivery(fixture(), client, [row("5")], "plan");
  assert.equal(r.total, 15500);
  assert.equal(r.expected[0].incluidosAbono, 4);
  assert.equal(r.summary[0].facturados, 1);
  assert.equal(r.abono?.planVersion, 2);
  const alone = delivery(fixture(), client, [row("0")], "plan");
  assert.equal(alone.total, 12000);
  assert.equal(alone.items.length, 0);
});
test("consume cupo actual y no repone por devoluciones", () => {
  const d: any = fixture();
  d.abonosClientes = [
    { id: "a", clienteId: "c", planId: "plan", periodo: d.periodo },
  ];
  d.cuposAbono = [
    {
      abonoId: "a",
      productoId: "p",
      incluidos: 4,
      consumidos: 2,
      disponibles: 2,
    },
  ];
  const r = delivery(d, client, [row("3")], "");
  assert.equal(r.total, 3500);
  assert.equal(r.expected[0].incluidosAbono, 2);
  const ret = delivery(d, client, [{ ...row("0"), vacios: "1" }], "");
  assert.equal(ret.expected[0].incluidosAbono, 0);
  assert.equal(d.cuposAbono[0].disponibles, 2);
  assert.throws(() => delivery(d, client, [row()], "plan"));
});
test("precio cliente, excepcional y versión inactiva", () => {
  const d: any = fixture();
  d.preciosClientes = [
    { clienteId: "c", productoId: "p", precio: 3000, activo: true, version: 2 },
  ];
  assert.equal(delivery(d, client, [row()], "").total, 3000);
  assert.equal(
    delivery(d, client, [{ ...row(), precio: "2500", motivo: "Promoción" }], "")
      .total,
    2500,
  );
  assert.throws(() => delivery(d, client, [{ ...row(), precio: "2500" }], ""));
  d.preciosClientes[0].activo = false;
  const r = delivery(d, client, [row()], "");
  assert.equal(r.total, 3500);
  assert.equal(r.items[0].precioClienteVersion, 2);
});
test("stock y envases negativos se rechazan", () => {
  assert.throws(() => delivery(fixture(), client, [row("11")], ""));
  assert.throws(() =>
    delivery(fixture(), client, [{ ...row("0"), vacios: "3" }], ""),
  );
  assert.throws(() => delivery(fixture(), client, [row("-1")], ""));
});
test("cobros mixtos y parciales sin errores de decimales", () => {
  const r = payments([
    { medio: "EFECTIVO", importe: "0.10", referencia: "" },
    { medio: "TRANSFERENCIA", importe: "0,20", referencia: "ref" },
    { medio: "MERCADO_PAGO", importe: "", referencia: "" },
  ]);
  assert.equal(r.total, 0.3);
  assert.equal(r.pagos.length, 2);
  assert.throws(() =>
    payments([{ medio: "EFECTIVO", importe: "0", referencia: "" }]),
  );
});

test("copas gratis o con precio: stock disponible, sin envases ni abono", () => {
  const d: any = fixture();
  d.productos.push({id:"copa",tipo:"COPA",nombre:"Copa",precioVenta:0,activo:true,version:0});
  d.stockJornada.push({productoId:"copa",estado:"DISPONIBLE",cantidad:2});
  const copa = {...row("2"),productoId:"copa"};
  const gratis = delivery(d,client,[copa],"");
  assert.equal(gratis.total,0);
  assert.equal(gratis.summary[0].envases,0);
  assert.equal(gratis.summary[0].retornable,false);
  assert.equal(gratis.expected[0].incluidosAbono,0);
  assert.equal(gratis.items[0].precioVersion,0);
  assert.throws(()=>delivery(d,client,[{...copa,vacios:"1"}],""),/copas/);
  assert.throws(()=>delivery(d,client,[{...copa,entregados:"3"}],""),/Stock/);
  d.productos[1].precioVenta=200;
  assert.equal(delivery(d,client,[copa],"").total,400);
  assert.equal(delivery(d,client,[{...copa,precio:"150",motivo:"Promoción"}],"").total,300);
  const mixed = delivery(d,client,[row("5"),copa],"plan");
  assert.equal(mixed.total,15900);
  assert.equal(mixed.expected[0].incluidosAbono,4);
  assert.equal(mixed.expected[1].incluidosAbono,0);
});
