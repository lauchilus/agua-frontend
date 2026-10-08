import { useEffect, useRef, useState } from "preact/hooks";
import type { Snapshot, Cliente } from "./types";
import { sendOperation } from "./api";
import {
  delivery,
  payments,
  money,
  type DraftItem,
  type Operation,
} from "./operations-model";
interface Pending {
  version: 1;
  id: string;
  jornadaId: string;
  clienteNombre: string;
  total: number;
  operation: Operation;
  status: "pending" | "confirmed" | "rejected";
  message?: string;
}
interface Props {
  externalBusy: boolean;
  username: string;
  data: Snapshot | null;
  client: Cliente | null;
  refresh: () => Promise<void>;
  setWorking: (working: boolean) => void;
}
function initial(key: string): { pending: Pending | null; error: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { pending: null, error: "" };
    const p = JSON.parse(raw);
    if (
      p.version !== 1 ||
      !p.id ||
      !p.jornadaId ||
      !p.operation ||
      !["pending", "confirmed", "rejected"].includes(p.status)
    )
      throw new Error();
    return { pending: p, error: "" };
  } catch {
    return {
      pending: null,
      error:
        "No se pudo leer la solicitud guardada. No registres otra operación hasta revisar el almacenamiento de este navegador.",
    };
  }
}
export function Operations({
  username,
  data,
  client,
  refresh,
  setWorking,
  externalBusy,
}: Props) {
  const key = `agua.pending.v1.${username}`,
    init = useRef(initial(key));
  const [pending, setPending] = useState<Pending | null>(init.current.pending),
    [storageError, setStorageError] = useState(init.current.error);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [formKey, setFormKey] = useState(0);
  const running = useRef(false);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === key) {
        const next = initial(key);
        setPending(next.pending);
        setStorageError(next.error);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  function save(p: Pending) {
    localStorage.setItem(key, JSON.stringify(p));
    setPending(p);
  }
  async function finish(p: Pending) {
    await refresh();
    const stored = initial(key);
    if (stored.error) throw new Error(stored.error);
    if (stored.pending && stored.pending.id !== p.id)
      throw new Error(
        "Hay otra solicitud en este navegador. Revisá la operación pendiente.",
      );
    localStorage.removeItem(key);
    setPending(null);
    setFormKey((n) => n + 1);
    setNotice(
      p.status === "confirmed"
        ? (p.message ?? "Operación confirmada.")
        : "Solicitud rechazada descartada. Revisá los datos actualizados antes de volver a cargarla.",
    );
  }
  async function execute(p: Pending) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setWorking(true);
    setError("");
    setNotice("");
    try {
      if (p.status !== "pending") {
        await finish(p);
        return;
      }
      const result = await sendOperation(p.jornadaId, p.operation);
      const item = result.resultados?.[0];
      if (
        result.completo &&
        result.confirmadas === 1 &&
        item?.estado === "CONFIRMADA" &&
        item.respuesta?.id === p.id
      ) {
        const done: Pending = {
          ...p,
          status: "confirmed",
          message: `${p.operation.tipo === "COBRO" ? "Cobro" : "Entrega"} confirmada por ${money(item.respuesta.total)}. Saldo del cliente: ${money(item.respuesta.saldoCliente)}.`,
        };
        save(done);
        await finish(done);
      } else if (
        result.confirmadas === 0 &&
        item &&
        ["CONFLICTO", "RECHAZADA"].includes(item.estado)
      ) {
        save({
          ...p,
          status: "rejected",
          message: item.mensaje ?? "El servidor rechazó la solicitud.",
        });
        setError(item.mensaje ?? "Solicitud rechazada.");
      } else
        throw new Error(
          item?.mensaje ??
            "No se pudo confirmar la operación. Reintentá la misma solicitud.",
        );
    } catch (e) {
      setError(
        (e as Error).message ||
          "Se perdió la conexión. La solicitud está guardada; reintentá para conocer el resultado.",
      );
    } finally {
      running.current = false;
      setBusy(false);
      setWorking(false);
    }
  }
  async function submit(operation: Operation, total: number) {
    if (running.current || externalBusy || !data || !client) return;
    setError("");
    setNotice("");
    try {
      if ((localStorage.getItem(`agua.clients.pending.v1.${username}`) || localStorage.getItem(`agua.factory.pending.v1.${username}`)))
        throw new Error("Primero resolvé la solicitud pendiente de clientes o fábrica.");
      if (localStorage.getItem(`agua.jornada.pending.v1.${username}`))
        throw new Error(
          "Primero resolvé la apertura o carga pendiente en Preparar el reparto.",
        );
      const existing = initial(key);
      if (existing.error) throw new Error(existing.error);
      if (existing.pending) {
        setPending(existing.pending);
        throw new Error("Primero resolvé la solicitud pendiente.");
      }
      const id =
        operation.tipo === "ENTREGA"
          ? operation.entrega.operacionId
          : operation.cobro.operacionId;
      const p: Pending = {
        version: 1,
        id,
        jornadaId: data.jornada.id,
        clienteNombre: client.nombre,
        total,
        operation,
        status: "pending",
      };
      save(p);
      await execute(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!client && !pending && !error && !notice && !storageError) return null;
  return (
    <section class="panel operations">
      <span class="eyebrow">ENTREGAS Y COBROS</span>
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
          <h2>
            {pending.status === "confirmed"
              ? "Confirmada · falta actualizar la pantalla"
              : pending.status === "rejected"
                ? "Solicitud rechazada"
                : "Solicitud pendiente de confirmación"}
          </h2>
          <p>
            <b>{pending.clienteNombre}</b> ·{" "}
            {pending.operation.tipo === "COBRO" ? "Cobro" : "Entrega"} ·{" "}
            {money(pending.total)}
          </p>
          <small>Operación: {pending.id}</small>
          <small>Jornada: {pending.jornadaId}</small>
          {pending.message && <p>{pending.message}</p>}
          <p class="muted">
            {pending.status === "pending"
              ? "Reintentá esta solicitud para consultar o completar su registro. Conserva el mismo identificador y los mismos datos."
              : "El resultado ya se conoce. Actualizaremos los saldos antes de habilitar otra operación."}
          </p>
          <button
            class="primary"
            disabled={busy || externalBusy || !!storageError}
            onClick={() => void execute(pending)}
          >
            {busy
              ? "Procesando…"
              : pending.status === "pending"
                ? "Reintentar misma solicitud"
                : pending.status === "confirmed"
                  ? "Actualizar datos"
                  : "Descartar solicitud rechazada y actualizar"}
          </button>
        </div>
      ) : data && client && !storageError ? (
        <>
          {data.jornada.estado !== "ABIERTA" ? (
            <p class="notice">
              La jornada está cerrada. Solo permite consultas.
            </p>
          ) : !client.activo ? (
            <p class="notice">
              El cliente está inactivo. No se pueden registrar operaciones.
            </p>
          ) : (
            <OperationForm
              key={client.id + data.generadoEn + formKey}
              data={data}
              client={client}
              busy={busy || externalBusy}
              submit={submit}
            />
          )}
        </>
      ) : null}
    </section>
  );
}
function OperationForm({
  data,
  client,
  busy,
  submit,
}: {
  data: Snapshot;
  client: Cliente;
  busy: boolean;
  submit: (operation: Operation, total: number) => Promise<void>;
}) {
  const [mode, setMode] = useState<"ENTREGA" | "COBRO">("ENTREGA"),
    [plan, setPlan] = useState(""),
    [review, setReview] = useState(false),
    [localError, setLocalError] = useState("");
  const [rows, setRows] = useState<DraftItem[]>(
    data.productos
      .filter((p) => p.activo && p.tipo === "BIDON")
      .map((p) => ({
        productoId: p.id,
        entregados: "0",
        vacios: "0",
        danados: "0",
        precio: "",
        motivo: "",
      })),
  );
  const [pay, setPay] = useState([
    { medio: "EFECTIVO", importe: "", referencia: "" },
    { medio: "TRANSFERENCIA", importe: "", referencia: "" },
    { medio: "MERCADO_PAGO", importe: "", referencia: "" },
  ]);
  let calculated: ReturnType<typeof delivery> | null = null,
    payment: ReturnType<typeof payments> | null = null,
    validation = "";
  try {
    if (mode === "ENTREGA") calculated = delivery(data, client, rows, plan);
    else payment = payments(pay);
  } catch (e) {
    validation = (e as Error).message;
  }
  const total = calculated?.total ?? payment?.total ?? 0;
  function change(index: number, field: keyof DraftItem, value: string) {
    setReview(false);
    setRows((list) =>
      list.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }
  function next(e: Event) {
    e.preventDefault();
    if (busy) return;
    setLocalError("");
    if (validation) {
      setLocalError(validation);
      return;
    }
    setReview(true);
  }
  async function confirm() {
    if (validation || busy) return;
    const periodo = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const month = `${periodo.find((p) => p.type === "year")!.value}-${periodo.find((p) => p.type === "month")!.value}-01`;
    if (month !== data.periodo) {
      setLocalError(
        "Cambió el mes. Actualizá la jornada antes de registrar operaciones.",
      );
      return;
    }
    if (typeof crypto.randomUUID !== "function") {
      setLocalError(
        "El navegador requiere localhost o HTTPS para registrar operaciones.",
      );
      return;
    }
    const id = crypto.randomUUID();
    if (mode === "ENTREGA" && calculated)
      await submit(
        {
          tipo: "ENTREGA",
          entrega: {
            operacionId: id,
            clienteId: client.id,
            items: calculated.items,
            ...(calculated.abono ? { abono: calculated.abono } : {}),
          },
          esperadoEntrega: { total, items: calculated.expected },
        },
        total,
      );
    else if (payment)
      await submit(
        {
          tipo: "COBRO",
          cobro: {
            operacionId: id,
            clienteId: client.id,
            pagos: payment.pagos,
          },
        },
        total,
      );
  }
  return (
    <>
      <h2>Registrar para {client.nombre}</h2>
      <div class="tabs">
        <button
          disabled={busy}
          class={mode === "ENTREGA" ? "active" : ""}
          onClick={() => {
            setMode("ENTREGA");
            setReview(false);
            setLocalError("");
          }}
        >
          Entrega / devolución
        </button>
        <button
          disabled={busy}
          class={mode === "COBRO" ? "active" : ""}
          onClick={() => {
            setMode("COBRO");
            setReview(false);
            setLocalError("");
          }}
        >
          Cobro
        </button>
      </div>
      {localError && (
        <p class="error" role="alert">
          {localError}
        </p>
      )}
      {review ? (
        <div class="review">
          <h3>Revisá antes de confirmar</h3>
          {mode === "ENTREGA" && calculated ? (
            <>
              {calculated.summary.map((s) => (
                <div class="row" key={s.nombre}>
                  <div>
                    <b>{s.nombre}</b>
                    <small>
                      {s.entregados} entregados · {s.vacios} vacíos devueltos ·{" "}
                      {s.danados} dañados devueltos
                    </small>
                    <small>
                      {s.incluidos} incluidos en abono · {s.facturados}{" "}
                      facturados
                    </small>
                    <small>Envases resultantes: {s.envases}</small>
                  </div>
                  <b>{money(s.subtotal)}</b>
                </div>
              ))}
              {calculated.abono && (
                <p>Se cargará el abono mensual completo, sin prorrateo.</p>
              )}
            </>
          ) : (
            payment?.pagos.map((p) => (
              <div class="row" key={p.medio}>
                <span>{p.medio.replaceAll("_", " ")}</span>
                <b>{money(p.importe)}</b>
              </div>
            ))
          )}
          <div class="balance">
            <span>
              {mode === "ENTREGA" ? "Total de la entrega" : "Total del cobro"}
            </span>
            <strong>{money(total)}</strong>
          </div>
          <p>
            Saldo estimado luego de registrar:{" "}
            <b>{money(client.saldo + (mode === "ENTREGA" ? total : -total))}</b>
          </p>
          {mode === "COBRO" && total > client.saldo && (
            <p class="notice">
              El cliente quedará con saldo a favor. Registrá solo el importe que
              efectivamente cobrás.
            </p>
          )}
          <div class="actions">
            <button
              class="secondary"
              disabled={busy}
              onClick={() => setReview(false)}
            >
              Volver a editar
            </button>
            <button
              class="primary"
              disabled={busy || !!validation}
              onClick={() => void confirm()}
            >
              Confirmar {mode === "ENTREGA" ? "entrega" : "cobro"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={next}>
          <fieldset class="form-wrapper" disabled={busy}>
            {mode === "ENTREGA" ? (
              <>
                <label>
                  Abono a cargar este mes
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.currentTarget.value)}
                  >
                    <option value="">No cargar un abono nuevo</option>
                    {data.planesAbono
                      .filter(
                        (p) =>
                          p.activo &&
                          !data.abonosClientes.some(
                            (a) =>
                              a.clienteId === client.id && a.planId === p.id,
                          ),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} · {money(p.precio)}
                        </option>
                      ))}
                  </select>
                </label>
                <p class="muted">
                  Los cupos disponibles se aplican automáticamente. Podés cargar
                  un abono sin entregar bidones.
                </p>
                {rows.map((r, i) => {
                  const p = data.productos.find((p) => p.id === r.productoId)!;
                  const stock =
                    data.stockJornada.find(
                      (s) => s.productoId === p.id && s.estado === "LLENO",
                    )?.cantidad ?? 0;
                  return (
                    <fieldset key={p.id}>
                      <legend>{p.nombre}</legend>
                      <small>Stock lleno en jornada: {stock}</small>
                      <div class="quantity-fields">
                        {[
                          ["entregados", "Entregados"],
                          ["vacios", "Vacíos devueltos"],
                          ["danados", "Dañados devueltos"],
                        ].map(([f, label]) => (
                          <label key={f}>
                            {label}
                            <input
                              type="number"
                              min="0"
                              max="10000"
                              step="1"
                              value={r[f as keyof DraftItem]}
                              onInput={(e) =>
                                change(
                                  i,
                                  f as keyof DraftItem,
                                  e.currentTarget.value,
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <details>
                        <summary>Precio excepcional para esta entrega</summary>
                        <label>
                          Precio por bidón fuera del abono
                          <input
                            inputMode="decimal"
                            placeholder="Usar precio habitual"
                            value={r.precio}
                            onInput={(e) =>
                              change(i, "precio", e.currentTarget.value)
                            }
                          />
                        </label>
                        <label>
                          Motivo
                          <input
                            maxLength={500}
                            value={r.motivo}
                            onInput={(e) =>
                              change(i, "motivo", e.currentTarget.value)
                            }
                          />
                        </label>
                      </details>
                    </fieldset>
                  );
                })}
              </>
            ) : (
              <>
                <p class="muted">
                  Podés registrar un pago parcial o combinar medios. Saldo
                  actual: {money(client.saldo)}.
                </p>
                {pay.map((p, i) => (
                  <fieldset key={p.medio}>
                    <legend>
                      {p.medio === "MERCADO_PAGO"
                        ? "Mercado Pago"
                        : p.medio === "EFECTIVO"
                          ? "Efectivo"
                          : "Transferencia"}
                    </legend>
                    <label>
                      Importe
                      <input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={p.importe}
                        onInput={(e) =>
                          setPay((list) =>
                            list.map((r, n) =>
                              n === i
                                ? { ...r, importe: e.currentTarget.value }
                                : r,
                            ),
                          )
                        }
                      />
                    </label>
                    {p.medio !== "EFECTIVO" && (
                      <label>
                        Referencia (opcional)
                        <input
                          maxLength={100}
                          value={p.referencia}
                          onInput={(e) =>
                            setPay((list) =>
                              list.map((r, n) =>
                                n === i
                                  ? { ...r, referencia: e.currentTarget.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                    )}
                  </fieldset>
                ))}
              </>
            )}
            <p class="muted">
              {validation || `Total estimado: ${money(total)}`}
            </p>
            <button class="primary" disabled={busy}>
              Revisar {mode === "ENTREGA" ? "entrega" : "cobro"}
            </button>
          </fieldset>
        </form>
      )}
    </>
  );
}
