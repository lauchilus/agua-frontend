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
    stock = 0;
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
      estado: "ABIERTA",
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
                  estado: "ABIERTA",
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
    if (url.endsWith("/productos"))
      return new Response(JSON.stringify([product]));
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
        if (url.endsWith("/cargas")) {
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
        estado: "ABIERTA",
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
    click(kind === "OPEN" ? "Abrir jornada" : "Cargar / recargar stock");
    await wait();
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
    click(kind === "OPEN" ? "Confirmar apertura" : "Confirmar carga");
    await wait();
    await wait();
  }
  return {
    dom,
    w,
    bodies,
    ledger,
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
