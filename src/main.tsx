import { render } from "preact";
import { useState } from "preact/hooks";
import { cash, clearAuth, download, login } from "./api";
import type { Caja, Cliente, Snapshot, User } from "./types";
import "./style.css";
import { JourneyPicker } from "./JourneyPicker";
import { Operations } from "./Operations";
import { ExpenseList } from "./ExpenseList";
import {ClientManager} from "./ClientManager";
import {PriceAdmin} from "./PriceAdmin";
import {PlanAdmin} from "./PlanAdmin";
import {CategoryAdmin} from "./CategoryAdmin";
import { Factory } from "./Factory";
import { JourneyActions } from "./JourneyActions";
const money = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n);
const date = (s: string) => s.split("-").reverse().join("/");
const stamp = (s: string) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(s));
function App() {
  const [journeyRevision, setJourneyRevision] = useState(0);
  const [user, setUser] = useState<User | null>(null),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const [id, setId] = useState(""),
    [data, setData] = useState<Snapshot | null>(null),
    [caja, setCaja] = useState<Caja | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("jornada"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Cliente | null>(null);
  async function signIn(e: Event) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setUser(await login(username.trim(), password));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  async function load(target: string) {
    setBusy(true);
    setError("");
    try {
      const snapshot = await download(target);
      if (snapshot.versionFormato !== 1)
        throw new Error(
          "Actualizá la aplicación para leer este formato de datos.",
        );
      const balance = await cash(target);
      setId(target);
      setData(snapshot);
      setCaja(balance);
      setSelected(null);
      setTab("jornada");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function completeJourney(target: string) {
    const snapshot = await download(target);
    const balance = await cash(target);
    setId(target);
    setData(snapshot);
    setCaja(balance);
    setSelected(null);
    setTab("jornada");
    setJourneyRevision((n) => n + 1);
  }
  async function refreshAfterOperation() {
    if (!id) return;
    const snapshot = await download(id);
    const balance = await cash(id);
    setData(snapshot);
    setCaja(balance);
    setSelected((current) =>
      current
        ? (snapshot.clientes.find((c) => c.id === current.id) ?? null)
        : null,
    );
  }
  function logout() {
    clearAuth();
    setUser(null);
    setData(null);
    setCaja(null);
    setSelected(null);
    setId("");
    setSearch("");
    setError("");
    setPassword("");
  }
  const product = (pid: string) =>
    data?.productos.find((p) => p.id === pid)?.nombre ?? "Producto";
  const clientes =
    data?.clientes.filter((c) =>
      (c.nombre + " " + c.direccion + " " + c.telefono)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    ) ?? [];
  return (
    <div class="app">
      <header class="top">
        <div class="brand">
          <span class="brand-icon">◉</span>
          <div>
            AGUA<small>GESTIÓN DE REPARTO</small>
          </div>
        </div>
        {user && (
          <div class="account">
            <span>
              {user.username}
              <small>
                {user.roles.includes("ROLE_ADMIN")
                  ? "Administrador"
                  : "Repartidor"}
              </small>
            </span>
            <button class="ghost" disabled={busy} onClick={logout}>
              Salir
            </button>
          </div>
        )}
      </header>
      {!user ? (
        <main class="login-layout">
          <section class="intro">
            <span class="eyebrow">CADA ENTREGA, EN ORDEN</span>
            <h1>
              Tu jornada.
              <br />
              Todo a mano.
            </h1>
            <p>
              Clientes, abonos y stock en una sola pantalla. Simple, estés donde
              estés.
            </p>
            <div class="intro-note">
              <span>01</span> Entrá con tu usuario de reparto
            </div>
            <div class="intro-note">
              <span>02</span> Consultá tu jornada y tus clientes
            </div>
          </section>
          <form class="panel login" onSubmit={signIn}>
            <span class="eyebrow">BIENVENIDO</span>
            <h2>Ingresá a tu cuenta</h2>
            <p class="muted">Usá el mismo usuario que en el sistema.</p>
            <label>
              Usuario
              <input
                autoComplete="username"
                required
                value={username}
                onInput={(e) => setUsername(e.currentTarget.value)}
                disabled={busy}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onInput={(e) => setPassword(e.currentTarget.value)}
                disabled={busy}
              />
            </label>
            {error && (
              <p class="error" role="alert">
                {error}
              </p>
            )}
            <button class="primary" disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar →"}
            </button>
            <small class="muted">
              La contraseña no se guarda en el almacenamiento de la aplicación.
            </small>
          </form>
        </main>
      ) : (
        <main class="workspace">
          <div class="page-heading">
            <div>
              <span class="eyebrow">REPARTO / CONSULTAS</span>
              <h1>
                {data ? "Tu jornada de reparto" : "Comencemos la jornada"}
              </h1>
            </div>
            <span class="pill">Entregas y cobros · Con conexión</span>
          </div>
          <ClientManager admin={user.roles.includes("ROLE_ADMIN")} key={user.username} username={user.username} busy={busy} setWorking={setBusy} refresh={refreshAfterOperation}/>
          {user.roles.includes("ROLE_ADMIN") && <PriceAdmin key={user.username} busy={busy} setWorking={setBusy}/>}
          {user.roles.includes("ROLE_ADMIN") && <PlanAdmin key={user.username} busy={busy} setWorking={setBusy}/>}
          {user.roles.includes("ROLE_ADMIN") && <CategoryAdmin key={user.username} busy={busy} setWorking={setBusy}/>}
          {user.roles.includes("ROLE_ADMIN") && (
            <Factory
              key={user.username}
              username={user.username}
              busy={busy}
              setWorking={setBusy}
            />
          )}
          <JourneyActions
            key={user.username}
            user={user}
            data={data}
            busy={busy}
            setWorking={setBusy}
            onComplete={completeJourney}
          />
          <JourneyPicker
            key={user.username + journeyRevision}
            user={user}
            disabled={busy}
            currentId={id}
            onSelect={load}
          />
          {data && (
            <button
              class="secondary"
              disabled={busy}
              onClick={() => void load(id)}
            >
              {busy ? "Consultando…" : "Actualizar jornada seleccionada"}
            </button>
          )}
          <Operations
            key={user.username}
            username={user.username}
            data={data}
            client={selected}
            refresh={refreshAfterOperation}
            setWorking={setBusy}
            externalBusy={busy}
          />
          {error && (
            <p class="error" role="alert">
              {error}
              {data && " Seguís viendo la última consulta exitosa."}
            </p>
          )}
          {!data ? (
            <div class="panel empty">
              <h2>Elegí una jornada para empezar</h2>
              <p>Podés consultar una jornada abierta o revisar una cerrada.</p>
              <p class="muted">
                Elegí una jornada de la lista. Si no hay abiertas, podés
                consultar las cerradas.
              </p>
            </div>
          ) : (
            <>
              <div class="context">
                <span>
                  <b>{date(data.jornada.fecha)}</b> ·{" "}
                  <span
                    class={`status ${data.jornada.estado === "ABIERTA" ? "open" : ""}`}
                  >
                    {data.jornada.estado === "ABIERTA" ? "Abierta" : "Cerrada"}
                  </span>
                </span>
                <small>Datos consultados: {stamp(data.generadoEn)}</small>
              </div>
              <nav class="tabs" aria-label="Secciones">
                {[
                  ["jornada", "Resumen"],
                  ["clientes", "Clientes"],
                  ["stock", "Stock"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-current={tab === value ? "page" : undefined}
                    class={tab === value ? "active" : ""}
                    onClick={() => {
                      setTab(value);
                      setSelected(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {tab === "jornada" && (
                <>
                  <div class="stats">
                    <article class="stat dark">
                      <span>Efectivo esperado</span>
                      <strong>{money(caja!.efectivoEsperado)}</strong>
                      <small>
                        Fondo inicial + ingresos − gastos en efectivo
                      </small>
                    </article>
                    <article class="stat">
                      <span>Total cobrado</span>
                      <strong>{money(caja!.totalCobrado)}</strong>
                      <small>Todos los medios de pago</small>
                    </article>
                    <article class="stat">
                      <span>Total gastado</span>
                      <strong>{money(caja!.totalGastado)}</strong>
                      <small>Gastos de esta jornada</small>
                    </article>
                  </div>
                  <div class="two-col">
                    <section class="panel">
                      <h2>Ingresos por medio</h2>
                      {[
                        ["Efectivo", caja!.ingresosEfectivo],
                        ["Transferencia", caja!.ingresosTransferencia],
                        ["Mercado Pago", caja!.ingresosMercadoPago],
                      ].map(([label, n]) => (
                        <div class="row" key={label}>
                          <span>{label}</span>
                          <b>{money(Number(n))}</b>
                        </div>
                      ))}
                      <div class="row">
                        <span>Fondo inicial</span>
                        <b>{money(caja!.efectivoInicial)}</b>
                      </div>
                    </section>
                    <section class="panel">
                      <h2>Gastos por medio</h2>
                      {[["Efectivo",caja!.egresosEfectivo],["Transferencia",caja!.egresosTransferencia],["Mercado Pago",caja!.egresosMercadoPago]].map(([label,n])=><div class="row" key={String(label)}><span>{label}</span><b>{money(Number(n ?? 0))}</b></div>)}
                      <p class="muted">Solo el gasto en efectivo reduce el efectivo esperado.</p>
                      <h2>Datos disponibles</h2>
                      <div class="row">
                        <span>Clientes compartidos</span>
                        <b>{data.clientes.length}</b>
                      </div>
                      <div class="row">
                        <span>Productos del catálogo</span>
                        <b>{data.productos.length}</b>
                      </div>
                      <p class="muted">
                        Los saldos y abonos de clientes son actuales. La caja
                        corresponde a la jornada seleccionada.
                      </p>
                      <button
                        class="secondary"
                        onClick={() => setTab("clientes")}
                      >
                        Ver clientes →
                      </button>
                    </section>
                  </div>
                  <ExpenseList key={data.jornada.id+data.generadoEn} id={data.jornada.id}/>
                  <p class="notice">
                    Para registrar entregas o cobros, elegí un cliente. El
                    trabajo sin conexión todavía no está habilitado.
                  </p>
                </>
              )}
              {tab === "stock" && (
                <section class="panel">
                  <h2>Stock de la camioneta</h2>
                  <p class="muted">Existencias de la jornada seleccionada.</p>
                  {data.stockJornada.length ? (
                    data.stockJornada.map((s) => (
                      <div class="row" key={s.productoId + s.estado}>
                        <div>
                          <b>{product(s.productoId)}</b>
                          <small>{s.estado.replaceAll("_", " ")}</small>
                        </div>
                        <strong>{s.cantidad}</strong>
                      </div>
                    ))
                  ) : (
                    <p>No hay stock registrado.</p>
                  )}
                  {data.jornada.estado === "CERRADA" && (
                    <p class="notice">
                      Jornada cerrada: el stock restante ya fue devuelto a
                      fábrica.
                    </p>
                  )}
                </section>
              )}
              {tab === "clientes" && !selected && (
                <section class="panel">
                  <div class="section-heading">
                    <h2>
                      Clientes <span class="count">{clientes.length}</span>
                    </h2>
                    <label class="search">
                      <span class="sr-only">Buscar cliente</span>
                      <input
                        type="search"
                        placeholder="Buscar nombre, dirección o teléfono"
                        value={search}
                        onInput={(e) => setSearch(e.currentTarget.value)}
                      />
                    </label>
                  </div>
                  <div class="client-list">
                    {clientes.map((c) => (
                      <button
                        class="client"
                        key={c.id}
                        onClick={() => setSelected(c)}
                      >
                        <span class="avatar">
                          {c.nombre.slice(0, 1).toUpperCase()}
                        </span>
                        <span class="client-info">
                          <b>{c.nombre}</b>
                          <small>
                            {c.direccion} {!c.activo && " · Inactivo"}
                          </small>
                        </span>
                        <span
                          class={`client-balance ${c.saldo > 0 ? "debt" : ""}`}
                        >
                          <b>{money(Math.abs(c.saldo))}</b>
                          <small>
                            {c.saldo > 0
                              ? "Debe"
                              : c.saldo < 0
                                ? "A favor"
                                : "Saldado"}
                          </small>
                        </span>
                        <span aria-hidden="true">›</span>
                      </button>
                    ))}
                  </div>
                  {!clientes.length && (
                    <p class="empty">
                      No encontramos clientes con esa búsqueda.
                    </p>
                  )}
                </section>
              )}
              {tab === "clientes" && selected && (
                <>
                  <button class="back" onClick={() => setSelected(null)}>
                    ← Volver a clientes
                  </button>
                  <section class="panel">
                    <span class="eyebrow">FICHA DEL CLIENTE</span>
                    <h2>{selected.nombre}</h2>
                    <p>{selected.direccion}</p>
                    <p>{selected.telefono}</p>
                    {!selected.activo && <p class="notice">Cliente inactivo</p>}
                    {selected.observaciones && (
                      <p class="notice">{selected.observaciones}</p>
                    )}
                    <div class="balance">
                      <span>
                        {selected.saldo > 0
                          ? "Saldo pendiente"
                          : selected.saldo < 0
                            ? "Saldo a favor"
                            : "Cuenta saldada"}
                      </span>
                      <strong>{money(Math.abs(selected.saldo))}</strong>
                    </div>
                  </section>
                  <div class="two-col">
                    {[
                      ["Envases", data.envasesClientes],
                      ["Máquinas", data.maquinasClientes],
                    ].map(([title, items]) => {
                      const list = (
                        items as Snapshot["envasesClientes"]
                      ).filter((x) => x.clienteId === selected.id);
                      return (
                        <section class="panel" key={String(title)}>
                          <h2>{String(title)} en poder del cliente</h2>
                          {list.length ? (
                            list.map((t) => (
                              <div class="row" key={t.productoId}>
                                <span>{product(t.productoId)}</span>
                                <b>{t.cantidad}</b>
                              </div>
                            ))
                          ) : (
                            <p class="muted">Sin unidades registradas.</p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                  <section class="panel">
                    <h2>Abonos · {date(data.periodo).slice(3)}</h2>
                    {data.abonosClientes.filter(
                      (a) => a.clienteId === selected.id,
                    ).length === 0 ? (
                      <p class="muted">Sin abonos registrados para este mes.</p>
                    ) : (
                      data.abonosClientes
                        .filter((a) => a.clienteId === selected.id)
                        .map((a) => (
                          <div class="abono" key={a.id}>
                            <div class="row">
                              <b>{a.planNombre}</b>
                              <b>{money(a.importe)}</b>
                            </div>
                            {data.cuposAbono
                              .filter((c) => c.abonoId === a.id)
                              .map((c) => (
                                <div class="row" key={c.productoId}>
                                  <span>
                                    {product(c.productoId)}
                                    <small>
                                      {c.consumidos} de {c.incluidos} consumidos
                                    </small>
                                  </span>
                                  <b>{c.disponibles} disponibles</b>
                                </div>
                              ))}
                          </div>
                        ))
                    )}
                  </section>
                  <section class="panel">
                    <h2>Precios especiales vigentes</h2>
                    {data.preciosClientes.filter(
                      (p) => p.clienteId === selected.id && p.activo,
                    ).length ? (
                      data.preciosClientes
                        .filter((p) => p.clienteId === selected.id && p.activo)
                        .map((p) => (
                          <div class="row" key={p.productoId}>
                            <span>{product(p.productoId)}</span>
                            <b>{money(p.precio)}</b>
                          </div>
                        ))
                    ) : (
                      <p class="muted">
                        Se aplica el precio general a las unidades fuera del
                        abono.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      )}
      <footer>
        AGUA · Reparto y administración <span>Versión 0.14</span>
      </footer>
    </div>
  );
}
render(<App />, document.getElementById("app")!);
