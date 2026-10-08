import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url)),
  code = fs.readFileSync(
    root +
      "dist/assets/" +
      fs.readdirSync(root + "dist/assets").find((f) => f.endsWith(".js")),
    "utf8",
  );
const wait = () => new Promise((r) => setTimeout(r, 60));
async function setup({
  active = false,
  lost = false,
  conflict = false,
  refreshFailure = false,
  expenseMedium = "EFECTIVO",
} = {}) {
  const dom = new JSDOM('<div id="app"></div>', {
      url: "http://localhost:5173",
      runScripts: "outside-only",
      pretendToBeVisual: true,
    }),
    w = dom.window;
  w.TextEncoder = TextEncoder;
  w.AbortSignal = AbortSignal;
  w.Response = Response;
  let journey = active ? "00000000-0000-4000-8000-000000000099" : null,
    first = true,
    refreshFail = false,
    stock = 0, closed = false;
  const spent={EFECTIVO:0,TRANSFERENCIA:0,MERCADO_PAGO:0};
  const bodies = [],
    ledger = new Map(),
    key = "agua.jornada.pending.v1.admin";
  const product = {
    id: "p",
    codigo: "BIDON_12",
    nombre: "Bidón de 12 litros",
    tipo: "BIDON",
    precioVenta: 3500,
    version: 1,
  };
  const snapshot = () => ({
    versionFormato: 1,
    generadoEn: new Date().toISOString(),
    zonaHoraria: "America/Argentina/Buenos_Aires",
    periodo: "2026-10-01",
    jornada: {
      id: journey,
      fecha: "2026-10-08",
      estado: closed ? "CERRADA" : "ABIERTA",
      efectivoInicial: 24000,
    },
    stockJornada: [{ productoId: "p", estado: "LLENO", cantidad: stock }],
    productos: [{ ...product, activo: true }],
    clientes: [],
    envasesClientes: [],
    maquinasClientes: [],
    preciosClientes: [],
    planesAbono: [],
    itemsPlanesAbono: [],
    abonosClientes: [],
    cuposAbono: [],
  });
  w.fetch = async (url, opts = {}) => {
    if (url.endsWith("/auth/me"))
      return new Response(
        JSON.stringify({ username: "admin", roles: ["ROLE_ADMIN"] }),
      );
    if (url.includes("/jornadas?"))
      return new Response(
        JSON.stringify({
          contenido: journey
            ? [
                {
                  id: journey,
                  fecha: "2026-10-08",
                  estado: closed ? "CERRADA" : "ABIERTA",
                  camionetaNombre: "Camioneta 1",
                  patente: "AA",
                  repartidorNombre: "Rep",
                },
              ]
            : [],
          pagina: 0,
          hayMas: false,
        }),
      );
    if (url.endsWith("/apertura/opciones"))
      return new Response(
        JSON.stringify({
          camionetas: [
            {
              id: "v",
              nombre: "Camioneta 1",
              patente: "AA",
              ocupada: !!journey,
            },
          ],
          repartidores: [{ id: "r", nombre: "Rep", ocupado: !!journey }],
          efectivoInicialSugerido: 24000,
        }),
      );
    if (url.endsWith("/categorias-gasto")) return new Response(JSON.stringify([{id:"cat",nombre:"Nafta",activo:true,version:0}]));
    if (url.includes("/gastos?")) return new Response(JSON.stringify({contenido:[],pagina:0,hayMas:false}));
    if (url.endsWith("/productos"))
      return new Response(JSON.stringify([product, {id:"bag",codigo:"BOLSA_20",nombre:"Bolsa de 20 litros",tipo:"INSUMO"}, {id:"cup",codigo:"COPA",nombre:"Copa",tipo:"COPA"}, {id:"machine",codigo:"MAQUINA",nombre:"Máquina",tipo:"MAQUINA"}]));
    if (url.endsWith("/stock/fabrica"))
      return new Response(
        JSON.stringify([
          {
            productoId: "p",
            codigo: "BIDON_12",
            nombre: "Bidón de 12 litros",
            estado: "LLENO",
            cantidad: 5 - stock,
          },
        ]),
      );
    if (url.endsWith("/cierre/previa")) return new Response(JSON.stringify({ jornada: snapshot().jornada, caja: { efectivoEsperado: 24000 }, stockADevolver: [{productoId: "p", nombre: "Bidón de 12 litros", estado: "LLENO", cantidad: 2}, {productoId: "m", nombre: "Máquina", estado: "DISPONIBLE", cantidad: 1}] }));
    if (url.endsWith("/csrf"))
      return new Response(
        JSON.stringify({ headerName: "X-CSRF-TOKEN", token: "csrf" }),
      );
    if (opts.method === "POST") {
      assert.equal(opts.headers["X-CSRF-TOKEN"], "csrf");
      bodies.push(opts.body);
      const body = JSON.parse(opts.body);
      if (conflict)
        return new Response(JSON.stringify({ detail: "Stock insuficiente" }), {
          status: 409,
        });
      if (!ledger.has(body.operacionId)) {
        if (url.endsWith("/gastos")) {
          spent[body.medio]+=body.importe;
          ledger.set(body.operacionId,{id:body.operacionId,jornadaId:journey});
        } else if (url.endsWith("/cierre")) {
          closed = true; stock = 0;
          ledger.set(body.operacionId, {id: body.operacionId, jornadaId: journey});
        } else if (url.endsWith("/cargas")) {
          stock += body.items.reduce((n, i) => n + i.cantidad, 0);
          ledger.set(body.operacionId, {
            id: body.operacionId,
            jornadaId: journey,
            numero: 1,
            tipo: "INICIAL",
          });
        } else {
          journey = body.operacionId;
          ledger.set(body.operacionId, { id: journey, estado: "ABIERTA" });
        }
      }
      if (lost && first) {
        first = false;
        throw new TypeError("Respuesta perdida");
      }
      if (refreshFailure && first) {
        first = false;
        refreshFail = true;
      }
      return new Response(JSON.stringify(ledger.get(body.operacionId)));
    }
    if (refreshFail) return new Response("{}", { status: 400 });
    if (url.endsWith("/datos-offline"))
      return new Response(JSON.stringify(snapshot()));
    return new Response(
      JSON.stringify({
        estado: closed ? "CERRADA" : "ABIERTA",
        efectivoInicial: 24000,
        totalCobrado: 0,
        totalGastado: Object.values(spent).reduce((a,b)=>a+b,0),
        egresosEfectivo:spent.EFECTIVO,egresosTransferencia:spent.TRANSFERENCIA,egresosMercadoPago:spent.MERCADO_PAGO,
        efectivoEsperado: 24000-spent.EFECTIVO,
        ingresosEfectivo: 0,
        ingresosTransferencia: 0,
        ingresosMercadoPago: 0,
      }),
    );
  };
  function click(label) {
    const e = [...w.document.querySelectorAll("button")].find(
      (b) => b.textContent === label,
    );
    assert.ok(e, label);
    assert.ok(!e.disabled, label + " disabled");
    e.click();
  }
  function input(q, v) {
    const e = w.document.querySelector(q);
    assert.ok(e, q);
    e.value = v;
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
  if (active) {
    w.document.querySelector(".journey-option").click();
    await wait();
  }
  async function confirm(kind) {
    click(kind === "OPEN" ? "Abrir jornada" : kind === "CLOSE" ? "Cerrar jornada" : kind === "EXPENSE" ? "Registrar gasto" : "Cargar / recargar stock");
    await wait();
    if (kind === "EXPENSE") {
      const cat=w.document.querySelector('[aria-label="Categoría del gasto"]');cat.value="cat";cat.dispatchEvent(new w.Event("change",{bubbles:true}));
      await wait();input('[aria-label="Descripción del gasto"]',"Nafta prueba");await wait();input('[aria-label="Importe del gasto"]',"2000");await wait();
      const medio=w.document.querySelector('[aria-label="Medio del gasto"]');medio.value=expenseMedium;medio.dispatchEvent(new w.Event("change",{bubbles:true}));await wait();
    }
    if (kind === "CLOSE") { input('input[aria-label="Efectivo contado"]', "24000"); await wait(); }
    if (kind === "LOAD") {
      input('input[aria-label="Cantidad de Bidón de 12 litros"]', "2");
      await wait();
    }
    w.document
      .querySelector(".journey-actions form")
      .dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
    await wait();
    click(kind === "OPEN" ? "Confirmar apertura" : kind === "CLOSE" ? "Confirmar cierre" : kind === "EXPENSE" ? "Confirmar gasto" : "Confirmar carga");
    await wait();
    await wait();
  }
  return {
    dom,
    w,
    bodies,
    ledger,
    spent,
    key,
    confirm,
    click,
    stock: () => stock,
    text: () => w.document.body.textContent,
    allowRefresh: () => {
      refreshFail = false;
    },
  };
}
test("apertura con respuesta perdida reintenta mismo UUID y carga jornada", async () => {
  const x = await setup({ lost: true });
  try {
    await x.confirm("OPEN");
    assert.equal(x.ledger.size, 1);
    assert.ok(x.w.localStorage.getItem(x.key));
    x.click("Reintentar solicitud de jornada");
    await wait();
    await wait();
    assert.equal(x.bodies[0], x.bodies[1]);
    assert.equal(x.ledger.size, 1);
    assert.equal(x.w.localStorage.getItem(x.key), null);
    assert.match(x.text(), /Jornada abierta/);
  } finally {
    x.dom.window.close();
  }
});
test("carga usa catálogo sin activo y reintento no duplica unidades", async () => {
  const x = await setup({ active: true, lost: true });
  try {
    await x.confirm("LOAD");
    assert.equal(x.stock(), 2);
    x.click("Reintentar solicitud de jornada");
    await wait();
    await wait();
    assert.equal(x.stock(), 2);
    assert.equal(x.bodies[0], x.bodies[1]);
    assert.match(x.text(), /Carga inicial registrada/);
  } finally {
    x.dom.window.close();
  }
});
test("confirmada y refresco fallido conserva confirmación; no duplica POST", async () => {
  const x = await setup({ active: true, refreshFailure: true });
  try {
    await x.confirm("LOAD");
    assert.equal(
      JSON.parse(x.w.localStorage.getItem(x.key)).status,
      "confirmed",
    );
    x.allowRefresh();
    x.click("Actualizar jornada confirmada");
    await wait();
    await wait();
    assert.equal(x.bodies.length, 1);
    assert.equal(x.w.localStorage.getItem(x.key), null);
  } finally {
    x.dom.window.close();
  }
});
test("rechazo de carga no altera stock y se puede descartar", async () => {
  const x = await setup({ active: true, conflict: true });
  try {
    await x.confirm("LOAD");
    assert.equal(x.stock(), 0);
    assert.equal(
      JSON.parse(x.w.localStorage.getItem(x.key)).status,
      "rejected",
    );
    x.click("Descartar solicitud rechazada");
    await wait();
    await wait();
    assert.equal(x.w.localStorage.getItem(x.key), null);
  } finally {
    x.dom.window.close();
  }
});
test("no prepara apertura si existe una entrega pendiente", async () => {
  const x = await setup();
  try {
    x.w.localStorage.setItem("agua.pending.v1.admin", '{"pending":true}');
    x.click("Abrir jornada");
    await wait();
    assert.match(x.text(), /Primero resolvé la entrega o el cobro pendiente/);
    assert.equal(x.bodies.length, 0);
  } finally {
    x.dom.window.close();
  }
});

test("cierre perdido reintenta mismo cuerpo, devuelve máquinas y bloquea nuevos movimientos", async () => {
 const x = await setup({active:true,lost:true});
 try {
  await x.confirm("CLOSE");
  const body = JSON.parse(x.bodies[0]);
  assert.equal(body.efectivoContado,24000);
  assert.deepEqual(body.devoluciones,[{productoId:"p",estado:"LLENO",cantidad:2},{productoId:"m",estado:"DISPONIBLE",cantidad:1}]);
  x.click("Reintentar solicitud de jornada"); await wait(); await wait();
  assert.equal(x.bodies[0],x.bodies[1]); assert.equal(x.ledger.size,1);
  assert.equal(x.w.localStorage.getItem(x.key),null);
  assert.match(x.text(),/Jornada cerrada/);
  assert.ok(![...x.w.document.querySelectorAll("button")].some(b=>b.textContent === "Cerrar jornada"));
 } finally {x.dom.window.close();}
});
test("cierre confirmado con refresco fallido solo vuelve a consultar", async () => {
 const x=await setup({active:true,refreshFailure:true});
 try {await x.confirm("CLOSE"); assert.equal(JSON.parse(x.w.localStorage.getItem(x.key)).status,"confirmed"); x.allowRefresh(); x.click("Actualizar jornada confirmada"); await wait(); await wait(); assert.equal(x.bodies.length,1); assert.equal(x.w.localStorage.getItem(x.key),null); } finally {x.dom.window.close();}
});

test("carga oculta insumos y conserva copas y máquinas",async()=>{const x=await setup({active:true});try{x.click("Cargar / recargar stock");await wait();const labels=[...x.w.document.querySelectorAll(".load-row")].map(x=>x.textContent).join(" ");assert.match(labels,/Copa/);assert.match(labels,/Máquina/);assert.match(labels,/Bidón/);assert.doesNotMatch(labels,/Bolsa/);}finally{x.dom.window.close();}});

test("gasto perdido se reintenta una vez con mismo UUID y caja correcta",async()=>{const x=await setup({active:true,lost:true});try{await x.confirm("EXPENSE");assert.equal(x.spent.EFECTIVO,2000);x.click("Reintentar solicitud de jornada");await wait();await wait();assert.equal(x.bodies[0],x.bodies[1]);assert.equal(x.spent.EFECTIVO,2000);assert.equal(x.w.localStorage.getItem(x.key),null);assert.match(x.text(),/Gasto registrado/);assert.match(x.text(),/22[.]000/);}finally{x.dom.window.close();}});
test("transferencia y Mercado Pago conservan efectivo esperado",async()=>{for(const medio of ["TRANSFERENCIA","MERCADO_PAGO"]){const x=await setup({active:true,expenseMedium:medio});try{await x.confirm("EXPENSE");assert.equal(x.spent[medio],2000);assert.equal(x.spent.EFECTIVO,0);assert.match(x.text(),/24[.]000/);}finally{x.dom.window.close();}}});
test("gasto rechazado no cambia caja",async()=>{const x=await setup({active:true,conflict:true});try{await x.confirm("EXPENSE");assert.equal(x.spent.EFECTIVO,0);assert.equal(JSON.parse(x.w.localStorage.getItem(x.key)).status,"rejected");}finally{x.dom.window.close();}});
