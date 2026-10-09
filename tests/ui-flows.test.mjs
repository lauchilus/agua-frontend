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
  w.TextEncoder = TextEncoder;
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
  if(options.machines){snap.productos.push({id:"m",tipo:"MAQUINA",nombre:"Máquina",activo:true});snap.stockJornada.push({productoId:"m",estado:"DISPONIBLE",cantidad:2});snap.maquinasClientes.push({clienteId:"c",productoId:"m",cantidad:1});snap.clientes[0].tieneAbonoRegistrado=true;}
  let refreshFail = false,
    first = true;
  w.fetch = async (url, opts = {}) => {
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
          snap.envasesClientes[0].cantidad += req.items[0].entregados;
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
  w.document.querySelector(".journey-option").click();
  await wait();
  click("Clientes");
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
    allowRefresh: () => {
      refreshFail = false;
    },
  };
}
test("respuesta perdida: reintento conserva UUID y cuerpo; no duplica", async () => {
  const x = await setup({ lost: true });
  try {
    await x.reviewDelivery();
    assert.equal(x.ids.size, 1);
    assert.ok(x.w.localStorage.getItem(x.key));
    assert.match(x.text(), /pendiente de confirmación/);
    x.click("Reintentar misma solicitud");
    await wait();
    await wait();
    assert.equal(x.bodies.length, 2);
    assert.equal(x.bodies[0], x.bodies[1]);
    assert.equal(x.snap.clientes[0].saldo, 6500);
    assert.equal(x.w.localStorage.getItem(x.key), null);
    assert.match(x.text(), /Entrega confirmada/);
  } finally {
    x.dom.window.close();
  }
});
test("confirmación seguida de error al refrescar: no vuelve a hacer POST", async () => {
  const x = await setup({ refreshFail: true });
  try {
    await x.reviewDelivery();
    assert.equal(
      JSON.parse(x.w.localStorage.getItem(x.key)).status,
      "confirmed",
    );
    x.allowRefresh();
    x.click("Actualizar datos");
    await wait();
    await wait();
    assert.equal(x.bodies.length, 1);
    assert.equal(x.w.localStorage.getItem(x.key), null);
  } finally {
    x.dom.window.close();
  }
});
test("conflicto conserva datos y permite descartar rechazo tras refrescar", async () => {
  const x = await setup({ conflict: true });
  try {
    await x.reviewDelivery();
    assert.equal(x.snap.clientes[0].saldo, 3000);
    assert.equal(
      JSON.parse(x.w.localStorage.getItem(x.key)).status,
      "rejected",
    );
    x.click("Descartar solicitud rechazada y actualizar");
    await wait();
    await wait();
    assert.equal(x.w.localStorage.getItem(x.key), null);
    assert.equal(x.bodies.length, 1);
  } finally {
    x.dom.window.close();
  }
});
test("cobro mixto con CSRF registra solo los medios informados", async () => {
  const x = await setup();
  try {
    x.click("Cobro");
    await wait();
    const fields = x.w.document.querySelectorAll(
      ".operations input[inputmode=decimal]",
    );
    for (const [i, v] of [
      [0, "1000"],
      [1, "500"],
    ]) {
      fields[i].value = v;
      fields[i].dispatchEvent(new x.w.Event("input", { bubbles: true }));
    }
    await wait();
    x.w.document
      .querySelector(".operations form")
      .dispatchEvent(
        new x.w.Event("submit", { bubbles: true, cancelable: true }),
      );
    await wait();
    x.click("Confirmar cobro");
    await wait();
    await wait();
    assert.equal(x.snap.clientes[0].saldo, 1500);
    assert.equal(JSON.parse(x.bodies[0]).operaciones[0].cobro.pagos.length, 2);
  } finally {
    x.dom.window.close();
  }
});
test("jornada cerrada no muestra formularios de operaciones", async () => {
  const x = await setup({ closed: true });
  try {
    assert.equal(x.w.document.querySelector(".operations form"), null);
    assert.match(x.text(), /La jornada está cerrada/);
    assert.equal(x.bodies.length, 0);
  } finally {
    x.dom.window.close();
  }
});
test("si falla el almacenamiento no envía el POST", async () => {
  const x = await setup();
  try {
    x.w.Storage.prototype.setItem = () => {
      throw new Error("Sin espacio para guardar");
    };
    await x.reviewDelivery();
    assert.equal(x.bodies.length, 0);
    assert.match(x.text(), /Sin espacio/);
  } finally {
    x.dom.window.close();
  }
});
test("salir e ingresar recupera solicitud sin guardar contraseña", async () => {
  const x = await setup({ lost: true });
  try {
    await x.reviewDelivery();
    const saved = x.w.localStorage.getItem(x.key);
    assert.ok(saved);
    assert.ok(!saved.includes("test-only"));
    x.click("Salir");
    await wait();
    assert.equal(x.w.localStorage.getItem(x.key), saved);
    x.input("[type=password]", "test-only");
    await wait();
    x.w.document
      .querySelector("form")
      .dispatchEvent(
        new x.w.Event("submit", { bubbles: true, cancelable: true }),
      );
    await wait();
    await wait();
    assert.match(x.text(), /pendiente de confirmación/);
    x.click("Reintentar misma solicitud");
    await wait();
    await wait();
    assert.equal(x.bodies.length, 2);
    assert.equal(x.bodies[0], x.bodies[1]);
    assert.equal(x.ids.size, 1);
    assert.equal(x.w.localStorage.getItem(x.key), null);
  } finally {
    x.dom.window.close();
  }
});

async function machineAction(x,delivered,returned){x.input('[aria-label="Máquinas a entregar"]',delivered);await wait();x.input('[aria-label="Máquinas a retirar"]',returned);await wait();x.w.document.querySelector('.machine-form').dispatchEvent(new x.w.Event('submit',{bubbles:true,cancelable:true}));await wait();x.click('Confirmar máquinas');await wait();await wait();}
test('máquina perdida reintenta sin duplicar ni cobrar',async()=>{const x=await setup({machines:true,lost:true});try{await machineAction(x,'1','0');assert.equal(x.snap.maquinasClientes[0].cantidad,2);x.click('Reintentar misma solicitud');await wait();await wait();assert.equal(x.bodies[0],x.bodies[1]);assert.equal(x.snap.maquinasClientes[0].cantidad,2);assert.equal(x.snap.stockJornada[1].cantidad,1);assert.equal(x.snap.clientes[0].saldo,3000);assert.match(x.text(),/Movimiento de máquinas confirmado/);assert.doesNotMatch(x.text(),/NaN/);}finally{x.dom.window.close();}});
test('retiro de máquina vuelve a la jornada sin cambiar deuda',async()=>{const x=await setup({machines:true});try{await machineAction(x,'0','1');assert.equal(x.snap.maquinasClientes[0].cantidad,0);assert.equal(x.snap.stockJornada[1].cantidad,3);assert.equal(x.snap.clientes[0].saldo,3000);}finally{x.dom.window.close();}});
