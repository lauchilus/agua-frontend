import { useRef, useState } from "preact/hooks";
import { ApiError, factoryStock, products, postJourney } from "./api";
import type { FactoryStock, Producto } from "./types";
type Pending = {
  body: Record<string, unknown>;
  kind: "AJUSTE" | "PRODUCCION";
  status: "pending" | "confirmed" | "rejected";
  summary: string;
};
export function Factory({
  username,
  busy,
  setWorking,
}: {
  username: string;
  busy: boolean;
  setWorking: (v: boolean) => void;
}) {
  const key = `agua.factory.pending.v1.${username}`;
  function read(): Pending | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (
      !p.body?.operacionId ||
      !["AJUSTE", "PRODUCCION"].includes(p.kind) ||
      !["pending", "confirmed", "rejected"].includes(p.status)
    )
      throw Error("Solicitud de fábrica guardada no válida.");
    return p;
  }
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [visible, setVisible] = useState(false),
    [rows, setRows] = useState<FactoryStock[]>([]),
    [catalog, setCatalog] = useState<Producto[]>([]),
    [pending, setPending] = useState<Pending | null>(null),
    [kind, setKind] = useState<"AJUSTE" | "PRODUCCION">("AJUSTE"),
    [product, setProduct] = useState(""),
    [state, setState] = useState("VACIO"),
    [quantity, setQuantity] = useState(""),
    [reason, setReason] = useState(""),
    [review, setReview] = useState<Pending | null>(null),
    [search, setSearch] = useState("");
  const running = useRef(false);
  async function refresh() {
    const [s, p] = await Promise.all([factoryStock(), products()]);
    setRows(s);
    setCatalog(p);
  }
  async function open() {
    if (busy) return;
    setWorking(true);
    setError("");
    try {
      setPending(read());
      await refresh();
      setVisible(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  function save(p: Pending) {
    localStorage.setItem(key, JSON.stringify(p));
    setPending(p);
  }
  async function execute(p: Pending) {
    if (running.current || busy) return;
    running.current = true;
    setWorking(true);
    setError("");
    let confirmed = p.status === "confirmed";
    try {
      if (p.status === "pending") {
        const result = await postJourney(
          p.kind === "AJUSTE" ? "/admin/stock/ajustes" : "/admin/producciones",
          p.body,
        );
        if (result.id !== p.body.operacionId)
          throw Error(
            "Respuesta inesperada. Conservamos la solicitud para reintentar.",
          );
        confirmed = true;
        p = { ...p, status: "confirmed" };
        save(p);
      }
      await refresh();
      localStorage.removeItem(key);
      setPending(null);
      setReview(null);
      setQuantity("");
      setReason("");
      setNotice(
        confirmed
          ? "Movimiento registrado. Stock actualizado."
          : "Rechazo descartado. Revisá las existencias antes de preparar otra operación.",
      );
    } catch (e) {
      if (
        !confirmed &&
        e instanceof ApiError &&
        [400, 409, 422].includes(e.status)
      ) {
        try {
          save({ ...p, status: "rejected" });
        } catch {}
      }
      setError((e as Error).message);
    } finally {
      running.current = false;
      setWorking(false);
    }
  }
  function prepare(e: Event) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const previous = read();
      if (previous) {
        setPending(previous);
        throw Error("Primero resolvé la solicitud de fábrica pendiente.");
      }
      if (
        (localStorage.getItem(`agua.clients.pending.v1.${username}`) || localStorage.getItem(`agua.pending.v1.${username}`)) ||
        localStorage.getItem(`agua.jornada.pending.v1.${username}`)
      )
        throw Error("Primero resolvé la solicitud pendiente del reparto.");
      const p = catalog.find((p) => p.id === product);
      if (!p) throw Error("Elegí un producto.");
      if (
        !/^-?\d+$/.test(quantity) ||
        !Number.isSafeInteger(Number(quantity)) ||
        Math.abs(Number(quantity)) > 2147483647 ||
        Number(quantity) === 0
      )
        throw Error("Indicá una cantidad entera distinta de cero.");
      const n = Number(quantity);
      let body: Record<string, unknown> = { productoId: p.id, cantidad: n };
      let summary = "";
      if (kind === "PRODUCCION") {
        if (p.tipo !== "BIDON" || n < 1)
          throw Error(
            "La producción requiere bidones y una cantidad positiva.",
          );
        if (![12,20].includes(p.capacidadLitros ?? 0)) throw Error("No hay bolsa configurada para esta capacidad.");
        const bolsa = `BOLSA_${p.capacidadLitros}`;
        const available = (code: string, st: string) =>
          rows.find((s) => s.codigo === code && s.estado === st)?.cantidad ?? 0;
        if (
          n >
          Math.min(
            available(p.codigo, "VACIO"),
            available("TAPA", "DISPONIBLE"),
            available(bolsa, "DISPONIBLE"),
          )
        )
          throw Error("No hay suficientes vacíos, tapas o bolsas de la capacidad seleccionada.");
        summary = `Producir ${n} ${p.nombre}: sumar ${n} llenos y descontar ${n} vacíos, ${n} tapas y ${n} bolsas de ${p.capacidadLitros} litros.`;
      } else {
        const st = p.tipo === "BIDON" ? state : "DISPONIBLE";
        const row = rows.find((s) => s.productoId === p.id && s.estado === st);
        if (!row) throw Error("Combinación de stock no inicializada.");
        if (row.cantidad + n < 0)
          throw Error("El ajuste dejaría stock negativo.");
        if (!reason.trim() || reason.trim().length > 500)
          throw Error("Indicá un motivo de hasta 500 caracteres.");
        body = { ...body, estado: st, motivo: reason.trim() };
        summary = `${p.nombre} · ${st}: ${row.cantidad} → ${row.cantidad + n} (${n > 0 ? "+" : ""}${n}). Motivo: ${reason.trim()}`;
      }
      setReview({ kind, body, status: "pending", summary });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm() {
    if (!review || busy) return;
    try {
      const old = read();
      if (old) {
        setPending(old);
        throw Error("Ya hay una solicitud pendiente.");
      }
      if (
        (localStorage.getItem(`agua.clients.pending.v1.${username}`) || localStorage.getItem(`agua.pending.v1.${username}`)) ||
        localStorage.getItem(`agua.jornada.pending.v1.${username}`)
      )
        throw Error("Primero resolvé la solicitud pendiente del reparto.");
      const p = {
        ...review,
        body: { ...review.body, operacionId: crypto.randomUUID() },
      };
      save(p);
      await execute(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section class="panel">
      <div class="section-heading">
        <h2>Administración · Stock de fábrica</h2>
        <button class="secondary" disabled={busy} onClick={() => void open()}>
          {visible ? "Actualizar stock de fábrica" : "Abrir stock de fábrica"}
        </button>
      </div>
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
      {visible && (
        <>
          <label>
            Buscar producto
            <input
              value={search}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </label>
          {rows
            .filter((s) =>
              (s.nombre + " " + s.codigo)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((s) => (
              <div class="row" key={s.productoId + s.estado}>
                <span>
                  {s.nombre}
                  <small>{s.estado}</small>
                </span>
                <b>{s.cantidad}</b>
              </div>
            ))}
          {pending ? (
            <div>
              <h3>
                {pending.status === "confirmed"
                  ? "Confirmado · falta actualizar"
                  : pending.status === "rejected"
                    ? "Solicitud rechazada"
                    : "Solicitud de fábrica pendiente"}
              </h3>
              <p>{pending.summary}</p>
              <button
                class="primary"
                disabled={busy}
                onClick={() => void execute(pending)}
              >
                {pending.status === "pending"
                  ? "Reintentar movimiento"
                  : pending.status === "confirmed"
                    ? "Actualizar movimiento confirmado"
                    : "Descartar rechazo"}
              </button>
            </div>
          ) : (
            <form onSubmit={prepare}>
              <fieldset class="form-wrapper" disabled={busy || !!review}>
                <label>
                  Operación
                  <select
                    value={kind}
                    onChange={(e) => {
                      setKind(e.currentTarget.value as typeof kind);
                      setProduct("");
                    }}
                  >
                    <option value="AJUSTE">Ajuste manual</option>
                    <option value="PRODUCCION">Producción de bidones</option>
                  </select>
                </label>
                <label>
                  Producto
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.currentTarget.value)}
                  >
                    <option value="">Elegí un producto</option>
                    {catalog
                      .filter((p) => kind === "AJUSTE" || p.tipo === "BIDON")
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                  </select>
                </label>
                {kind === "AJUSTE" &&
                  catalog.find((p) => p.id === product)?.tipo === "BIDON" && (
                    <label>
                      Estado
                      <select
                        value={state}
                        onChange={(e) => setState(e.currentTarget.value)}
                      >
                        <option>VACIO</option>
                        <option>LLENO</option>
                        <option>DANADO</option>
                      </select>
                    </label>
                  )}
                <label>
                  {kind === "AJUSTE"
                    ? "Variación: positiva ingresa, negativa descuenta"
                    : "Cantidad a producir"}
                  <input
                    aria-label="Cantidad de fábrica"
                    type="number"
                    step="1"
                    value={quantity}
                    onInput={(e) => setQuantity(e.currentTarget.value)}
                  />
                </label>
                {kind === "AJUSTE" && (
                  <label>
                    Motivo
                    <textarea
                      maxLength={500}
                      value={reason}
                      onInput={(e) => setReason(e.currentTarget.value)}
                    />
                  </label>
                )}
                {!review && <button class="primary">Revisar movimiento</button>}
              </fieldset>
              {review && (
                <div>
                  <p class="notice">{review.summary}</p>
                  <button
                    type="button"
                    class="secondary"
                    disabled={busy}
                    onClick={() => setReview(null)}
                  >
                    Editar movimiento
                  </button>
                  <button
                    type="button"
                    class="primary"
                    disabled={busy}
                    onClick={() => void confirm()}
                  >
                    Confirmar movimiento
                  </button>
                </div>
              )}
            </form>
          )}
        </>
      )}
    </section>
  );
}
