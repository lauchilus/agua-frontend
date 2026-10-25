import {webcrypto} from 'node:crypto';
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const code = fs.readFileSync(
  root +
    "dist/assets/" +
    fs.readdirSync(root + "dist/assets").find((f) => f.endsWith(".js")),
  "utf8",
);
const wait = () => new Promise((r) => setTimeout(r, 60));
async function setup(options = {}) {
  const dom = new JSDOM('<div id="app"></div>', {
    url: "http://localhost:5173",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  Object.defineProperty(w,"crypto",{value:webcrypto});
  w.TextEncoder = TextEncoder;w.TextDecoder=TextDecoder;
  Object.defineProperty(w.navigator,"locks",{value:{request:async (_name,_options,callback)=>callback({name:"test-lock"})}});
  let connected=true;Object.defineProperty(w.navigator,"onLine",{get:()=>connected});
  w.AbortSignal = AbortSignal;
  w.Response = Response;
  const key = "agua.pending.v1.admin",
    ids = new Map(),
    bodies = [];
  const date = new Date(),
    period =
      date
        .toLocaleDateString("en-CA", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
        .slice(0, 7) + "-01";
  const snap = {
    versionFormato: 1,
    generadoEn: date.toISOString(),
    periodo: period,
    zonaHoraria: "America/Argentina/Buenos_Aires",
    jornada: {
      id: "30bc9931-0557-404b-b642-fc8917cccdef",
      fecha: "2026-10-07",
      estado: options.closed ? "CERRADA" : "ABIERTA",
      efectivoInicial: 24000,
    },
    productos: [
      {
        id: "p",
        tipo: "BIDON",
        nombre: "Bidón de 12 litros",
        codigo: "BIDON_12",
        precioVenta: 3500,
        activo: true,
        version: 1,
      },
    ],
    stockJornada: [{ productoId: "p", estado: "LLENO", cantidad: 3 }],
    clientes: [
      {
        id: "c",
        nombre: "Cliente prueba",
        direccion: "Calle",
        telefono: "123",
        activo: true,
        saldo: 3000,
      },
    ],
    envasesClientes: [{ clienteId: "c", productoId: "p", cantidad: 2 }],
    maquinasClientes: [],
    abonosClientes: [],
    cuposAbono: [],
    preciosClientes: [],
    planesAbono: [],
    itemsPlanesAbono: [],
  };
  if(options.cups){snap.productos[0]={...snap.productos[0],tipo:"COPA",codigo:"COPA",nombre:"Copa",precioVenta:0};snap.stockJornada[0].estado="DISPONIBLE";snap.envasesClientes=[];}
  if(options.machines){snap.productos.push({id:"m",tipo:"MAQUINA",nombre:"Máquina",activo:true});snap.stockJornada.push({productoId:"m",estado:"DISPONIBLE",cantidad:2});snap.maquinasClientes.push({clienteId:"c",productoId:"m",cantidad:1});snap.clientes[0].tieneAbonoRegistrado=true;}
  let refreshFail = false,
    first = true;
  w.fetch = async (url, opts = {}) => {
    if(!connected)throw new TypeError("Network unavailable");
    if (url.endsWith("/auth/me"))
      return new Response(
        JSON.stringify({ username: "admin", roles: ["ROLE_ADMIN"] }),
      );
    if (url.includes("/jornadas?"))
      return new Response(
        JSON.stringify({
          contenido: [
            {
              ...snap.jornada,
              camionetaNombre: "Camioneta 1",
              patente: "AA123BB",
              repartidorNombre: "Rep",
            },
          ],
          pagina: 0,
          hayMas: false,
        }),
      );
    if (url.endsWith("/csrf"))
      return new Response(
        JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "csrf-test" }),
      );
    if (opts.method === "POST") {
      assert.equal(opts.headers["X-CSRF-TOKEN"], "csrf-test");
      assert.ok(opts.headers.Authorization.startsWith("Basic "));
      bodies.push(opts.body);
      const op = JSON.parse(opts.body).operaciones[0];
      const req = op.entrega ?? op.cobro ?? op.maquina;
      if (options.conflict)
        return new Response(
          JSON.stringify({
            completo: false,
            confirmadas: 0,
            pendientes: 1,
            resultados: [
              {
                estado: "CONFLICTO",
                httpStatus: 409,
                mensaje: "Precio cambió",
                respuesta: null,
              },
            ],
          }),
        );
      if (!ids.has(req.operacionId)) {
        let total;
        if(op.tipo === "MAQUINA") {total=0;snap.stockJornada[1].cantidad-=req.entregadas-req.retiradas;snap.maquinasClientes[0].cantidad+=req.entregadas-req.retiradas;
        } else if (op.tipo === "ENTREGA") {
          total = op.esperadoEntrega.total;
          snap.clientes[0].saldo += total;
          snap.stockJornada[0].cantidad -= req.items[0].entregados;
          if (!options.cups) snap.envasesClientes[0].cantidad += req.items[0].entregados;
        } else {
          total = req.pagos.reduce((n, p) => n + p.importe, 0);
          snap.clientes[0].saldo -= total;
        }
        ids.set(req.operacionId, {
          id: req.operacionId,
          total,
          saldoCliente: op.tipo === "MAQUINA" ? snap.maquinasClientes[0].cantidad : snap.clientes[0].saldo,
        });
      }
      if (options.lost && first) {
        first = false;
        throw new TypeError("Respuesta perdida");
      }
      if (options.refreshFail && first) {
        first = false;
        refreshFail = true;
      }
      return new Response(
        JSON.stringify({
          completo: true,
          confirmadas: 1,
          pendientes: 0,
          resultados: [
            {
              estado: "CONFIRMADA",
              httpStatus: 200,
              respuesta: ids.get(req.operacionId),
            },
          ],
        }),
      );
    }
    if (refreshFail) return new Response("{}", { status: 500 });
    if (url.endsWith("/datos-offline")) {
      snap.generadoEn = new Date().toISOString();
      return new Response(JSON.stringify(snap));
    }
    return new Response(
      JSON.stringify({
        estado: snap.jornada.estado,
        efectivoInicial: 24000,
        totalCobrado: 0,
        totalGastado: 0,
        efectivoEsperado: 24000,
        ingresosEfectivo: 0,
        ingresosTransferencia: 0,
        ingresosMercadoPago: 0,
      }),
    );
  };
  function click(label) {
    const b = [...w.document.querySelectorAll("button")].find(
      (b) => b.textContent === label,
    );
    assert.ok(b, "button " + label);
    assert.ok(!b.disabled, label + " disabled");
    b.click();
  }
  function input(selector, value) {
    const e = w.document.querySelector(selector);
    assert.ok(e, selector);
    e.value = value;
    e.dispatchEvent(new w.Event("input", { bubbles: true }));
  }
  w.eval(code);
  input("[autocomplete=username]", "admin");
  input("[type=password]", "test-only");
  await wait();
  w.document
    .querySelector("form")
    .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await wait();
  await wait();
  for(let i=0;i<40&&!w.document.querySelector(".journey-option");i++)await wait();
  w.document.querySelector(".journey-option").click();
  await wait();
  click("Clientes del reparto");
  await wait();
  w.document.querySelector(".client").click();
  await wait();
  async function reviewDelivery() {
    input(".operations input[type=number]", "1");
    await wait();
    w.document
      .querySelector(".operations form")
      .dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
    await wait();
    click("Confirmar entrega");
    await wait();
    await wait();
  }
  return {
    w,
    dom,
    key,
    snap,
    bodies,
    ids,
    click,
    input,
    reviewDelivery,
    text: () => w.document.body.textContent,
    connection: (value)=>{connected=value;w.dispatchEvent(new w.Event(value?"online":"offline"));},
    allowRefresh: () => {
      refreshFail = false;
    },
  };
}
async function until(fn){for(let i=0;i<60;i++){if(fn())return;await wait();}assert.ok(fn(),"La interfaz no alcanzó el estado esperado");}
test("sin conexión registra dos entregas, bloquea cierre y sincroniza al volver sin tocar botón",async()=>{
 const a=await setup();try{
  assert.ok(a.w.document.querySelector('.auto-operations'));
  a.connection(false);await a.reviewDelivery();
  assert.match(a.text(),/1 pendientes/);assert.equal(a.bodies.length,0);
  await a.reviewDelivery();assert.match(a.text(),/2 pendientes/);
  a.click('Finalizar reparto');await wait();assert.match(a.text(),/Primero resolvé la entrega o el cobro pendiente/);
  a.connection(true);await until(()=>a.bodies.length===2&&a.w.document.querySelector('.auto-operations h2').textContent==='Al día');
  assert.equal(a.snap.stockJornada[0].cantidad,1);assert.equal(a.snap.clientes[0].saldo,10000);
  assert.notEqual(JSON.parse(a.bodies[0]).operaciones[0].entrega.operacionId,JSON.parse(a.bodies[1]).operaciones[0].entrega.operacionId);
 }finally{a.w.close();}
});
test("respuesta perdida se reintenta automáticamente con el mismo UUID",async()=>{
 const a=await setup({lost:true});try{
  await a.reviewDelivery();assert.equal(a.bodies.length,1);assert.match(a.text(),/pendientes/);
  a.connection(true);await until(()=>a.bodies.length===2&&a.w.document.querySelector('.auto-operations h2').textContent==='Al día');
  assert.equal(a.bodies[0],a.bodies[1]);assert.equal(a.ids.size,1);assert.equal(a.snap.stockJornada[0].cantidad,2);
 }finally{a.w.close();}
});
test("conflicto detiene reintentos y muestra revisión explícita",async()=>{
 const a=await setup({conflict:true});try{
  await a.reviewDelivery();assert.match(a.text(),/Revisar operación/);a.connection(true);await wait();assert.equal(a.bodies.length,1);
  assert.equal(a.w.document.querySelector('.auto-operations button.primary')?.disabled,true);
 }finally{a.w.close();}
});
test("salir con pendientes y volver a ingresar los recupera y sincroniza automáticamente",async()=>{
 const a=await setup();try{
  a.connection(false);await a.reviewDelivery();assert.equal(a.bodies.length,0);a.click('Salir');await wait();
  a.connection(true);a.input('[autocomplete=username]','admin');a.input('[autocomplete=current-password]','test-only');await wait();
  a.w.document.querySelector('form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>a.bodies.length===1&&a.w.document.querySelector('.auto-operations h2')?.textContent==='Al día');
  assert.equal(a.snap.stockJornada[0].cantidad,2);assert.equal(a.ids.size,1);
 }finally{a.w.close();}
});
