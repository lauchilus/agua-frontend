import test from "node:test";
import assert from "node:assert/strict";
import { opening, loading } from "../src/journey-model.ts";
const options = {
  camionetas: [{ id: "v", nombre: "Van", patente: "AA", ocupada: false }],
  repartidores: [{ id: "r", nombre: "Rep", ocupado: false }],
  efectivoInicialSugerido: 24000,
};
test("apertura exige disponibles y valida dinero", () => {
  assert.equal(opening(options, "v", "r", "24000,50").efectivoInicial, 24000.5);
  assert.throws(() => opening(options, "v", "otro", "0"));
  assert.throws(() =>
    opening(
      { ...options, camionetas: [{ ...options.camionetas[0], ocupada: true }] },
      "v",
      "r",
      "0",
    ),
  );
  assert.throws(() => opening(options, "v", "r", "-1"));
});
test("carga llena y disponible respeta stock y cantidades", () => {
  const products = [
    {
      id: "p",
      codigo: "BIDON_12",
      tipo: "BIDON",
      nombre: "Bidón",
      precioVenta: 3500,
      activo: true,
      version: 1,
    },
    {
      id: "m",
      codigo: "MAQUINA",
      tipo: "MAQUINA",
      nombre: "Máquina",
      precioVenta: 0,
      activo: true,
      version: 0,
    },
  ];
  const stock = [
    {
      productoId: "p",
      codigo: "BIDON_12",
      nombre: "Bidón",
      estado: "LLENO",
      cantidad: 2,
    },
    {
      productoId: "p",
      codigo: "BIDON_12",
      nombre: "Bidón",
      estado: "VACIO",
      cantidad: 100,
    },
    {
      productoId: "m",
      codigo: "MAQUINA",
      nombre: "Máquina",
      estado: "DISPONIBLE",
      cantidad: 1,
    },
  ];
  assert.deepEqual(loading(products, stock, { p: "2", m: "1" }), [
    { productoId: "p", cantidad: 2 },
    { productoId: "m", cantidad: 1 },
  ]);
  for (const value of ["3", "-1", "1.5", "2147483648"])
    assert.throws(() => loading(products, stock, { p: value }));
  assert.throws(() => loading(products, stock, { p: "0" }));
});

test('no permite cargar insumos aunque tengan stock', () => {
  const p:any={id:'i',nombre:'Bolsa',tipo:'INSUMO',activo:true};
  assert.throws(()=>loading([p],[{productoId:'i',estado:'DISPONIBLE',cantidad:50} as any],{i:'1'}),/Solo se pueden cargar/);
});
