import { useEffect, useRef, useState } from "preact/hooks";
import {
  ApiError,
  openingOptions,
  factoryStock,
  products,
  postJourney,
  closurePreview,
  expenseCategories,
} from "./api";
import { opening, loading, closing } from "./journey-model";
import {ExpenseFields} from "./ExpenseFields";
import {expense,emptyExpense,type Category} from "./expense-model";
import { money } from "./operations-model";
import type {
  ClosurePreview,
  User,
  Snapshot,
  OpeningOptions,
  FactoryStock,
  Producto,
} from "./types";
type Body =
  | ({operacionId:string} & ReturnType<typeof expense>)
  | ({ operacionId: string } & ReturnType<typeof closing>)
  | {
      operacionId: string;
      camionetaId: string;
      repartidorId: string;
      efectivoInicial: number;
    }
  | { operacionId: string; items: { productoId: string; cantidad: number }[] };
interface Pending {
  version: 1;
  kind: "OPEN" | "LOAD" | "CLOSE" | "EXPENSE";
  body: Body;
  jornadaId: string;
  summary: string;
  status: "pending" | "confirmed" | "rejected";
  message?: string;
}
interface Props {
  user: User;
  data: Snapshot | null;
  busy: boolean;
  setWorking: (v: boolean) => void;
  onComplete: (id: string) => Promise<void>;
}
function read(key: string): { p: Pending | null; error: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { p: null, error: "" };
    const p = JSON.parse(raw);
    if (
      p.version !== 1 ||
      !p.body?.operacionId ||
      !["OPEN", "LOAD", "CLOSE", "EXPENSE"].includes(p.kind) ||
      !["pending", "confirmed", "rejected"].includes(p.status)
    )
      throw new Error();
    return { p, error: "" };
  } catch {
    return {
      p: null,
      error:
        "No se pudo leer la solicitud de jornada guardada. Revisá el almacenamiento antes de registrar otra.",
    };
  }
}
export function JourneyActions({
  user,
  data,
  busy,
  setWorking,
  onComplete,
}: Props) {
  const key = `agua.jornada.pending.v1.${user.username}`,
    start = useRef(read(key));
  const [pending, setPending] = useState<Pending | null>(start.current.p),
    [storageError, setStorageError] = useState(start.current.error),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"OPEN" | "LOAD" | "CLOSE" | "EXPENSE" | null>(null),
    [options, setOptions] = useState<OpeningOptions | null>(null),
    [catalog, setCatalog] = useState<Producto[]>([]),
    [stock, setStock] = useState<FactoryStock[]>([]);
  const [van, setVan] = useState(""),
    [rep, setRep] = useState(""),
    [amount, setAmount] = useState("24000"),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [review, setReview] = useState(false);
  const [preview, setPreview] = useState<ClosurePreview | null>(null),
    [reason, setReason] = useState("");
  const [categories,setCategories]=useState<Category[]>([]),[draft,setDraft]=useState(emptyExpense);
  const running = useRef(false);
  useEffect(() => {
    setMode(null);
    setReview(false);
  }, [data?.jornada.id, data?.jornada.estado]);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        const r = read(key);
        setPending(r.p);
        setStorageError(r.error);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);
  useEffect(() => {
    if (!pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending]);
  function save(p: Pending) {
    localStorage.setItem(key, JSON.stringify(p));
    setPending(p);
  }
  async function prepare(kind: "OPEN" | "LOAD" | "CLOSE" | "EXPENSE") {
    if (busy || running.current) return;
    setWorking(true);
    setError("");
    setNotice("");
    setMode(null);
    setReview(false);
    try {
      if (pending) throw new Error("Primero resolvé la solicitud pendiente.");
      if ((localStorage.getItem(`agua.clients.pending.v1.${user.username}`) || localStorage.getItem(`agua.factory.pending.v1.${user.username}`)))
        throw new Error("Primero resolvé la solicitud pendiente de clientes o fábrica.");
      if (localStorage.getItem(`agua.pending.v1.${user.username}`))
        throw new Error("Primero resolvé la entrega o el cobro pendiente.");
      if (kind === "OPEN") {
        const opt = await openingOptions();
        setOptions(opt);
        setAmount(String(opt.efectivoInicialSugerido));
        const vans = opt.camionetas.filter((c) => !c.ocupada),
          reps = opt.repartidores.filter((r) => !r.ocupado);
        setVan(vans.length === 1 ? vans[0].id : "");
        setRep(reps.length === 1 ? reps[0].id : "");
      } else if (kind === "EXPENSE") {
        if (!data || data.jornada.estado !== "ABIERTA") throw new Error("Seleccioná una jornada abierta.");
        setCategories(await expenseCategories());setDraft(emptyExpense());
      } else if (kind === "CLOSE") {
        if (!data || data.jornada.estado !== "ABIERTA")
          throw new Error("Seleccioná una jornada abierta.");
        const prev = await closurePreview(data.jornada.id);
        if (prev.jornada.estado !== "ABIERTA")
          throw new Error("La jornada ya está cerrada.");
        setPreview(prev);
        setAmount("");
        setReason("");
      } else {
        if (!data || data.jornada.estado !== "ABIERTA")
          throw new Error("Seleccioná una jornada abierta.");
        const [cat, fac] = await Promise.all([products(), factoryStock()]);
        setCatalog(cat.filter((p) => p.activo && ["BIDON", "MAQUINA", "COPA"].includes(p.tipo)));
        setStock(fac);
        setQuantities({});
      }
      setMode(kind);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function clear(p: Pending) {
    if (p.status === "confirmed") await onComplete(p.jornadaId);
    else if (data) await onComplete(data.jornada.id);
    const current = read(key);
    if (current.error) throw new Error(current.error);
    if (current.p && current.p.body.operacionId !== p.body.operacionId)
      throw new Error("Hay otra solicitud pendiente. Revisá la pantalla.");
    localStorage.removeItem(key);
    setPending(null);
    setMode(null);
    setReview(false);
    setNotice(p.message ?? "Datos actualizados. Podés continuar.");
  }
  async function execute(p: Pending) {
    if (running.current) return;
    running.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    let confirmed = p.status === "confirmed";
    try {
      if (p.status !== "pending") {
        await clear(p);
        return;
      }
      const path =
        p.kind === "OPEN"
          ? "/jornadas"
          : `/jornadas/${encodeURIComponent(p.jornadaId)}/${p.kind === "CLOSE" ? "cierre" : p.kind === "EXPENSE" ? "gastos" : "cargas"}`;
      const response = await postJourney(path, p.body);
      if (
        response.id !== p.body.operacionId ||
        (p.kind !== "OPEN" && response.jornadaId !== p.jornadaId)
      )
        throw new Error(
          "Respuesta inesperada. Conservamos la solicitud para verificarla mediante reintento.",
        );
      confirmed = true;
      const done: Pending = {
        ...p,
        status: "confirmed",
        jornadaId: p.kind === "OPEN" ? response.id : p.jornadaId,
        message:
          p.kind === "OPEN"
            ? "Jornada abierta. Ya podés cargar stock."
            : p.kind === "EXPENSE" ? "Gasto registrado. Caja actualizada." : p.kind === "CLOSE"
              ? "Jornada cerrada. Stock devuelto a fábrica y caja registrada."
              : `${response.tipo === "INICIAL" ? "Carga inicial" : "Recarga"} registrada. Stock actualizado.`,
      };
      save(done);
      await clear(done);
    } catch (e) {
      if (
        !confirmed &&
        e instanceof ApiError &&
        [400, 409, 422].includes(e.status)
      ) {
        try {
          save({ ...p, status: "rejected", message: e.message });
        } catch {
          setError(
            "No se pudo guardar el rechazo. Conservamos la solicitud original.",
          );
          return;
        }
      }
      setError(
        (e as Error).message ||
          "No se obtuvo confirmación. Reintentá la misma solicitud.",
      );
    } finally {
      running.current = false;
      setWorking(false);
    }
  }
  function getBody() {
    if (mode === "EXPENSE" && data?.jornada.estado === "ABIERTA") {
      const body=expense(categories,draft);
      if(body.fecha < data.jornada.fecha || body.fecha > emptyExpense().fecha) throw new Error("La fecha debe estar entre el inicio de la jornada y hoy.");
      return body;
    }
    if (mode === "CLOSE" && preview && data?.jornada.id === preview.jornada.id)
      return closing(preview, amount, reason);
    if (mode === "OPEN" && options) return opening(options, van, rep, amount);
    if (mode === "LOAD" && data?.jornada.estado === "ABIERTA")
      return { items: loading(catalog, stock, quantities) };
    throw new Error("Volvé a preparar la operación.");
  }
  function reviewOperation(e: Event) {
    e.preventDefault();
    setError("");
    try {
      getBody();
      setReview(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm() {
    if (busy || running.current || !mode) return;
    setError("");
    try {
      const prev = read(key);
      if (prev.error) throw new Error(prev.error);
      if (prev.p) {
        setPending(prev.p);
        throw new Error("Ya hay una solicitud pendiente.");
      }
      if (localStorage.getItem(`agua.pending.v1.${user.username}`))
        throw new Error("Primero resolvé la entrega o el cobro pendiente.");
      if ((localStorage.getItem(`agua.clients.pending.v1.${user.username}`) || localStorage.getItem(`agua.factory.pending.v1.${user.username}`)))
        throw new Error("Primero resolvé la solicitud pendiente de clientes o fábrica.");
      const body = { ...getBody(), operacionId: crypto.randomUUID() } as Body;
      const summary =
        mode === "OPEN"
          ? `${options!.camionetas.find((c) => c.id === van)?.nombre} · ${options!.repartidores.find((r) => r.id === rep)?.nombre} · Fondo ${money(Number(amount.replace(",", ".")))}`
          : mode === "EXPENSE" ? `${categories.find(c=>c.id===draft.categoriaId)?.nombre} · ${draft.fecha} · ${draft.medio} · ${money(Number(draft.importe.replace(",", ".")))} · ${draft.descripcion}` : mode === "CLOSE"
            ? `Cierre · Efectivo contado ${money(Number(amount.replace(",", ".")))} · ${reason || "Sin diferencia"}`
            : "items" in body
              ? body.items
                  .map(
                    (i) =>
                      `${catalog.find((p) => p.id === i.productoId)?.nombre}: ${i.cantidad}`,
                  )
                  .join(" · ")
              : "";
      const p: Pending = {
        version: 1,
        kind: mode,
        body,
        jornadaId: mode === "OPEN" ? body.operacionId : data!.jornada.id,
        summary,
        status: "pending",
      };
      save(p);
      await execute(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section class="panel journey-actions">
      <div class="section-heading">
        <h2>Operaciones de jornada</h2>
        {!pending && !storageError && (
          <div class="actions">
            <button
              class="primary"
              disabled={busy}
              onClick={() => void prepare("OPEN")}
            >
              Abrir jornada
            </button>
            {data?.jornada.estado === "ABIERTA" && <button class="secondary" disabled={busy} onClick={()=>void prepare("EXPENSE")}>Registrar gasto</button>}
            {data?.jornada.estado === "ABIERTA" && (
              <button
                class="secondary"
                disabled={busy}
                onClick={() => void prepare("CLOSE")}
              >
                Cerrar jornada
              </button>
            )}
            {data?.jornada.estado === "ABIERTA" && (
              <button
                class="secondary"
                disabled={busy}
                onClick={() => void prepare("LOAD")}
              >
                Cargar / recargar stock
              </button>
            )}
          </div>
        )}
      </div>
      {storageError && (
        <p class="error" role="alert">
          {storageError}
        </p>
      )}
      {error && (
        <p class="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p class="notice" role="status">
          {notice}
        </p>
      )}
      {pending ? (
        <div>
          <h3>
            {pending.status === "pending"
              ? "Solicitud de jornada pendiente"
              : pending.status === "confirmed"
                ? "Confirmada · falta actualizar"
                : "Solicitud de jornada rechazada"}
          </h3>
          <p>{pending.summary}</p>
          <small>Operación: {pending.body.operacionId}</small>
          {pending.message && <p>{pending.message}</p>}
          <p class="muted">
            La solicitud conserva sus datos e identificador. No crees otra para
            reemplazarla si todavía no conocemos el resultado.
          </p>
          <button
            class="primary"
            disabled={busy || !!storageError}
            onClick={() => void execute(pending)}
          >
            {pending.status === "pending"
              ? "Reintentar solicitud de jornada"
              : pending.status === "confirmed"
                ? "Actualizar jornada confirmada"
                : "Descartar solicitud rechazada"}
          </button>
        </div>
      ) : mode && !storageError ? (
        <form onSubmit={reviewOperation}>
          <fieldset disabled={busy} class="form-wrapper">
            <h3>
              {mode === "OPEN"
                ? "Nueva jornada"
                : mode === "CLOSE"
                  ? "Cierre de jornada"
                  : mode === "EXPENSE" ? "Gasto de jornada" : "Stock desde fábrica"}
            </h3>
            {mode === "EXPENSE" ? <ExpenseFields categories={categories} draft={draft} onChange={setDraft} review={review}/> : mode === "OPEN" && options ? (
              <>
                <label>
                  Camioneta
                  <select
                    value={van}
                    disabled={review}
                    onChange={(e) => setVan(e.currentTarget.value)}
                  >
                    <option value="">Elegí una camioneta</option>
                    {options.camionetas.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.ocupada}>
                        {c.nombre} · {c.patente}
                        {c.ocupada ? " · Ocupada" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Repartidor
                  <select
                    value={rep}
                    disabled={review}
                    onChange={(e) => setRep(e.currentTarget.value)}
                  >
                    <option value="">Elegí un repartidor</option>
                    {options.repartidores.map((r) => (
                      <option key={r.id} value={r.id} disabled={r.ocupado}>
                        {r.nombre}
                        {r.ocupado ? " · Con jornada abierta" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Efectivo inicial
                  <input
                    inputMode="decimal"
                    value={amount}
                    disabled={review}
                    onInput={(e) => setAmount(e.currentTarget.value)}
                  />
                </label>
                {(!options.camionetas.some((c) => !c.ocupada) ||
                  !options.repartidores.some((r) => !r.ocupado)) && (
                  <p class="notice">
                    No hay una combinación disponible. Revisá las jornadas
                    abiertas; deben cerrarse antes de volver a usar esa
                    camioneta o repartidor.
                  </p>
                )}
                <p class="muted">
                  La fecha se asigna al abrir, según la hora de Argentina del
                  servidor.
                </p>
              </>
            ) : mode === "CLOSE" && preview ? (
              <>
                <p>
                  Jornada del{" "}
                  {preview.jornada.fecha.split("-").reverse().join("/")}
                </p>
                <p>
                  Efectivo esperado:{" "}
                  <strong>{money(preview.caja.efectivoEsperado)}</strong>
                </p>
                <label>
                  Efectivo contado
                  <input
                    aria-label="Efectivo contado"
                    inputMode="decimal"
                    value={amount}
                    disabled={review}
                    onInput={(e) => setAmount(e.currentTarget.value)}
                  />
                </label>
                <p>
                  Diferencia (contado menos esperado):{" "}
                  <strong>
                    {/^\d+([.,]\d{1,2})?$/.test(amount.trim())
                      ? money(
                          Number(amount.replace(",", ".")) -
                            preview.caja.efectivoEsperado,
                        )
                      : "—"}
                  </strong>
                </p>
                <label>
                  Motivo de la diferencia
                  <textarea
                    aria-label="Motivo de la diferencia"
                    maxLength={500}
                    value={reason}
                    disabled={review}
                    onInput={(e) => setReason(e.currentTarget.value)}
                  />
                </label>
                <h4>Stock a devolver a fábrica</h4>
                {preview.stockADevolver.length ? (
                  preview.stockADevolver.map((s) => (
                    <p key={s.productoId + s.estado}>
                      {s.nombre} · {s.estado}: <strong>{s.cantidad}</strong>
                    </p>
                  ))
                ) : (
                  <p>No queda stock para devolver.</p>
                )}
                <p class="muted">
                  Verificá físicamente estas cantidades. El cierre devuelve todo
                  el stock y no permite registrar nuevos movimientos en esta
                  jornada.
                </p>
              </>
            ) : (
              <>
                <p class="muted">
                  Jornada del{" "}
                  {data?.jornada.fecha.split("-").reverse().join("/")}. La
                  primera carga se registra como inicial; las siguientes como
                  recargas.
                </p>
                {catalog.map((p) => {
                  const state = p.tipo === "BIDON" ? "LLENO" : "DISPONIBLE";
                  const available =
                    stock.find(
                      (s) => s.productoId === p.id && s.estado === state,
                    )?.cantidad ?? 0;
                  return (
                    <label class="load-row" key={p.id}>
                      <span>
                        <b>{p.nombre}</b>
                        <small>
                          {state} · En fábrica: {available}
                        </small>
                      </span>
                      <input
                        aria-label={`Cantidad de ${p.nombre}`}
                        type="number"
                        min="0"
                        max={available}
                        step="1"
                        placeholder="0"
                        disabled={review || available === 0}
                        value={quantities[p.id] ?? ""}
                        onInput={(e) => {
                          const value = e.currentTarget.value;
                          setQuantities((q) => ({ ...q, [p.id]: value }));
                        }}
                      />
                    </label>
                  );
                })}
              </>
            )}
            {review && (
              <p class="notice">
                Revisá los datos. Al confirmar{" "}
                {mode === "OPEN"
                  ? "se abrirá la jornada con el fondo indicado"
                  : mode === "CLOSE"
                    ? "se cerrará la jornada y se devolverá todo el stock indicado a fábrica"
                    : mode === "EXPENSE" ? "se registrará el gasto en el medio de pago indicado" : "se descontarán las cantidades de fábrica y se sumarán a la jornada"}
                .
              </p>
            )}
            <div class="actions">
              <button
                type="button"
                class="ghost"
                onClick={() => {
                  setMode(null);
                  setReview(false);
                }}
              >
                Cancelar
              </button>
              {review ? (
                <>
                  <button
                    type="button"
                    class="secondary"
                    onClick={() => setReview(false)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="primary"
                    onClick={() => void confirm()}
                  >
                    Confirmar{" "}
                    {mode === "OPEN"
                      ? "apertura"
                      : mode === "CLOSE"
                        ? "cierre"
                        : mode === "EXPENSE" ? "gasto" : "carga"}
                  </button>
                </>
              ) : (
                <button class="primary">
                  Revisar{" "}
                  {mode === "OPEN"
                    ? "apertura"
                    : mode === "CLOSE"
                      ? "cierre"
                      : mode === "EXPENSE" ? "gasto" : "carga"}
                </button>
              )}
            </div>
          </fieldset>
        </form>
      ) : (
        !pending && (
          <p class="muted">
            Abrí una jornada o seleccioná una abierta de la lista para cargar
            stock.
          </p>
        )
      )}
    </section>
  );
}
