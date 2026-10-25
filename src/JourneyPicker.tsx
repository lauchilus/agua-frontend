import { useEffect, useState } from "preact/hooks";
import { listJourneys } from "./api";
import type { PaginaJornadas, User } from "./types";
interface Props {
  user: User;
  disabled: boolean;
  currentId: string;
  onSelect: (id: string) => Promise<void>;
}
export function JourneyPicker({ user, disabled, currentId, onSelect }: Props) {
  const [estado, setEstado] = useState("ABIERTA"),
    [pagina, setPagina] = useState(0),
    [revision, setRevision] = useState(0);
  const [result, setResult] = useState<PaginaJornadas | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    const timeout = setTimeout(() => controller.abort(), 20000);
    listJourneys(estado, pagina, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        setResult(r);
        if (
          !user.roles.includes("ROLE_ADMIN") &&
          estado === "ABIERTA" &&
          r.contenido.length === 1 &&
          !currentId
        )
          void onSelect(r.contenido[0].id);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e.message);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      });
    // Timeout distinguido del desmontaje para mostrar un reintento.
    const onAbort = () => {
      setError(
        "La consulta se interrumpió. Actualizá la lista para reintentar.",
      );
      setLoading(false);
    };
    controller.signal.addEventListener("abort", onAbort);
    return () => {
      clearTimeout(timeout);
      controller.signal.removeEventListener("abort", onAbort);
      controller.abort();
    };
  }, [user.username, estado, pagina, revision]);
  return (
    <section class="panel">
      <div class="section-heading">
        <h2>
          {user.roles.includes("ROLE_ADMIN")
            ? "Repartos del día"
            : "Mis repartos"}
        </h2>
        <button
          class="secondary"
          disabled={disabled || loading}
          onClick={() => setRevision((n) => n + 1)}
        >
          Actualizar lista
        </button>
      </div>
      <label>
        Mostrar
        <select
          value={estado}
          disabled={disabled || loading}
          onChange={(e) => {
            setEstado(e.currentTarget.value);
            setPagina(0);
          }}
        >
          <option value="ABIERTA">Abiertas</option>
          <option value="CERRADA">Cerradas</option>
          <option value="TODAS">Todas</option>
        </select>
      </label>
      {loading && <p role="status">Buscando jornadas…</p>}
      {error && (
        <p class="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          {!result.contenido.length ? (
            <p class="notice">
              No hay jornadas{" "}
              {estado === "ABIERTA"
                ? "abiertas"
                : estado === "CERRADA"
                  ? "cerradas"
                  : "disponibles"}
              {user.roles.includes("ROLE_ADMIN")
                ? ""
                : " asignadas a tu usuario"}
              .{" "}
              {estado === "ABIERTA"
                ? "Podés elegir Cerradas para consultar el historial."
                : ""}
            </p>
          ) : (
            <div class="journey-list">
              {result.contenido.map((j) => (
                <button
                  key={j.id}
                  class={`journey-option ${currentId === j.id ? "chosen" : ""}`}
                  disabled={disabled}
                  onClick={() => void onSelect(j.id)}
                  aria-pressed={currentId === j.id}
                >
                  <span>
                    <b>
                      {j.fecha.split("-").reverse().join("/")} ·{" "}
                      {j.camionetaNombre}
                    </b>
                    <small>
                      {j.patente} · {j.repartidorNombre}
                    </small>
                  </span>
                  <span class="status">
                    {j.estado === "ABIERTA" ? "Abierta" : "Cerrada"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div class="pagination">
            <button
              class="ghost"
              disabled={disabled || pagina === 0}
              onClick={() => setPagina((n) => n - 1)}
            >
              Anterior
            </button>
            <span>Página {pagina + 1}</span>
            <button
              class="ghost"
              disabled={disabled || !result.hayMas}
              onClick={() => setPagina((n) => n + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}
